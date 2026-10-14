// src/components/ui/SectionTitle.tsx
import React from 'react';

interface SectionTitleProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  icon,
  title,
  subtitle,
  action,
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
      gap: 12,
      flexWrap: 'wrap',
    }}
  >
    <div>
      <div
        style={{
          fontSize: 10,
          color: 'rgba(255, 255, 255, 0.4)',
          letterSpacing: '1.8px',
          fontWeight: 800,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
        <span>{title}</span>
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.5)',
            marginTop: 6,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
    {action}
  </div>
);