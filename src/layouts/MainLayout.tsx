// src/layouts/MainLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { GlobalPlayer } from '../components/GlobalPlayer';
import { GlobalSearch } from '../components/GlobalSearch'; 
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../contexts/ThemeContext';

const Icons = {
  home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  feed: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>,
  new: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20" /></svg>,
  playlist: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  events: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  live: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /></svg>,
  genres: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
  artists: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  tools: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>,
  help: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  admin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  sun: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
  moon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
  discover: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  // ✅ NOUVELLE ICÔNE : Trophée pour le Top 50
  trophy: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>,
};

const NAV_ITEMS = [
  { path: '/', label: 'Accueil', icon: Icons.home, exact: true },
  { path: '/discover', label: 'Découvrir', icon: Icons.discover },
  { path: '/charts', label: 'Top 50', icon: Icons.trophy }, // ✅ AJOUTÉ
  { path: '/feed', label: 'Feed', icon: Icons.feed },
  { path: '/nouveautes', label: 'Nouveautés', icon: Icons.new },
  { path: '/mes-playlists', label: 'Mes Playlists', icon: Icons.playlist },
  { path: '/events', label: 'Événements', icon: Icons.events },
  { path: '/live', label: 'Live DJ', icon: Icons.live },
  { path: '/genres', label: 'Genres', icon: Icons.genres },
  { path: '/artists', label: 'Artistes', icon: Icons.artists },
  { path: '/tools', label: 'Outils DJ', icon: Icons.tools },
  { path: '/help', label: 'Guide', icon: Icons.help },
  { path: '/settings', label: 'Réglages', icon: Icons.settings },
];

const MOBILE_NAV = [
  { path: '/', label: 'Accueil', icon: Icons.home, exact: true },
  { path: '/discover', label: 'Découvrir', icon: Icons.discover }, 
  { path: '/charts', label: 'Top 50', icon: Icons.trophy }, // ✅ AJOUTÉ
  { path: '/nouveautes', label: 'Sorties', icon: Icons.new },
  { path: '#menu', label: 'Menu', icon: Icons.menu }, 
];

