// src/components/CorrelationMeter.tsx
import React, { useRef, useEffect, useState } from 'react';

interface CorrelationMeterProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  color?: string;
}

export const CorrelationMeter: React.FC<CorrelationMeterProps> = ({
  analyser,
  isActive,
  color = '#00d9ff',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>(new Array(120).fill(0));
  const rafHistoryRef = useRef<number[]>([]);
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    if (canvas.width !== W * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const dataArray = analyser
      ? new Float32Array(analyser.fftSize)
      : null;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);

      // Fond
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, W, H);

      // ============================================================
      // GRILLE ET AXES
      // ============================================================
      const padding = 30;
      const trackY = H - 40;
      const trackHeight = 8;
      const trackWidth = W - padding * 2;
      const trackX = padding;

      // Barre de fond
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(trackX, trackY, trackWidth, trackHeight);

      // Gradient rouge → jaune → vert
      const gradient = ctx.createLinearGradient(trackX, 0, trackX + trackWidth, 0);
      gradient.addColorStop(0, 'rgba(255, 51, 102, 0.4)');
      gradient.addColorStop(0.5, 'rgba(255, 212, 59, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 255, 136, 0.4)');
      ctx.fillStyle = gradient;
      ctx.fillRect(trackX, trackY, trackWidth, trackHeight);

      // Graduations -1, 0, +1
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      [-1, 0, 1].forEach((val) => {
        const x = trackX + ((val + 1) / 2) * trackWidth;
        ctx.beginPath();
        ctx.moveTo(x, trackY - 4);
        ctx.lineTo(x, trackY + trackHeight + 4);
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(
          val > 0 ? '+1' : val < 0 ? '-1' : '0',
          x,
          trackY + trackHeight + 6
        );
      });

      // Zone rouge (problème de phase)
      const redZoneX = trackX;
      const redZoneEnd = trackX + (0.25 * trackWidth); // -1 à -0.5
      ctx.fillStyle = 'rgba(255, 51, 102, 0.15)';
      ctx.fillRect(redZoneX, trackY - 2, redZoneEnd - redZoneX, trackHeight + 4);

      // Zone jaune (transition)
      const yellowZoneEnd = trackX + (0.5 * trackWidth); // -0.5 à 0
      ctx.fillStyle = 'rgba(255, 212, 59, 0.1)';
      ctx.fillRect(redZoneEnd, trackY - 2, yellowZoneEnd - redZoneEnd, trackHeight + 4);

      // ============================================================
      // RÉCUPÉRATION DE LA VALEUR
      // ============================================================
      let correlation = 0;

      if (analyser && dataArray && isActive) {
        analyser.getFloatTimeDomainData(dataArray as Float32Array<ArrayBuffer>);

        // Approximation L/R : on prend les échantillons pairs/impairs
        let sumLR = 0;
        let sumL2 = 0;
        let sumR2 = 0;
        const N = dataArray.length;

        for (let i = 0; i < N - 1; i += 2) {
          const l = dataArray[i] || 0;
          const r = dataArray[i + 1] || 0;
          sumLR += l * r;
          sumL2 += l * l;
          sumR2 += r * r;
        }

        const denom = Math.sqrt(sumL2 * sumR2);
        correlation = denom > 0 ? sumLR / denom : 0;
        correlation = Math.max(-1, Math.min(1, correlation));

        // Historique pour le RANGE
        rafHistoryRef.current.push(correlation);
        if (rafHistoryRef.current.length > 1000) {
          rafHistoryRef.current.shift();
        }

        // Moyenne sur les 500 dernières mesures
        const avgWindow = rafHistoryRef.current.slice(-500);
        const avgCorrelation = avgWindow.reduce((a, b) => a + b, 0) / avgWindow.length;

        historyRef.current.push(avgCorrelation);
        if (historyRef.current.length > 120) historyRef.current.shift();
        setCurrentValue(avgCorrelation);
      } else {
        // Au repos : 0
        historyRef.current.push(0);
        if (historyRef.current.length > 120) historyRef.current.shift();
        setCurrentValue(0);
      }

      // ============================================================
      // INDICATEUR DE POSITION
      // ============================================================
      const indicatorX = trackX + ((correlation + 1) / 2) * trackWidth;

      // Ligne verticale
      ctx.strokeStyle = correlation < -0.5 ? '#ff3366' : correlation < 0.2 ? '#ffd43b' : '#00ff88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(indicatorX, trackY - 8);
      ctx.lineTo(indicatorX, trackY + trackHeight + 8);
      ctx.stroke();

      // Cercle
      ctx.fillStyle = correlation < -0.5 ? '#ff3366' : correlation < 0.2 ? '#ffd43b' : '#00ff88';
      ctx.beginPath();
      ctx.arc(indicatorX, trackY + trackHeight / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // ============================================================
      // GRAPHE D'HISTORIQUE
      // ============================================================
      const graphTop = 12;
      const graphHeight = trackY - graphTop - 12;
      const graphLeft = padding;
      const graphRight = W - padding;
      const graphWidth = graphRight - graphLeft;

      // Ligne médiane
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(graphLeft, graphTop + graphHeight / 2);
      ctx.lineTo(graphRight, graphTop + graphHeight / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Courbe
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      historyRef.current.forEach((val, i) => {
        const x = graphLeft + (i / (historyRef.current.length - 1)) * graphWidth;
        const y = graphTop + graphHeight / 2 - (val * graphHeight) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Remplissage léger
      ctx.lineTo(graphRight, graphTop + graphHeight / 2);
      ctx.lineTo(graphLeft, graphTop + graphHeight / 2);
      ctx.closePath();
      ctx.fillStyle = `${color}10`;
      ctx.fill();

      // Label au centre
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('CORRÉLATION PHASE L/R', (graphLeft + graphRight) / 2, graphTop + graphHeight + 2);
    };

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isActive, color]);

  // ============================================================
  // ÉTAT DE LA CORRÉLATION
  // ============================================================
  const status = (() => {
    if (currentValue >= 0.5) return { label: 'EXCELLENT', color: '#00ff88', desc: 'Compatible mono' };
    if (currentValue >= 0.2) return { label: 'BON', color: '#00ff88', desc: 'Bon compromis' };
    if (currentValue >= -0.3) return { label: 'ATTENTION', color: '#ffd43b', desc: 'Stéréo large' };
    return { label: 'PROBLÈME', color: '#ff3366', desc: 'Risque en mono' };
  })();

  return (
    <div
      style={{
        padding: 14,
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid #1f1f1f',
        borderRadius: 8,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'rgba(0, 217, 255, 0.1)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
            }}
          >
            📊
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#ccc',
                letterSpacing: '0.5px',
              }}
            >
              CORRELATION METER
            </div>
            <div style={{ fontSize: 8, color: '#666', marginTop: 1 }}>
              Phase L/R (compatibilité mono)
            </div>
          </div>
        </div>

        {/* Valeur actuelle */}
        <div style={{ textAlign: 'right' }}>
          <div
            className="mono"
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: status.color,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {isActive ? currentValue.toFixed(2) : '0.00'}
          </div>
          <div
            style={{
              fontSize: 8,
              color: status.color,
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}
          >
            {isActive ? status.label : 'IDLE'}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 100,
          borderRadius: 6,
          overflow: 'hidden',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid #1f1f1f',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      {/* Légende */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: 8,
          color: '#666',
        }}
      >
        <span style={{ color: '#ff3366' }}>● -1 (Hors phase)</span>
        <span style={{ color: '#ffd43b' }}>● 0 (Stéréo)</span>
        <span style={{ color: '#00ff88' }}>● +1 (Mono)</span>
      </div>

      {isActive && (
        <div
          style={{
            marginTop: 8,
            padding: '6px 10px',
            background: `${status.color}10`,
            border: `1px solid ${status.color}40`,
            borderRadius: 6,
            fontSize: 9,
            color: status.color,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {status.desc}
        </div>
      )}
    </div>
  );
};