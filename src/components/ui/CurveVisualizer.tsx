// src/components/ui/CurveVisualizer.tsx
import React, { useRef, useEffect, useState } from 'react';

interface CurveVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  height?: number;
  color?: string;
}

export const CurveVisualizer: React.FC<CurveVisualizerProps> = ({ analyser, isActive, height = 150, color = '#00d9ff' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  // On ajoute <ArrayBuffer> ici pour satisfaire TypeScript
  const [dataArray, setDataArray] = useState<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    if (!analyser) return;
    const bufferLength = analyser.frequencyBinCount;
    // On force le type ici aussi
    setDataArray(new Uint8Array(new ArrayBuffer(bufferLength)) as Uint8Array<ArrayBuffer>);
  }, [analyser]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser || !dataArray || !isActive) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      animationRef.current = requestAnimationFrame(render);
      
      // Maintenant TypeScript est content
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      // Dessin de la grille
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (h / 4) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Dessin de la courbe
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;

      const sliceWidth = width / dataArray.length;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 255;
        const y = h - (v * h);
        
        if (i === 0) ctx.moveTo(x, y);
        else {
          const xc = x - sliceWidth / 2;
          const yc = h - (dataArray[i - 1] / 255) * h;
          ctx.quadraticCurveTo(xc, yc, x, y);
        }
        x += sliceWidth;
      }

      // Remplissage sous la courbe
      ctx.lineTo(width, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, `${color}40`);
      gradient.addColorStop(1, `${color}00`);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.stroke();
    };

    render();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, dataArray, isActive, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={height} 
      style={{ width: '100%', height: '100%', display: 'block' }} 
    />
  );
};