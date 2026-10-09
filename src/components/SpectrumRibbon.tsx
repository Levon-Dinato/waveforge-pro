// src/components/SpectrumRibbon.tsx
import React, { useRef, useEffect } from 'react';

interface SpectrumRibbonProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  height?: number;
  style?: React.CSSProperties;
  lineCount?: number;
  pointCount?: number;
}

export const SpectrumRibbon: React.FC<SpectrumRibbonProps> = ({
  analyser,
  isActive,
  height = 220,
  style,
  lineCount = 40,
  pointCount = 160,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const smoothDataRef = useRef<number[]>(new Array(pointCount).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const midY = h / 2;
    const maxAmplitude = h * 0.42;

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    // Palette : rouge → orange → jaune → vert → cyan → bleu → violet
    const getColorAtPosition = (position: number, alpha: number): string => {
      // Position : 0 (gauche/rouge) → 1 (droite/violet)
      // Hue : 0° (rouge) → 280° (violet)
      const hue = position * 280;
      const saturation = 95;
      const lightness = 60;
      return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    };

    // ============================================================
    // ÉTAT AU REPOS
    // ============================================================
    const drawIdle = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';
      for (let line = 0; line < lineCount; line += 4) {
        const depth = line / (lineCount - 1);
        const alpha = 0.1 + depth * 0.1;

        const lineGradient = ctx.createLinearGradient(0, 0, w, 0);
        for (let k = 0; k <= 8; k++) {
          lineGradient.addColorStop(k / 8, getColorAtPosition(k / 8, alpha));
        }
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = 0.5;

        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(w, midY);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    // ============================================================
    // ÉTAT ACTIF
    // ============================================================
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      // Fond noir pur
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      if (!analyser || !dataArray) return;

      analyser.getByteFrequencyData(dataArray);

      // --- Échantillonnage avec échelle logarithmique ---
      // On prend seulement les 60% des bins (les aigus hauts sont vides)
      const usableBins = Math.floor(dataArray.length * 0.6);
      const samples: number[] = [];

      for (let i = 0; i < pointCount; i++) {
        // Position normalisée 0 → 1
        const t = i / (pointCount - 1);

        // Échelle logarithmique : on étale les basses fréquences
        // (comme l'oreille humaine, qui entend en log)
        const logPos = Math.pow(t, 1.6);
        const binIndex = Math.floor(logPos * usableBins);

        // Moyenne sur 3 bins pour stabiliser
        const idx0 = Math.max(0, binIndex - 1);
        const idx1 = Math.min(dataArray.length - 1, binIndex);
        const idx2 = Math.min(dataArray.length - 1, binIndex + 1);

        const avg = (dataArray[idx0] + dataArray[idx1] + dataArray[idx2]) / 3 / 255;

        // Amplification
        const amplification = 1.8;
        const value = Math.min(1, avg * amplification);

        // Lissage temporel
        const prev = smoothDataRef.current[i] || 0;
        const smooth = value > prev
          ? value * 0.6 + prev * 0.4
          : prev * 0.85 + value * 0.15;

        smoothDataRef.current[i] = smooth;
        samples.push(smooth);
      }

      // --- Lissage spatial par convolution gaussienne ---
      const envelope: number[] = [];
      for (let i = 0; i < pointCount; i++) {
        let sum = 0;
        let weight = 0;
        for (let k = -10; k <= 10; k++) {
          const idx = i + k;
          if (idx < 0 || idx >= pointCount) continue;
          const w_k = Math.exp(-(k * k) / 40);
          sum += samples[idx] * w_k;
          weight += w_k;
        }
        envelope.push(sum / weight);
      }

      // --- Application d'une courbe de "respiration" ---
      // Les extrémités sont légèrement réduites pour donner l'effet "diamant"
      const shaped = envelope.map((v, i) => {
        const t = i / (pointCount - 1);
        // Facteur : 0.4 au bord, 1.0 au centre
        const edgeFactor = 0.4 + Math.sin(t * Math.PI) * 0.6;
        return v * edgeFactor;
      });

      ctx.globalCompositeOperation = 'lighter';

      // ============================================================
      // DESSIN DES LIGNES DU MESH
      // ============================================================
      for (let line = 0; line < lineCount; line++) {
        const depth = line / (lineCount - 1);

        // Amplitude de la ligne (les lignes externes suivent plus le signal)
        const lineAmplitude = maxAmplitude * (0.15 + depth * 0.85);

        // Alpha
        const alpha = 0.08 + depth * 0.65;

        // Épaisseur
        const lineWidth = 0.3 + depth * 0.6;

        // Glow
        const glowIntensity = depth * 6;

        // --- Ligne SUPÉRIEURE ---
        ctx.beginPath();
        for (let i = 0; i < pointCount; i++) {
          const x = (i / (pointCount - 1)) * w;
          const y = midY - shaped[i] * lineAmplitude;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const lineGradient = ctx.createLinearGradient(0, 0, w, 0);
        for (let k = 0; k <= 8; k++) {
          lineGradient.addColorStop(k / 8, getColorAtPosition(k / 8, alpha));
        }
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = lineWidth;
        ctx.shadowBlur = glowIntensity;
        ctx.shadowColor = `hsla(${depth * 280}, 95%, 65%, ${depth * 0.5})`;
        ctx.stroke();

        // --- Ligne INFÉRIEURE (miroir) ---
        ctx.beginPath();
        for (let i = 0; i < pointCount; i++) {
          const x = (i / (pointCount - 1)) * w;
          const y = midY + shaped[i] * lineAmplitude;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // ============================================================
      // LIGNE CENTRALE LUMINEUSE (noyau)
      // ============================================================
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      const centerGrad = ctx.createLinearGradient(0, 0, w, 0);
      for (let k = 0; k <= 8; k++) {
        centerGrad.addColorStop(k / 8, getColorAtPosition(k / 8, 0.5));
      }
      ctx.strokeStyle = centerGrad;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;
    };

    if (isActive) {
      draw();
    } else {
      drawIdle();
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isActive, lineCount, pointCount]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #1a1a2e',
        background: '#000000',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {!isActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: '#444',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '2px',
            pointerEvents: 'none',
          }}
        >
          ▶ EN ATTENTE DE LECTURE
        </div>
      )}
    </div>
  );
};