// src/pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrackGrid } from '../components/TrackGrid';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { EventsTicker } from '../components/EventsTicker';
import { ArtistPromoSection } from '../components/ArtistPromoSection';

const Icons = {
  play: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  music: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  headphones: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>,
  upload: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>,
  share: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>,
  star: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
  bolt: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
};

interface Artist { id: string; username: string; avatar_url?: string; }

interface ExtendedTrack {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_url: string | null;
  user_id?: string;
  duration: number;
  peaks: number[];
  genre?: string;
  bpm?: number;
  song_key?: string;
  likes_count?: number;
  plays?: number;
  downloads?: number;
}

export const HomePage = () => {
  const isMobile = useIsMobile(768);
  const navigate = useNavigate();
  const { play, isPlaying, currentTrack } = usePlayer() as any;
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [tracks, setTracks] = useState<ExtendedTrack[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

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
    accent: '#00d9ff',
    footerBg: isDark ? '#050505' : '#ffffff',
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: tracksData } = await supabase.from('tracks').select('*').order('created_at', { ascending: false }).limit(30);
        if (tracksData) setTracks(tracksData as ExtendedTrack[]);

        const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url').limit(12);
        if (profilesData) setArtists(profilesData as Artist[]);
      } catch (err) {
        console.error('Erreur chargement:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const incrementPlayCount = async (track: ExtendedTrack) => {
    if (!user || user.id === track.user_id) return; 
    
    const listenKey = `listened_${track.id}_${user.id}`;
    const lastListen = localStorage.getItem(listenKey);
    const now = Date.now();
    
    if (lastListen && now - parseInt(lastListen) < 0.1 * 60 * 1000) return; 

    try {
      const { error } = await supabase.rpc('increment_play_count', { track_id_param: track.id });
      if (!error) {
        setTracks(prev => prev.map(t => t.id === track.id ? { ...t, plays: (t.plays || 0) + 1 } : t));
        localStorage.setItem(listenKey, now.toString());
      }
    } catch (err) { console.error("Erreur RPC:", err); }
  };

  if (loading) return <div style={{ color: colors.textMuted, padding: 60, textAlign: 'center', fontSize: 14, background: colors.bg, minHeight: '100vh' }}>CHARGEMENT...</div>;

  const featured = tracks[0];
  const top10 = [...tracks].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 10);
  const newReleases = tracks.slice(1, 13);
  
  const isFeaturedPlaying = featured ? (currentTrack as any)?.id === featured.id && isPlaying : false; 

  const genres = Array.from(new Set(tracks.map(t => t.genre).filter(Boolean))).slice(0, 8);

  const playFeatured = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!featured) return;

    // ✅ On ne bloque plus la lecture pour les invités !
    const isNew = (currentTrack as any)?.id !== featured.id;
    
    const trackToPlay = {
      id: featured.id, 
      title: featured.title, 
      artist: featured.artist, 
      audio_url: featured.audio_url, 
      cover_url: featured.cover_url, 
      user_id: featured.user_id || undefined, 
      duration: featured.duration, 
      peaks: featured.peaks, 
      bpm: featured.bpm, 
      song_key: featured.song_key, 
      genre: featured.genre 
    };
    
    play(trackToPlay as any);
    
    // On ne compte la lecture que si l'utilisateur est connecté
    if (isNew && user) incrementPlayCount(featured);
  };

  const handlePlayTrack = (track: any) => {
    // ✅ On ne bloque plus la lecture pour les invités !
    const isNew = (currentTrack as any)?.id !== track.id;
    
    const trackToPlay = {
      id: track.id, 
      title: track.title, 
      artist: track.artist, 
      audio_url: track.audio_url, 
      cover_url: track.cover_url, 
      user_id: track.user_id || undefined, 
      duration: track.duration, 
      peaks: track.peaks, 
      bpm: track.bpm, 
      song_key: track.song_key, 
      genre: track.genre 
    };

    play(trackToPlay as any);

    if (isNew && user) incrementPlayCount(track);
  };

  const steps = [
    { icon: Icons.upload, title: 'Upload ton son', desc: 'Ajoute tes tracks, remixes et exclusivités en quelques clics.' },
    { icon: Icons.share, title: 'Partage ta page', desc: 'Un lien unique pour ta bio, tes dates et tes releases.' },
    { icon: Icons.bolt, title: 'Fais vibrer la nuit', desc: 'Sois découvert par des milliers de DJs et de fans.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif', color: colors.textMain, width: '100%', maxWidth: '100%', overflowX: 'hidden', background: colors.bg, transition: 'background 0.3s ease, color 0.3s ease' }}>

      <EventsTicker />

      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', flexDirection: 'column', gap: isMobile ? 24 : 48, paddingTop: 24, paddingBottom: isMobile ? 40 : 80 }}>

        {/* 1. HERO */}
        <div style={{ position: 'relative', borderRadius: isMobile ? 16 : 24, overflow: 'hidden', border: `1px solid ${colors.border}`, width: '100%', height: isMobile ? 420 : 540, background: isDark ? '#000' : '#e5e7eb', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>

          {!isMobile ? (
            <video autoPlay loop muted playsInline poster="/og-image.jpg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: isDark ? 0.3 : 0.3 }}>
              <source src="/videos/hero-video.mp4" type="video/mp4" />
            </video>
          ) : (
            <img src="/og-image.jpg" alt="Hero" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: isDark ? 0.4 : 0.2 }} />
          )}

          <div style={{ position: 'absolute', inset: 0, background: isMobile ? `linear-gradient(to top, ${colors.bg} 15%, transparent 100%)` : `linear-gradient(90deg, ${colors.bg} 35%, transparent 100%)` }} />

          <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: `linear-gradient(${colors.accent} 1px, transparent 1px), linear-gradient(90deg, ${colors.accent} 1px, transparent 1px)`, backgroundSize: '40px 40px', maskImage: 'radial-gradient(ellipse at 80% 50%, black 30%, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse at 80% 50%, black 30%, transparent 70%)' }} />

          <div style={{ position: 'relative', padding: isMobile ? '20px' : '64px', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', maxWidth: 620 }}>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.3)', padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: colors.accent, width: 'fit-content', marginBottom: 16, letterSpacing: '1px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.accent, boxShadow: `0 0 8px ${colors.accent}` }} />
              LA PLATEFORME DES DJS INDÉPENDANTS
            </div>

            <h1 style={{ fontSize: isMobile ? '2.2rem' : '4rem', fontWeight: 900, margin: '0 0 16px 0', letterSpacing: '-1.5px', lineHeight: 1.05, textShadow: isDark ? '0 4px 20px rgba(0,0,0,0.8)' : 'none', color: colors.textMain }}>
              Partage tes sons.<br /><span style={{ color: colors.accent }}>Fais vibrer</span> la nuit.
            </h1>

            <p style={{ color: colors.textMuted, fontSize: isMobile ? 14 : 18, margin: '0 0 24px 0', lineHeight: 1.5, maxWidth: 480 }}>
              Découvre les dernières exclusivités, partage tes productions et connecte-toi avec les meilleurs DJs.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <Link to="/nouveautes" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '10px 20px' : '14px 32px', background: colors.accent, color: '#000', borderRadius: 30, fontWeight: 800, fontSize: isMobile ? 13 : 15, textDecoration: 'none', boxShadow: `0 8px 24px ${colors.accent}40` }}>
                Écouter les sorties {Icons.arrowRight}
              </Link>
              <Link to="/auth" style={{ padding: isMobile ? '10px 20px' : '14px 32px', background: colors.btnSecondaryBg, color: colors.textMain, border: `1px solid ${colors.btnSecondaryBorder}`, borderRadius: 30, fontWeight: 600, fontSize: isMobile ? 13 : 15, textDecoration: 'none' }}>
                Rejoindre
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex' }}>
                {artists.slice(0, 4).map((a, i) => (
                  <div key={a.id} style={{ width: 32, height: 32, borderRadius: '50%', background: a.avatar_url ? `url(${a.avatar_url}) center/cover` : colors.textDark, border: `2px solid ${colors.bg}`, marginLeft: i > 0 ? -10 : 0 }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>
                <span style={{ color: colors.textMain, fontWeight: 800 }}>{artists.length > 0 ? `${artists.length * 15}+` : '500+'}</span> artistes déjà inscrits
              </div>
            </div>
          </div>
        </div>

        {/* 2. STATS BAR */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '24px 0', borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }}>
          {[
            { icon: Icons.headphones, value: `${tracks.length * 12}+`, label: 'Sons partagés' },
            { icon: Icons.users, value: `${artists.length * 15}+`, label: 'Artistes actifs' },
            { icon: Icons.music, value: '24/7', label: 'Nouveaux sons' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderLeft: i > 0 ? `1px solid ${colors.border}` : 'none' }}>
              <div style={{ color: colors.accent }}>{s.icon}</div>
              <div style={{ fontSize: isMobile ? 22 : 36, fontWeight: 900, color: colors.textMain, letterSpacing: '-1px' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 3. TRACK À LA UNE */}
        {featured && (
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, overflow: 'hidden', height: isMobile ? 'auto' : 320, position: 'relative' }}>
            <div style={{ width: isMobile ? '100%' : 320, height: isMobile ? 200 : '100%', background: featured.cover_url ? `url(${featured.cover_url}) center/cover` : colors.textDark, position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 16, left: 16, background: '#ff3366', color: '#fff', padding: '4px 12px', borderRadius: 30, fontSize: 10, fontWeight: 900, letterSpacing: '1px', zIndex: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                {Icons.star} À LA UNE
              </div>
            </div>
            <div style={{ flex: 1, padding: isMobile ? 20 : 40, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 8 }}>Le son du moment</div>
              <h2 style={{ fontSize: isMobile ? 22 : 40, fontWeight: 900, margin: '0 0 8px 0', lineHeight: 1.1, letterSpacing: '-0.5px', color: colors.textMain }}>{featured.title}</h2>
              <div style={{ fontSize: isMobile ? 14 : 18, color: colors.textMuted, marginBottom: 20 }}>{featured.artist}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={playFeatured} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '10px 20px' : '14px 28px', background: isFeaturedPlaying ? 'rgba(0, 217, 255, 0.15)' : colors.accent, color: isFeaturedPlaying ? colors.accent : '#000', border: isFeaturedPlaying ? `1px solid ${colors.accent}` : 'none', borderRadius: 30, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {isFeaturedPlaying ? <>{Icons.pause} En lecture</> : <>{Icons.play} Écouter</>}
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  {featured.bpm && <span style={{ padding: '4px 10px', background: colors.tagBg, border: `1px solid ${colors.border}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: colors.textMain }}>{featured.bpm} BPM</span>}
                  <span style={{ padding: '4px 10px', background: colors.tagBg, border: `1px solid ${colors.border}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: colors.textMain }}>{featured.genre || 'Electronic'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. GRILLE PRINCIPALE + TOP 10 */}
        <div style={{ display: 'flex', gap: isMobile ? 20 : 40, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: colors.textMain, margin: 0, letterSpacing: '-0.5px' }}>Nouvelles sorties</h2>
              <Link to="/nouveautes" style={{ fontSize: 12, color: colors.textMuted, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                Tout voir {Icons.arrowRight}
              </Link>
            </div>
            <TrackGrid tracks={newReleases as any} onPlay={(t) => handlePlayTrack(t as any)} />
          </div>

          {!isMobile && (
            <aside style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: colors.panelBg, borderRadius: 16, border: `1px solid ${colors.border}`, padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: colors.textMain, margin: '0 0 20px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>Top 10 Chart</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {top10.map((track, idx) => (
                    <div key={track.id} onClick={() => navigate(`/track/${track.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
                      <span style={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', color: idx < 3 ? colors.accent : colors.textDark, width: 24 }}>0{idx + 1}</span>
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

        {/* 5. ARTISTES À LA UNE */}
        {artists.length > 0 && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: colors.accent, marginBottom: 6 }}>Communauté</div>
                <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 900, color: colors.textMain, margin: 0, letterSpacing: '-0.5px' }}>Artistes à découvrir</h2>
              </div>
              <Link to="/artists" style={{ fontSize: 12, color: colors.textMuted, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                Tout voir {Icons.arrowRight}
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: isMobile ? 12 : 16 }}>
              {artists.slice(0, isMobile ? 6 : 12).map((artist) => (
                <Link key={artist.id} to={`/premium/${artist.username}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none', padding: 12, borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.panelBg, transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '50%', background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : colors.tagBg, border: `2px solid ${colors.border}`, overflow: 'hidden' }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMain, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{artist.username}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 6. GENRES */}
        {genres.length > 0 && (
          <section>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: colors.accent, marginBottom: 6 }}>Explorer</div>
              <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 900, color: colors.textMain, margin: 0, letterSpacing: '-0.5px' }}>Par style musical</h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {genres.map((genre) => (
                <Link key={genre} to={`/nouveautes?genre=${encodeURIComponent(genre!)}`} style={{ padding: '10px 20px', background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 30, fontSize: 13, fontWeight: 700, color: colors.textMain, textDecoration: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.color = colors.accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textMain; }}
                >
                  {genre}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 7. COMMENT ÇA MARCHE */}
        <section>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? 24 : 40 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: colors.accent, marginBottom: 6 }}>Simple & rapide</div>
            <h2 style={{ fontSize: isMobile ? 22 : 32, fontWeight: 900, color: colors.textMain, margin: 0, letterSpacing: '-0.5px' }}>Comment ça marche ?</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 16 : 24 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: isMobile ? 20 : 32, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 60, fontWeight: 900, color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', lineHeight: 1 }}>0{i + 1}</div>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${colors.accent}15`, border: `1px solid ${colors.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent, marginBottom: 20 }}>
                  {step.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: colors.textMain, margin: '0 0 8px 0' }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: colors.textMuted, margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 8. CTA FINALE */}
        <section style={{
          background: isDark
            ? `linear-gradient(135deg, ${colors.accent}15, transparent 60%), ${colors.panelBg}`
            : `linear-gradient(135deg, ${colors.accent}10, transparent 60%), ${colors.panelBg}`,
          border: `1px solid ${colors.accent}40`,
          borderRadius: 24,
          padding: isMobile ? 32 : 60,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: colors.accent, opacity: 0.08, filter: 'blur(60px)' }} />
          <h2 style={{ fontSize: isMobile ? 24 : 36, fontWeight: 900, color: colors.textMain, margin: '0 0 12px 0', letterSpacing: '-1px', position: 'relative' }}>
            Prêt à faire vibrer la nuit ?
          </h2>
          <p style={{ fontSize: isMobile ? 14 : 16, color: colors.textMuted, margin: '0 auto 28px auto', maxWidth: 500, lineHeight: 1.6, position: 'relative' }}>
            Rejoins une communauté de DJs passionnés, partage tes sons et sois découvert par des milliers de fans.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <Link to="/auth" style={{ padding: '14px 32px', background: colors.accent, color: '#000', borderRadius: 30, fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: `0 8px 24px ${colors.accent}40` }}>
              Créer un compte gratuit
            </Link>
            <Link to="/premium" style={{ padding: '14px 32px', background: 'transparent', color: colors.textMain, border: `1px solid ${colors.btnSecondaryBorder}`, borderRadius: 30, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Découvrir Premium
            </Link>
          </div>
        </section>

        {/* 9. SECTION SERVICES ARTISTES */}
        <ArtistPromoSection />

      </div>

      {/* 10. FOOTER */}
      <footer style={{ background: colors.footerBg, borderTop: `1px solid ${colors.border}`, marginTop: 'auto' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: isMobile ? '40px 16px 24px' : '60px 24px 32px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1fr 1fr', gap: isMobile ? 32 : 48, marginBottom: 40 }}>

            <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900, fontSize: 13 }}>DZ</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: colors.textMain, letterSpacing: '-0.5px' }}>
                  DropZone<span style={{ color: colors.accent }}>.dj</span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6, margin: 0, maxWidth: 320 }}>
                La plateforme des DJs indépendants. Partage tes sons, connecte-toi avec la communauté et fais vibrer la nuit.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: 12, fontWeight: 800, color: colors.textMain, textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 16px 0' }}>Plateforme</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { to: '/nouveautes', label: 'Nouveautés' },
                  { to: '/artists', label: 'Artistes' },
                  { to: '/premium', label: 'Premium' },
                  { to: '/events', label: 'Événements' },
                ].map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} style={{ fontSize: 13, color: colors.textMuted, textDecoration: 'none' }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: 12, fontWeight: 800, color: colors.textMain, textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 16px 0' }}>Compte</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { to: '/auth', label: 'Se connecter' },
                  { to: '/auth', label: "S'inscrire" },
                  { to: '/settings', label: 'Mon profil' },
                  { to: '/upload', label: 'Uploader un son' },
                ].map((l, i) => (
                  <li key={i}>
                    <Link to={l.to} style={{ fontSize: 13, color: colors.textMuted, textDecoration: 'none' }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: 12, fontWeight: 800, color: colors.textMain, textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 16px 0' }}>Légal</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { to: '/mentions-legales', label: 'Mentions légales' },
                  { to: '/cgu', label: "CGU" },
                  { to: '/confidentialite', label: 'Confidentialité' },
                  { to: '/contact', label: 'Contact' },
                ].map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} style={{ fontSize: 13, color: colors.textMuted, textDecoration: 'none' }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 24, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>

            <div style={{ fontSize: 12, color: colors.textMuted, order: isMobile ? 2 : 1 }}>
              © {new Date().getFullYear()} DropZone.dj — Tous droits réservés
            </div>

            <div style={{ display: 'flex', gap: 10, order: isMobile ? 1 : 2 }}>
              {[
                { name: 'Instagram', url: '#', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> },
                { name: 'TikTok', url: '#', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg> },
                { name: 'SoundCloud', url: '#', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.998 14.766c-.06 1.63-1.418 2.93-3.078 2.93H11.29c-.286 0-.521-.23-.521-.511V8.16c0-.23.157-.427.382-.485.585-.153 1.284-.229 1.939-.229 3.187 0 5.93 2.145 6.662 5.218 1.991.033 3.613 1.562 3.613 3.445l.012 1.63zM9.82 7.246c-.102 0-.19.038-.26.104-.09.084-.146.206-.146.338v9.539c0 .261.2.477.459.503H1.662c-.911 0-1.656-.744-1.656-1.656v-5.41c0-.915.745-1.656 1.656-1.656h.134c.06-1.244.58-2.35 1.404-3.144.825-.795 1.94-1.29 3.198-1.29.685 0 1.338.152 1.92.426.16.077.25.238.25.414v1.99z"/></svg> },
                { name: 'X', url: '#', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg> },
              ].map((s) => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.name}
                  style={{ width: 36, height: 36, borderRadius: 8, background: colors.tagBg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, textDecoration: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = colors.accent; e.currentTarget.style.borderColor = colors.accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.borderColor = colors.border; }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};