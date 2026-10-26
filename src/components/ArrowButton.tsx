// src/components/ArrowButton.tsx
import React, { useState } from 'react';

interface ArrowButtonProps {
  label: string;
  icon?: React.ReactNode;
  color: string;
  href?: string;
  onClick?: () => void;
  variant?: 'solid' | 'outline';
}

export const ArrowButton: React.FC<ArrowButtonProps> = ({ 
  label, icon, color, href, onClick, variant = 'solid' 
}) => {
  const [hovered, setHovered] = useState(false);
  const isOutline = variant === 'outline';

  const content = (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 20px', // Plus petit
        background: isOutline ? 'rgba(255,255,255,0.03)' : color,
        color: isOutline ? '#fff' : '#000',
        fontWeight: 700,
        fontSize: 11, // Texte plus petit
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        cursor: 'pointer',
        borderRadius: '6px', // Angles légèrement arrondis, pas de capsule
        border: isOutline ? `1px solid rgba(255,255,255,0.15)` : '1px solid transparent',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hovered 
          ? (isOutline ? '0 4px 12px rgba(0,0,0,0.3)' : `0 6px 15px -5px ${color}60`) 
          : 'none',
      }}
    >
      {/* Effet de brillance au survol */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: hovered ? '100%' : '-100%',
        width: '50%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        transform: 'skewX(-25deg)',
        transition: 'left 0.5s ease',
        zIndex: 1,
      }} />

      {/* Contenu */}
      <span style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon && <span style={{ display: 'flex', alignItems: 'center', opacity: isOutline ? 1 : 0.8 }}>{icon}</span>}
        {label}
      </span>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'inline-block' }}>
        {content}
      </a>
    );
  }

  return <div onClick={onClick} style={{ display: 'inline-block' }}>{content}</div>;
};