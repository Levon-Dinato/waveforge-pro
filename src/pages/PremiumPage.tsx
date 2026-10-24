// src/pages/PremiumPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { GlobalPlayer } from '../components/GlobalPlayer';
import './LevonDinato.css';

export const PremiumPage: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { play, currentTrack, isPlaying, togglePlay, stop } = usePlayer();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);

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

        if (profileError) {
          console.error("Erreur profil:", profileError);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (profileData) {
          setProfile(profileData);

          const { data: tracksData } = await supabase.from('tracks').select('*').eq('user_id', profileData.id).order('created_at', { ascending: false });
          if (tracksData) setTracks(tracksData);

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
    play({
      id: track.id,
      title: track.title,
      artist: track.artist,
      audio_url: track.audio_url,
      cover_url: track.cover_url,
      user_id: track.user_id,
      duration: track.duration,
      peaks: track.peaks,
      bpm: track.bpm,
      song_key: track.song_key,
      genre: track.genre,
    });
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
            <div className="tracklist">
              <div className="track-header"><div></div><div>Titre / Artiste</div><div>Genre</div><div style={{ textAlign: 'right' }}>Actions</div></div>
              {tracks.length > 0 ? (
                tracks.map((track) => (
                  <div key={track.id} className="track-row" onClick={() => handlePlayTrack(track)}>
                    <div className="track-play">{currentTrack?.id === track.id && isPlaying ? '⏸' : '▶'}</div>
                    <div className="track-info"><h4>{track.title}</h4><p>{track.artist}</p></div>
                    <div className="track-genre">{track.genre}</div>
                    
                    {/* ✅ BOUTON ACHETER */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      {track.purchase_url ? (
                        <a 
                          href={track.purchase_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            background: themeColor, 
                            color: '#000', 
                            padding: '6px 12px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '800', 
                            textDecoration: 'none',
                            textTransform: 'uppercase'
                          }}
                        >
                          Acheter
                        </a>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#666' }}>—</span>
                      )}
                    </div>
                  </div>
                ))
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                {profile.instagram_url && (
                  <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E1306C', background: '#0d1512', color: '#E1306C', textDecoration: 'none' }}><svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.181a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z"/></svg></a>
                )}
                {profile.spotify_url && (
                  <a href={profile.spotify_url} target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1DB954', background: '#0d1512', color: '#1DB954', textDecoration: 'none' }}><svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg></a>
                )}
                {profile.soundcloud_url && (
                  <a href={profile.soundcloud_url} target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FF5500', background: '#0d1512', color: '#FF5500', textDecoration: 'none' }}><svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'currentColor' }}><path d="M11.56 8.87V17h8.77c1.78 0 3.22-1.44 3.22-3.22 0-1.78-1.44-3.22-3.22-3.22-.34 0-.67.05-.98.15-.41-2.47-2.55-4.35-5.13-4.35-2.31 0-4.27 1.51-4.97 3.6-.31-.09-.64-.14-.98-.14C6.82 9.82 5 11.64 5 13.87c0 2.23 1.82 4.05 4.05 4.05h1.72V8.87h.79z"/></svg></a>
                )}
                {profile.tiktok_url && (
                  <a href={profile.tiktok_url} target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fff', background: '#0d1512', color: '#fff', textDecoration: 'none' }}><svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a>
                )}
                {profile.youtube_url && (
                  <a href={profile.youtube_url} target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FF0000', background: '#0d1512', color: '#FF0000', textDecoration: 'none' }}><svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>
                )}
                {profile.beatport_url && (
                  <a href={profile.beatport_url} target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #01FF95', background: '#0d1512', color: '#01FF95', textDecoration: 'none' }}><svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M12.751 8.51a4.31 4.31 0 0 0-1.974-1.732v-.01c-.435-.214-.881-.375-1.339-.483a6.15 6.15 0 0 0-1.393-.156h-5.01v12.74h5.01c.512 0 1.026-.062 1.536-.188.512-.125 1.004-.31 1.48-.55a4.7 4.7 0 0 0 1.287-1.02c.383-.415.7-.9.942-1.454.252-.566.38-1.222.38-1.968a5.54 5.54 0 0 0-.288-1.77 4.47 4.47 0 0 0-.829-1.51 4.14 4.14 0 0 0-1.328-1.077 4.99 4.99 0 0 0-1.684-.45v-.015c.428-.103.83-.277 1.186-.52a3.78 3.78 0 0 0 .922-.88c.256-.355.458-.765.6-1.217.137-.44.205-.93.205-1.449 0-.65-.12-1.26-.36-1.814a4.04 4.04 0 0 0-1.032-1.404m-.815 9.32c-.155.276-.39.5-.686.65a3.25 3.25 0 0 1-1.002.308 7.75 7.75 0 0 1-1.183.074H6.83v-4.53h2.522c.42 0 .825.05 1.203.156.379.105.71.28.99.515.28.235.5.54.66.906.159.365.24.81.24 1.32 0 .468-.08.88-.24 1.223l-.269.378m-4.354-8.023h2.281c.386 0 .748.035 1.075.106.328.071.61.188.842.353.234.163.416.384.544.653.129.269.192.606.192.994 0 .434-.084.797-.253 1.084a1.73 1.73 0 0 1-.674.638 3.04 3.04 0 0 1-.986.317 7.37 7.37 0 0 1-1.158.084H6.83V9.807h.752m8.04-5.716h4.043v9.885h1.522V4.09h2.522v10.398h-8.088V4.09z"/></svg></a>
                )}
                {profile.x_url && (
                  <a href={profile.x_url} target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fff', background: '#0d1512', color: '#fff', textDecoration: 'none' }}><svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
                )}
                {profile.facebook_url && (
                  <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1877F2', background: '#0d1512', color: '#1877F2', textDecoration: 'none' }}><svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
                )}
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
        <GlobalPlayer 
          currentTrack={currentTrack} 
          isPlaying={isPlaying} 
          onTogglePlay={togglePlay} 
          onStop={stop} 
        />
      )}
    </div>
  );
};