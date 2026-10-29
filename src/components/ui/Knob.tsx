// src/components/ui/Knob.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';

interface KnobProps {
  value: number; // 0 à 100
  onChange: (value: number) => void;
  label: string;
  color?: string;
  size?: number;
}

export const Knob: React.FC<KnobProps> = ({ value, onChange, label, color = '#00d9ff', size = 100 }) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // On garde en mémoire la position de départ de la souris et la valeur de départ
  const dragRef = useRef({ startY: 0, startValue: 0 });

  const angle = -135 + (value / 100) * 270;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = { startY: e.clientY, startValue: value };
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    // Molette : on ajuste par pas de 1% pour être très précis
    const step = e.deltaY > 0 ? -1 : 1;
    onChange(Math.max(0, Math.min(100, value + step)));
  }, [value, onChange]);

  useEffect(() => {
    const el = knobRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // On calcule la différence de position verticale (Y)
      const deltaY = dragRef.current.startY - e.clientY;
      
      // On ajuste la sensibilité (ici, 150 pixels de mouvement = 100%)
      const sensitivity = 150; 
      const valueChange = (deltaY / sensitivity) * 100;
      
      const newValue = Math.max(0, Math.min(100, dragRef.current.startValue + valueChange));
      onChange(Math.round(newValue));
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onChange]);

  const circumference = 2 * Math.PI * (size / 2 - 6);
  const offset = circumference - (value / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 10px 20px rgba(0,0,0,0.5)',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.05)',
          userSelect: 'none',
        }}
      >
        <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(135deg)' }} width={size} height={size}>
          <circle
            cx={size / 2} cy={size / 2} r={size / 2 - 6}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.25}
          />
          <circle
            cx={size / 2} cy={size / 2} r={size / 2 - 6}
            fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${color})`, transition: isDragging ? 'none' : 'stroke-dashoffset 0.2s ease-out' }}
          />
        </svg>

        <div style={{
          width: size * 0.65,
          height: size * 0.65,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #222, #111)',
          boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.05), 0 5px 15px rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{
            width: 3, height: size * 0.25,
            background: color,
            borderRadius: 2,
            position: 'absolute',
            top: size * 0.08,
            transformOrigin: 'bottom center',
            transform: `rotate(${angle}deg)`,
            boxShadow: `0 0 8px ${color}`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }} />
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: '#666', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
        <div style={{ fontSize: 14, color: '#fff', fontWeight: 900, fontFamily: 'monospace', marginTop: 2 }}>{Math.round(value)}%</div>
      </div>
    </div>
  );
};