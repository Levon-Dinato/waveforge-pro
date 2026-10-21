// src/components/SpectrumVisualizer.tsx
import React, { useEffect, useRef } from 'react';

interface SpectrumVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  height?: number;
  barCount?: number;
  colorByAmplitude?: boolean;
}

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  analyser, 
  isActive, 
  height = 160, 
  barCount = 64, 
  colorByAmplitude = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  // ✅ NOUVEAU : On garde en mémoire la hauteur actuelle de chaque barre
  const heightsRef = useRef<number[]>(new Array(barCount).fill(0));

  useEffect(() => {
    if (!analyser) return;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    // Reset les hauteurs si le barCount change
    heightsRef.current = new Array(barCount).fill(0);
  }, [analyser, barCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderFrame = () => {
      requestRef.current = requestAnimationFrame(renderFrame);
      const width = canvas.width;
      const h = canvas.height;
      
      ctx.clearRect(0, 0, width, h);

      if (!analyser || !dataArrayRef.current || !isActive) return;

      analyser.getByteFrequencyData(dataArrayRef.current);
      const data = dataArrayRef.current;
      
      const sampleRate = analyser.context.sampleRate;
      const nyquist = sampleRate / 2;
      const binCount = analyser.frequencyBinCount;
      
      const barWidth = width / barCount;
      const gap = 2;
      
      const minFreq = 20; 
      const maxFreq = Math.min(20000, nyquist); 

      for (let i = 0; i < barCount; i++) {
        const percent = i / barCount;
        const freq = minFreq * Math.pow(maxFreq / minFreq, percent);
        const binIndex = Math.floor(freq / nyquist * binCount);
        
        let value = data[Math.min(binIndex, binCount - 1)] || 0;
        value = Math.pow(value / 255, 1.2) * 255;

        // Hauteur cible calculée
        const targetHeight = Math.max(2, (value / 255) * h);
        
        // ✅ INERTIE : On calcule la hauteur actuelle de la barre
        const currentHeight = heightsRef.current[i];
        
        // Si le son monte, on monte vite (0.4). Si le son descend, on descend doucement (0.08)
        const smoothing = targetHeight > currentHeight ? 0.4 : 0.08;
        const nextHeight = currentHeight + (targetHeight - currentHeight) * smoothing;
        
        // On sauvegarde la nouvelle hauteur pour l'image suivante
        heightsRef.current[i] = nextHeight;

        const x = i * barWidth;
        const y = h - nextHeight;

        if (colorByAmplitude) {
          if (nextHeight > h * 0.85) ctx.fillStyle = '#ff3366';
          else if (nextHeight > h * 0.6) ctx.fillStyle = '#ffd43b';
          else ctx.fillStyle = '#00ff88';
        } else {
          ctx.fillStyle = '#00d9ff';
        }

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth - gap, nextHeight, [2, 2, 0, 0]);
        } else {
          ctx.rect(x, y, barWidth - gap, nextHeight);
        }
        ctx.fill();
      }
    };

    requestRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, isActive, barCount, colorByAmplitude]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = height;
      }
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, [height]);

  return (
    <div style={{ width: '100%', height, position: 'relative' }} className="studio-grid">
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};