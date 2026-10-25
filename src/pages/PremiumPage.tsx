// src/pages/PremiumPage.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { GlobalPlayer } from '../components/GlobalPlayer';
import './LevonDinato.css';

const SocialIcons = {
  tiktok: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
  spotify: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>,
  x: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>,
  youtube: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  facebook: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  instagram: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  soundcloud: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23.998 14.766c-.06 1.63-1.418 2.93-3.078 2.93H11.29c-.286 0-.521-.23-.521-.511V8.16c0-.23.157-.427.382-.485.585-.153 1.284-.229 1.939-.229 3.187 0 5.93 2.145 6.662 5.218 1.991.033 3.613 1.562 3.613 3.445l.012 1.63zM9.82 7.246c-.102 0-.19.038-.26.104-.09.084-.146.206-.146.338v9.539c0 .261.2.477.459.503H1.662c-.911 0-1.656-.744-1.656-1.656v-5.41c0-.915.745-1.656 1.656-1.656h.134c.06-1.244.58-2.35 1.404-3.144.825-.795 1.94-1.29 3.198-1.29.685 0 1.338.152 1.92.426.16.077.25.238.25.414v1.99z"/></svg>,
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

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 0;

    for (let i = 0; i < displayPeaks.length; i++) {
      const x = (i / displayPeaks.length) * W;
      const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
      const barHeight = Math.max(val * maxAmplitude, 1.5); 
      if (x >= playedX) ctx.fillRect(x, centerY - barHeight, 1.5, barHeight * 2);
    }

    if (isPlaying || displayProgress > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, playedX, H);
      ctx.clip();
      ctx.fillStyle = themeColor;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 10;
      for (let i = 0; i < displayPeaks.length; i++) {
        const x = (i / displayPeaks.length) * W;
        const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
        const barHeight = Math.max(val * maxAmplitude, 1.5);
        ctx.fillRect(x, centerY - barHeight, 1.5, barHeight * 2);
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    if (isPlaying || displayProgress > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
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
      style={{ width: '100%', height: '40px', display: 'block', cursor: isCurrent ? 'pointer' : 'default', touchAction: 'none', opacity: isCurrent ? 1 : 0.6 }} 
    />
  );
};

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
    return [...tracks].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 5);
  }, [tracks]);

  if (loading) return <div style={{ background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>;
  if (!profile) return <div style={{ background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Artiste introuvable.</div>;

  const gmailContactLink = `https://mail.google.com/mail/?view=cm&fs=1&to=djcontrolradiotv1@gmail.com&su=Booking%20${profile.username}&body=Salut,%20je%20souhaite%20vous%20contacter%20pour%20un%20booking.`;
  const themeColor = profile.theme_color || '#00d9ff';
  const isOwner = user && profile && user.id === profile.id;

  const settings = profile.settings || {};
  const heroTitle = settings.hero_title || profile.hero_title || `L'expérience *sonore* ultime.`;
  const heroDesc = settings.hero_description || profile.hero_description || `Découvrez les productions Funky House, Nu-Disco et Tech House du duo ${profile.username}. Un set conçu pour faire vibrer les dancefloors et marquer les esprits.`;
  const bio = settings.bio || profile.bio || "Levon & Dinato est un duo électrisant qui fusionne leurs influences uniques pour créer un son reconnaissable et contagieux. Unis par une passion commune pour la Funky House, la Nu-Disco, la Tech House et l'Electro Dance.";
  
  const showStats = settings.show_stats !== false;
  const showDuo = settings.show_duo !== false;
  const showPrestations = settings.show_prestations !== false;
  const showReleases = settings.show_releases !== false;
  const showSidebarTop = settings.show_sidebar_top !== false;
  const showSidebarDates = settings.show_sidebar_dates !== false;

  const prestations = settings.prestations && settings.prestations.length > 0 ? settings.prestations : [
    { title: 'Clubs & Festivals', desc: 'Sets dynamiques et énergie communicative.' },
    { title: 'Événements Privés', desc: 'Ambiance sur mesure pour vos invités.' },
    { title: 'Corporate', desc: 'Soirées d\'entreprise et lancements.' },
    { title: 'Production', desc: 'Création de tracks originales et remixes.' },
  ];

  const socials = [
    { key: 'tiktok_url', logo: SocialIcons.tiktok, color: '#ffffff' },
    { key: 'spotify_url', logo: SocialIcons.spotify, color: '#1DB954' },
    { key: 'x_url', logo: SocialIcons.x, color: '#ffffff' },
    { key: 'youtube_url', logo: SocialIcons.youtube, color: '#FF0000' },
    { key: 'facebook_url', logo: SocialIcons.facebook, color: '#1877F2' },
    { key: 'instagram_url', logo: SocialIcons.instagram, color: '#E1306C' },
    { key: 'soundcloud_url', logo: SocialIcons.soundcloud, color: '#FF5500' },
  ].filter(s => profile[s.key]);

  return (
    <div style={{ background: '#050505', minHeight: '100vh', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', '--accent': themeColor } as React.CSSProperties}>
      
      <style>{`
        .hover-row { transition: background 0.2s; }
        .hover-row:hover { background: rgba(255,255,255,0.03); }
        .hover-row:hover .play-btn { opacity: 1; transform: scale(1); }
        .play-btn { opacity: 0; transform: scale(0.9); transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .hover-img { transition: transform 0.3s; }
        .hover-row:hover .hover-img { transform: scale(1.05); }
        .nav-link { color: rgba(255,255,255,0.5); text-decoration: none; font-size: 14px; font-weight: 600; transition: color 0.2s; }
        .nav-link:hover { color: #fff; }
        .btn-primary { background: #fff; color: #000; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 800; text-decoration: none; transition: transform 0.2s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-primary:hover { transform: scale(1.02); }

        html { scroll-behavior: smooth; }
        section[id] { scroll-margin-top: 100px; }
        
        @media (max-width: 900px) {
          .layout-grid { flex-direction: column !important; }
          .sidebar { width: 100% !important; border-left: none !important; padding-left: 0 !important; }
          .hero-title { font-size: 3.5rem !important; }
        }
      `}</style>

      <Helmet>
        <title>{profile.username} — Artiste</title>
      </Helmet>

      {/* NAVIGATION FIXE */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 72, background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(20px)', zIndex: 1000, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={profile.avatar_url || "/logo.jpg"} alt="Avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.5px' }}>{profile.username}</span>
              <span style={{ fontSize: 10, fontWeight: 800, background: themeColor, color: '#000', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.5px' }}>PRO</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }} className="nav-links">
            {/* ✅ Lien changé en "Bio" */}
            <a href="#duo" className="nav-link">Bio</a>
            <a href="#prestations" className="nav-link">Prestations</a>
            <a href="#releases" className="nav-link">Releases</a>
          </div>
          <div>
            <a href={gmailContactLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '8px 20px', fontSize: 12 }}>Booking</a>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={{ position: 'relative', minHeight: '95vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#050505', paddingTop: 72 }}>
        
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <video 
            autoPlay muted loop playsInline poster={profile.avatar_url || "/logo.jpg"} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, filter: 'grayscale(85%) contrast(130%) brightness(0.6) blur(2px)', transform: 'scale(1.05)' }}
          >
            <source src={profile.background_video_url || "/background.mp4"} type="video/mp4" />
          </video>
          <div style={{ position: 'absolute', inset: 0, background: themeColor, mixBlendMode: 'overlay', opacity: 0.15 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(5,5,5,0.8) 100%)' }} />
        </div>
        
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 1000, padding: '0 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', padding: '8px 20px', borderRadius: 50, border: `1px solid ${themeColor}60`, marginBottom: 24 }}>
            <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#fff' }}>{settings.hero_tagline || "Nouveaux remixes disponibles"}</span>
          </div>
          
          <h1 className="hero-title" style={{ fontSize: 'clamp(3.5rem, 8vw, 6rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-3px', marginBottom: 24, textShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            {renderTitle(heroTitle)}
          </h1>
          
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'clamp(1rem, 2vw, 1.2rem)', lineHeight: 1.6, marginBottom: 40, maxWidth: 600, margin: '0 auto 40px auto', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            {heroDesc}
          </p>
          
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#releases" className="btn-primary" style={{ background: 'transparent', border: `1px solid ${themeColor}`, color: themeColor, padding: '16px 32px', fontSize: 14 }}>
              ÉCOUTER LES TRACKS
            </a>
            <button onClick={() => navigator.clipboard.writeText(window.location.href).then(() => alert('Lien copié !'))} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '16px 32px', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
              PARTAGER
            </button>
          </div>

          {showStats && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 60, marginTop: 60, paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{settings.stat1_value || '12+'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{settings.stat1_label || "Années d'expérience"}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{settings.stat2_value || '50+'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{settings.stat2_label || "Tracks & Remixes"}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{settings.stat3_value || '100%'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{settings.stat3_label || "Pistes en feu"}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* EVENT TICKER */}
      <div style={{ background: '#0a0f18', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b', padding: '12px 0', overflow: 'hidden', position: 'relative', zIndex: 20 }}>
        <div style={{ display: 'flex', gap: 24, width: 'max-content', animation: 'scroll 30s linear infinite' }}>
          {events.length > 0 ? (
            [...events, ...events, ...events].map((event, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: 50 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: themeColor, background: `${themeColor}15`, padding: '4px 8px', borderRadius: 4 }}>{new Date(event.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{event.title}</span>
                <span style={{ fontSize: 12, color: '#666' }}>{event.location || event.city}</span>
              </div>
            ))
          ) : (
             <div style={{ fontSize: 13, color: '#666', padding: '0 20px' }}>Aucune date annoncée pour le moment.</div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="layout-grid" style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 80, padding: '80px 24px 100px 24px', alignItems: 'flex-start' }}>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          
          {showDuo && (
            <section id="duo" style={{ marginBottom: 80 }}>
              {/* ✅ Titre dynamique qui s'adapte ("Bio" par défaut maintenant) */}
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, letterSpacing: '-0.5px' }}>{settings.duo_title || 'Bio'}</h2>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '40px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: themeColor }} />
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, lineHeight: 1.9, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {bio}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 32 }}>
                  {profile.music_style && profile.music_style.split(',').map((style: string, i: number) => (
                    <span key={i} style={{ border: `1px solid ${themeColor}40`, background: `${themeColor}10`, padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, color: themeColor }}>
                      {style.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {showPrestations && (
            <section id="prestations" style={{ marginBottom: 80 }}>
               <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, letterSpacing: '-0.5px' }}>{settings.prestations_title || 'Prestations'}</h2>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                 {prestations.map((item: any, i: number) => (
                   <div key={i} style={{ padding: 32, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, background: 'rgba(255,255,255,0.02)' }}>
                     <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px 0', color: '#fff' }}>{item.title}</h3>
                     <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
                   </div>
                 ))}
               </div>
            </section>
          )}

          {showReleases && (
            <section id="releases">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>{settings.releases_title || 'Dernières Sorties'}</h2>
                {isOwner && (
                  <Link to="/nouveautes" style={{ color: themeColor, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Gérer</Link>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {tracks.length > 0 ? tracks.map((track, index) => {
                  const isPlayable = track.audio_url && track.audio_url.length > 0;
                  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                  const isCurrentTrack = currentTrack?.id === track.id;
                  const iframeSrc = getIframeSrc(track.embed_code);
                  const isBeatport = !!iframeSrc;

                  if (isBeatport) {
                    return (
                      <div key={track.id} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16, overflow: 'hidden', padding: 24 }}>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
                          <div style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {track.cover_url ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                              <h3 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>{track.title}</h3>
                              <span style={{ fontSize: 10, fontWeight: 800, color: '#01FF95', background: 'rgba(1, 255, 149, 0.1)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(1, 255, 149, 0.2)' }}>BEATPORT</span>
                            </div>
                            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{track.artist} • {track.genre}</div>
                          </div>
                        </div>
                        <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', width: '100%' }}>
                          <iframe src={iframeSrc!} width="100%" height="162" frameBorder="0" scrolling="no" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation" style={{ display: 'block', width: '100%' }}></iframe>
                        </div>
                      </div>
                    );
                  }

                  const cardBgColor = track.player_bg_color || '#000000';
                  const cardBgImage = track.player_bg_image_url;
                  
                  const customCardStyle = {
                    backgroundColor: cardBgImage ? '#000000' : (cardBgColor || '#0a0a0f'),
                    backgroundImage: cardBgImage ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url("${cardBgImage}")` : 'none',
                    backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
                  };

                  return (
                    <div 
                      key={track.id} 
                      className="hover-row"
                      onClick={() => isPlayable && handlePlayTrack(track)}
                      style={{ 
                        ...customCardStyle,
                        display: 'flex', flexDirection: 'column', padding: '24px', borderRadius: 16, 
                        cursor: isPlayable ? 'pointer' : 'default', border: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {track.cover_url ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0 }}>{track.title}</h3>
                              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4 }}>{track.genre}</span>
                            </div>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{track.artist}</div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                           {isPlayable && (
                             <button onClick={(e) => handleDownload(e, track.audio_url, `${track.artist} - ${track.title}.mp3`)} style={{ background: 'transparent', border: `1px solid ${themeColor}`, borderRadius: 6, padding: '6px 16px', color: themeColor, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = `${themeColor}20`} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Télécharger
                             </button>
                           )}
                           <button style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                             {isThisPlaying ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                             ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                             )}
                           </button>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: '12px 16px', zIndex: 1, border: '1px solid rgba(255,255,255,0.05)' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v14a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M5 10a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0v-4a3 3 0 0 0-3-3z"></path><path d="M19 7a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0v-7a3 3 0 0 0-3-3z"></path></svg>
                              <span style={{ color: themeColor, fontWeight: 900, fontSize: '14px', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.5px' }}>Dropzone</span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                <span style={{ color: themeColor }}>{formatTime(isThisPlaying ? currentTime : 0)}</span>
                                <span style={{ color: '#888', fontSize: 11 }}>/</span>
                                <span style={{ color: '#ccc' }}>{formatTime(track.duration)}</span>
                              </div>
                              <div style={{ fontSize: 11, color: '#ccc', fontWeight: 600, display: 'flex', gap: 12 }}>
                                <span>{track.bpm} BPM</span>
                                <span>{track.song_key || '—'}</span>
                              </div>
                            </div>
                         </div>
                         
                         <CanvasWaveform 
                            peaks={track.peaks} 
                            isPlaying={isThisPlaying} 
                            themeColor={themeColor} 
                            progress={isThisPlaying && duration > 0 ? currentTime / duration : 0} 
                            isCurrent={isCurrentTrack} 
                            onSeek={seek} 
                         />
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ padding: '40px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Aucune sortie disponible.</div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <aside className="sidebar" style={{ width: 320, flexShrink: 0, paddingLeft: 40, borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
               <img src={profile.avatar_url || "/logo.jpg"} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>Réseaux</span>
               <div style={{ display: 'flex', gap: 12 }}>
                 {socials.slice(0, 4).map(s => (
                   <a key={s.key} href={profile[s.key]} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.6)', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = s.color} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}>
                     {s.logo}
                   </a>
                 ))}
               </div>
            </div>
          </div>

          {showSidebarTop && topTracks.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 16px 0', color: '#fff' }}>Top Tracks</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {topTracks.map((track, index) => (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => handlePlayTrack(track)}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: index === 0 ? themeColor : 'rgba(255,255,255,0.2)', width: 16 }}>{index + 1}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.genre}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showSidebarDates && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 16px 0', color: '#fff' }}>Prochaines Dates</h3>
              {events.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {events.map(e => (
                     <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                       <div style={{ fontSize: 11, color: themeColor, fontWeight: 800, letterSpacing: '0.5px' }}>{new Date(e.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()}</div>
                       <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{e.title}</div>
                       <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{e.city}</div>
                     </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Aucune date prévue.</p>
              )}
            </div>
          )}

          <div style={{ marginTop: 60, padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 600, margin: '0 0 16px 0' }}>Disponible pour Booking</p>
            <a href={gmailContactLink} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', padding: '12px', background: '#fff', color: '#000', textDecoration: 'none', fontSize: 13, fontWeight: 800, borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contacter</a>
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: '#020202', padding: '60px 24px 30px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 40 }}>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <img src={profile.avatar_url || "/logo.jpg"} alt="Logo" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${themeColor}60` }} />
                <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px' }}>{profile.username}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6, maxWidth: 300, margin: 0 }}>
                Plongez dans l'univers sonore unique de {profile.username}. Des productions exclusives pour faire vibrer vos dancefloors.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 60, flexWrap: 'wrap' }}>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#fff', marginBottom: 16 }}>Navigation</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <li><a href="#duo" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>Bio</a></li>
                  <li><a href="#prestations" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>Prestations</a></li>
                  <li><a href="#releases" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>Dernières Sorties</a></li>
                </ul>
              </div>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#fff', marginBottom: 16 }}>Plateforme</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <li><Link to="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>Accueil</Link></li>
                  <li><Link to="/nouveautes" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>Nouveautés</Link></li>
                  <li><Link to="/artists" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>Artistes</Link></li>
                </ul>
              </div>
            </div>

            <div style={{ flex: '1 1 200px' }}>
              <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#fff', marginBottom: 16 }}>Suivez l'artiste</h4>
              <div style={{ display: 'flex', gap: 12 }}>
                {socials.map(s => (
                  <a key={s.key} href={profile[s.key]} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = s.color; e.currentTarget.style.transform = 'translateY(-2px)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                    {s.logo}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: 0 }}>
              © {new Date().getFullYear()} {profile.username}. Tous droits réservés.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: 0 }}>
              Propulsé par <span style={{ color: themeColor, fontWeight: 700 }}>Dropzone</span>
            </p>
          </div>
        </div>
      </footer>

      {currentTrack && (
        <GlobalPlayer currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlay={togglePlay} onStop={stop} />
      )}
    </div>
  );
};

export default PremiumPage;