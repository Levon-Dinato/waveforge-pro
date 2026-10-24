// src/pages/LevonDinatoPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './LevonDinato.css';

export const LevonDinatoPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [currentTrack, setCurrentTrack] = useState<{ title: string; artist: string; src: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [events, setEvents] = useState<any[]>([]);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(5);

      if (data && data.length > 0) {
        setEvents(data);
      } else {
        setEvents([
          { id: 1, event_date: '2026-10-31', title: 'La Générale - Valence Horror Story#3', location: 'Valence', city: 'France', image_url: '/logo.jpg' },
          { id: 2, event_date: '2026-11-11', title: 'Drôme & Bass #4 Au Vacarme Exquis', location: 'Bourg-lès-Valence', city: 'France', image_url: '/logo.jpg' },
          { id: 3, event_date: '2026-10-30', title: 'Dream Nation Festival', location: 'Paris', city: 'France', image_url: '/logo.jpg' }
        ]);
      }
    };
    fetchEvents();
  }, []);

  const handlePlayTrack = (title: string, artist: string, src: string) => {
    if (currentTrack?.src === src) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      setCurrentTrack({ title, artist, src });
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = src;
          audioRef.current.play();
          setIsPlaying(true);
        }
      }, 100);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
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
    const width = rect.width;
    const newTime = (clickX / width) * audioRef.current.duration;
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
    } catch {
      return 'DATE';
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Levon & Dinato — DJ & Production Officiel',
      text: 'Découvrez la page officielle du duo Levon & Dinato sur DropZone DJ !',
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Lien copié dans le presse-papiers !');
      } catch (err) {}
    }
  };

  const gmailUpsellLink = "https://mail.google.com/mail/?view=cm&fs=1&to=djcontrolradiotv1@gmail.com&su=Demande%20de%20Page%20Premium%20DJ&body=Salut,%20je%20suis%20int%C3%A9ress%C3%A9%20par%20une%20page%20premium%20comme%20celle%20de%20Levon%20%26%20Dinato.%20Mon%20pseudo%20est%20:%20";
  const gmailContactLink = "https://mail.google.com/mail/?view=cm&fs=1&to=djcontrolradiotv1@gmail.com&su=Booking%20Levon%20%26%20Dinato&body=Salut,%20je%20souhaite%20vous%20contacter%20pour%20un%20booking.";

  return (
    <div className="levon-page">
      <Helmet>
        <title>Levon & Dinato — DJ & Production Officiel</title>
        <meta name="description" content="Découvrez les productions Funky House, Nu-Disco et Tech House du duo Levon & Dinato. Un set conçu pour faire vibrer les dancefloors." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://waveforge-pro-one.vercel.app/levon-dinato" />
        <meta property="og:title" content="Levon & Dinato — DJ & Production Officiel" />
        <meta property="og:description" content="Découvrez les productions Funky House, Nu-Disco et Tech House du duo Levon & Dinato." />
        <meta property="og:image" content="https://waveforge-pro-one.vercel.app/og-levon-dinato.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Levon & Dinato — DJ & Production Officiel" />
        <meta name="twitter:description" content="Découvrez les productions Funky House, Nu-Disco et Tech House du duo Levon & Dinato." />
        <meta name="twitter:image" content="https://waveforge-pro-one.vercel.app/og-levon-dinato.jpg" />
      </Helmet>

      <div className="top-bar">
        <button onClick={() => navigate('/')} className="back-btn">
          <span>←</span> Retour au site
        </button>
      </div>

      <header className="nav">
        <div className="wrapper nav-inner">
          <a href="#" className="logo">
            <img src="/logo.jpg" alt="Levon & Dinato" />
            <span className="premium-badge">PREMIUM</span>
          </a>
          <ul className="nav-links">
            <li><a href="#about">Le Duo</a></li>
            <li><a href="#services">Prestations</a></li>
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
                
                {/* ✅ CORRECTIF : Balise img classique avec fallback si pas d'image */}
                <div className="event-cover">
                  {event.image_url ? (
                    <img src={event.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div className="event-cover-fallback">🎵</div>
                  )}
                </div>
                
                <div className="event-info">
                  <div className="event-title">{event.title}</div>
                  <div className="event-location">{event.location} {event.city ? `, ${event.city}` : ''}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="event-ticker-item">
              <div className="event-date-badge">BIENTÔT</div>
              <div className="event-info"><div className="event-title">Chargement des dates...</div></div>
            </div>
          )}
        </div>
      </div>

      <section className="hero">
        <video className="bg-video" autoPlay muted loop playsInline>
          <source src="/background.mp4" type="video/mp4" />
        </video>
        
        <div className="wrapper hero-inner">
          <div className="hero-tag">Nouveaux remixes disponibles</div>
          <h1 className="hero-title">L'expérience <span>sonore</span> ultime.</h1>
          <p className="hero-desc">Découvrez les productions Funky House, Nu-Disco et Tech House du duo Levon & Dinato. Un set conçu pour faire vibrer les dancefloors et marquer les esprits.</p>
          
          <div className="hero-actions">
            <a href="#releases" className="btn-primary">Écouter les tracks</a>
            
            <button onClick={handleShare} className="btn-outline-hero" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              Partager
            </button>

            <a href={gmailUpsellLink} target="_blank" rel="noopener noreferrer" className="btn-outline-hero">
              ✨ Créer ma page Premium
            </a>
          </div>

          <div className="hero-stats">
            <div className="stat-item"><h4>12+</h4><p>Années d'expérience</p></div>
            <div className="stat-item"><h4>50+</h4><p>Tracks & Remixes</p></div>
            <div className="stat-item"><h4>100%</h4><p>Pistes en feu</p></div>
          </div>
        </div>
      </section>

      <div className="wrapper container">
        <div className="content">
          <section id="about">
            <div className="section-header"><h2 className="section-title">Le Duo</h2></div>
            <div className="about-grid">
              <div className="about-text">
                <h3>Deux esprits, un son.</h3>
                <p>Levon & Dinato est un duo électrisant qui fusionne leurs influences uniques pour créer un son reconnaissable et contagieux. Unis par une passion commune pour la Funky House, la Nu-Disco, la Tech House et l'Electro Dance.</p>
                <div className="member-box">
                  <h4>Stéphane Dinato</h4>
                  <p>Finaliste du Trophée du Meilleur DJ 2012. Sets haute énergie, productions fusionnant vibrations rétro, beats modernes et mélodies captivantes.</p>
                </div>
                <div className="member-box">
                  <h4>Levon Mystik</h4>
                  <p>Artiste polyvalent et créatif. Puisant dans ses racines musicales et son amour pour les rythmes vibrants, il ajoute une dimension unique qui élève leur son.</p>
                </div>
              </div>
              <div className="about-visual">
                <img src="/logo.jpg" alt="Levon & Dinato" />
              </div>
            </div>
          </section>

          <section id="services">
            <div className="section-header"><h2 className="section-title">Prestations</h2></div>
            <div className="services-grid">
              <div className="service-card"><span className="service-icon">🎧</span><h4>Clubs & Festivals</h4><p>Sets dynamiques, transitions propres et énergie communicative.</p></div>
              <div className="service-card"><span className="service-icon">🥂</span><h4>Soirées Privées & VIP</h4><p>Ambiance club sur mesure pour vos événements exclusifs.</p></div>
              <div className="service-card"><span className="service-icon">🏢</span><h4>Événements Pro</h4><p>Soirées d'entreprise, lancements de produit et galas.</p></div>
              <div className="service-card"><span className="service-icon">🎛️</span><h4>Production & Remix</h4><p>Création de tracks originales et remixes sur mesure.</p></div>
            </div>
          </section>

          <section id="releases">
            <div className="section-header"><h2 className="section-title">Dernières Sorties</h2></div>
            <div className="tracklist">
              <div className="track-header"><div></div><div>Titre / Artiste</div><div>Genre</div><div style={{ textAlign: 'right' }}>BPM</div></div>
              
              <div className="track-row" onClick={() => handlePlayTrack("Fever Climbing (Extended Mix)", "Aretha Franklin • Levon & Dinato", "/audio/fever-climbing.mp3")}>
                <div className="track-play">{currentTrack?.title === "Fever Climbing (Extended Mix)" && isPlaying ? '⏸' : '▶'}</div>
                <div className="track-info"><h4>Fever Climbing (Extended Mix)</h4><p>Aretha Franklin • Levon & Dinato</p></div>
                <div className="track-genre">Funky House</div><div className="track-bpm">124 BPM</div>
              </div>

              <div className="track-row" onClick={() => handlePlayTrack("Hey Brother (Avicii Remix 2026)", "Levon & Dinato", "/audio/hey-brother-remix.mp3")}>
                <div className="track-play">{currentTrack?.title === "Hey Brother (Avicii Remix 2026)" && isPlaying ? '⏸' : '▶'}</div>
                <div className="track-info"><h4>Hey Brother (Avicii Remix 2026)</h4><p>Levon & Dinato</p></div>
                <div className="track-genre">Electro House</div><div className="track-bpm">128 BPM</div>
              </div>

              <div className="track-row" onClick={() => handlePlayTrack("Blade (Levon & Dinato Remix)", "Scooter • D'Angello & Francis", "/audio/blade-remix.mp3")}>
                <div className="track-play">{currentTrack?.title === "Blade (Levon & Dinato Remix)" && isPlaying ? '⏸' : '▶'}</div>
                <div className="track-info"><h4>Blade (Levon & Dinato Remix)</h4><p>Scooter • D'Angello & Francis</p></div>
                <div className="track-genre">Hard Dance</div><div className="track-bpm">150 BPM</div>
              </div>

              <div className="track-row" onClick={() => handlePlayTrack("And I Feel It Rising Up (St. Tropez Remix)", "Levon & Dinato", "/audio/rising-up-remix.mp3")}>
                <div className="track-play">{currentTrack?.title === "And I Feel It Rising Up (St. Tropez Remix)" && isPlaying ? '⏸' : '▶'}</div>
                <div className="track-info"><h4>And I Feel It Rising Up (St. Tropez Remix)</h4><p>Levon & Dinato</p></div>
                <div className="track-genre">Dance / K-Pop</div><div className="track-bpm">126 BPM</div>
              </div>

              <div className="track-row" onClick={() => handlePlayTrack("Training Season (Levon & Dinato Remix)", "Dua Lipa", "/audio/training-season-remix.mp3")}>
                <div className="track-play">{currentTrack?.title === "Training Season (Levon & Dinato Remix)" && isPlaying ? '⏸' : '▶'}</div>
                <div className="track-info"><h4>Training Season (Levon & Dinato Remix)</h4><p>Dua Lipa</p></div>
                <div className="track-genre">Dance / Pop</div><div className="track-bpm">124 BPM</div>
              </div>
            </div>
          </section>
        </div>

        <aside className="sidebar">
          <div className="sidebar-inner">
            
            <div className="sidebar-widget">
              <div className="sidebar-title">Top Tracks</div>
              <div className="top-list">
                <div className="top-item"><div className="top-num">1</div><div className="top-info"><h4>Fever Climbing</h4><p>Funky House</p></div></div>
                <div className="top-item"><div className="top-num">2</div><div className="top-info"><h4>Training Season</h4><p>Dance / Pop</p></div></div>
                <div className="top-item"><div className="top-num">3</div><div className="top-info"><h4>Hey Brother (Remix)</h4><p>Electro House</p></div></div>
                <div className="top-item"><div className="top-num">4</div><div className="top-info"><h4>Blade (Remix)</h4><p>Hard Dance</p></div></div>
                <div className="top-item"><div className="top-num">5</div><div className="top-info"><h4>And I Feel It Rising Up</h4><p>Dance / K-Pop</p></div></div>
              </div>
            </div>

            <div className="sidebar-widget">
              <div className="sidebar-title">Prochaines Dates</div>
              <div className="event-item"><div className="event-date">12 Juillet 2026</div><h4>Club Éclipse</h4><p>Paris, FR</p></div>
              <div className="event-item"><div className="event-date">03 Août 2026</div><h4>Festival Sunlight</h4><p>Marseille, FR</p></div>
            </div>

            <div className="sidebar-widget">
              <div className="sidebar-title">Réseaux</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                <a href="https://www.tiktok.com/@stephane.dinato" target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333', background: '#0d1512', color: '#fff', textDecoration: 'none', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                </a>
                <a href="https://open.spotify.com/intl-fr/artist/4zRPcTUuUYL9VLqBxDoE5S" target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1DB954', background: '#0d1512', color: '#1DB954', textDecoration: 'none', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333', background: '#0d1512', color: '#fff', textDecoration: 'none', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FF0000', background: '#0d1512', color: '#FF0000', textDecoration: 'none', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1877F2', background: '#0d1512', color: '#1877F2', textDecoration: 'none', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="https://www.instagram.com/TON_COMPTE" target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E1306C', background: '#0d1512', color: '#E1306C', textDecoration: 'none', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.181a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z"/></svg>
                </a>
                <a href="https://soundcloud.com/stephane-dinato-806877257" target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FF5500', background: '#0d1512', color: '#FF5500', textDecoration: 'none', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'currentColor' }}><path d="M11.56 8.87V17h8.77c1.78 0 3.22-1.44 3.22-3.22 0-1.78-1.44-3.22-3.22-3.22-.34 0-.67.05-.98.15-.41-2.47-2.55-4.35-5.13-4.35-2.31 0-4.27 1.51-4.97 3.6-.31-.09-.64-.14-.98-.14C6.82 9.82 5 11.64 5 13.87c0 2.23 1.82 4.05 4.05 4.05h1.72V8.87h.79z"/></svg>
                </a>
              </div>
            </div>

            <div className="sidebar-widget" style={{ background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(10, 18, 26, 0.9))', border: '1px solid rgba(0, 217, 255, 0.3)' }}>
              <div className="sidebar-title" style={{ color: 'var(--accent)' }}>✨ Page Premium</div>
              <p style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '15px', lineHeight: 1.4 }}>
                Envie d'une page aussi pro pour ton profil ?
              </p>
              <a href={gmailUpsellLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ width: '100%', fontSize: '0.75rem', padding: '10px', boxShadow: 'none' }}>
                Me contacter
              </a>
            </div>

          </div>
        </aside>
      </div>

      <section className="upsell-section">
        <div className="wrapper">
          <div className="upsell-grid">
            <div className="upsell-text">
              <span className="upsell-tag">Exclusivité DropZone</span>
              <h2>Envie de te démarquer avec une page comme celle-ci ?</h2>
              <p>Ne laisse plus ton profil ressembler à tous les autres. Obtiens ta propre page officielle sur-mesure avec ton design et ton lecteur audio intégré.</p>
              <a href={gmailUpsellLink} target="_blank" rel="noopener noreferrer" className="btn-primary">
                🚀 Je veux la même page
              </a>
            </div>
            <div className="upsell-visual">
              <img src="/logo.jpg" alt="Page Premium" />
            </div>
          </div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="wrapper">
          <h2>Prêt à enflammer votre scène ?</h2>
          <p>Disponibles pour clubs, festivals et événements privés.</p>
          <a href={gmailContactLink} target="_blank" rel="noopener noreferrer" className="contact-email">
            Nous contacter &rarr;
          </a>
        </div>
      </section>

      <footer className="footer">
        <div className="wrapper footer-inner">
          <div>© 2026 Levon & Dinato. Tous droits réservés.</div>
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