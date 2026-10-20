// src/components/BadgeList.tsx
import React from 'react';

interface BadgeListProps {
  badges: string[];
}

const BADGE_CONFIG: Record<string, { label: string; icon: string; color: string; description: string }> = {
  first_upload: { 
    label: 'Premier son', 
    icon: '🎵', 
    color: '#00d9ff', 
    description: 'A uploadé son premier morceau' 
  },
  producer: { 
    label: 'Producteur', 
    icon: '🎹', 
    color: '#7c5cff', 
    description: 'A uploadé 10 morceaux ou plus' 
  },
  popular: { 
    label: 'Populaire', 
    icon: '🔥', 
    color: '#ff3366', 
    description: 'A reçu 100 likes ou plus' 
  },
  live_dj: { 
    label: 'Live DJ', 
    icon: '🔴', 
    color: '#ff3366', 
    description: 'A diffusé un live' 
  },
  party_organizer: { 
    label: 'Organisateur', 
    icon: '📅', 
    color: '#ffd43b', 
    description: 'A créé un événement' 
  },
};

export const BadgeList: React.FC<BadgeListProps> = ({ badges }) => {
  if (!badges || badges.length === 0) {
    return (
      <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
        Aucun badge pour le moment.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {badges.map((badgeKey) => {
        const config = BADGE_CONFIG[badgeKey];
        if (!config) return null;
        
        return (
          <div
            key={badgeKey}
            title={config.description}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: `${config.color}15`,
              border: `1px solid ${config.color}40`,
              borderRadius: 20,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: config.color,
              cursor: 'help',
            }}
          >
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </div>
        );
      })}
    </div>
  );
};