// src/pages/PremiumPage.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { GlobalPlayer } from '../components/GlobalPlayer';
import './LevonDinato.css';

// ✅ VRAIS LOGOS SVG OFFICIELS
const SocialIcons = {
  tiktok: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
  spotify: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>,
  x: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>,
  youtube: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  facebook: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  instagram: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  soundcloud: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M23.998 14.766c-.06 1.63-1.418 2.93-3.078 2.93H11.29c-.286 0-.521-.23-.521-.511V8.16c0-.23.157-.427.382-.485.585-.153 1.284-.229 1.939-.229 3.187 0 5.93 2.145 6.662 5.218 1.991.033 3.613 1.562 3.613 3.445l.012 1.63zM9.82 7.246c-.102 0-.19.038-.26.104-.09.084-.146.206-.146.338v9.539c0 .261.2.477.459.503H1.662c-.911 0-1.656-.744-1.656-1.656v-5.41c0-.915.745-1.656 1.656-1.656h.134c.06-1.244.58-2.35 1.404-3.144.825-.795 1.94-1.29 3.198-1.29.685 0 1.338.152 1.92.426.16.077.25.238.25.414v1.99z"/></svg>,
};

const CanvasWaveform: React.FC<{ 
  peaks: number[]; isPlaying: boolean; themeColor: string; progress: number; isCurrent: boolean; onSeek: (ratio: number) => void;
}> = ({ peaks, isPlaying, themeColor, progress, isCurrent, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => { if (!isDraggingRef.current) setDragProgress(null); }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);
    if (!peaks || peaks.length === 0) return;

    const centerY = H / 2;
    const maxAmplitude = H * 0.45;
    const displayProgress = dragProgress !== null ? dragProgress : progress;
    const playedX = displayProgress * W;

    const barCount = 500;
    const step = Math.ceil(peaks.length / barCount);
    const displayPeaks = peaks.filter((_: any, i: number) => i % step === 0).slice(0, barCount);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 0;

    for (let i = 0; i < displayPeaks.length; i++) {
      const x = (i / displayPeaks.length) * W;
      const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
      const barHeight = Math.max(val * maxAmplitude, 2.5); 
      if (x >= playedX) ctx.fillRect(x, centerY - barHeight, 1, barHeight * 2);
    }

    if (isPlaying || displayProgress > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, playedX, H);
      ctx.clip();
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, 'rgba(0, 217, 255, 0.2)');
      gradient.addColorStop(0.5, 'rgba(0, 217, 255, 1)');
      gradient.addColorStop(1, 'rgba(0, 217, 255, 0.2)');
      ctx.fillStyle = gradient;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 6;
      for (let i = 0; i < displayPeaks.length; i++) {
        const x = (i / displayPeaks.length) * W;
        const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
        const barHeight = Math.max(val * maxAmplitude, 2.5);
        ctx.fillRect(x, centerY - barHeight, 1, barHeight * 2);
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    if (isPlaying || displayProgress > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(playedX, 0);
      ctx.lineTo(playedX, H);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [peaks, isPlaying, themeColor, progress, dragProgress]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCurrent) return;
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getRatio = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };

    const initialRatio = getRatio(e.clientX);
    setDragProgress(initialRatio);
    onSeek(initialRatio);

    let lastSeekTime = 0;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const ratio = getRatio(moveEvent.clientX);
      setDragProgress(ratio);
      const now = Date.now();
      if (now - lastSeekTime > 100) {
        lastSeekTime = now;
        onSeek(ratio);
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onSeek(getRatio(upEvent.clientX));
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <canvas 
      ref={canvasRef} onMouseDown={handleMouseDown} onClick={(e) => { if (isCurrent) e.stopPropagation(); }}
      style={{ width: '100%', height: '90px', display: 'block', borderRadius: '8px', cursor: isCurrent ? 'pointer' : 'default', touchAction: 'none' }} 
    />
  );
};

