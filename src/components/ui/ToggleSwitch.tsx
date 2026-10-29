// src/components/ui/ToggleSwitch.tsx
import React from 'react';

interface ToggleSwitchProps {
  isActive: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ isActive, onClick, label, color = '#00d9ff' }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: `1px solid ${isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'}`,
        padding: '8px 16px',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.2s',
        outline: 'none',
      }}
    >
      <div style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: isActive ? color : '#222',
        boxShadow: isActive ? `0 0 10px ${color}, 0 0 4px ${color}` : 'inset 0 2px 4px rgba(0,0,0,0.5)',
        transition: 'all 0.2s',
      }} />
      <span style={{ 
        fontSize: 11, 
        fontWeight: 800, 
        color: isActive ? '#fff' : '#666', 
        textTransform: 'uppercase', 
        letterSpacing: '1px' 
      }}>
        {label}
      </span>
    </button>
  );
};