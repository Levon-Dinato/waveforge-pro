// src/layouts/MainLayout.tsx
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VideoBackground } from '../components/VideoBackground';
import { VUMeter } from '../components/VUMeter';
import { SessionPanel } from '../components/SessionPanel';
import { InstallButton } from '../components/InstallButton';
import { GlobalPlayer } from '../components/GlobalPlayer';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

interface NavItem {
  path: string;
  labelKey: string;
  shortLabelKey: string;
  icon: string;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/',           labelKey: 'nav.home',        shortLabelKey: 'nav.home',        icon: '🏠', color: '#888' },
  { path: '/nouveautes', labelKey: 'nav.nouveautes',  shortLabelKey: 'nav.nouveautes',  icon: '🔥', color: '#ff8c00' },
  { path: '/genres',     labelKey: 'nav.genres',      shortLabelKey: 'nav.genres',      icon: '🎵', color: '#e50000' },
  { path: '/artists',    labelKey: 'nav.artists',     shortLabelKey: 'nav.artists',     icon: '🎤', color: '#00d9ff' },
  { path: '/mixer',      labelKey: 'nav.mixer',       shortLabelKey: 'nav.mixer',       icon: '🎛️', color: '#ff5cf0' },
  { path: '/studio',     labelKey: 'nav.studio',      shortLabelKey: 'nav.studio',      icon: '🎹', color: '#00d9ff' },
  { path: '/stems',      labelKey: 'nav.stems',       shortLabelKey: 'nav.stems',       icon: '🎤', color: '#00ff88' },
  { path: '/mastering',  labelKey: 'nav.mastering',   shortLabelKey: 'nav.mastering',   icon: '🎚️', color: '#7c5cff' },
  { path: '/generator',  labelKey: 'nav.generator',   shortLabelKey: 'nav.generator',   icon: '🎼', color: '#ffd43b' },
  { path: '/musicgen',   labelKey: 'nav.musicgen',    shortLabelKey: 'nav.musicgen',    icon: '🎵', color: '#00ff88' },
  { path: '/video',      labelKey: 'nav.video',       shortLabelKey: 'nav.video',       icon: '🎬', color: '#ff5cf0' },
  { path: '/cdj',        labelKey: 'nav.cdj',         shortLabelKey: 'nav.cdj',         icon: '🎛️', color: '#00d9ff' },
  { path: '/help',       labelKey: 'nav.help',        shortLabelKey: 'nav.help',        icon: '📖', color: '#00d9ff' },
  { path: '/settings',   labelKey: 'nav.settings',    shortLabelKey: 'nav.settings',    icon: '⚙️', color: '#888' },
];

