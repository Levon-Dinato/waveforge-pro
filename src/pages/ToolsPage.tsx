// src/pages/ToolsPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const TOOLS = [
  {
    path: '/cdj',
    title: 'DJ Prep',
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
    // ✅ Lien vers ton Studio de production / Remix
    // Si ton lien est /mixer ou /remix, change juste le path ici !
    path: '/studio', 
    title: 'Studio / Remix',
    desc: 'Crée, édite et remixe tes morceaux avec notre station de travail audio intégrée.',
    icon: '🎚️',
    color: '#7c5cff'
  }
];

export const ToolsPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      
      {/* En-tête */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 10px 0' }}>
          Outils <span style={{ color: '#00d9ff' }}>DJ</span>
        </h1>
        <p style={{ color: '#999', fontSize: '1rem', margin: 0 }}>
          Ta suite de production complète. Tout ce dont tu as besoin pour créer, mixer et masteriser.
        </p>
      </div>

      {/* Grille d'outils */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: 20 
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
              borderRadius: 12, 
              padding: 24,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = tool.color;
              e.currentTarget.style.boxShadow = `0 10px 30px ${tool.color}15`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#2a2a2a';
              e.currentTarget.style.boxShadow = 'none';
            }}
            >
              <div style={{ 
                width: 50, 
                height: 50, 
                borderRadius: 12, 
                background: `${tool.color}15`, 
                border: `1px solid ${tool.color}40`, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: 24,
                marginBottom: 20,
                color: tool.color
              }}>
                {tool.icon}
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 10px 0', color: '#fff' }}>
                {tool.title}
              </h2>
              <p style={{ color: '#999', fontSize: '0.85rem', lineHeight: 1.5, margin: 0, flex: 1 }}>
                {tool.desc}
              </p>
              <div style={{ 
                marginTop: 20, 
                color: tool.color, 
                fontSize: '0.8rem', 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6 
              }}>
                Lancer l'outil <span>→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};