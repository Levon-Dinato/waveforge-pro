// src/components/EQPanel.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { EQBand } from '../audio/masteringChain';

interface EQPanelProps {
  bands: EQBand[];
  onChange: (index: number, frequency: number, gain: number, q: number) => void;
  onReset: () => void;
  height?: number;
}

export const EQPanel: React.FC<EQPanelProps> = ({
  bands,
  onChange,
  onReset,
  height = 160,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedBand, setSelectedBand] = useState<number | null>(null);
  const [draggingBand, setDraggingBand] = useState<number | null>(null);
  const [hoveredBand, setHoveredBand] = useState<number | null>(null);

  // Constantes pour la conversion freq ↔ x
  const MIN_FREQ = 20;
  const MAX_FREQ = 20000;
  const MIN_DB = -12;
  const MAX_DB = 12;

  const freqToX = useCallback((freq: number, w: number) => {
    const logMin = Math.log10(MIN_FREQ);
    const logMax = Math.log10(MAX_FREQ);
    const logFreq = Math.log10(freq);
    return ((logFreq - logMin) / (logMax - logMin)) * w;
  }, []);

  const xToFreq = useCallback((x: number, w: number) => {
    const logMin = Math.log10(MIN_FREQ);
    const logMax = Math.log10(MAX_FREQ);
    const ratio = x / w;
    const logFreq = logMin + ratio * (logMax - logMin);
    return Math.pow(10, logFreq);
  }, []);

  const dbToY = useCallback((db: number, h: number) => {
    const padding = 20;
    const usableH = h - padding * 2;
    const ratio = (MAX_DB - db) / (MAX_DB - MIN_DB);
    return padding + ratio * usableH;
  }, []);

  const yToDb = useCallback((y: number, h: number) => {
    const padding = 20;
    const usableH = h - padding * 2;
    const ratio = (y - padding) / usableH;
    return MAX_DB - ratio * (MAX_DB - MIN_DB);
  }, []);

  // Dessin
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== w * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Fond
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, w, h);

    // Grille horizontale (dB)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    [-6, 0, 6].forEach((db) => {
      const y = dbToY(db, h);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    });

    // Ligne 0dB
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    const zeroY = dbToY(0, h);
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(w, zeroY);
    ctx.stroke();

    // Grille verticale (fréquences)
    const freqs = [30, 60, 100, 200, 500, 1000, 2000, 5000, 10000];
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    freqs.forEach((f) => {
      const x = freqToX(f, w);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    });

    // Courbe de réponse
    const N = 200;
    const freqsArray = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      freqsArray[i] = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, i / (N - 1));
    }

    const magnitudes = new Float32Array(N).fill(0);
    for (const band of bands) {
      for (let i = 0; i < N; i++) {
        const f = freqsArray[i];
        let gain = 0;
        const logDist = Math.log2(f / band.frequency);

        if (band.type === 'lowshelf') {
          gain = band.gain / (1 + Math.pow(f / band.frequency, 2));
        } else if (band.type === 'highshelf') {
          gain = band.gain / (1 + Math.pow(band.frequency / f, 2));
        } else {
          const qFactor = Math.exp(-Math.pow(logDist * band.q, 2) / 2);
          gain = band.gain * qFactor;
        }

        magnitudes[i] += gain;
      }
    }

    // Trace la courbe
    ctx.strokeStyle = '#00d9ff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00d9ff';
    ctx.beginPath();

    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * w;
      const db = Math.max(MIN_DB, Math.min(MAX_DB, magnitudes[i]));
      const y = dbToY(db, h);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Remplissage sous la courbe
    ctx.lineTo(w, zeroY);
    ctx.lineTo(0, zeroY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 217, 255, 0.08)';
    ctx.fill();

    // Dessine les points des bandes
    bands.forEach((band, index) => {
      const x = freqToX(band.frequency, w);
      const y = dbToY(band.gain, h);
      const isSelected = selectedBand === index;
      const isHovered = hoveredBand === index;
      const radius = isSelected ? 10 : isHovered ? 9 : 7;

      // Cercle extérieur
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? `${band.color}40` : `${band.color}20`;
      ctx.fill();

      // Cercle principal
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = band.color;
      ctx.shadowBlur = isSelected || isHovered ? 12 : 6;
      ctx.shadowColor = band.color;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Numéro
      ctx.fillStyle = '#000';
      ctx.font = `bold ${radius}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), x, y);
    });

    // Labels des fréquences en bas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    [100, 1000, 10000].forEach((f) => {
      const x = freqToX(f, w);
      const label = f >= 1000 ? `${f / 1000}kHz` : `${f}Hz`;
      ctx.fillText(label, x, h - 12);
    });

    // Labels dB à gauche
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    [-12, -6, 0, 6, 12].forEach((db) => {
      const y = dbToY(db, h);
      ctx.fillText(`${db > 0 ? '+' : ''}${db}`, 3, y - 3);
    });
  }, [bands, selectedBand, hoveredBand, freqToX, dbToY]);

  // Gestion de la souris
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    let closestIdx = -1;
    let closestDist = Infinity;
    bands.forEach((band, i) => {
      const bx = freqToX(band.frequency, w);
      const by = dbToY(band.gain, h);
      const dist = Math.sqrt((mx - bx) ** 2 + (my - by) ** 2);
      if (dist < closestDist && dist < 30) {
        closestDist = dist;
        closestIdx = i;
      }
    });

    if (closestIdx !== -1) {
      setSelectedBand(closestIdx);
      setDraggingBand(closestIdx);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    if (draggingBand !== null) {
      const band = bands[draggingBand];
      const newFreq = Math.max(band.minFreq, Math.min(band.maxFreq, xToFreq(mx, w)));
      const newGain = Math.max(MIN_DB, Math.min(MAX_DB, yToDb(my, h)));
      onChange(draggingBand, Math.round(newFreq), parseFloat(newGain.toFixed(1)), band.q);
    } else {
      let hovered = -1;
      bands.forEach((band, i) => {
        const bx = freqToX(band.frequency, w);
        const by = dbToY(band.gain, h);
        const dist = Math.sqrt((mx - bx) ** 2 + (my - by) ** 2);
        if (dist < 15) hovered = i;
      });
      setHoveredBand(hovered);
    }
  };

  const handleMouseUp = () => {
    setDraggingBand(null);
  };

  useEffect(() => {
    const up = () => setDraggingBand(null);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const selected = selectedBand !== null ? bands[selectedBand] : null;

  return (
    <div>
      {/* Canvas de courbe */}
      <div
        style={{
          position: 'relative',
          marginBottom: 12,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #1f1f1f',
        }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            width: '100%',
            height: `${height}px`,
            display: 'block',
            cursor: draggingBand !== null ? 'grabbing' : hoveredBand !== null ? 'grab' : 'crosshair',
          }}
        />
      </div>

      {/* Contrôles de la bande sélectionnée */}
      {selected && selectedBand !== null && (
        <div
          style={{
            padding: 12,
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 8,
            border: `1px solid ${selected.color}40`,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: selected.color,
                  color: '#000',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selectedBand + 1}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: selected.color,
                  letterSpacing: '0.5px',
                }}
              >
                {selected.label.toUpperCase()}
              </span>
            </div>
            <button
              onClick={() => setSelectedBand(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <MiniKnob
              label="Fréquence"
              value={selected.frequency}
              unit={selected.frequency >= 1000 ? 'kHz' : 'Hz'}
              displayValue={
                selected.frequency >= 1000
                  ? (selected.frequency / 1000).toFixed(1)
                  : Math.round(selected.frequency).toString()
              }
              min={selected.minFreq}
              max={selected.maxFreq}
              color={selected.color}
              onChange={(v) => onChange(selectedBand, Math.round(v), selected.gain, selected.q)}
            />
            <MiniKnob
              label="Gain"
              value={selected.gain}
              unit="dB"
              displayValue={(selected.gain > 0 ? '+' : '') + selected.gain.toFixed(1)}
              min={MIN_DB}
              max={MAX_DB}
              color={selected.color}
              onChange={(v) => onChange(selectedBand, selected.frequency, parseFloat(v.toFixed(1)), selected.q)}
            />
            <MiniKnob
              label="Q (Précision)"
              value={selected.q}
              unit=""
              displayValue={selected.q.toFixed(1)}
              min={0.1}
              max={5}
              color={selected.color}
              onChange={(v) => onChange(selectedBand, selected.frequency, selected.gain, parseFloat(v.toFixed(2)))}
            />
          </div>
        </div>
      )}

      {/* Bouton Reset */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: '#666' }}>
          💡 Clique sur un point pour éditer · Glisse pour ajuster
        </div>
        <button
          onClick={onReset}
          className="btn-action"
          style={{
            padding: '4px 10px',
            fontSize: 10,
            color: '#ff3366',
            borderColor: 'rgba(255, 51, 102, 0.3)',
          }}
        >
          🔄 RESET EQ
        </button>
      </div>
    </div>
  );
};

// ============================================================
// Mini Knob
// ============================================================
const MiniKnob: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  displayValue: string;
  color: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, unit, displayValue, color, onChange }) => {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);
  const normalized = (value - min) / (max - min);
  const angle = -135 + normalized * 270;

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startY: e.clientY, startValue: value };

    const move = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaY = dragRef.current.startY - ev.clientY;
      const range = max - min;
      const sensitivity = range / 150;
      let newValue = dragRef.current.startValue + deltaY * sensitivity;
      newValue = Math.max(min, Math.min(max, newValue));
      onChange(newValue);
    };

    const up = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        width="50"
        height="50"
        viewBox="0 0 50 50"
        onMouseDown={handleMouseDown}
        style={{ cursor: 'ns-resize' }}
      >
        <circle cx="25" cy="25" r="18" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="2" />
        <circle
          cx="25"
          cy="25"
          r="18"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={`${normalized * 113} 113`}
          strokeLinecap="round"
          transform="rotate(135 25 25)"
          opacity="0.8"
        />
        <line
          x1="25"
          y1="25"
          x2="25"
          y2="10"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${angle} 25 25)`}
        />
        <circle cx="25" cy="25" r="2.5" fill={color} />
      </svg>
      <div style={{ fontSize: 8, color: '#666', marginTop: 2, letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div
        className="mono"
        style={{ fontSize: 10, color, fontWeight: 600, marginTop: 1 }}
      >
        {displayValue}{unit}
      </div>
    </div>
  );
};