const PRESTATIONS_DATA = [
  { icon: '🎧', title: 'Clubs & Festivals', desc: 'Sets dynamiques, transitions propres et énergie communicative.' },
  { icon: '🥂', title: 'Soirées Privées & VIP', desc: 'Ambiance club sur mesure pour vos événements exclusifs.' },
  { icon: '🏢', title: 'Événements Pro', desc: 'Soirées d\'entreprise, lancements de produit et galas.' },
  { icon: '💎', title: 'Production & Remix', desc: 'Création de tracks originales et remixes sur mesure.' },
];

export const PremiumPage: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { play, currentTrack, isPlaying, togglePlay, stop, currentTime, duration, seek } = usePlayer();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleDownload = async (e: React.MouseEvent, url: string, filename: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl; link.download = filename;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); window.URL.revokeObjectURL(blobUrl);
    } catch (error) { window.open(url, '_blank'); }
  };

  const handleShare = async (e: React.MouseEvent, track: any) => {
    e.stopPropagation();
    const shareData = { title: `${track.title} - ${track.artist}`, text: `Écoute ${track.title} de ${track.artist} sur Dropzone !`, url: window.location.href };
    if (navigator.share) { try { await navigator.share(shareData); } catch (err) {} } 
    else { navigator.clipboard.writeText(window.location.href); alert('Lien copié dans le presse-papier !'); }
  };

  const getIframeSrc = (embedCode: string) => {
    if (!embedCode) return null;
    let src = embedCode;
    if (!embedCode.startsWith('http')) {
      const match = embedCode.match(/src=["'](.*?)["']/);
      if (match) src = match[1];
    }
    if (src.startsWith('http://')) src = src.replace('http://', 'https://');
    return src;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;
      setLoading(true);
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);
        let query = supabase.from('profiles').select('*');
        if (isUUID) query = query.eq('id', username);
        else query = query.ilike('username', username);

        const { data: profileData, error: profileError } = await query.single();
        if (profileError) { setProfile(null); setLoading(false); return; }

        if (profileData) {
          setProfile(profileData);
          const { data: tracksData } = await supabase.from('tracks').select('*').eq('user_id', profileData.id).order('created_at', { ascending: false });
          
          if (tracksData) {
            const formattedTracks = tracksData.map(t => {
              let parsedPeaks = [];
              if (typeof t.peaks === 'string') {
                try { parsedPeaks = JSON.parse(t.peaks); } catch (e) { parsedPeaks = []; }
              } else if (Array.isArray(t.peaks)) parsedPeaks = t.peaks;
              return { ...t, peaks: parsedPeaks };
            });
            setTracks(formattedTracks);
          }

          const today = new Date().toISOString().split('T')[0];
          const { data: eventsData } = await supabase.from('events').select('*').eq('created_by', profileData.id).gte('event_date', today).order('event_date', { ascending: true });
          if (eventsData) setEvents(eventsData);

          const { data: galleryData } = await supabase.from('profile_gallery').select('*').eq('user_id', profileData.id).order('created_at', { ascending: false });
          if (galleryData) setGallery(galleryData);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [username]);

  const handlePlayTrack = (track: any) => {
    if (track.audio_url && track.audio_url.length > 0) {
      play({
        id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url,
        cover_url: track.cover_url, user_id: track.user_id, duration: track.duration,
        peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre,
      });
    }
  };

  const formatTickerDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase();
    } catch { return 'DATE'; }
  };

  const renderTitle = (title: string): React.ReactNode => {
    if (!title) return null;
    const parts = title.split(/(\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <span key={index} style={{ color: 'var(--accent)' }}>{part.slice(1, -1)}</span>;
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  const topTracks = useMemo(() => {
    return [...tracks]
      .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0) || (b.downloads || 0) - (a.downloads || 0))
      .slice(0, 5);
  }, [tracks]);

  if (loading) return <div style={{ background: '#050a10', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>;
  if (!profile) return <div style={{ background: '#050a10', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Artiste introuvable.</div>;

  const gmailContactLink = `https://mail.google.com/mail/?view=cm&fs=1&to=djcontrolradiotv1@gmail.com&su=Booking%20${profile.username}&body=Salut,%20je%20souhaite%20vous%20contacter%20pour%20un%20booking.`;
  const themeColor = profile.theme_color || '#00d9ff';
  const isOwner = user && profile && user.id === profile.id;

  // ✅ CONFIGURATION DES RÉSEAUX AVEC LES VRAIS LOGOS
  const socials = [
    { key: 'tiktok_url', logo: SocialIcons.tiktok, color: '#ffffff', bg: 'rgba(255,255,255,0.1)' },
    { key: 'spotify_url', logo: SocialIcons.spotify, color: '#1DB954', bg: 'rgba(29, 185, 84, 0.1)' },
    { key: 'x_url', logo: SocialIcons.x, color: '#ffffff', bg: 'rgba(255,255,255,0.1)' },
    { key: 'youtube_url', logo: SocialIcons.youtube, color: '#FF0000', bg: 'rgba(255, 0, 0, 0.1)' },
    { key: 'facebook_url', logo: SocialIcons.facebook, color: '#1877F2', bg: 'rgba(24, 119, 242, 0.1)' },
    { key: 'instagram_url', logo: SocialIcons.instagram, color: '#E1306C', bg: 'rgba(225, 48, 108, 0.1)' },
    { key: 'soundcloud_url', logo: SocialIcons.soundcloud, color: '#FF5500', bg: 'rgba(255, 85, 0, 0.1)' },
  ].filter(s => profile[s.key]);

  return (
    <div className="levon-page" style={{ '--accent': themeColor } as React.CSSProperties}>
      
      <style>{`
        @media (max-width: 768px) {
          .wrapper.container { flex-direction: column; padding: 10px; }
          .content { width: 100%; }
          .sidebar { width: 100%; margin-top: 30px; }
          .nav-links { display: none; }
          .hero-title { font-size: 2rem !important; }
          .hero-desc { font-size: 0.95rem !important; }
          .track-card-header { flex-direction: column; align-items: flex-start !important; gap: 16px; }
          .track-card-actions { width: 100%; justify-content: space-between; }
          .gallery-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important; }
          .top-bar { padding: 10px 16px !important; }
          .hero-inner { padding: 40px 16px !important; }
          .prestations-grid { grid-template-columns: 1fr !important; }
        }
        
        section[id] { scroll-margin-top: 150px; }
      `}</style>

      <Helmet>
        <title>{profile.username} — Page Officielle</title>
        <meta property="og:title" content={`${profile.username} — DJ & Production`} />
        <meta property="og:image" content={profile.avatar_url || '/og-levon-dinato.jpg'} />
      </Helmet>

      {isOwner && (
        <div style={{ position: 'fixed', bottom: 90, right: 20, zIndex: 9999, display: 'flex', gap: 10 }}>
          <Link to="/settings" style={{ background: themeColor, color: '#000', padding: '12px 24px', borderRadius: 30, fontWeight: 800, textDecoration: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
            ✏️ Modifier ma page
          </Link>
        </div>
      )}

      <div className="top-bar">
        <button onClick={() => navigate('/')} className="back-btn">
          <span>←</span> Retour au site
        </button>
      </div>

      <header className="nav">
        <div className="wrapper nav-inner">
          <a href="#" className="logo">
            <img src={profile.avatar_url || "/logo.jpg"} alt={profile.username} style={{ borderRadius: '50%', objectFit: 'cover', width: '40px', height: '40px' }} />
            <span className="premium-badge">PREMIUM</span>
          </a>
          <ul className="nav-links">
            <li><a href="#about">À propos</a></li>
            <li><a href="#prestations">Prestations</a></li>
            <li><a href="#releases">Releases</a></li>
            {gallery.length > 0 && <li><a href="#gallery">Galerie</a></li>}
          </ul>
          <div className="nav-actions">
            <a href="#contact" className="btn-primary">Booking</a>
          </div>
        </div>
      </header>

      <div className="event-ticker-wrapper">
        <div className="event-ticker">
          {events.length > 0 ? (
            [...events, ...events, ...events].map((event, index) => (
              <div key={index} className="event-ticker-item">
                <div className="event-date-badge">{formatTickerDate(event.event_date)}</div>
                <div className="event-cover">
                  {event.image_url ? <img src={event.image_url} alt="" /> : <div className="event-cover-fallback">🎵</div>}
                </div>
                <div className="event-info">
                  <div className="event-title">{event.title}</div>
                  <div className="event-location">{event.location}</div>
                </div>
              </div>
            ))
          ) : (
            [...Array(3)].map((_, i) => (
              <div key={i} className="event-ticker-item">
                <div className="event-date-badge">BIENTÔT</div>
                <div className="event-info"><div className="event-title">Aucune date annoncée pour le moment.</div></div>
              </div>
            ))
          )}
        </div>
      </div>

      <section className="hero">
        <video className="bg-video" autoPlay muted loop playsInline poster={profile.avatar_url || "/logo.jpg"} style={{ objectFit: 'cover' }}>
          <source src={profile.background_video_url || "/background.mp4"} type="video/mp4" />
        </video>
        
        <div className="wrapper hero-inner">
          <div className="hero-tag">{profile.hero_tagline || "Nouveaux remixes disponibles"}</div>
          <h1 className="hero-title">
            {profile.hero_title ? renderTitle(profile.hero_title) : renderTitle(`L'expérience *sonore* de ${profile.username}.`)}
          </h1>
          <p className="hero-desc">
            {profile.hero_description || `Découvrez les productions exclusives et l'univers unique de ${profile.username}. Plongez dans leur monde musical et vibrez au rythme de leurs dernières sorties.`}
          </p>
          <div className="hero-actions">
            <a href="#releases" className="btn-primary">Écouter les tracks</a>
          </div>
        </div>
      </section>

      <div className="wrapper container">
        <div className="content">
          
          <section id="about">
            <div className="section-header"><h2 className="section-title">L'Artiste</h2></div>
            <div style={{ 
              display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '40px', padding: '40px', alignItems: 'center', 
              background: 'linear-gradient(145deg, rgba(13, 22, 33, 0.95), rgba(6, 13, 20, 0.95))', 
              border: '1px solid rgba(0, 217, 255, 0.15)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)' 
            }}>
              <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                <h3 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px', color: '#fff', letterSpacing: '-0.5px' }}>
                  {profile.username}
                </h3>
                <p style={{ color: '#8c9f98', fontSize: '1rem', margin: '0 0 32px 0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {profile.bio || "Découvrez son univers musical exclusif et ses dernières sorties."}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {profile.music_style && (
                    <div style={{ background: '#0a0a0a', borderLeft: `3px solid ${themeColor}`, padding: '16px 20px', borderRadius: '0 8px 8px 0', borderTop: '1px solid #222', borderRight: '1px solid #222', borderBottom: '1px solid #222' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Styles Musicaux</div>
                      <div style={{ fontSize: 13, color: '#888' }}>{profile.music_style}</div>
                    </div>
                  )}
                  {profile.influences && (
                    <div style={{ background: '#0a0a0a', borderLeft: '3px solid #8a2be2', padding: '16px 20px', borderRadius: '0 8px 8px 0', borderTop: '1px solid #222', borderRight: '1px solid #222', borderBottom: '1px solid #222' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Influences</div>
                      <div style={{ fontSize: 13, color: '#888' }}>{profile.influences}</div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ flex: '0 1 350px', margin: '0 auto' }}>
                <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', border: `2px solid ${themeColor}`, boxShadow: `0 10px 30px ${themeColor}40`, background: '#111' }}>
                  <img src={profile.avatar_url || "/logo.jpg"} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              </div>
            </div>
          </section>

          <section id="prestations">
            <div className="section-header"><h2 className="section-title">Prestations</h2></div>
            <div className="prestations-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              {PRESTATIONS_DATA.map((item, index) => (
                <div 
                  key={index} 
                  style={{ 
                    background: 'linear-gradient(145deg, rgba(13, 22, 33, 0.95), rgba(6, 13, 20, 0.95))', 
                    border: '1px solid rgba(0, 217, 255, 0.15)', 
                    borderRadius: '16px', 
                    padding: '32px',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = themeColor;
                    e.currentTarget.style.boxShadow = `0 10px 30px ${themeColor}20`;
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.15)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.icon}</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>{item.title}</h3>
                  <p style={{ fontSize: '14px', color: '#8c9f98', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="releases">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
              <h2 className="section-title" style={{ border: 'none', margin: 0, padding: 0 }}>Dernières Sorties</h2>
              {isOwner && (
                <Link to="/nouveautes" style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>+ Ajouter</Link>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {tracks.length > 0 ? (
                tracks.map((track) => {
                  const isPlayable = track.audio_url && track.audio_url.length > 0;
                  const iframeSrc = getIframeSrc(track.embed_code);
                  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                  const isCurrentTrack = currentTrack?.id === track.id;
                  const trackProgress = isThisPlaying && duration > 0 ? (currentTime / duration) : 0;
                  const isBeatport = !!iframeSrc;

                  const cardBgColor = track.player_bg_color || '#000000';
                  const cardBgImage = track.player_bg_image_url;
                  const customCardStyle = {
                    backgroundColor: cardBgColor,
                    backgroundImage: cardBgImage ? `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8)), url("${cardBgImage}")` : 'none',
                    backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
                  };
                  
                  const currentBackgroundStyle = isBeatport ? { backgroundColor: '#000000' } : customCardStyle;

                  return (
                    <div 
                      key={track.id} 
                      style={{ 
                        ...currentBackgroundStyle,
                        border: '1px solid #222222', borderRadius: '16px', overflow: 'hidden',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.4)', transition: 'all 0.2s',
                        cursor: isPlayable ? 'pointer' : 'default'
                      }}
                      onClick={() => isPlayable && handlePlayTrack(track)}
                      onMouseEnter={(e) => { if (isPlayable) e.currentTarget.style.borderColor = themeColor; }}
                      onMouseLeave={(e) => { if (isPlayable) e.currentTarget.style.borderColor = '#222222'; }}
                    >
                      <div className="track-card-header" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ 
                            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                            background: isPlayable ? (isThisPlaying ? themeColor : 'rgba(0,0,0,0.5)') : 'rgba(0,0,0,0.3)', 
                            border: isPlayable ? 'none' : '1px solid #333',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isPlayable ? (isThisPlaying ? '#000' : '#fff') : themeColor,
                            fontSize: '16px', backdropFilter: 'blur(5px)' 
                          }}>
                            {isPlayable ? (isThisPlaying ? '⏸' : '▶') : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            )}
                          </div>
                          <div style={{ width: '44px', height: '44px', flexShrink: 0, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#111', borderRadius: '8px', border: '1px solid #333' }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                            <div style={{ fontSize: '12px', color: '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>{track.artist}</div>
                          </div>
                        </div>
                        <div className="track-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ fontSize: '11px', color: '#ccc', fontWeight: '600', textTransform: 'uppercase' }}>{track.genre}</div>
                          {isPlayable && (
                            <button onClick={(e) => handleDownload(e, track.audio_url, `${track.artist} - ${track.title}.mp3`)} style={{ background: 'rgba(0,0,0,0.5)', color: themeColor, padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', border: `1px solid ${themeColor}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(5px)' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                              <span className="desktop-only-text">Télécharger</span>
                            </button>
                          )}
                        </div>
                      </div>
                      {iframeSrc && (
                        <div style={{ padding: '0 16px 16px 16px', position: 'relative', zIndex: 10, overflow: 'hidden', borderRadius: '8px' }} onClick={(e) => e.stopPropagation()}>
                          <iframe src={iframeSrc} width="100%" height="162" frameBorder="0" scrolling="no" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation" style={{ display: 'block', width: '100%', height: '162px', borderRadius: '8px', border: 'none', background: '#000', overflow: 'hidden' }}></iframe>
                        </div>
                      )}
                      {isPlayable && !iframeSrc && (
                        <div style={{ padding: '0 16px 16px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px', padding: '0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v14a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M5 10a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0v-4a3 3 0 0 0-3-3z"></path><path d="M19 7a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0v-7a3 3 0 0 0-3-3z"></path></svg>
                              <span style={{ color: themeColor, fontWeight: '900', fontSize: '16px', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.5px' }}>Dropzone</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <div style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'monospace', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                  <span style={{ color: themeColor }}>{formatTime(isThisPlaying ? currentTime : 0)}</span>
                                  <span style={{ color: '#888', fontSize: '12px' }}>/</span>
                                  <span style={{ color: '#ccc' }}>{formatTime(duration || track.duration)}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#ccc', fontWeight: '600', display: 'flex', gap: '12px', marginTop: '2px' }}>
                                  <span>{track.bpm} BPM</span>
                                  {track.song_key && <span>{track.song_key}</span>}
                                </div>
                              </div>
                              <button onClick={(e) => handleShare(e, track)} title="Partager ce son" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = themeColor; e.currentTarget.style.color = themeColor; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#fff'; }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                              </button>
                            </div>
                          </div>
                          <CanvasWaveform peaks={track.peaks} isPlaying={isThisPlaying} themeColor={themeColor} progress={trackProgress} isCurrent={isCurrentTrack} onSeek={seek} />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '20px', color: '#888' }}>Aucune musique pour le moment.</div>
              )}
            </div>
          </section>

          {gallery.length > 0 && (
            <section id="gallery">
              <div className="section-header"><h2 className="section-title">Galerie Photos</h2></div>
              <div className="gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {gallery.map((img) => (
                  <div key={img.id} style={{ aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', border: '1px solid #333', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    <img src={img.image_url} alt="Galerie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="sidebar" style={{ width: 340, flexShrink: 0 }}>
          <div className="sidebar-inner" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {topTracks.length > 0 && (
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Top Tracks</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {topTracks.map((track, index) => (
                    <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => handlePlayTrack(track)}>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: themeColor, fontStyle: 'italic', width: '16px' }}>{index + 1}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                        <div style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.genre}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Prochaines Dates</div>
              {events.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {events.map((event, index) => (
                    <div key={event.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: index !== events.length - 1 ? '16px' : 0, borderBottom: index !== events.length - 1 ? '1px solid #1e293b' : 'none' }}>
                      <div style={{ fontSize: '11px', color: themeColor, fontWeight: 700 }}>{new Date(event.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{event.title}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{event.city || event.location}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>Aucune date pour l'instant.</p>
              )}
            </div>

            {/* ✅ MODULE RÉSEAUX AVEC LES VRAIS LOGOS */}
            {socials.length > 0 && (
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Réseaux</div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {socials.map((social) => (
                    <a key={social.key} href={profile[social.key]} target="_blank" rel="noopener noreferrer" title={social.key} style={{ 
                      width: '42px', height: '42px', borderRadius: '50%', background: social.bg, border: `1px solid ${social.color}`, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: social.color, transition: 'all 0.2s',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = `0 0 15px ${social.color}60`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {social.logo}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: 'linear-gradient(145deg, #0f172a 0%, #0a101f 100%)', border: `1px solid ${themeColor}40`, borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>✨ PAGE PREMIUM</div>
              <p style={{ color: '#888', fontSize: '13px', margin: '0 0 16px 0', lineHeight: 1.5 }}>Envie d'une page aussi pro pour ton profil ?</p>
              <a href={gmailContactLink} target="_blank" rel="noopener noreferrer" style={{ 
                display: 'block', width: '100%', padding: '12px', borderRadius: '8px', 
                border: `1px solid ${themeColor}`, color: themeColor, fontSize: '12px', fontWeight: 800, 
                textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${themeColor}15`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                Me contacter
              </a>
            </div>

          </div>
        </aside>
      </div>

      <section className="contact-section" id="contact">
        <div className="wrapper">
          <h2>Prêt à enflammer votre scène ?</h2>
          <p>{profile.username} est disponible pour clubs, festivals et événements privés.</p>
          <a href={gmailContactLink} target="_blank" rel="noopener noreferrer" className="contact-email" style={{ borderColor: themeColor, color: themeColor }}>
            Contacter {profile.username} &rarr;
          </a>
        </div>
      </section>

      <footer className="footer">
        <div className="wrapper footer-inner">
          <div style={{ textAlign: 'center' }}>© 2026 {profile.username}. Tous droits réservés.</div>
        </div>
      </footer>

      {currentTrack && (
        <GlobalPlayer currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlay={togglePlay} onStop={stop} />
      )}
    </div>
  );
};