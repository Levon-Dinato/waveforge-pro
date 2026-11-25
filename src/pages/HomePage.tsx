// src/pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { TrackStrip } from '../components/TrackStrip';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
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
  embed_code?: string;
  purchase_url?: string;
}

export const HomePage = () => {
  const isMobile = useIsMobile(768);
  const navigate = useNavigate();
  const { play, isPlaying, currentTrack } = usePlayer() as any;
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  const [tracks, setTracks] = useState<ExtendedTrack[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [embedModalTrack, setEmbedModalTrack] = useState<any>(null);

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
    accent: '#94c748',
    footerBg: isDark ? '#050505' : '#ffffff',
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ ÉTAPE 1 : Récupérer uniquement les profils Premium
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('is_premium', true) // On ne garde que les premium
          .limit(12);
          
        if (profilesData) {
          setArtists(profilesData as Artist[]);
          
          const premiumIds = profilesData.map(p => p.id);
          
          // ✅ ÉTAPE 2 : Récupérer les sons UNIQUEMENT de ces profils Premium
          if (premiumIds.length > 0) {
            const { data: tracksData } = await supabase
              .from('tracks')
              .select('*')
              .in('user_id', premiumIds) // Filtre par les IDs des premiums
              .or('is_jingle.is.null,is_jingle.eq.false') // ✅ Ignore les jingles
              .or('is_private.is.null,is_private.eq.false') // ✅ Ignore les titres privés
              .order('created_at', { ascending: false })
              .limit(30);
              
            if (tracksData) setTracks(tracksData as ExtendedTrack[]);
          }
        }
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

    // ✅ Promo embed : extrait joué dans une fenêtre (comme la page Promos)
    if (!featured.audio_url) {
      if (featured.embed_code) { setEmbedModalTrack(featured); return; }
      if (featured.purchase_url) { window.open(featured.purchase_url, '_blank'); return; }
      return;
    }

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
    
    if (isNew && user) incrementPlayCount(featured);
  };

  const handlePlayTrack = (track: any) => {
    // ✅ Promo embed : extrait joué dans une fenêtre (comme la page Promos)
    if (!track.audio_url) {
      if (track.embed_code) { setEmbedModalTrack(track); return; }
      if (track.purchase_url) { window.open(track.purchase_url, '_blank'); return; }
      return;
    }

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
    { icon: Icons.upload, title: t('home.step1_title'), desc: t('home.step1_desc') },
    { icon: Icons.share, title: t('home.step2_title'), desc: t('home.step2_desc') },
    { icon: Icons.bolt, title: t('home.step3_title'), desc: t('home.step3_desc') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif', color: colors.textMain, width: '100%', maxWidth: '100%', overflowX: 'hidden', background: colors.bg, transition: 'background 0.3s ease, color 0.3s ease' }}>

      <Helmet>
        <title>ELEKTRAQ — La radio des artistes électroniques indépendants</title>
        <meta name="description" content="La radio des artistes électroniques indépendants : les artistes uploadent leurs nouveautés, les DJs les découvrent à l'antenne 24/7 et les achètent sur les plateformes légales." />
        <meta property="og:title" content="ELEKTRAQ — La radio des artistes électroniques indépendants" />
        <meta property="og:description" content="Les artistes uploadent leurs nouveautés, les DJs les découvrent à l'antenne 24/7 et les achètent sur les plateformes légales." />
        <meta property="og:type" content="website" />
      </Helmet>

      <EventsTicker />

      <style>{`@keyframes pulseLive { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }`}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', paddingLeft: isMobile ? 12 : 24, paddingRight: isMobile ? 12 : 24, display: 'flex', flexDirection: 'column', gap: isMobile ? 24 : 48, paddingTop: 24, paddingBottom: isMobile ? 40 : 80 }}>

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

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: colors.accent, width: 'fit-content', marginBottom: 16, letterSpacing: '1px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.accent, boxShadow: `0 0 8px ${colors.accent}` }} />
              {t('home.badge')}
            </div>

            <h1 style={{ fontSize: isMobile ? '2rem' : '3.6rem', fontWeight: 900, margin: '0 0 16px 0', letterSpacing: '-1.5px', lineHeight: 1.12, textShadow: isDark ? '0 4px 20px rgba(0,0,0,0.8)' : 'none', color: colors.textMain }}>
              {t('home.hero_1')}<br />
              <span style={{ color: colors.accent }}>{t('home.hero_2')}</span><br />
              {t('home.hero_3')}
            </h1>

            <p style={{ color: colors.textMuted, fontSize: isMobile ? 14 : 18, margin: '0 0 24px 0', lineHeight: 1.5, maxWidth: 480 }}>
              {t('home.hero_sub')}
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <Link to="/radio/ELEKTRAQ" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '12px 22px' : '16px 34px', background: colors.accent, color: '#000', borderRadius: 30, fontWeight: 800, fontSize: isMobile ? 14 : 16, textDecoration: 'none', boxShadow: `0 8px 24px ${colors.accent}40` }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff2d55', animation: 'pulseLive 1.5s infinite' }} />
                {t('home.listen_releases')} {Icons.arrowRight}
              </Link>
              <Link to="/auth" style={{ padding: isMobile ? '10px 20px' : '14px 32px', background: colors.btnSecondaryBg, color: colors.textMain, border: `1px solid ${colors.btnSecondaryBorder}`, borderRadius: 30, fontWeight: 600, fontSize: isMobile ? 13 : 15, textDecoration: 'none' }}>
                {t('home.join')}
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex' }}>
                {artists.slice(0, 4).map((a, i) => (
                  <div key={a.id} style={{ width: 32, height: 32, borderRadius: '50%', background: a.avatar_url ? `url(${a.avatar_url}) center/cover` : colors.textDark, border: `2px solid ${colors.bg}`, marginLeft: i > 0 ? -10 : 0 }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>
                <span style={{ color: colors.textMain, fontWeight: 800 }}>{artists.length > 0 ? `${artists.length * 15}+` : '500+'}</span> {t('home.artists_registered')}
              </div>
            </div>
          </div>
        </div>

        {/* 2. STATS BAR */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '24px 0', borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }}>
          {[
            { icon: Icons.headphones, value: `${tracks.length * 12}+`, label: t('home.sounds_shared') },
            { icon: Icons.users, value: `${artists.length * 15}+`, label: t('home.active_artists') },
            { icon: Icons.music, value: '24/7', label: t('home.new_sounds') },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderLeft: i > 0 ? `1px solid ${colors.border}` : 'none' }}>
              <div style={{ color: colors.accent }}>{s.icon}</div>
              <div style={{ fontSize: isMobile ? 22 : 36, fontWeight: 900, color: colors.textMain, letterSpacing: '-1px' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 3. TRACK À LA UNE */}
        {featured ? (
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, overflow: 'hidden', height: isMobile ? 'auto' : 320, position: 'relative' }}>
            <div style={{ width: isMobile ? '100%' : 320, height: isMobile ? 200 : '100%', background: featured.cover_url ? `url(${featured.cover_url}) center/cover` : colors.textDark, position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 16, left: 16, background: '#b0b0b0', color: '#fff', padding: '4px 12px', borderRadius: 30, fontSize: 10, fontWeight: 900, letterSpacing: '1px', zIndex: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                {Icons.star} {t('home.featured_badge')}
              </div>
            </div>
            <div style={{ flex: 1, padding: isMobile ? 20 : 40, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 8 }}>{t('home.track_of_moment')}</div>
              <h2 style={{ fontSize: isMobile ? 22 : 40, fontWeight: 900, margin: '0 0 8px 0', lineHeight: 1.1, letterSpacing: '-0.5px', color: colors.textMain }}>{featured.title}</h2>
              <div style={{ fontSize: isMobile ? 14 : 18, color: colors.textMuted, marginBottom: 20 }}>{featured.artist}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={playFeatured} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '10px 20px' : '14px 28px', background: isFeaturedPlaying ? 'rgba(255, 255, 255, 0.15)' : colors.accent, color: isFeaturedPlaying ? colors.accent : '#000', border: isFeaturedPlaying ? `1px solid ${colors.accent}` : 'none', borderRadius: 30, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {isFeaturedPlaying ? <>{Icons.pause} {t('home.listening')}</> : <>{Icons.play} {t('home.listen')}</>}
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  {featured.bpm && <span style={{ padding: '4px 10px', background: colors.tagBg, border: `1px solid ${colors.border}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: colors.textMain }}>{featured.bpm} BPM</span>}
                  <span style={{ padding: '4px 10px', background: colors.tagBg, border: `1px solid ${colors.border}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: colors.textMain }}>{featured.genre || 'Electronic'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted, background: colors.panelBg, borderRadius: 16, border: `1px solid ${colors.border}` }}>{t('home.no_featured')}</div>
        )}

        {/* 4. RAYONS HORIZONTAUX (style Beatport) */}
        <TrackStrip title={t('home.new_releases')} tracks={newReleases} onPlay={handlePlayTrack} seeAllUrl="/nouveautes" seeAllLabel={t('home.see_all')} />
        {top10.length > 0 && (
          <TrackStrip title={t('home.top10')} tracks={top10} ranked onPlay={handlePlayTrack} seeAllUrl="/charts" seeAllLabel={t('home.see_all')} />
        )}

        {/* 5. ARTISTES À LA UNE */}
        {artists.length > 0 && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: colors.accent, marginBottom: 6 }}>{t('home.community')}</div>
                <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 900, color: colors.textMain, margin: 0, letterSpacing: '-0.5px' }}>{t('home.discover_artists')}</h2>
              </div>
              <Link to="/artists" style={{ fontSize: 12, color: colors.accent, textDecoration: 'none', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 4 }}>
                {t('home.see_all')} {Icons.arrowRight}
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
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: colors.accent, marginBottom: 6 }}>{t('home.explore')}</div>
              <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 900, color: colors.textMain, margin: 0, letterSpacing: '-0.5px' }}>{t('home.by_style')}</h2>
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

        {/* 7. RADIOS EN DIRECT */}
        {artists.length > 0 && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#b0b0b0', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#b0b0b0', animation: 'pulse 1.5s infinite' }} />
                  {t('home.live')}
                </div>
                <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 900, color: colors.textMain, margin: 0, letterSpacing: '-0.5px' }}>{t('home.community_radios')}</h2>
              </div>
              <Link to="/radios" style={{ fontSize: 12, color: colors.accent, textDecoration: 'none', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 4 }}>
                {t('home.see_all_radios')} {Icons.arrowRight}
              </Link>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
              {artists.slice(0, 3).map((artist) => (
                <Link key={artist.id} to={`/radio/${artist.username}`} style={{ display: 'flex', alignItems: 'center', gap: 16, background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 16, textDecoration: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#b0b0b0'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : colors.textDark, flexShrink: 0, border: '2px solid rgba(176, 176, 176, 0.3)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: colors.textMain, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist.username}</div>
                    <div style={{ fontSize: 12, color: '#b0b0b0', fontWeight: 600 }}>{t('home.listen_radio')}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 8. COMMENT ÇA MARCHE */}
        <section>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? 24 : 40 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: colors.accent, marginBottom: 6 }}>{t('home.simple_fast')}</div>
            <h2 style={{ fontSize: isMobile ? 22 : 32, fontWeight: 900, color: colors.textMain, margin: 0, letterSpacing: '-0.5px' }}>{t('home.how_it_works')}</h2>
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

        {/* 9. CTA FINALE */}
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
            {t('home.cta_title')}
          </h2>
          <p style={{ fontSize: isMobile ? 14 : 16, color: colors.textMuted, margin: '0 auto 28px auto', maxWidth: 500, lineHeight: 1.6, position: 'relative' }}>
            {t('home.cta_sub')}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <Link to="/auth" style={{ padding: '14px 32px', background: colors.accent, color: '#000', borderRadius: 30, fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: `0 8px 24px ${colors.accent}40` }}>
              {t('home.cta_create')}
            </Link>
            <Link to="/premium" style={{ padding: '14px 32px', background: 'transparent', color: colors.textMain, border: `1px solid ${colors.btnSecondaryBorder}`, borderRadius: 30, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              {t('home.cta_premium')}
            </Link>
          </div>
        </section>

        {/* 10. SECTION SERVICES ARTISTES */}
        <ArtistPromoSection />

      </div>

      {/* ✅ Le footer est désormais global (MainLayout) — supprimé ici pour éviter le doublon */}

      {/* Animation pour le point rouge */}
      <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }`}</style>

      {embedModalTrack && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={(e) => { if (e.target === e.currentTarget) setEmbedModalTrack(null); }}>
          <div style={{ padding: 24, width: '100%', maxWidth: 560, background: colors.panelBg, borderRadius: 16, border: `1px solid ${colors.border}`, position: 'relative', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
            <button onClick={() => setEmbedModalTrack(null)} style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 20 }}>✕</button>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16, paddingRight: 30 }}>
              {embedModalTrack.cover_url && <img src={embedModalTrack.cover_url} alt="cover" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: `1px solid ${colors.border}`, flexShrink: 0 }} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{embedModalTrack.title}</div>
                <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{embedModalTrack.artist}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>🎧 {t('nouveautes.embed_listen')}</div>
            <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${colors.border}` }} dangerouslySetInnerHTML={{ __html: embedModalTrack.embed_code }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              {embedModalTrack.purchase_url && (
                <a href={embedModalTrack.purchase_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', padding: '12px', background: colors.accent, color: '#000', borderRadius: 10, fontWeight: 800, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>🛒 {t('nouveautes.open_official')}</a>
              )}
              <button onClick={() => { setEmbedModalTrack(null); navigate('/track/' + embedModalTrack.id); }} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${colors.btnSecondaryBorder}`, color: colors.textMain, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('nouveautes.view_track')}</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};