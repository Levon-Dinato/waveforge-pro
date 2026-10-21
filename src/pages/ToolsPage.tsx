// src/pages/ToolsPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const TOOLS = [
  {
    path: '/cdj',
    title: 'DJ Auto CUE',
    desc: 'Prépare tes sets, analyse les BPM et exporte tes pistes pour tes platines.',
    icon: '🎧',
    color: '#00d9ff'
  },
  {
    path: '/mastering',
    title: 'Mastering',
    desc: 'Donne de la puissance à tes morceaux avec notre chaîne de mastering pro.',
    icon: '🎛️',
    color: '#ff3366'
  },
  {
    path: '/studio',
    title: 'Studio Audio → MIDI',
    desc: 'Crée, édite et remixe tes morceaux avec notre station de travail audio intégrée.',
    icon: '🎹',
    color: '#7c5cff'
  }
];

export const ToolsPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 20px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      
      {/* En-tête minimaliste */}
      <div style={{ marginBottom: 48, textAlign: 'left', borderBottom: '1px solid #2a2a2a', paddingBottom: 24 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
          OUTILS <span style={{ color: '#00d9ff' }}>DJ</span>
        </h1>
        <p style={{ color: '#999', fontSize: '0.9rem', margin: 0 }}>
          Ta suite de production. Crée, mixe et masterise.
        </p>
      </div>

      {/* Grille d'outils */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: 16 
      }}>
        {TOOLS.map((tool) => (
          <Link 
            key={tool.path} 
            to={tool.path}
            style={{ textDecoration: 'none' }}
          >
            <div style={{ 
              background: '#1c1c1c', 
              border: '1px solid #2a2a2a', 
              borderRadius: 8, 
              padding: 20,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = tool.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#2a2a2a';
            }}
            >
              <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 8, 
                background: '#121212', 
                border: `1px solid #2a2a2a`, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: 20,
                marginBottom: 16,
              }}>
                {tool.icon}
              </div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>
                {tool.title}
              </h2>
              <p style={{ color: '#999', fontSize: '0.8rem', lineHeight: 1.5, margin: 0, flex: 1 }}>
                {tool.desc}
              </p>
              <div style={{ 
                marginTop: 20, 
                color: '#666', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 4,
                transition: 'color 0.2s ease'
              }}
              className="tool-link-text"
              >
                Lancer l'outil <span>→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Petit effet hover pour le texte "Lancer l'outil" */}
      <style>{`
        a:hover .tool-link-text {
          color: #00d9ff;
        }
      `}</style>
    </div>
  );
};