export const MainLayout: React.FC = () => {
  const { user, profile, refreshProfile, isAdmin } = useAuth();
  const { currentTrack, isPlaying, togglePlay, stop } = usePlayer();
  const isMobile = useIsMobile(768);
  const location = useLocation();
  const navigate = useNavigate();
  
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const colors = {
    bg: isDark ? '#0a0a0a' : '#ffffff',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    border: isDark ? '#222222' : '#e5e7eb',
    hoverBg: isDark ? '#121212' : '#f3f4f6',
    activeBg: isDark ? 'rgba(0, 217, 255, 0.05)' : 'rgba(0, 217, 255, 0.1)',
    mainBg: isDark ? '#0a0a0a' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
  };

  const isFullScreen = location.pathname === '/mastering' || location.pathname === '/cdj' || location.pathname === '/studio' || location.pathname === '/nouveautes';

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);
  useEffect(() => { if (user?.id) refreshProfile(); }, [user?.id, refreshProfile]);

  const displayName = profile?.username || user?.email?.split('@')[0] || 'Artiste';
  const avatarUrl = profile?.avatar_url;

  const ThemeToggleButton = () => (
    <button
      onClick={toggleTheme}
      style={{
        position: 'fixed', top: 20, right: 20, zIndex: 9999,
        width: 44, height: 44, borderRadius: '50%',
        background: isDark ? '#ffffff' : '#1a1a1a', 
        border: `1px solid ${isDark ? '#e5e7eb' : '#333333'}`,
        color: isDark ? '#000000' : '#ffffff', 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', transition: 'all 0.2s',
      }}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      {isDark ? Icons.sun : Icons.moon}
    </button>
  );

  if (isFullScreen) {
    return (
      <div style={{ minHeight: '100vh', background: colors.bg, color: colors.textMain, transition: 'background 0.3s ease' }}>
        {location.pathname !== '/nouveautes' && <ThemeToggleButton />}
        <Outlet />
        {currentTrack && <GlobalPlayer currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlay={togglePlay} onStop={stop} />}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bg, color: colors.textMain, overflowX: 'hidden', width: '100%', maxWidth: '100vw', transition: 'background 0.3s ease' }}>
        
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: colors.bg, borderBottom: `1px solid ${colors.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/icons/icon-192.png" alt="DropZone DJ" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 8 }} />
            <span style={{ fontWeight: 800, fontSize: '1rem', color: colors.textMain, letterSpacing: '-0.5px' }}>DROPZONE <span style={{ color: '#00d9ff' }}>DJ</span></span>
          </Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer', padding: 4 }}>
              {isDark ? Icons.sun : Icons.moon}
            </button>
            <Link to={`/profil/${user?.id}`} className="avatar-circle" style={{ width: 34, height: 34, overflow: 'hidden', background: colors.hoverBg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d9ff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayName.charAt(0).toUpperCase()}
            </Link>
          </div>
        </header>

        <main style={{ flex: 1, padding: '16px 12px', paddingBottom: currentTrack ? 140 : 80, overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}>
          <Outlet />
        </main>

        {currentTrack && <GlobalPlayer currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlay={togglePlay} onStop={stop} />}

        <nav style={{ 
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: colors.bg, borderTop: `1px solid ${colors.border}`,
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          padding: '8px 4px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
        }}>
          {MOBILE_NAV.map(item => {
            const isMenu = item.path === '#menu';
            const isActive = !isMenu && (item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path));
            return (
              <button key={item.path} onClick={() => isMenu ? setMobileMenuOpen(true) : navigate(item.path)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 12, background: 'transparent', border: 'none', color: isActive ? '#00d9ff' : colors.textMuted, cursor: 'pointer', minWidth: 60 }}>
                <div style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.1s' }}>{item.icon}</div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2px' }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.mainBg, color: colors.textMain, transition: 'background 0.3s ease' }}>
      
      <ThemeToggleButton />

      <aside style={{ width: 240, background: colors.bg, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, transition: 'background 0.3s ease, border-color 0.3s ease' }}>
        <div style={{ padding: '24px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/icons/icon-192.png" alt="DropZone DJ" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.5px', color: colors.textMain }}>DropZone DJ</span>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            return (
              <NavLink key={item.path} to={item.path} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, textDecoration: 'none', color: isActive ? '#00d9ff' : colors.textMuted, background: isActive ? colors.activeBg : 'transparent', fontWeight: isActive ? 700 : 500, fontSize: '0.9rem', borderLeft: isActive ? '2px solid #00d9ff' : '2px solid transparent', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = colors.hoverBg; e.currentTarget.style.color = colors.textMain; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.textMuted; } }}
              >
                <span style={{ display: 'flex' }}>{item.icon}</span>
                {item.label}
              </NavLink>
            );
          })}
          
          <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginTop: 16, border: `1px solid ${colors.border}`, borderRadius: 8, background: 'transparent', color: colors.textMain, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s' }}>
             {isDark ? Icons.sun : Icons.moon}
             {isDark ? 'Mode Clair' : 'Mode Sombre'}
          </button>

          {isAdmin && (
            <NavLink to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', textDecoration: 'none', color: '#ff4444', background: 'rgba(255, 68, 68, 0.05)', fontWeight: 700, fontSize: '0.9rem', marginTop: 16, border: '1px solid rgba(255, 68, 68, 0.2)', borderRadius: 8 }}>
              <span style={{ display: 'flex' }}>{Icons.admin}</span>
              Panel Admin
            </NavLink>
          )}
        </nav>

        <Link to={`/profil/${user?.id}`} style={{ padding: '16px 20px', borderTop: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: colors.textMain }} onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: colors.hoverBg, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d9ff', fontWeight: 700, fontSize: 13, border: `1px solid ${colors.border}` }}>
            {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
             <div style={{ fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
             <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>Voir mon profil</div>
          </div>
        </Link>
      </aside>

      <div style={{ flex: 1, marginLeft: 240, display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: currentTrack ? 100 : 0 }}>
        
        <div style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}`, padding: '12px 32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <GlobalSearch />
        </div>

        <main style={{ flex: 1, padding: 32, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
          <Outlet />
        </main>
      </div>
      {currentTrack && <GlobalPlayer currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlay={togglePlay} onStop={stop} />}
    </div>
  );
};