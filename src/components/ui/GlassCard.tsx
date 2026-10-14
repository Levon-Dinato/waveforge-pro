import React, { type ReactNode, type CSSProperties } from 'react';

interface GlassCardProps {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  borderColor?: string;
  padding?: number | string;
  glow?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  className,
  borderColor,
  padding,
  glow,
  onClick,
}) => {
  const glowColor = glow || 'rgba(0, 217, 255, 0)';

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${borderColor || 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: 14,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: glow ? `0 0 24px ${glowColor}33, inset 0 1px 0 rgba(255,255,255,0.05)` : undefined,
        padding: padding !== undefined ? padding : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};