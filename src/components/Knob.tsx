import { useRef, useState, useEffect, useCallback } from 'react';

interface KnobProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  unit?: string;
  size?: number;
  color?: string;
  defaultValue?: number;
  onChange: (value: number) => void;
  bipolar?: boolean;  // Pour les valeurs -X à +X (pitch)
  formatValue?: (v: number) => string;
}

export function Knob({
  value,
  min = 0,
  max = 100,
  step = 1,
  label,
  unit = '',
  size = 56,
  color = '#00d9ff',
  defaultValue,
  onChange,
  bipolar = false,
  formatValue,
}: KnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  // Position normalisée (0 à 1)
  const normalized = (value - min) / (max - min);

  // Angle : -135° à +135° (270° total)
  const angle = -135 + normalized * 270;

  // Position du curseur (indicateur)
  const radius = size / 2 - 6;
  const radians = ((angle - 90) * Math.PI) / 180;
  const indicatorX = size / 2 + Math.cos(radians) * radius * 0.7;
  const indicatorY = size / 2 + Math.sin(radians) * radius * 0.7;

  // Arc de progression
  const arcStartAngle = -135;
  const arcEndAngle = -135 + normalized * 270;
  const arcPath = describeArc(size / 2, size / 2, radius, arcStartAngle, arcEndAngle);

  // Pour knob bipolaire (pitch) : on part du centre
  const bipolarArcPath = bipolar
    ? describeArc(
        size / 2,
        size / 2,
        radius,
        -135 + 135,  // centre = 0
        arcEndAngle
      )
    : arcPath;

  // Formatage de la valeur affichée
  const displayValue = formatValue
    ? formatValue(value)
    : `${Math.round(value * 100) / 100}${unit}`;

  // Drag souris
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startY: e.clientY,
      startValue: value,
    };
  }, [value]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaY = dragRef.current.startY - e.clientY;
      const range = max - min;
      const sensitivity = 200; // pixels pour parcourir tout le range
      const deltaValue = (deltaY / sensitivity) * range;
      let newValue = dragRef.current.startValue + deltaValue;

      // Snap au step
      newValue = Math.round(newValue / step) * step;

      // Clamp
      newValue = Math.max(min, Math.min(max, newValue));
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, step, onChange]);

  // Double-clic → reset à la valeur par défaut
  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  };

  // Molette
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -step : step;
    let newValue = value + delta;
    newValue = Math.max(min, Math.min(max, newValue));
    onChange(newValue);
  };

  return (
    <div className="knob-container">
      <div
        ref={knobRef}
        style={{
          width: size,
          height: size,
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <svg width={size} height={size} style={{ transform: 'rotate(0deg)' }}>
          {/* Cercle extérieur */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e1e2a"
            strokeWidth={4}
          />

          {/* Arc de progression */}
          <path
            d={bipolarArcPath}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            style={{
              filter: isHovered || isDragging ? `drop-shadow(0 0 6px ${color})` : 'none',
              transition: 'filter 0.15s ease',
            }}
          />

          {/* Indicateur central */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius * 0.6}
            fill="#0f0f15"
            stroke="#1e1e2a"
            strokeWidth={1}
          />

          {/* Ligne indicateur */}
          <line
            x1={size / 2}
            y1={size / 2}
            x2={indicatorX}
            y2={indicatorY}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            style={{
              filter: isHovered || isDragging ? `drop-shadow(0 0 4px ${color})` : 'none',
            }}
          />
        </svg>
      </div>

      <div className="knob-label">{label}</div>
      <div className="knob-value">{displayValue}</div>
    </div>
  );
}

/**
 * Génère le path SVG d'un arc.
 */
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}