export const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const engine = useAudioEngineContext();
  const { user, username, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const [showSessions, setShowSessions] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ============================================================
  // VERSION MOBILE
  // ============================================================
  if (isMobile) {
    return (
      <>
        <VideoBackground />
        <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
          
          {/* HEADER MOBILE */}
          <header style={{ 
            padding: '14px 16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
            background: 'rgba(10, 10, 15, 0.7)', 
            backdropFilter: 'blur(16px)', 
            WebkitBackdropFilter: 'blur(16px)', 
            position: 'sticky', 
            top: 0, 
            zIndex: 50 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#fff', 
                  fontSize: 22, 
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                ☰
              </button>
              <div style={{ 
                width: 32, 
                height: 32, 
                borderRadius: 10, 
                background: 'linear-gradient(135deg, #00d9ff, #0088ff)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: 16, 
                boxShadow: '0 0 16px rgba(0, 217, 255, 0.5)' 
              }}>
                🎹
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
                WAVEFORGE <span style={{ color: '#00d9ff' }}>PRO</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LanguageSwitcher />
              {user ? (
                <NavLink to={`/profil/${user.id}`} style={{ padding: '8px 12px', background: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.3)', borderRadius: 10, color: '#00d9ff', fontSize: 11, fontWeight: 700, textDecoration: 'none', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🎧 {username}
                </NavLink>
              ) : (
                <NavLink to="/auth" style={{ padding: '8px 12px', background: 'rgba(0, 217, 255, 0.15)', border: '1px solid rgba(0, 217, 255, 0.4)', borderRadius: 10, color: '#00d9ff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>🔐</NavLink>
              )}
            </div>
          </header>

          {/* MENU MOBILE (drawer) */}
          {sidebarOpen && (
            <>
              <div 
                onClick={() => setSidebarOpen(false)}
                style={{ 
                  position: 'fixed', 
                  inset: 0, 
                  background: 'rgba(0,0,0,0.7)', 
                  zIndex: 98 
                }} 
              />
              <aside style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                height: '100vh',
                width: '280px',
                background: 'rgba(20, 22, 30, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                zIndex: 99,
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Menu</div>
                  <button 
                    onClick={() => setSidebarOpen(false)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}
                  >
                    ×
                  </button>
                </div>
                {NAV_ITEMS.map((item) => (
                  <NavLink 
                    key={item.path} 
                    to={item.path} 
                    end={item.path === '/'} 
                    onClick={() => setSidebarOpen(false)}
                    style={({ isActive }) => ({ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 12, 
                      padding: '10px 14px', 
                      borderRadius: 10, 
                      textDecoration: 'none', 
                      fontSize: 14,
                      fontWeight: 600,
                      background: isActive ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
                      color: isActive ? '#00d9ff' : 'rgba(255,255,255,0.7)',
                      border: isActive ? '1px solid rgba(0, 217, 255, 0.2)' : '1px solid transparent'
                    })}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </aside>
            </>
          )}

          {/* CONTENU PRINCIPAL MOBILE */}
          <main style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '16px 12px' }}>
            <Outlet />
          </main>

          {/* NAV BOTTOM MOBILE */}
          <nav style={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            background: 'rgba(10, 10, 15, 0.85)', 
            backdropFilter: 'blur(20px)', 
            WebkitBackdropFilter: 'blur(20px)', 
            borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
            display: 'flex', 
            justifyContent: 'space-around', 
            alignItems: 'center', 
            padding: '8px 6px', 
            zIndex: 100, 
            paddingBottom: 'max(8px, env(safe-area-inset-bottom))', 
            overflowX: 'auto', 
            gap: 2 
          }}>
            {NAV_ITEMS.slice(0, 5).map((item) => (
              <NavLink 
                key={item.path} 
                to={item.path} 
                end={item.path === '/'} 
                style={({ isActive }) => ({ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 3, 
                  padding: '8px 6px', 
                  borderRadius: 10, 
                  textDecoration: 'none', 
                  flex: '0 0 auto', 
                  minWidth: 60,
                  background: isActive ? `linear-gradient(180deg, ${item.color}20, ${item.color}05)` : 'transparent',
                  border: isActive ? `1px solid ${item.color}50` : '1px solid transparent'
                })}
              >
                {({ isActive }) => (
                  <>
                    <span style={{ fontSize: 18, filter: isActive ? `drop-shadow(0 0 6px ${item.color})` : 'grayscale(1) opacity(0.5)' }}>{item.icon}</span>
                    <span style={{ fontSize: 9, color: isActive ? item.color : 'rgba(255,255,255,0.45)', fontWeight: isActive ? 700 : 500 }}>{t(item.shortLabelKey)}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        <InstallButton variant="banner" />
        <GlobalPlayer />
        <SessionPanel isOpen={showSessions} onClose={() => setShowSessions(false)} />
      </>
    );
  }

  // ============================================================
  // VERSION DESKTOP
  // ============================================================
  return (
    <>
      <VideoBackground />
      <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        
        {/* SIDEBAR DESKTOP */}
        <aside className="wf-sidebar">
          <div className="wf-logo">
            <div className="wf-logo-icon">🎹</div>
            <div className="wf-logo-text">WAVE<span>FORGE</span></div>
          </div>

          <nav className="wf-sidebar-nav">
            <NavLink to="/search" className={({ isActive }) => `wf-nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon">🔍</span>
              <span>Recherche</span>
            </NavLink>

            {NAV_ITEMS.map((item) => (
              <NavLink 
                key={item.path} 
                to={item.path} 
                end={item.path === '/'} 
                className={({ isActive }) => `wf-nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="icon">{item.icon}</span>
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}

            <InstallButton variant="sidebar" />
          </nav>

          <div className="wf-sidebar-footer">
            <button onClick={() => setShowSessions(true)} className="wf-btn wf-btn-secondary" style={{ width: '100%' }}>
              💾 {t('nav.sessions')}
            </button>

            {user && (
              <NavLink to={`/profil/${user.id}`} className="wf-btn wf-btn-secondary" style={{ width: '100%' }}>
                👤 {t('nav.profile')}
              </NavLink>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {user ? (
                <>
                  <div style={{ fontSize: 11, color: '#00d9ff', fontWeight: 700, textAlign: 'center' }}>🎧 {username}</div>
                  <button onClick={async () => { await signOut(); navigate('/'); }} className="wf-btn wf-btn-secondary" style={{ width: '100%', color: '#ff8c8c' }}>
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <NavLink to="/auth" className="wf-btn wf-btn-primary" style={{ width: '100%' }}>
                  🔐 {t('auth.login_tab').toUpperCase()}
                </NavLink>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <LanguageSwitcher />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>{t('nav.output')}</div>
              <VUMeter audioBuffer={engine.audioBuffer} isPlaying={engine.isPlaying} currentTime={engine.currentTime} />
            </div>
          </div>
        </aside>

        {/* CONTENU PRINCIPAL DESKTOP */}
        <main className="wf-main">
          <Outlet />
        </main>

      </div>
      <GlobalPlayer />
      <SessionPanel isOpen={showSessions} onClose={() => setShowSessions(false)} />
    </>
  );
};