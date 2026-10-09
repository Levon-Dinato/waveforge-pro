// src/layouts/MainLayout.tsx
import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { VideoBackground } from '../components/VideoBackground';
import { VUMeter } from '../components/VUMeter';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/',          label: 'Accueil',     icon: '🏠', color: '#888' },
  { path: '/studio',    label: 'Studio',      icon: '🎹', color: '#00d9ff' },
  { path: '/stems',     label: 'Stems',       icon: '🎤', color: '#00ff88' },
  { path: '/mastering', label: 'Mastering',   icon: '🎚️', color: '#00d9ff' },
  { path: '/remix',     label: 'Remix AI',    icon: '🎛️', color: '#ff5cf0' },
  { path: '/generator', label: 'Générateur',  icon: '🎼', color: '#ffd43b' },
  { path: '/settings',  label: 'Réglages',    icon: '⚙️', color: '#888' },
];

export const MainLayout: React.FC = () => {
  const engine = useAudioEngineContext();

  return (
    <>
      <VideoBackground />

      <div
        className="studio-grid"
        style={{
          minHeight: '100vh',
          padding: 20,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'flex',
            gap: 20,
          }}
        >
          {/* === SIDEBAR === */}
          <aside
            style={{
              width: 220,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                paddingBottom: 16,
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  boxShadow: '0 0 20px rgba(0, 217, 255, 0.4)',
                }}
              >
                🎹
              </div>
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    color: '#fff',
                  }}
                >
                  WAVEFORGE{' '}
                  <span style={{ color: 'var(--cyan)', fontWeight: 300 }}>
                    PRO
                  </span>
                </h1>
                <p
                  className="label-uppercase"
                  style={{ margin: 0, fontSize: 8, color: '#666' }}
                >
                  Audio → MIDI Studio
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  style={({ isActive }: { isActive: boolean }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 6,
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? item.color : '#888',
                    background: isActive
                      ? `rgba(${hexToRgb(item.color)}, 0.1)`
                      : 'transparent',
                    border: isActive
                      ? `1px solid ${item.color}`
                      : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  })}
                >
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* VU Mètre en bas de la sidebar */}
            <div style={{ marginTop: 'auto', paddingTop: 16 }}>
              <div
                className="label-uppercase"
                style={{ fontSize: 8, color: '#444', marginBottom: 8 }}
              >
                Sortie Audio
              </div>
              <VUMeter
                audioBuffer={engine.audioBuffer}
                isPlaying={engine.isPlaying}
                currentTime={engine.currentTime}
              />
            </div>
          </aside>

          {/* === CONTENU PRINCIPAL === */}
          <main
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Outlet />
          </main>
        </div>

        <footer
          style={{
            marginTop: 32,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
            textAlign: 'center',
            fontSize: 10,
            color: '#555',
            letterSpacing: '0.05em',
            maxWidth: 1400,
            margin: '32px auto 0',
          }}
        >
          WAVEFORGE PRO · YIN · TONE.JS · DEMUCS · BASIC PITCH · v1.0
        </footer>
      </div>
    </>
  );
};

/**
 * Convertit un code hex (#RRGGBB) en "R, G, B" pour rgba()
 */
function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}