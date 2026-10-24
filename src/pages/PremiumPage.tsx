// src/pages/PremiumPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom'; // ✅ useParams pour récupérer le nom dans l'URL
import { supabase } from '../lib/supabase';
import './LevonDinato.css'; // On réutilise ton super fichier CSS

export const PremiumPage: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>(); // Récupère "levon-dinato" ou autre
  
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

  // ✅ 1. On va chercher les infos du DJ, ses sons et ses dates dans Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // On cherche le profil par son username (en ignorant les majuscules)
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username || '')
        .single();

      if (profileData) {
        setProfile(profileData);

        // On cherche ses sons
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false });
        if (tracksData) setTracks(tracksData);

        // On cherche ses dates (uniquement celles de CET artiste)
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

  // ✅ Si l'artiste n'existe pas, on affiche un message
  if (loading) return <div style={{ background: '#050a10', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement de la page...</div>;
  if (!profile) return <div style={{ background: '#050a10', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Artiste introuvable.</div>;

  const gmailContactLink = `https://mail.google.com/mail/?view=cm&fs=1&to=djcontrolradiotv1@gmail.com&su=Booking%20${profile.username}&body=Salut,%20je%20souhaite%20vous%20contacter%20pour%20un%20booking.`;

  return (
    <div className="levon-page">
      <Helmet>
        <title>{profile.username} — Page Officielle</title>
        <meta property="og:title" content={`${profile.username} — DJ & Production`} />
        <meta property="og:image" content={profile.avatar_url || '/og-levon-dinato.jpg'} />
      </Helmet>

      <div className="top-bar">
        <button onClick={() => navigate('/')} className="back-btn">
          <span>←</span> Retour au site
        </button>
      </div>

      <header className="nav">
        <div className="wrapper nav-inner">
          <a href="#" className="logo">
            <img src={profile.avatar_url || "/logo.jpg"} alt={profile.username} />
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

      {/* Bandeau dynamique des événements de l'artiste */}
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
            <div className="event-ticker-item"><div className="event-info"><div className="event-title">Aucune date à venir</div></div></div>
          )}
        </div>
      </div>

      <section className="hero">
        <video className="bg-video" autoPlay muted loop playsInline>
          <source src="/background.mp4" type="video/mp4" />
        </video>
        <div className="wrapper hero-inner">
          <div className="hero-tag">Nouveaux remixes disponibles</div>
          <h1 className="hero-title">L'expérience <span>sonore</span> de {profile.username}.</h1>
          <p className="hero-desc">{profile.bio || "Bienvenue sur ma page officielle. Retrouvez ici mes dernières productions et mes prochaines dates."}</p>
          
          <div className="hero-actions">
            <a href="#releases" className="btn-primary">Écouter les tracks</a>
          </div>
        </div>
      </section>

      <div className="wrapper container">
        <div className="content">
          <section id="about">
            <div className="section-header"><h2 className="section-title">À propos</h2></div>
            <div className="about-grid">
              <div className="about-text">
                <h3>Le son de {profile.username}</h3>
                <p>{profile.bio || "Bio à venir..."}</p>
              </div>
              <div className="about-visual">
                <img src={profile.avatar_url || "/logo.jpg"} alt={profile.username} />
              </div>
            </div>
          </section>

          <section id="releases">
            <div className="section-header"><h2 className="section-title">Dernières Sorties</h2></div>
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
              )) : <p style={{ color: '#666' }}>Aucune date pour l'instant.</p>}
            </div>

            <div className="sidebar-widget">
              <div className="sidebar-title">Réseaux</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                {profile.instagram_url && (
                  <a href={profile.instagram_url} target="_blank" rel="noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0d1512', border: '1px solid #E1306C', color: '#E1306C', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>IG</a>
                )}
                {profile.spotify_url && (
                  <a href={profile.spotify_url} target="_blank" rel="noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0d1512', border: '1px solid #1DB954', color: '#1DB954', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>SP</a>
                )}
                {profile.soundcloud_url && (
                  <a href={profile.soundcloud_url} target="_blank" rel="noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0d1512', border: '1px solid #FF5500', color: '#FF5500', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>SC</a>
                )}
                {/* Tu pourras ajouter les autres réseaux ici */}
              </div>
            </div>

          </div>
        </aside>
      </div>

      <section className="contact-section" id="contact">
        <div className="wrapper">
          <h2>Prêt à enflammer votre scène ?</h2>
          <p>Disponible pour clubs, festivals et événements privés.</p>
          <a href={gmailContactLink} target="_blank" rel="noopener noreferrer" className="contact-email">
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
          <div className="audio-controls">
            <button className="audio-btn" onClick={togglePlay}>{isPlaying ? '⏸' : '▶'}</button>
          </div>
          <div className="audio-progress-wrap">
            <span className="audio-time">{formatTime(currentTime)}</span>
            <div className="audio-progress" onClick={handleSeek}>
              <div className="audio-progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="audio-time">{formatTime(duration)}</span>
          </div>
        </div>
      )}

      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} />
    </div>
  );
};