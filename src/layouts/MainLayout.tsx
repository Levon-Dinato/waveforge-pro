// src/layouts/MainLayout.tsx
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VideoBackground } from '../components/VideoBackground';
import { VUMeter } from '../components/VUMeter';
import { SessionPanel } from '../components/SessionPanel';
import { InstallButton } from '../components/InstallButton';
import { GlobalPlayer } from '../components/GlobalPlayer';
import { Footer } from '../components/Footer';
import { NotificationsDropdown } from '../components/NotificationsDropdown';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

const Icons = {
  home: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>),
  search: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>),
  newReleases: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>),
  live: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>),
  genres: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>),
  artists: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>),
  tools: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>),
  help: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>),
  settings: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>),
  events: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>),
  feed: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>),
};

interface NavItem { path: string; labelKey: string; shortLabelKey: string; icon: React.ReactNode; }

const NAV_ITEMS: NavItem[] = [
  { path: '/',           labelKey: 'nav.home',        shortLabelKey: 'nav.home',        icon: Icons.home },
  { path: '/feed',       labelKey: 'Feed',            shortLabelKey: 'nav.feed',        icon: Icons.feed },
  { path: '/nouveautes', labelKey: 'nav.nouveautes',  shortLabelKey: 'nav.nouveautes',  icon: Icons.newReleases },
  { path: '/events',     labelKey: 'Events',          shortLabelKey: 'nav.events',      icon: Icons.events },
  { path: '/live',       labelKey: 'live DJ',         shortLabelKey: 'nav.live',        icon: Icons.live },
  { path: '/genres',     labelKey: 'nav.genres',      shortLabelKey: 'nav.genres',      icon: Icons.genres },
  { path: '/artists',    labelKey: 'nav.artists',     shortLabelKey: 'nav.artists',     icon: Icons.artists },
  { path: '/tools',      labelKey: 'Outils DJ',       shortLabelKey: 'Outils',          icon: Icons.tools },
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

  // ============================================================
  // VERSION MOBILE
  // ============================================================
  if (isMobile) {
    return (
      <>
        <VideoBackground />
        <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 160, background: '#121212' }}>
          
          <header style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a', background: '#181818', position: 'sticky', top: 0, zIndex: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: 4 }}>☰</button>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: '#1c1c1c', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src="/icons/icon-192.png" alt="DropZone DJ" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>DROPZONE <span style={{ color: '#00d9ff' }}>DJ</span></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <NotificationsDropdown />
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
              <aside style={{ position: 'fixed', top: 0, left: 0, height: '100vh', width: '280px', background: '#121212', borderRight: '1px solid #2a2a2a', zIndex: 99, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Menu</div>
                  <button onClick={() => setSidebarOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>×</button>
                </div>
                {NAV_ITEMS.map((item) => (
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', zIndex: 1, background: '#121212' }}>
        
        {/* HEADER GLOBAL (Barre du haut) */}
        <header style={{ 
          height: 60, 
          background: '#181818', 
          borderBottom: '1px solid #2a2a2a', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0
        }}>
          {/* Espace vide à gauche pour compenser la sidebar */}
          <div style={{ width: 240 }}></div>

          {/* Recherche globale */}
          <div style={{ flex: 1, maxWidth: 500 }}>
             <input type="text" placeholder="Rechercher un son, un artiste..." style={{ width: '100%', padding: '8px 12px', background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', outline: 'none', fontSize: 13 }} />
          </div>

          {/* Profil + Notifications à droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <NotificationsDropdown />
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <NavLink to={`/profil/${user.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#fff' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                    {username?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{username}</span>
                </NavLink>
                <button onClick={async () => { await signOut(); navigate('/'); }} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 11, cursor: 'pointer' }}>Déconnexion</button>
              </div>
            ) : (
              <NavLink to="/auth" style={{ padding: '6px 16px', background: '#00d9ff', borderRadius: 4, color: '#000', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                Connexion
              </NavLink>
            )}
          </div>
        </header>

        {/* CORPS DU SITE (Sidebar + Main) */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* SIDEBAR GAUCHE */}
          <aside className="wf-sidebar" style={{ background: '#121212', borderRight: '1px solid #2a2a2a', width: 240, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            
            {/* ✅ LE LOGO EST DE RETOUR ICI */}
            <div className="wf-logo" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', borderBottom: '1px solid #2a2a2a', cursor: 'pointer' }} onClick={() => navigate('/')}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: '#1c1c1c', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src="/icons/icon-192.png" alt="DropZone DJ" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>DROP<span style={{ color: '#00d9ff' }}>ZONE</span> DJ</div>
            </div>

            <nav className="wf-sidebar-nav" style={{ paddingTop: 16 }}>
              <NavLink to="/search" className={({ isActive }) => `wf-nav-link ${isActive ? 'active' : ''}`}>
                <span className="icon" style={{ display: 'flex', alignItems: 'center' }}>{Icons.search}</span>
                <span>Recherche</span>
              </NavLink>

              {NAV_ITEMS.map((item) => (
                <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => `wf-nav-link ${isActive ? 'active' : ''}`}>
                  <span className="icon" style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              ))}

              <InstallButton variant="sidebar" />
            </nav>

            <div className="wf-sidebar-footer" style={{ marginTop: 'auto', padding: 16 }}>
              <button onClick={() => setShowSessions(true)} className="wf-btn wf-btn-secondary" style={{ width: '100%' }}>
                💾 {t('nav.sessions')}
              </button>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>{t('nav.output')}</div>
                <VUMeter audioBuffer={engine.audioBuffer} isPlaying={engine.isPlaying} currentTime={engine.currentTime} />
              </div>
            </div>
          </aside>

          {/* MAIN CONTENU */}
          <main className="wf-main" style={{ flex: 1, overflowY: 'auto', background: '#121212', paddingBottom: 90 }}>
            <Outlet />
            <Footer />
          </main>

        </div>
      </div>
      
      <GlobalPlayer />
      <SessionPanel isOpen={showSessions} onClose={() => setShowSessions(false)} />
    </>
  );
};