// src/layouts/MainLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { GlobalPlayer } from '../components/GlobalPlayer';
import { GlobalSearch } from '../components/GlobalSearch'; 
import { ScrollButtons } from '../components/ScrollButtons';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../contexts/ThemeContext';
import { Footer } from '../components/Footer';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const Icons = {
  home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  feed: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>,
  new: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20" /></svg>,
  playlist: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  events: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  live: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /></svg>,
  genres: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
  artists: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  help: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  admin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  sun: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
  moon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
  discover: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  trophy: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
  close: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  radioList: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15V6"></path><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path><path d="M12 12H3"></path><path d="M16 6H3"></path><path d="M12 18H3"></path></svg>,
};

interface NavItem { path: string; labelKey: string; icon: React.ReactNode; exact?: boolean; highlight?: boolean; }

const NAV_ITEMS: NavItem[] = [
  { path: '/', labelKey: 'nav.home', icon: Icons.home, exact: true },
  // 📻 LA RADIO = vitrine n°1
  { path: '/radio/ELEKTRAQ', labelKey: 'nav.radio', icon: Icons.live, highlight: true },
  // 🎧 Le coeur : promos des artistes
  { path: '/nouveautes', labelKey: 'nav.djonly', icon: Icons.new },
  { path: '/artists', labelKey: 'nav.artists', icon: Icons.artists },
  { path: '/charts', labelKey: 'nav.top50', icon: Icons.trophy },
  { path: '/radios', labelKey: 'nav.allRadios', icon: Icons.radioList },
  { path: '/feed', labelKey: 'nav.feed', icon: Icons.feed },
  { path: '/discover', labelKey: 'nav.discover', icon: Icons.discover },
  { path: '/genres', labelKey: 'nav.genres', icon: Icons.genres },
  { path: '/mes-playlists', labelKey: 'nav.playlists', icon: Icons.playlist },
  { path: '/sortie-radio', labelKey: 'nav.sortieRadio', icon: Icons.radioList },
  { path: '/help', labelKey: 'nav.guide', icon: Icons.help },
];

const MOBILE_NAV: NavItem[] = [
  { path: '/radio/ELEKTRAQ', labelKey: 'nav.radioShort', icon: Icons.radioList },
  { path: '/nouveautes', labelKey: 'nav.releases', icon: Icons.new },
  { path: '/artists', labelKey: 'nav.artists', icon: Icons.artists },
  { path: '/charts', labelKey: 'nav.top50', icon: Icons.trophy },
  { path: '#menu', labelKey: 'nav.menu', icon: Icons.menu }, 
];

