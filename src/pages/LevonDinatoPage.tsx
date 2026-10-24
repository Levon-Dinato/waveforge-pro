// src/pages/LevonDinatoPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import './LevonDinato.css';

export const LevonDinatoPage: React.FC = () => {
  const [currentTrack, setCurrentTrack] = useState<{ title: string; artist: string; src: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

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

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setIsTransitioning(true);
    setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
      setTimeout(() => setIsTransitioning(false), 400);
    }, 400);
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="levon-page">
      <Helmet>
        <title>Levon & Dinato — DJ & Production Officiel</title>
      </Helmet>

      <div className={`slide-transition ${isTransitioning ? 'active' : ''}`}>
        <span>LEVON & DINATO</span>
      </div>

      <header className="nav">
        <div className="wrapper nav-inner">
          <a href="/" className="logo">
            <img src="/logo.jpg" alt="Levon & Dinato" />
          </a>
          <ul className="nav-links">
            <li><a href="#about" onClick={(e) => handleNavClick(e, 'about')}>Le Duo</a></li>
            <li><a href="#services" onClick={(e) => handleNavClick(e, 'services')}>Prestations</a></li>
            <li><a href="#releases" onClick={(e) => handleNavClick(e, 'releases')}>Releases</a></li>
            <li><a href="#gallery" onClick={(e) => handleNavClick(e, 'gallery')}>Galerie</a></li>
          </ul>
          <div className="nav-actions">
            <a href="#contact" className="btn-primary" onClick={(e) => handleNavClick(e, 'contact')}>Booking</a>
            <div className="burger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </header>

      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <a href="#about" onClick={(e) => { handleNavClick(e, 'about'); setMobileMenuOpen(false); }}>Le Duo</a>
        <a href="#services" onClick={(e) => { handleNavClick(e, 'services'); setMobileMenuOpen(false); }}>Prestations</a>
        <a href="#releases" onClick={(e) => { handleNavClick(e, 'releases'); setMobileMenuOpen(false); }}>Releases</a>
        <a href="#gallery" onClick={(e) => { handleNavClick(e, 'gallery'); setMobileMenuOpen(false); }}>Galerie</a>
        <a href="#contact" onClick={(e) => { handleNavClick(e, 'contact'); setMobileMenuOpen(false); }} style={{ color: 'var(--accent)' }}>Booking</a>
      </div>

      <section className="hero">
        <video className="bg-video" autoPlay muted loop playsInline>
          <source src="/background.mp4" type="video/mp4" />
        </video>
        <div className="wrapper hero-inner">
          <div className="hero-tag fade-in">Nouveaux remixes disponibles</div>
          <h1 className="hero-title fade-in">L'expérience <span>sonore</span> ultime.</h1>
          <p className="hero-desc fade-in">Découvrez les productions Funky House, Nu-Disco et Tech House du duo Levon & Dinato. Un set conçu pour faire vibrer les dancefloors et marquer les esprits.</p>
          
          <div className="hero-actions fade-in">
            <a href="#releases" className="btn-primary" onClick={(e) => handleNavClick(e, 'releases')} style={{ fontSize: '0.95rem' }}>Écouter les tracks</a>
            <a href="#contact" onClick={(e) => handleNavClick(e, 'contact')} className="btn-outline-hero">Nous contacter</a>
          </div>

          <div className="hero-stats fade-in">
            <div className="stat-item"><h4>12+</h4><p>Années d'expérience</p></div>
            <div className="stat-item"><h4>50+</h4><p>Tracks & Remixes</p></div>
            <div className="stat-item"><h4>100%</h4><p>Pistes en feu</p></div>
          </div>
        </div>
      </section>

      <div className="wrapper container">
        <div className="content">
          <section id="about" className="fade-in">
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
                <div className="social-grid">
                  <a href="https://www.instagram.com/TON_COMPTE" target="_blank" rel="noopener noreferrer" className="social-btn">
                    <svg className="social-icon" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.181a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z"/></svg>
                    Instagram
                  </a>
                  <a href="https://www.tiktok.com/@stephane.dinato" target="_blank" rel="noopener noreferrer" className="social-btn">
                    <svg className="social-icon" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                    TikTok
                  </a>
                  <a href="https://open.spotify.com/intl-fr/artist/4zRPcTUuUYL9VLqBxDoE5S" target="_blank" rel="noopener noreferrer" className="social-btn">
                    <svg className="social-icon" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                    Spotify
                  </a>
                  <a href="https://soundcloud.com/stephane-dinato-806877257" target="_blank" rel="noopener noreferrer" className="social-btn">
                    <svg className="social-icon" viewBox="0 0 24 24"><path d="M2.4 12.8c-.3 0-.6.2-.6.6 0 .3.2.6.6.6.3 0 .6-.2.6-.6 0-.3-.3-.6-.6-.6zm2.4-1.2c-.4 0-.8.3-.8.8 0 .4.3.8.8.8s.8-.3.8-.8c0-.4-.4-.8-.8-.8zm3-1.2c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1zm4.2-1.2c-.8 0-1.4.6-1.4 1.4s.6 1.4 1.4 1.4 1.4-.6 1.4-1.4-.6-1.4-1.4-1.4zm4.2-1.2c-1 0-1.8.8-1.8 1.8s.8 1.8 1.8 1.8 1.8-.8 1.8-1.8-.8-1.8-1.8-1.8zm4.2-1.2c-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2 2.2-1 2.2-2.2-1-2.2-2.2-2.2z"/></svg>
                    SoundCloud
                  </a>
                </div>
              </div>
              <div className="about-visual">
                <img src="/logo.jpg" alt="Levon & Dinato" />
              </div>
            </div>
          </section>

          <section id="services" className="fade-in">
            <div className="section-header"><h2 className="section-title">Prestations</h2></div>
            <div className="services-grid">
              <div className="service-card"><span className="service-icon">🎧</span><h4>Clubs & Festivals</h4><p>Sets dynamiques, transitions propres et énergie communicative. On lit la foule et on enflamme la piste.</p></div>
              <div className="service-card"><span className="service-icon">🥂</span><h4>Soirées Privées & VIP</h4><p>Anniversaires, aftershows, soirées privées et événements exclusifs. Une ambiance club sur mesure.</p></div>
              <div className="service-card"><span className="service-icon">🏢</span><h4>Événements Pro</h4><p>Soirées d'entreprise, lancements de produit, séminaires et galas haut de gamme.</p></div>
              <div className="service-card"><span className="service-icon">🎛️</span><h4>Production & Remix</h4><p>Création de tracks originales, remixes et reworks sur mesure pour votre label ou projet.</p></div>
            </div>
          </section>

          <section id="releases" className="fade-in">
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

          <section id="gallery" className="fade-in">
            <div className="section-header"><h2 className="section-title">Galerie Live</h2></div>
            <div className="gallery-grid">
              <div className="gallery-item">[ Photo Live 01 ]</div>
              <div className="gallery-item">[ Photo Live 02 ]</div>
              <div className="gallery-item">[ Photo Studio ]</div>
              <div className="gallery-item">[ Photo Crowd ]</div>
            </div>
          </section>
        </div>

        <aside className="sidebar fade-in">
          <div className="sidebar-inner">
            <div className="sidebar-widget">
              <div className="sidebar-title">Top Tracks</div>
              <div className="top-list">
                <div className="top-item"><div className="top-num">1</div><div className="top-info"><h4>Fever Climbing</h4><p>Funky House</p></div></div>
                <div className="top-item"><div className="top-num">2</div><div className="top-info"><h4>Training Season</h4><p>Dance / Pop</p></div></div>
                <div className="top-item"><div className="top-num">3</div><div className="top-info"><h4>Hey Brother (Remix)</h4><p>Electro House</p></div></div>
                <div className="top-item"><div className="top-num">4</div><div className="top-info"><h4>Blade (Remix)</h4><p>Hard Dance</p></div></div>
                {/* ✅ LA FAUTE DE FRAPPE ÉTAIT ICI */}
                <div className="top-item"><div className="top-num">5</div><div className="top-info"><h4>And I Feel It Rising Up</h4><p>Dance / K-Pop</p></div></div>
              </div>
            </div>

            <div className="sidebar-widget" id="dates">
              <div className="sidebar-title">Prochaines Dates</div>
              <div className="event-item"><div className="event-date">12 Juillet 2026</div><h4>Club Éclipse</h4><p>Paris, FR</p></div>
              <div className="event-item"><div className="event-date">03 Août 2026</div><h4>Festival Sunlight</h4><p>Marseille, FR</p></div>
              <div className="event-item"><div className="event-date">17 Août 2026</div><h4>Rooftop Party</h4><p>Ibiza, ES</p></div>
            </div>
          </div>
        </aside>
      </div>

      <section className="contact-section" id="contact">
        <div className="wrapper fade-in">
          <h2>Prêt à enflammer votre scène ?</h2>
          <p>Disponibles pour clubs, festivals et événements privés.</p>
          <a href="mailto:djcontrolradiotv1@gmail.com" className="contact-email">djcontrolradiotv1@gmail.com &rarr;</a>
        </div>
      </section>

      <footer className="footer">
        <div className="wrapper footer-inner">
          <div>© 2026 Levon & Dinato. Tous droits réservés.</div>
          <div className="footer-links">
            <a href="https://open.spotify.com/intl-fr/artist/4zRPcTUuUYL9VLqBxDoE5S" target="_blank" rel="noopener noreferrer">Spotify</a>
            <a href="#" target="_blank" rel="noopener noreferrer">Instagram</a>
          </div>
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