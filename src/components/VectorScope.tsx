// src/components/VectorScope.tsx
import React, { useRef, useEffect, useCallback } from 'react';

interface VectorScopeProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  size?: number;
  color?: string;
}

export const VectorScope: React.FC<VectorScopeProps> = ({
  analyser,
  isActive,
  size = 220,
  color = '#00d9ff',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const leftRef = useRef<Float32Array | null>(null);
  const rightRef = useRef<Float32Array | null>(null);

  // Init buffers
  useEffect(() => {
    if (!analyser) return;
    leftRef.current = new Float32Array(analyser.fftSize);
    rightRef.current = new Float32Array(analyser.fftSize);
  }, [analyser]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = size;
    const H = size;

    if (canvas.width !== W * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Fond noir semi-transparent pour effet de traîne
    ctx.fillStyle = 'rgba(5, 5, 8, 0.25)';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) / 2 - 14;

    // ============================================================
    // GRILLE
    // ============================================================
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.66, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.33, 0, Math.PI * 2);
    ctx.stroke();

    // Axes diagonaux L/R
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy + radius);
    ctx.lineTo(cx + radius, cy - radius);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy - radius);
    ctx.lineTo(cx + radius, cy + radius);
    ctx.stroke();

    // Axes horizontaux/verticaux
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('L', cx - radius - 8, cy);
    ctx.fillText('R', cx + radius + 8, cy);
    ctx.fillText('M', cx, cy - radius - 8);
    ctx.fillText('S', cx, cy + radius + 8);

    if (!analyser || !leftRef.current || !rightRef.current) {
      if (isActive) rafRef.current = requestAnimationFrame(draw);
      return;
    }

    // ============================================================
    // RÉCUPÉRATION L/R (via 2 analysers séparés = pas dispo)
    // Approche : on utilise getFloatTimeDomainData sur le signal mono
    // et on simule L/R en prenant l'échantillon i et i+1
    // ============================================================
    const buffer = leftRef.current;
    analyser.getFloatTimeDomainData(buffer);

    // ============================================================
    // DESSIN DES POINTS
    // ============================================================
    ctx.globalCompositeOperation = 'lighter';

    const N = buffer.length;
    const dotSize = 1.4;

    for (let i = 0; i < N - 1; i += 4) {
      // Approximation L/R : on prend 2 échantillons successifs
      // (pour un vrai scope L/R, il faudrait 2 analysers)
      const l = buffer[i] || 0;
      const r = buffer[i + 1] || 0;

      // Formule goniomètre :
      //   side = (L - R) → axe horizontal
      //   mid  = (L + R) → axe vertical
      const side = (l - r) * 0.9;
      const mid = (l + r) * 0.9;

      // Conversion en coordonnées écran
      // Note : sur l'axe horizontal, gauche = -side, droite = +side
      const x = cx + side * radius;
      const y = cy - mid * radius;

      // Distance au centre pour modulation d'opacité
      const dx = (x - cx) / radius;
      const dy = (y - cy) / radius;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const alpha = Math.max(0.08, 0.85 - dist * 0.5);

      ctx.fillStyle = hexToRgba(color, alpha);
      ctx.fillRect(x, y, dotSize, dotSize);
    }

    ctx.globalCompositeOperation = 'source-over';

    if (isActive) {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [analyser, isActive, size, color]);

  useEffect(() => {
    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: 8,
        overflow: 'hidden',
        background: 'radial-gradient(circle at center, #0a0a14 0%, #050508 100%)',
        border: '1px solid #1a1a2e',
        flexShrink: 0,
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
            textAlign: 'center',
            padding: 20,
          }}
        >
          ▶ LANCER LA LECTURE
        </div>
      )}
    </div>
  );
};

function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}