export const MainLayout: React.FC = () => {
  const { user, profile, refreshProfile, isAdmin, signOut } = useAuth();
  const { currentTrack, isPlaying, togglePlay, stop } = usePlayer();
  const isMobile = useIsMobile(768);
  const location = useLocation();
  const navigate = useNavigate();
  
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const colors = {
    bg: isDark ? '#0a0a0a' : '#ffffff',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    border: isDark ? '#222222' : '#e5e7eb',
    hoverBg: isDark ? '#121212' : '#f3f4f6',
    activeBg: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    mainBg: isDark ? '#0a0a0a' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
  };

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);
  useEffect(() => { if (user?.id) refreshProfile(); }, [user?.id, refreshProfile]);

  const displayName = profile?.username || user?.email?.split('@')[0] || 'Artiste';
  const avatarUrl = profile?.avatar_url;

  const handleAuthClick = async () => {
    if (user) {
      await signOut();
      navigate('/');
    } else {
      navigate('/auth');
    }
  };

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bg, color: colors.textMain, overflowX: 'hidden', width: '100%', maxWidth: '100vw', transition: 'background 0.3s ease' }}>
        
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: colors.bg, borderBottom: `1px solid ${colors.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '2px', color: colors.textMain }}>ELEKTRAQ</span>
          </Link>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {user ? (
              <button onClick={handleAuthClick} style={{ background: 'transparent', border: 'none', color: '#b0b0b0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {t('common.logout')}
              </button>
            ) : (
              <button onClick={handleAuthClick} style={{ background: '#ffffff', border: 'none', color: '#000', fontWeight: 700, fontSize: 13, padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>
                {t('common.login')}
              </button>
            )}

            <LanguageSwitcher />
            <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer', padding: 4 }}>
              {isDark ? Icons.sun : Icons.moon}
            </button>

            {user && (
              <Link to={`/profil/${user.id}`} className="avatar-circle" style={{ width: 34, height: 34, overflow: 'hidden', background: colors.hoverBg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayName.charAt(0).toUpperCase()}
              </Link>
            )}
          </div>
        </header>

        <main style={{ flex: 1, padding: '16px 12px', paddingBottom: currentTrack ? 140 : 90, overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}>
          <Outlet />
        </main>

        <Footer />
        
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
              <button key={item.path} onClick={() => isMenu ? setMobileMenuOpen(true) : navigate(item.path)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 12, background: 'transparent', border: 'none', color: isActive ? colors.textMain : colors.textMuted, cursor: 'pointer', minWidth: 60 }}>
                <div style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.1s' }}>{item.icon}</div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2px' }}>{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        {mobileMenuOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: colors.bg,
            display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease'
          }}>
            <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
            
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}` }}>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: colors.textMain }}>{t('nav.menu')}</span>
              <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer', padding: 8 }}>
                {Icons.close}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {NAV_ITEMS.map(item => {
                const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
                
                return (
                  <NavLink key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px', borderRadius: 12,
                    textDecoration: 'none', color: colors.textMain,
                    background: isActive ? colors.activeBg : 'transparent', fontWeight: isActive ? 700 : 500,
                  }}>
                    <span style={{ display: 'flex', color: isActive ? colors.textMain : colors.textMuted }}>{item.icon}</span>
                    {t(item.labelKey)}
                  </NavLink>
                );
              })}
            </div>

            <div style={{ padding: '20px', borderTop: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => { toggleTheme(); setMobileMenuOpen(false); }} style={{ width: '100%', padding: '14px', background: colors.hoverBg, color: colors.textMain, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {isDark ? Icons.sun : Icons.moon} {isDark ? t('common.light_mode') : t('common.dark_mode')}
              </button>
              
              <button onClick={() => { handleAuthClick(); setMobileMenuOpen(false); }} style={{
                width: '100%', padding: '14px', background: user ? 'rgba(176, 176, 176, 0.1)' : '#ffffff',
                color: user ? '#b0b0b0' : '#000', border: user ? '1px solid #b0b0b0' : 'none',
                borderRadius: 8, fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
                {user ? <>{Icons.logout} {t('common.logout')}</> : t('common.sign_in')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.mainBg, color: colors.textMain, transition: 'background 0.3s ease', paddingBottom: currentTrack ? 100 : 0 }}>

      {/* HEADER TOP BAR (style Beatport) — fixe en haut */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: colors.bg, borderBottom: `1px solid ${colors.border}`, boxShadow: '0 6px 24px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 24, padding: '10px 24px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontWeight: 900, fontSize: '1.3rem', letterSpacing: '2px', color: colors.textMain }}>ELEKTRAQ</span>
          </Link>
          <div style={{ flex: 1, maxWidth: 380, minWidth: 200 }}>
            <GlobalSearch />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
            <LanguageSwitcher />
            <button onClick={toggleTheme} style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.textMain, cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' }}>
              {isDark ? Icons.sun : Icons.moon}
            </button>
            {user ? (
              <Link to={`/profil/${user.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: colors.textMain }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: colors.hoverBg, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.border}` }}>
                  {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayName.charAt(0).toUpperCase()}
                </div>
              </Link>
            ) : (
              <button onClick={handleAuthClick} style={{ background: '#94c748', border: 'none', color: '#000', fontWeight: 800, fontSize: 11, padding: '9px 16px', borderRadius: 6, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {t('common.sign_in')}
              </button>
            )}
          </div>
        </div>

        {/* NAV LINKS (style Beatport) */}
        <nav style={{ maxWidth: 1280, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 2, padding: '8px 24px 10px 24px', overflowX: 'auto', borderTop: `1px solid ${colors.border}` }}>
          {NAV_ITEMS.map(item => {
            const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            return (
              <NavLink key={item.path} to={item.path} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 4, textDecoration: 'none', fontSize: 11, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap', color: isActive ? '#94c748' : (item.highlight ? colors.textMain : colors.textMuted), background: item.highlight ? 'rgba(148,199,72,0.1)' : (isActive ? 'rgba(148,199,72,0.08)' : 'transparent'), borderBottom: isActive ? '2px solid #94c748' : '2px solid transparent', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#94c748'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = item.highlight ? colors.textMain : colors.textMuted; }}
              >
                {t(item.labelKey)}
                {item.highlight && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94c748', boxShadow: '0 0 6px #94c748' }} />}
              </NavLink>
            );
          })}
        </nav>
      </header>

      <main style={{ flex: 1, width: '100%', maxWidth: 1280, margin: '0 auto', padding: '116px 24px 80px' }}>
        <Outlet />
      </main>

      <Footer />

      <ScrollButtons />

      {currentTrack && <GlobalPlayer currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlay={togglePlay} onStop={stop} />}
    </div>
  );
};