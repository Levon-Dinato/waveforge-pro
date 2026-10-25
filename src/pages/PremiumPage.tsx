// src/pages/PremiumPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { GlobalPlayer } from '../components/GlobalPlayer';
import './LevonDinato.css';

// ✅ COMPOSANT CANVAS WAVEFORM (Inchangé)
const CanvasWaveform: React.FC<{ 
  peaks: number[]; 
  isPlaying: boolean; 
  themeColor: string; 
  progress: number; 
  isCurrent: boolean; 
  onSeek: (ratio: number) => void;
}> = ({ peaks, isPlaying, themeColor, progress, isCurrent, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) setDragProgress(null);
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
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
      ref={canvasRef} 
      onMouseDown={handleMouseDown} 
      onClick={(e) => { if (isCurrent) e.stopPropagation(); }}
      style={{ width: '100%', height: '90px', display: 'block', borderRadius: '8px', cursor: isCurrent ? 'pointer' : 'default' }} 
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
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  const handleShare = async (e: React.MouseEvent, track: any) => {
    e.stopPropagation();
    const shareData = {
      title: `${track.title} - ${track.artist}`,
      text: `Écoute ${track.title} de ${track.artist} sur Dropzone !`,
      url: window.location.href,
    };

    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papier !');
    }
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
          // ✅ VERIFICATION DANS LA CONSOLE
          console.log("Données du profil chargées :", profileData);
          console.log("URL de l'image de fond :", profileData.player_bg_image_url);
          
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
      } catch (err) {
        console.error("Erreur inattendue:", err);
      } finally {
        setLoading(false);
      }
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

  if (loading) return <div style={{ background: '#050a10', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>;
  if (!profile) return <div style={{ background: '#050a10', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Artiste introuvable.</div>;

  const gmailContactLink = `https://mail.google.com/mail/?view=cm&fs=1&to=djcontrolradiotv1@gmail.com&su=Booking%20${profile.username}&body=Salut,%20je%20souhaite%20vous%20contacter%20pour%20un%20booking.`;
  const themeColor = profile.theme_color || '#00d9ff';
  const isOwner = user && profile && user.id === profile.id;

  // ✅ SÉCURISATION DU FOND
  const playerBgImage = profile.player_bg_image_url ? profile.player_bg_image_url.trim() : null;
  const playerBgColor = profile.player_bg_color || '#000000';
  
  // On applique l'image et la couleur séparément pour éviter les bugs
  const cardBgStyle = {
    backgroundColor: playerBgColor,
    backgroundImage: playerBgImage ? `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8)), url("${playerBgImage}")` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div className="levon-page" style={{ '--accent': themeColor } as React.CSSProperties}>
      <Helmet>
        <title>{profile.username} — Page Officielle</title>
        <meta property="og:title" content={`${profile.username} — DJ & Production`} />
        <meta property="og:image" content={profile.avatar_url || '/og-levon-dinato.jpg'} />
      </Helmet>

      {isOwner && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', gap: 10 }}>
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
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '40px', padding: '40px', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(145deg, rgba(13, 22, 33, 0.95), rgba(6, 13, 20, 0.95))', border: '1px solid rgba(0, 217, 255, 0.15)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)' }}>
              <div style={{ flex: '1 1 300px' }}>
                <h3 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px', color: '#fff' }}>{profile.username}</h3>
                <p style={{ color: '#8c9f98', fontSize: '1.1rem', margin: 0 }}>Découvrez son univers musical exclusif et ses dernières sorties.</p>
              </div>
              <div style={{ flex: '0 0 350px', width: '100%', maxWidth: '350px', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${themeColor}`, boxShadow: `0 10px 30px ${themeColor}40`, margin: '0 auto' }}>
                <img src={profile.avatar_url || "/logo.jpg"} alt={profile.username} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }} />
              </div>
            </div>
          </section>

          <section id="releases">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
              <h2 className="section-title" style={{ border: 'none', margin: 0, padding: 0 }}>Dernières Sorties</h2>
              {isOwner && (
                <Link to="/nouveautes" style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>+ Ajouter un son</Link>
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

                  return (
                    <div 
                      key={track.id} 
                      style={{ 
                        ...cardBgStyle, // ✅ Application sécurisée du fond
                        border: '1px solid #222222', 
                        borderRadius: '16px', 
                        overflow: 'hidden',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                        transition: 'all 0.2s',
                        cursor: isPlayable ? 'pointer' : 'default'
                      }}
                      onClick={() => isPlayable && handlePlayTrack(track)}
                      onMouseEnter={(e) => { if (isPlayable) e.currentTarget.style.borderColor = themeColor; }}
                      onMouseLeave={(e) => { if (isPlayable) e.currentTarget.style.borderColor = '#222222'; }}
                    >
                      
                      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          
                          <div style={{ 
                            width: '44px', height: '44px', borderRadius: '50%', 
                            background: isPlayable ? (isThisPlaying ? themeColor : 'rgba(0,0,0,0.5)') : 'rgba(0,0,0,0.3)', 
                            border: isPlayable ? 'none' : '1px solid #333',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isPlayable ? (isThisPlaying ? '#000' : '#fff') : themeColor,
                            fontSize: '16px',
                            backdropFilter: 'blur(5px)' 
                          }}>
                            {isPlayable ? (
                              isThisPlaying ? '⏸' : '▶'
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            )}
                          </div>

                          <div style={{ width: '48px', height: '48px', background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#111', borderRadius: '8px', border: '1px solid #333' }} />

                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                            <div style={{ fontSize: '13px', color: '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>{track.artist}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                          <div style={{ fontSize: '12px', color: '#ccc', fontWeight: '600', textTransform: 'uppercase' }}>{track.genre}</div>
                          
                          {isPlayable && (
                            <button 
                              onClick={(e) => handleDownload(e, track.audio_url, `${track.artist} - ${track.title}.mp3`)}
                              style={{ 
                                background: 'rgba(0,0,0,0.5)', color: themeColor, padding: '8px 16px', 
                                borderRadius: '6px', fontSize: '12px', fontWeight: '800', 
                                border: `1px solid ${themeColor}`, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                backdropFilter: 'blur(5px)'
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                              Télécharger
                            </button>
                          )}
                        </div>
                      </div>

                      {iframeSrc && (
                        <div 
                          style={{ padding: '0 20px 20px 20px', position: 'relative', zIndex: 10, overflow: 'hidden', borderRadius: '8px' }}
                          onClick={(e) => e.stopPropagation()} 
                        >
                          <iframe 
                            src={iframeSrc} 
                            width="100%" 
                            height="162" 
                            frameBorder="0"
                            scrolling="no"
                            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                            style={{ 
                              display: 'block', width: '100%', height: '162px',
                              borderRadius: '8px', border: 'none', background: '#000', overflow: 'hidden' 
                            }}
                          ></iframe>
                        </div>
                      )}

                      {isPlayable && !iframeSrc && (
                        <div style={{ padding: '0 20px 20px 20px' }}>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px', padding: '0 4px' }}>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a3 3 0 0 0-3 3v14a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                                <path d="M5 10a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0v-4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 7a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0v-7a3 3 0 0 0-3-3z"></path>
                              </svg>
                              <span style={{ 
                                color: themeColor, fontWeight: '900', fontSize: '18px', 
                                fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.5px'
                              }}>
                                Dropzone
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <div style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'monospace', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                  <span style={{ color: themeColor }}>{formatTime(isThisPlaying ? currentTime : 0)}</span>
                                  <span style={{ color: '#888', fontSize: '14px' }}>/</span>
                                  <span style={{ color: '#ccc' }}>{formatTime(duration || track.duration)}</span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#ccc', fontWeight: '600', display: 'flex', gap: '16px', marginTop: '4px' }}>
                                  <span>{track.bpm} BPM</span>
                                  {track.song_key && <span>{track.song_key}</span>}
                                </div>
                              </div>

                              <button
                                onClick={(e) => handleShare(e, track)}
                                title="Partager ce son"
                                style={{
                                  width: '36px', height: '36px', borderRadius: '50%',
                                  background: 'rgba(0,0,0,0.5)', border: '1px solid #333',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#fff', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = themeColor; e.currentTarget.style.color = themeColor; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#fff'; }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="18" cy="5" r="3"></circle>
                                  <circle cx="6" cy="12" r="3"></circle>
                                  <circle cx="18" cy="19" r="3"></circle>
                                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                                </svg>
                              </button>

                            </div>
                          </div>
                          
                          <CanvasWaveform 
                            peaks={track.peaks} isPlaying={isThisPlaying}
                            themeColor={themeColor} progress={trackProgress}
                            isCurrent={isCurrentTrack} onSeek={seek}
                          />
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {gallery.map((img) => (
                  <div key={img.id} style={{ aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', border: '1px solid #333', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    <img src={img.image_url} alt="Galerie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="sidebar">
          <div className="sidebar-inner">
            <div className="sidebar-widget">
              <div className="sidebar-title">Prochaines Dates</div>
              {events.length > 0 ? events.map(event => (
                <div key={event.id} className="event-item">
                  <div className="event-date">{new Date(event.event_date).toLocaleDateString('fr-FR')}</div>
                  <h4>{event.title}</h4><p>{event.city}</p>
                </div>
              )) : <p style={{ color: '#666', fontSize: '0.85rem' }}>Aucune date pour l'instant.</p>}
            </div>

            <div className="sidebar-widget">
              <div className="sidebar-title">Réseaux</div>
              {/* ... (Réseaux) ... */}
            </div>

            <div className="sidebar-widget">
              <div className="sidebar-title">Biographie</div>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#8c9f98', fontSize: '0.85rem' }}>
                {profile.bio || "Biographie à venir..."}
              </p>
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
          <div>© 2026 {profile.username}. Tous droits réservés.</div>
        </div>
      </footer>

      {currentTrack && (
        <GlobalPlayer 
          currentTrack={currentTrack} isPlaying={isPlaying} 
          onTogglePlay={togglePlay} onStop={stop} 
        />
      )}
    </div>
  );
};