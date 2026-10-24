// src/pages/PremiumPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, Link } from 'react-router-dom'; // ✅ Ajout de Link
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext'; // ✅ Ajout de useAuth
import './LevonDinato.css';

export const PremiumPage: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth(); // ✅ Récupération de l'utilisateur connecté
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  
  const [currentTrack, setCurrentTrack] = useState<{ title: string; artist: string; src: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const isId = username?.includes('-');
      const query = supabase.from('profiles').select('*');
      
      const { data: profileData } = isId 
        ? await query.eq('id', username).single()
        : await query.ilike('username', username || '').single();

      if (profileData) {
        setProfile(profileData);

        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false });
        if (tracksData) setTracks(tracksData);

        const today = new Date().toISOString().split('T')[0];
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .eq('created_by', profileData.id)
          .gte('event_date', today)
          .order('event_date', { ascending: true });
        if (eventsData) setEvents(eventsData);
      }
      setLoading(false);
    };
    fetchData();
  }, [username]);

  const handlePlayTrack = (track: any) => {
    if (currentTrack?.src === track.audio_url) {
      if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); } 
      else { audioRef.current?.play(); setIsPlaying(true); }
    } else {
      setCurrentTrack({ title: track.title, artist: track.artist, src: track.audio_url });
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = track.audio_url;
          audioRef.current.play();
          setIsPlaying(true);
        }
      }, 100);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } 
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setCurrentTime(current);
      setDuration(total || 0);
      setProgress((current / total) * 100);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatTickerDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase();
    } catch { return 'DATE'; }
  };

  if (loading) return <div style={{ background: '#050a10', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>;
  if (!profile) return <div style={{ background: '#050a10', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Artiste introuvable.</div>;

  const gmailContactLink = `https://mail.google.com/mail/?view=cm&fs=1&to=djcontrolradiotv1@gmail.com&su=Booking%20${profile.username}&body=Salut,%20je%20souhaite%20vous%20contacter%20pour%20un%20booking.`;
  const themeColor = profile.theme_color || '#00d9ff';
  
  // ✅ Vérification si le visiteur est le propriétaire de la page
  const isOwner = user?.id === profile.id;

  return (
    <div className="levon-page" style={{ '--accent': themeColor } as React.CSSProperties}>
      <Helmet>
        <title>{profile.username} — Page Officielle</title>
        <meta property="og:title" content={`${profile.username} — DJ & Production`} />
        <meta property="og:image" content={profile.avatar_url || '/og-levon-dinato.jpg'} />
      </Helmet>

      {/* ✅ BARRE D'ÉDITION (uniquement visible par le propriétaire) */}
      {isOwner && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', gap: 10 }}>
          <Link 
            to="/settings" 
            style={{ background: themeColor, color: '#000', padding: '12px 24px', borderRadius: 30, fontWeight: 800, textDecoration: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}
          >
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
        <video className="bg-video" autoPlay muted loop playsInline>
          <source src="/background.mp4" type="video/mp4" />
        </video>
        <div className="wrapper hero-inner">
          <div className="hero-tag">{profile.hero_tagline || "Nouveaux remixes disponibles"}</div>
          
          {/* ✅ TITRE ET DESCRIPTION DYNAMIQUES */}
          <h1 className="hero-title">
            {profile.hero_title ? profile.hero_title : `L'expérience sonore de ${profile.username}.`}
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
            
            <div 
              style={{ 
                display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '40px', padding: '40px', alignItems: 'center', justifyContent: 'space-between',
                background: 'linear-gradient(145deg, rgba(13, 22, 33, 0.95), rgba(6, 13, 20, 0.95))',
                border: '1px solid rgba(0, 217, 255, 0.15)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
              }}
            >
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
            {/* ✅ BOUTON AJOUTER UN SON (uniquement pour le propriétaire) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
              <h2 className="section-title" style={{ border: 'none', margin: 0, padding: 0 }}>Dernières Sorties</h2>
              {isOwner && (
                <Link to="/studio" style={{ background: 'rgba(0, 217, 255, 0.1)', color: themeColor, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', textDecoration: 'none', border: `1px solid ${themeColor}`, transition: 'all 0.2s' }}>
                  + Ajouter un son
                </Link>
              )}
            </div>
            
            <div className="tracklist">
              <div className="track-header"><div></div><div>Titre / Artiste</div><div>Genre</div><div style={{ textAlign: 'right' }}>BPM</div></div>
              
              {tracks.length > 0 ? (
                tracks.map((track) => (
                  <div key={track.id} className="track-row" onClick={() => handlePlayTrack(track)}>
                    <div className="track-play">{currentTrack?.src === track.audio_url && isPlaying ? '⏸' : '▶'}</div>
                    <div className="track-info"><h4>{track.title}</h4><p>{track.artist}</p></div>
                    <div className="track-genre">{track.genre}</div><div className="track-bpm">{track.bpm} BPM</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', color: '#888' }}>Aucune musique pour le moment.</div>
              )}
            </div>
          </section>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                {profile.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0d1512', border: '1px solid #E1306C', color: '#E1306C', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 'bold' }}>IG</a>}
                {profile.spotify_url && <a href={profile.spotify_url} target="_blank" rel="noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0d1512', border: '1px solid #1DB954', color: '#1DB954', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 'bold' }}>SP</a>}
                {profile.soundcloud_url && <a href={profile.soundcloud_url} target="_blank" rel="noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0d1512', border: '1px solid #FF5500', color: '#FF5500', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 'bold' }}>SC</a>}
                {profile.tiktok_url && <a href={profile.tiktok_url} target="_blank" rel="noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0d1512', border: '1px solid #fff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 'bold' }}>TK</a>}
                {profile.youtube_url && <a href={profile.youtube_url} target="_blank" rel="noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0d1512', border: '1px solid #FF0000', color: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 'bold' }}>YT</a>}
              </div>
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
        <div className="audio-player active">
          <div className="audio-info">
            <div className="audio-title">{currentTrack.title}</div>
            <div className="audio-artist">{currentTrack.artist}</div>
          </div>
          <div className="audio-controls"><button className="audio-btn" onClick={togglePlay}>{isPlaying ? '⏸' : '▶'}</button></div>
          <div className="audio-progress-wrap">
            <span className="audio-time">{formatTime(currentTime)}</span>
            <div className="audio-progress" onClick={handleSeek}><div className="audio-progress-bar" style={{ width: `${progress}%` }}></div></div>
            <span className="audio-time">{formatTime(duration)}</span>
          </div>
        </div>
      )}
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} />
    </div>
  );
};