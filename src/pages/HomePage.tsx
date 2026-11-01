// src/pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrackGrid } from '../components/TrackGrid';
import type { Track } from '../components/TrackGrid';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext'; // ✅ Import du thème
import { EventsTicker } from '../components/EventsTicker';

const Icons = {
  play: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  music: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  headphones: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>,
};

interface Artist { id: string; username: string; avatar_url?: string; }

export const HomePage = () => {
  const isMobile = useIsMobile(768);
  const navigate = useNavigate();
  const { play, isPlaying, isCurrentTrack } = usePlayer();
  const { user } = useAuth();
  
  // ✅ RÉCUPÉRATION DU THÈME
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ PALETTE DE COULEURS DYNAMIQUES
  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    textDark: isDark ? '#555555' : '#999999',
    border: isDark ? '#222222' : '#e5e7eb',
    panelBg: isDark ? '#121212' : '#ffffff',
    tagBg: isDark ? '#0a0a0a' : '#f0f0f0',
    heroOverlayTop: isDark ? 'rgba(10,10,10,0.8)' : 'rgba(245,245,247,0.9)',
    heroOverlaySide: isDark ? 'rgba(10,10,10,0.8)' : 'rgba(245,245,247,0.9)',
    btnPrimaryBg: isDark ? '#ffffff' : '#1a1a1a',
    btnPrimaryText: isDark ? '#000000' : '#ffffff',
    btnSecondaryBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    btnSecondaryBorder: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: tracksData } = await supabase.from('tracks').select('*').order('created_at', { ascending: false }).limit(30);
        if (tracksData) setTracks(tracksData as Track[]);

        const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url').limit(10);
        if (profilesData) setArtists(profilesData as Artist[]);
      } catch (err) {
        console.error('Erreur chargement:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ color: colors.textMuted, padding: 60, textAlign: 'center', fontSize: 14, background: colors.bg, minHeight: '100vh' }}>CHARGEMENT...</div>;

  const featured = tracks[0];
  const top10 = [...tracks].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 10);
  const newReleases = tracks.slice(1, 13);

  const isFeaturedPlaying = featured ? isCurrentTrack(featured.id) && isPlaying : false;

  // ✅ BLOCAGE LECTURE DU SON À LA UNE (Intact)
  const playFeatured = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      alert("🔒 Inscrivez-vous gratuitement pour écouter les morceaux en entier.");
      navigate('/auth');
      return;
    }
    if (!featured) return;
    play({ id: featured.id, title: featured.title, artist: featured.artist, audio_url: featured.audio_url, cover_url: featured.cover_url, user_id: featured.user_id || null, duration: featured.duration, peaks: featured.peaks, bpm: featured.bpm, song_key: featured.song_key, genre: featured.genre });
  };

  // ✅ BLOCAGE LECTURE DEPUIS LA GRILLE (Intact)
  const handlePlayTrack = (track: Track) => {
    if (!user) {
      alert("🔒 Inscrivez-vous gratuitement pour écouter les morceaux en entier.");
      navigate('/auth');
      return;
    }
    play({ id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url, cover_url: track.cover_url, user_id: track.user_id || null, duration: track.duration, peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 120, fontFamily: 'Inter, sans-serif', color: colors.textMain, width: '100%', maxWidth: '100%', overflowX: 'hidden', background: colors.bg, transition: 'background 0.3s ease, color 0.3s ease' }}>
      
      <EventsTicker />

      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', flexDirection: 'column', gap: isMobile ? 24 : 48 }}>

        {/* 1. HERO SECTION */}
        <div style={{ position: 'relative', borderRadius: isMobile ? 16 : 24, overflow: 'hidden', border: `1px solid ${colors.border}`, width: '100%', height: isMobile ? 380 : 500, background: isDark ? '#000' : '#e5e7eb', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          
          {!isMobile ? (
            <video autoPlay loop muted playsInline poster="/og-image.jpg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: isDark ? 0.4 : 0.2 }}>
              <source src="/videos/hero-video.mp4" type="video/mp4" />
            </video>
          ) : (
            <img 
              src="/og-image.jpg" 
              alt="Hero" 
              loading="lazy" 
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: isDark ? 0.4 : 0.2 }} 
            />
          )}

          {/* Dégradé qui s'adapte au fond */}
          <div style={{ position: 'absolute', inset: 0, background: isMobile ? `linear-gradient(to top, ${colors.bg} 10%, transparent 100%)` : `linear-gradient(90deg, ${colors.bg} 30%, transparent 100%)` }} />

          <div style={{ position: 'relative', padding: isMobile ? '20px' : '64px', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', maxWidth: 600 }}>
            
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.3)', padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: '#00d9ff', width: 'fit-content', marginBottom: 16 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d9ff', boxShadow: '0 0 8px #00d9ff' }} />
              LA PLATEFORME DES DJS INDÉPENDANTS
            </div>

            <h1 style={{ fontSize: isMobile ? '2.2rem' : '4rem', fontWeight: 900, margin: '0 0 12px 0', letterSpacing: '-1.5px', lineHeight: 1.05, textShadow: isDark ? '0 4px 20px rgba(0,0,0,0.8)' : 'none', color: colors.textMain }}>
              Partage tes sons.<br /><span style={{ color: '#00d9ff' }}>Fais vibrer</span> la nuit.
            </h1>
            
            <p style={{ color: colors.textMuted, fontSize: isMobile ? 14 : 18, margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Découvre les dernières exclusivités, partage tes productions et connecte-toi avec les meilleurs DJs.
            </p>
            
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/nouveautes" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '10px 20px' : '14px 32px', background: colors.btnPrimaryBg, color: colors.btnPrimaryText, borderRadius: 30, fontWeight: 700, fontSize: isMobile ? 13 : 15, textDecoration: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                Écouter les sorties {Icons.arrowRight}
              </Link>
              <Link to="/auth" style={{ padding: isMobile ? '10px 20px' : '14px 32px', background: colors.btnSecondaryBg, color: colors.textMain, border: `1px solid ${colors.btnSecondaryBorder}`, borderRadius: 30, fontWeight: 600, fontSize: isMobile ? 13 : 15, textDecoration: 'none' }}>
                Rejoindre
              </Link>
            </div>
          </div>
        </div>

        {/* 2. BARRE DE STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '16px 0', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ color: '#00d9ff' }}>{Icons.headphones}</div>
            <div style={{ fontSize: isMobile ? 20 : 32, fontWeight: 900, color: colors.textMain }}>{tracks.length * 12}+</div>
            <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 700, textAlign: 'center' }}>Sons</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>
            <div style={{ color: '#00d9ff' }}>{Icons.users}</div>
            <div style={{ fontSize: isMobile ? 20 : 32, fontWeight: 900, color: colors.textMain }}>{artists.length * 15}+</div>
            <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 700, textAlign: 'center' }}>Artistes</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ color: '#00d9ff' }}>{Icons.music}</div>
            <div style={{ fontSize: isMobile ? 20 : 32, fontWeight: 900, color: colors.textMain }}>24/7</div>
            <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 700, textAlign: 'center' }}>Nouveaux</div>
          </div>
        </div>

        {/* 3. TRACK À LA UNE */}
        {featured && (
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, overflow: 'hidden', height: isMobile ? 'auto' : 320 }}>
            <div style={{ width: isMobile ? '100%' : 320, height: isMobile ? 200 : '100%', background: featured.cover_url ? `url(${featured.cover_url}) center/cover` : colors.textDark, position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 16, left: 16, background: '#ff3366', color: '#fff', padding: '4px 12px', borderRadius: 30, fontSize: 10, fontWeight: 900, letterSpacing: '1px', zIndex: 2 }}>À LA UNE</div>
            </div>
            <div style={{ flex: 1, padding: isMobile ? 16 : 40, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 8 }}>Le son du moment</div>
              <h2 style={{ fontSize: isMobile ? 22 : 40, fontWeight: 900, margin: '0 0 8px 0', lineHeight: 1.1, letterSpacing: '-0.5px', color: colors.textMain }}>{featured.title}</h2>
              <div style={{ fontSize: isMobile ? 14 : 18, color: colors.textMuted, marginBottom: 20 }}>{featured.artist}</div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={playFeatured} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '10px 20px' : '14px 28px', background: isFeaturedPlaying ? 'rgba(0, 217, 255, 0.15)' : '#00d9ff', color: isFeaturedPlaying ? '#00d9ff' : '#000', border: isFeaturedPlaying ? '1px solid #00d9ff' : 'none', borderRadius: 30, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {isFeaturedPlaying ? <>{Icons.pause} En lecture</> : <>{Icons.play} Écouter</>}
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ padding: '4px 10px', background: colors.tagBg, border: `1px solid ${colors.border}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: colors.textMain }}>{featured.bpm} BPM</span>
                  <span style={{ padding: '4px 10px', background: colors.tagBg, border: `1px solid ${colors.border}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: colors.textMain }}>{featured.genre || 'Electronic'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. GRILLE PRINCIPALE */}
        <div style={{ display: 'flex', gap: isMobile ? 20 : 40, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
          
          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: colors.textMain, margin: 0, letterSpacing: '-0.5px' }}>Nouvelles sorties</h2>
              <Link to="/nouveautes" style={{ fontSize: 12, color: colors.textMuted, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                Tout voir {Icons.arrowRight}
              </Link>
            </div>
            
            <TrackGrid tracks={newReleases} onPlay={handlePlayTrack} />
          </div>

          {!isMobile && (
            <aside style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: colors.panelBg, borderRadius: 16, border: `1px solid ${colors.border}`, padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: colors.textMain, margin: '0 0 20px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>Top 10 Chart</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {top10.map((track, idx) => (
                    <div key={track.id} onClick={() => navigate(`/track/${track.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
                      <span style={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', color: idx < 3 ? '#00d9ff' : colors.textDark, width: 24 }}>0{idx + 1}</span>
                      <div style={{ width: 44, height: 44, borderRadius: 6, background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.textDark, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: colors.textMain, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};