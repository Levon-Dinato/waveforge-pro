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
  { path: '/mixer',      labelKey: 'nav.mixer',       shortLabelKey: 'nav.mixer',       icon: '🎛️', color: '#ff5cf0' }, // ✅ NOUVEAU
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
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // ============================================================
  // VERSION MOBILE
  // ============================================================
  if (isMobile) {
    return (
      <>
        <VideoBackground />
        <div className="studio-grid" style={{ minHeight: '100vh', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
          <header style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(10, 10, 15, 0.7)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #00d9ff, #0088ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 0 16px rgba(0, 217, 255, 0.5)' }}>🎹</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.2px', color: '#fff' }}>WAVEFORGE <span style={{ background: 'linear-gradient(135deg, #00d9ff, #7c5cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 700 }}>PRO</span></div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, marginTop: 1 }}>Audio → Video Studio</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LanguageSwitcher />
              {user ? (
                <NavLink to={`/profil/${user.id}`} style={{ padding: '8px 12px', background: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.3)', borderRadius: 10, color: '#00d9ff', fontSize: 11, fontWeight: 700, textDecoration: 'none', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎧 {username}</NavLink>
              ) : (
                <NavLink to="/auth" style={{ padding: '8px 12px', background: 'rgba(0, 217, 255, 0.15)', border: '1px solid rgba(0, 217, 255, 0.4)', borderRadius: 10, color: '#00d9ff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>🔐</NavLink>
              )}
              <button onClick={() => setShowSessions(true)} style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 10, color: '#00d9ff', fontSize: 14, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }} title="Sessions sauvegardées">💾</button>
            </div>
          </header>
          <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}><Outlet /></main>
          <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(10, 10, 15, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 6px', zIndex: 100, paddingBottom: 'max(8px, env(safe-area-inset-bottom))', overflowX: 'auto', gap: 2 }}>
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.path === '/'} style={({ isActive }) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '8px 6px', borderRadius: 10, textDecoration: 'none', flex: '0 0 auto', minWidth: 58, transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', background: isActive ? `linear-gradient(180deg, ${item.color}20, ${item.color}05)` : 'transparent', border: isActive ? `1px solid ${item.color}50` : '1px solid transparent' })}>
                {({ isActive }) => (
                  <>
                    <span style={{ fontSize: 18, lineHeight: 1, filter: isActive ? `drop-shadow(0 0 6px ${item.color})` : 'grayscale(1) opacity(0.5)' }}>{item.icon}</span>
                    <span style={{ fontSize: 9, color: isActive ? item.color : 'rgba(255,255,255,0.45)', fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap', letterSpacing: '0.2px' }}>{t(item.shortLabelKey)}</span>
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
      <style>{`aside::-webkit-scrollbar { width: 5px; } aside::-webkit-scrollbar-track { background: transparent; } aside::-webkit-scrollbar-thumb { background: rgba(0, 217, 255, 0.15); border-radius: 3px; } aside::-webkit-scrollbar-thumb:hover { background: rgba(0, 217, 255, 0.4); }`}</style>
      <div className="studio-grid" style={{ minHeight: '100vh', padding: 20, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1480, margin: '0 auto', display: 'flex', gap: 24 }}>
          <aside style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, position: 'sticky', top: 20, height: 'fit-content', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', paddingRight: 4, scrollbarWidth: 'thin', scrollbarColor: 'rgba(0, 217, 255, 0.2) transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '2px 0 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg, #00d9ff, #0088ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, boxShadow: '0 0 20px rgba(0, 217, 255, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)' }}>🎹</div>
              <div>
                <h1 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: '-0.3px', color: '#fff', lineHeight: 1.1 }}>WAVEFORGE <span style={{ background: 'linear-gradient(135deg, #00d9ff, #7c5cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 700 }}>PRO</span></h1>
                <p style={{ margin: 0, fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>Audio → Video Studio</p>
              </div>
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <NavLink to="/search" style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 12.5, fontWeight: isActive ? 700 : 500, color: isActive ? '#ffd43b' : 'rgba(255,255,255,0.6)', background: isActive ? 'rgba(255, 212, 59, 0.1)' : 'transparent', border: isActive ? '1px solid rgba(255, 212, 59, 0.3)' : '1px solid transparent', transition: 'all 0.18s ease', marginBottom: 4 })}>
                <span style={{ fontSize: 14 }}>🔍</span>
                <span style={{ flex: 1 }}>Recherche</span>
              </NavLink>
              
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.path} to={item.path} end={item.path === '/'} onMouseEnter={() => setHoveredPath(item.path)} onMouseLeave={() => setHoveredPath(null)} style={({ isActive }: { isActive: boolean }) => {
                  const hovered = hoveredPath === item.path;
                  return {
                    display: 'flex', alignItems: 'center', gap: 11, padding: '8px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                    color: isActive ? item.color : hovered ? '#fff' : 'rgba(255,255,255,0.6)',
                    background: isActive ? `linear-gradient(135deg, ${item.color}18, ${item.color}05)` : hovered ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                    border: isActive ? `1px solid ${item.color}50` : '1px solid transparent', transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative', overflow: 'hidden'
                  };
                }}>
                  <span style={{ fontSize: 14, lineHeight: 1, filter: 'none', transition: 'transform 0.18s ease' }}>{item.icon}</span>
                  <span style={{ flex: 1, letterSpacing: '-0.1px' }}>{t(item.labelKey)}</span>
                  {window.location.pathname === item.path && (<span style={{ width: 4, height: 4, borderRadius: '50%', background: item.color, boxShadow: `0 0 8px ${item.color}` }} />)}
                </NavLink>
              ))}
            </nav>
            <InstallButton variant="sidebar" />
            <button onClick={() => setShowSessions(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(0, 136, 255, 0.05))', border: '1px solid rgba(0, 217, 255, 0.25)', borderRadius: 10, color: '#00d9ff', fontSize: 11, fontWeight: 800, cursor: 'pointer', letterSpacing: '1px', transition: 'all 0.2s ease', backdropFilter: 'blur(10px)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 136, 255, 0.1))'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 217, 255, 0.25)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(0, 136, 255, 0.05))'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>💾 {t('nav.sessions')}</button>
            {user && (<NavLink to={`/profil/${user.id}`} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 12px', background: isActive ? 'rgba(0, 217, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)', border: isActive ? '1px solid rgba(0, 217, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 10, color: isActive ? '#00d9ff' : 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textDecoration: 'none', fontFamily: 'monospace', transition: 'all 0.2s' })}>👤 {t('nav.profile')}</NavLink>)}
            <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <NavLink to={`/profil/${user.id}`} style={{ fontSize: 10, color: '#00d9ff', fontWeight: 700, letterSpacing: '0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', display: 'block' }}>🎧 {username}</NavLink>
                  <button onClick={async () => { await signOut(); navigate('/'); }} style={{ padding: '7px 10px', background: 'rgba(255, 60, 60, 0.08)', border: '1px solid rgba(255, 60, 60, 0.3)', borderRadius: 7, color: '#ff8c8c', fontSize: 10, fontWeight: 700, fontFamily: 'monospace', cursor: 'pointer', letterSpacing: '1px' }}>{t('nav.logout')}</button>
                </div>
              ) : (<NavLink to="/auth" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 12px', background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.15), rgba(0, 136, 255, 0.05))', border: '1px solid rgba(0, 217, 255, 0.4)', borderRadius: 10, color: '#00d9ff', fontSize: 11, fontWeight: 800, letterSpacing: '1px', textDecoration: 'none', fontFamily: 'monospace' }}>🔐 {t('auth.login_tab').toUpperCase()}</NavLink>)}
            </div>
            <div style={{ paddingTop: 10, paddingBottom: 4, borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'center' }}><LanguageSwitcher /></div>
            <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase' }}>{t('nav.output')}</div>
              <VUMeter audioBuffer={engine.audioBuffer} isPlaying={engine.isPlaying} currentTime={engine.currentTime} />
            </div>
          </aside>
          <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><Outlet /></main>
        </div>
        <footer style={{ maxWidth: 1480, margin: '40px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255, 255, 255, 0.06)', textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.5px', fontWeight: 600 }}>WAVEFORGE PRO · YIN · TONE.JS · DEMUCS · BASIC PITCH · v1.0</footer>
      </div>
      <GlobalPlayer />
      <SessionPanel isOpen={showSessions} onClose={() => setShowSessions(false)} />
    </>
  );
};