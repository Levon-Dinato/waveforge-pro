// src/pages/ToolsPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext'; // ✅ IMPORT DU THEME

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
  },
  {
    path: '/mixer',
    title: 'Console Mixer Pro',
    desc: 'Mixe tes morceaux en direct avec nos deux platines virtuelles, EQ et crossfader.',
    icon: '🎚️',
    color: '#00ff9d'
  },
];

export const ToolsPage: React.FC = () => {
  // ✅ RÉCUPÉRATION DU THÈME
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // ✅ PALETTE DE COULEURS DYNAMIQUES
  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7',
    panelBg: isDark ? '#1c1c1c' : '#ffffff',
    iconBg: isDark ? '#121212' : '#f3f4f6',
    border: isDark ? '#2a2a2a' : '#e5e7eb',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#999999' : '#666666',
    textLight: isDark ? '#666666' : '#888888',
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 20px', color: colors.textMain, fontFamily: 'Inter, sans-serif', background: colors.bg, minHeight: '100vh', transition: 'background 0.3s ease, color 0.3s ease' }}>
      
      {/* En-tête minimaliste */}
      <div style={{ marginBottom: 48, textAlign: 'left', borderBottom: `1px solid ${colors.border}`, paddingBottom: 24 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px', color: colors.textMain }}>
          OUTILS <span style={{ color: '#00d9ff' }}>DJ</span>
        </h1>
        <p style={{ color: colors.textMuted, fontSize: '0.9rem', margin: 0 }}>
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
              background: colors.panelBg,
              border: `1px solid ${colors.border}`,
              borderRadius: 8, 
              padding: 20,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              boxShadow: isDark ? 'none' : '0 4px 15px rgba(0,0,0,0.03)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = tool.color;
              e.currentTarget.style.boxShadow = isDark ? `0 4px 20px ${tool.color}20` : `0 10px 25px ${tool.color}30`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.boxShadow = isDark ? 'none' : '0 4px 15px rgba(0,0,0,0.03)';
            }}
            >
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 10, 
                background: colors.iconBg,
                border: `1px solid ${colors.border}`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: 24,
                marginBottom: 16,
              }}>
                {tool.icon}
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0', color: colors.textMain }}>
                {tool.title}
              </h2>
              <p style={{ color: colors.textMuted, fontSize: '0.85rem', lineHeight: 1.5, margin: 0, flex: 1 }}>
                {tool.desc}
              </p>
              <div style={{ 
                marginTop: 20, 
                color: colors.textLight,
                fontSize: '0.8rem', 
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