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

// ✅ ICÔNES SVG MINIMALISTES (Style Beatport)
const Icons = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  newReleases: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  live: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  ),
  genres: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  artists: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  studio: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  stems: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  mastering: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
  generator: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
  cdj: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  help: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

interface NavItem {
  path: string;
  labelKey: string;
  shortLabelKey: string;
  icon: React.ReactNode;
  devOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/',           labelKey: 'nav.home',        shortLabelKey: 'nav.home',        icon: Icons.home },
  { path: '/nouveautes', labelKey: 'nav.nouveautes',  shortLabelKey: 'nav.nouveautes',  icon: Icons.newReleases },
  { path: '/live',       labelKey: 'live DJ',        shortLabelKey: 'nav.live',        icon: Icons.live },
  { path: '/genres',     labelKey: 'nav.genres',      shortLabelKey: 'nav.genres',      icon: Icons.genres },
  { path: '/artists',    labelKey: 'nav.artists',     shortLabelKey: 'nav.artists',     icon: Icons.artists },
  { path: '/studio',     labelKey: 'nav.studio',      shortLabelKey: 'nav.studio',      icon: Icons.studio },
  { path: '/stems',      labelKey: 'nav.stems',       shortLabelKey: 'nav.stems',       icon: Icons.stems, devOnly: true },
  { path: '/mastering',  labelKey: 'nav.mastering',   shortLabelKey: 'nav.mastering',   icon: Icons.mastering, devOnly: true },
  { path: '/generator',  labelKey: 'nav.generator',   shortLabelKey: 'nav.generator',   icon: Icons.generator, devOnly: true },
  { path: '/cdj',        labelKey: 'nav.cdj',         shortLabelKey: 'nav.cdj',         icon: Icons.cdj, devOnly: true },
  { path: '/help',       labelKey: 'nav.help',        shortLabelKey: 'nav.help',        icon: Icons.help },
  { path: '/settings',   labelKey: 'nav.settings',    shortLabelKey: 'nav.settings',    icon: Icons.settings },
];

