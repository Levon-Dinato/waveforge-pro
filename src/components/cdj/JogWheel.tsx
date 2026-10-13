// src/components/cdj/JogWheel.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface JogWheelProps {
  size?: number;
  isPlaying: boolean;
  onScratch?: (delta: number) => void;
  onBend?: (delta: number) => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
  vinylMode?: boolean;
  color?: string;
}

export const JogWheel: React.FC<JogWheelProps> = ({
  size = 240,
  isPlaying,
  onScratch,
  onBend,
  onTouchStart,
  onTouchEnd,
  vinylMode = true,
  color = '#00d9ff',
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const lastAngleRef = useRef(0);
  const velocityRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const isTouchingTopRef = useRef(false);

  // Animation rotation auto quand ça joue
  useEffect(() => {
    if (!isPlaying || isDragging) return;
    let last = performance.now();
    const spin = (now: number) => {
      const dt = now - last;
      last = now;
      setRotation((r) => r + dt * 0.18);
      rafRef.current = requestAnimationFrame(spin);
    };
    rafRef.current = requestAnimationFrame(spin);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, isDragging]);

  // Inertie après scratch
  useEffect(() => {
    if (isDragging) return;
    const decay = () => {
      if (Math.abs(velocityRef.current) < 0.01) {
        velocityRef.current = 0;
        return;
      }
      setRotation((r) => r + velocityRef.current);
      velocityRef.current *= 0.95;
      rafRef.current = requestAnimationFrame(decay);
    };
    if (velocityRef.current !== 0) {
      rafRef.current = requestAnimationFrame(decay);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isDragging]);

  const getAngle = (clientX: number, clientY: number): number => {
    const wheel = wheelRef.current;
    if (!wheel) return 0;
    const rect = wheel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const getDistance = (clientX: number, clientY: number): number => {
    const wheel = wheelRef.current;
    if (!wheel) return 0;
    const rect = wheel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.sqrt((clientX - cx) ** 2 + (clientY - cy) ** 2);
  };

  // Mouse down
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const angle = getAngle(e.clientX, e.clientY);
    const dist = getDistance(e.clientX, e.clientY);
    const radius = size / 2;
    const isTopRing = dist > radius * 0.55 && dist < radius;

    lastAngleRef.current = angle;
    isTouchingTopRef.current = isTopRing;

    if (vinylMode && isTopRing) {
      setIsDragging(true);
      onTouchStart?.();
    } else if (isTopRing) {
      setIsDragging(true);
    }
  };

  // Mouse move handler stable
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const angle = getAngle(e.clientX, e.clientY);
      let delta = angle - lastAngleRef.current;

      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastAngleRef.current = angle;

      setRotation((r) => r + delta);
      velocityRef.current = delta * 0.6;

      if (vinylMode && isTouchingTopRef.current) {
        onScratch?.(delta);
      } else {
        onBend?.(delta);
      }
    },
    [isDragging, vinylMode, onScratch, onBend]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (vinylMode && isTouchingTopRef.current) {
      onTouchEnd?.();
    }
    isTouchingTopRef.current = false;
  }, [isDragging, vinylMode, onTouchEnd]);

  // Listeners globaux
  useEffect(() => {
    if (!isDragging) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      {/* Anneau extérieur */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 30% 30%, #4a4a4a 0%, #1a1a1a 60%, #0a0a0a 100%)',
          boxShadow: `
            inset 0 0 40px rgba(0,0,0,0.9),
            inset 0 0 10px rgba(255,255,255,0.05),
            0 8px 24px rgba(0,0,0,0.6),
            0 0 60px ${color}22
          `,
        }}
      />

      {/* Jog wheel rotatif */}
      <div
        ref={wheelRef}
        onMouseDown={handleMouseDown}
        style={{
          width: '88%',
          height: '88%',
          borderRadius: '50%',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : vinylMode ? 'grab' : 'pointer',
          transform: `rotate(${rotation}deg)`,
          transition: isDragging ? 'none' : 'transform 0.05s linear',
          background:
            'radial-gradient(circle at 50% 50%, #2a2a2a 0%, #1a1a1a 40%, #0d0d0d 100%)',
          boxShadow: isDragging
            ? `inset 0 0 60px rgba(0,0,0,0.95), 0 0 30px ${color}66`
            : `inset 0 0 40px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Cercles gravés */}
        <div
          style={{
            position: 'absolute',
            inset: '10%',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '20%',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        />

        {/* Marker */}
        <div
          style={{
            position: 'absolute',
            top: '8%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 3,
            height: 18,
            background: color,
            borderRadius: 2,
            boxShadow: `0 0 8px ${color}`,
          }}
        />

        {/* Center cap */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '38%',
            height: '38%',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 40% 40%, #333 0%, #1a1a1a 70%, #0a0a0a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isPlaying ? color : '#333',
              boxShadow: isPlaying ? `0 0 12px ${color}` : 'none',
              transition: 'all 0.2s',
            }}
          />
        </div>

        {/* Zones tactiles */}
        {[0, 90, 180, 270].map((deg) => (
          <div
            key={deg}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '40%',
              height: '2px',
              background: 'rgba(255,255,255,0.03)',
              transformOrigin: '0 50%',
              transform: `rotate(${deg}deg)`,
            }}
          />
        ))}
      </div>

      {/* LED mode */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 8,
          color: vinylMode ? color : '#444',
          letterSpacing: '1px',
          fontFamily: 'monospace',
          fontWeight: 700,
        }}
      >
        {vinylMode ? 'VINYL' : 'CDJ'}
      </div>
    </div>
  );
};