export const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const engine = useAudioEngineContext();
  const { user, username, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const [showSessions, setShowSessions] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const visibleNavItems = NAV_ITEMS.filter((item) => isLocalhost || !item.devOnly);

  // ============================================================
  // VERSION MOBILE
  // ============================================================
  if (isMobile) {
    return (
      <>
        <VideoBackground />
        <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
          
          <header style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(10, 10, 15, 0.7)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: 4 }}>☰</button>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #00d9ff, #0088ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 0 16px rgba(0, 217, 255, 0.5)' }}>🎹</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>DROPZONE <span style={{ color: '#00d9ff' }}>DJ</span></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LanguageSwitcher />
              {user ? (
                <NavLink to={`/profil/${user.id}`} style={{ padding: '8px 12px', background: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.3)', borderRadius: 10, color: '#00d9ff', fontSize: 11, fontWeight: 700, textDecoration: 'none', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎧 {username}</NavLink>
              ) : (
                <NavLink to="/auth" style={{ padding: '8px 12px', background: 'rgba(0, 217, 255, 0.15)', border: '1px solid rgba(0, 217, 255, 0.4)', borderRadius: 10, color: '#00d9ff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>🔐</NavLink>
              )}
            </div>
          </header>

          {sidebarOpen && (
            <>
              <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 98 }} />
              <aside style={{ position: 'fixed', top: 0, left: 0, height: '100vh', width: '280px', background: '#0a0c14', borderRight: '1px solid rgba(255,255,255,0.08)', zIndex: 99, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Menu</div>
                  <button onClick={() => setSidebarOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>×</button>
                </div>
                {visibleNavItems.map((item) => (
                  <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={() => setSidebarOpen(false)} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600, background: isActive ? 'rgba(0, 217, 255, 0.1)' : 'transparent', color: isActive ? '#00d9ff' : 'rgba(255,255,255,0.7)', border: isActive ? '1px solid rgba(0, 217, 255, 0.2)' : '1px solid transparent' })}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </aside>
            </>
          )}

          <main style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '16px 12px' }}>
            <Outlet />
          </main>

          <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(10, 10, 15, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 6px', zIndex: 100, paddingBottom: 'max(8px, env(safe-area-inset-bottom))', overflowX: 'auto', gap: 2 }}>
            {visibleNavItems.slice(0, 5).map((item) => (
              <NavLink key={item.path} to={item.path} end={item.path === '/'} style={({ isActive }) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '8px 6px', borderRadius: 10, textDecoration: 'none', flex: '0 0 auto', minWidth: 56, background: isActive ? `rgba(0, 217, 255, 0.1)` : 'transparent', border: isActive ? `1px solid rgba(0, 217, 255, 0.3)` : '1px solid transparent' })}>
                {({ isActive }) => (
                  <>
                    <span style={{ display: 'flex', alignItems: 'center', color: isActive ? '#00d9ff' : 'rgba(255,255,255,0.5)' }}>{item.icon}</span>
                    <span style={{ fontSize: 9, color: isActive ? '#00d9ff' : 'rgba(255,255,255,0.45)', fontWeight: isActive ? 700 : 500 }}>{t(item.shortLabelKey)}</span>
                  </>
                )}
              </NavLink>
            ))}
            <button onClick={() => setSidebarOpen(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '8px 6px', borderRadius: 10, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', flex: '0 0 auto', minWidth: 56 }}>
              <span style={{ fontSize: 18, color: '#888' }}>⋯</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Plus</span>
            </button>
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
        
        <aside className="wf-sidebar">
          <div className="wf-logo">
            <div className="wf-logo-icon">🎹</div>
            <div className="wf-logo-text">DROP<span>ZONE</span> DJ</div>
          </div>

          <nav className="wf-sidebar-nav">
            <NavLink to="/search" className={({ isActive }) => `wf-nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon" style={{ display: 'flex', alignItems: 'center' }}>{Icons.search}</span>
              <span>Recherche</span>
            </NavLink>

            {visibleNavItems.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => `wf-nav-link ${isActive ? 'active' : ''}`}>
                <span className="icon" style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}

            <InstallButton variant="sidebar" />
          </nav>

          <div className="wf-sidebar-footer">
            <button onClick={() => setShowSessions(true)} className="wf-btn wf-btn-secondary" style={{ width: '100%' }}>
              💾 {t('nav.sessions')}
            </button>

            {user ? (
              <div style={{ 
                padding: '12px', 
                background: '#1c1c1c',
                border: '1px solid #2a2a2a',
                borderRadius: 6,
                marginTop: 8,
                marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ 
                    width: 32, height: 32, borderRadius: '4px', 
                    background: '#121212',
                    border: '1px solid #2a2a2a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#fff',
                  }}>
                    {username?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {username}
                    </div>
                    <div style={{ fontSize: 10, color: '#999', fontWeight: 500 }}>Niveau 4</div>
                  </div>
                </div>
                <div style={{ width: '100%', height: 4, background: '#121212', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: '65%', height: '100%', background: '#00d9ff', borderRadius: 2 }} />
                </div>
              </div>
            ) : (
              <NavLink to="/auth" className="wf-btn wf-btn-primary" style={{ width: '100%', marginTop: 8, marginBottom: 8 }}>
                🔐 {t('auth.login_tab').toUpperCase()}
              </NavLink>
            )}

            {user && (
              <button onClick={async () => { await signOut(); navigate('/'); }} className="wf-btn wf-btn-secondary" style={{ width: '100%', color: '#ff8c8c' }}>
                {t('nav.logout')}
              </button>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <LanguageSwitcher />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>{t('nav.output')}</div>
              <VUMeter audioBuffer={engine.audioBuffer} isPlaying={engine.isPlaying} currentTime={engine.currentTime} />
            </div>
          </div>
        </aside>

        <main className="wf-main">
          <Outlet />
        </main>

      </div>
      <GlobalPlayer />
      <SessionPanel isOpen={showSessions} onClose={() => setShowSessions(false)} />
    </>
  );
};