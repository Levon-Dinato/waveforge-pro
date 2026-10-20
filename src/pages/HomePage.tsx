// src/pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrackGrid } from '../components/TrackGrid';
import type { Track } from '../components/TrackGrid';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';

interface Artist {
  id: string;
  username: string;
  avatar_url?: string;
}

export const HomePage = () => {
  const isMobile = useIsMobile(768);
  const { play } = usePlayer();
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (tracksData) setTracks(tracksData as Track[]);

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .limit(10);

        if (profilesData) setArtists(profilesData as Artist[]);
      } catch (err) {
        console.error('Erreur chargement:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ color: '#fff', padding: 60, textAlign: 'center', fontSize: 14, opacity: 0.5 }}>
        CHARGEMENT...
      </div>
    );
  }

  const featured = tracks[0];
  const top10 = [...tracks].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 10);
  const newReleases = tracks.slice(1, 13);

  const playFeatured = () => {
    if (!featured) return;
    play({
      id: featured.id,
      title: featured.title,
      artist: featured.artist,
      audio_url: featured.audio_url,
      cover_url: featured.cover_url,
      user_id: featured.user_id || null,
      duration: featured.duration,
      peaks: featured.peaks,
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 32,
      paddingBottom: 100,
      fontFamily: 'Inter, sans-serif',
      color: '#fff',
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden',
    }}>

      {/* HERO AVEC LE NOUVEAU SLOGAN ET L'IMAGE DE FOND */}
      <div style={{ 
        position: 'relative',
        borderRadius: 12, 
        overflow: 'hidden',
        border: '1px solid #2a2a2a',
        marginBottom: 16,
        width: '100%',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/hero-banner.jpg)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.4,
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #121212 20%, transparent 80%)' }} />

        <div style={{ position: 'relative', padding: isMobile ? '40px 24px' : '60px 40px' }}>
          <h1 style={{ 
            fontSize: isMobile ? '1.8rem' : '3rem', fontWeight: 800, 
            margin: '0 0 12px 0', letterSpacing: '-0.5px', lineHeight: 1.1, maxWidth: 700,
          }}>
            Les nouvelles sorties et les remixes.
          </h1>
          <p style={{ color: '#ccc', fontSize: isMobile ? 14 : 16, maxWidth: 600, margin: 0, lineHeight: 1.5 }}>
            Les promos, edits et morceaux exclusifs autorisés au partage. 
            <br />
            Nouveautés House, Tech House, EDM, Dance et Underground. Une communauté où les DJs présentent leurs productions et leurs découvertes.
          </p>
          
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <Link to="/nouveautes" style={{ padding: '10px 20px', background: '#00d9ff', color: '#000', borderRadius: 4, fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>
              Écouter les sorties
            </Link>
            <Link to="/auth" style={{ padding: '10px 20px', background: 'transparent', color: '#fff', border: '1px solid #2a2a2a', borderRadius: 4, fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>
              Rejoindre la communauté
            </Link>
          </div>
        </div>
      </div>

      {/* BARRE DE NAVIGATION INTERNE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #2a2a2a', width: '100%' }}>
        <div style={{ display: 'flex', gap: 24, overflowX: 'auto', width: '100%' }}>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>Accueil</Link>
          <Link to="/nouveautes" style={{ color: '#999', textDecoration: 'none', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>Sorties</Link>
          <Link to="/genres" style={{ color: '#999', textDecoration: 'none', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>Genres</Link>
          <Link to="/artists" style={{ color: '#999', textDecoration: 'none', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>Artistes</Link>
          <Link to="/live" style={{ color: '#ff3366', textDecoration: 'none', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>🔴 LIVE</Link>
        </div>
      </div>

      {/* ✅ CONTENEUR PRINCIPAL : Sidebar gauche (contenu) + Sidebar droite (top 10) */}
      <div style={{ 
        display: 'flex', 
        gap: 24, 
        alignItems: 'flex-start', 
        width: '100%',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        
        {/* COLONNE GAUCHE (À la une + Nouvelles sorties) */}
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
          
          {/* MODULE À LA UNE EN 3D */}
          {featured && (
            <div 
              onClick={playFeatured}
              className="featured-3d-card"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                height: isMobile ? 220 : 320,
                borderRadius: 12,
                overflow: 'hidden',
                cursor: 'pointer',
                border: '1px solid #2a2a2a',
                marginBottom: 32,
                width: '100%',
                transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.4s ease, border-color 0.4s ease',
              }}
            >
              <div 
                className="featured-3d-bg"
                style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(${featured.cover_url || ''})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(2px) brightness(0.6)',
                  transition: 'transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), filter 0.6s ease',
                }} 
              />

              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(10,12,20,0.95) 0%, transparent 80%)',
              }} />

              <div style={{ position: 'relative', padding: 20, width: '100%', display: 'flex', alignItems: 'center', gap: 16 }}>
                <button 
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: '#fff', color: '#000', border: 'none',
                    fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  ▶
                </button>

                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 11, color: '#00d9ff', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    À LA UNE
                  </span>
                  <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, margin: '4px 0', color: '#fff', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {featured.title}
                  </h2>
                  <p style={{ fontSize: isMobile ? 13 : 15, color: '#ccc', margin: 0 }}>
                    {featured.artist}
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4 }}>{featured.bpm} BPM</span>
                    <span style={{ fontSize: 10, color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4 }}>{featured.genre || 'Electronic'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Nouvelles sorties</h2>
            <Link to="/nouveautes" style={{ fontSize: 12, color: '#00d9ff', textDecoration: 'none', fontWeight: 600 }}>Tout voir →</Link>
          </div>
          
          <TrackGrid tracks={newReleases} />
        </div>

        {/* COLONNE DROITE (Top 10 + Artistes) - Cachée sur mobile */}
        {!isMobile && (
          <aside style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            <div style={{ background: '#1c1c1c', borderRadius: 8, border: '1px solid #2a2a2a', padding: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 12 }}>TOP 10</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {top10.map((track, idx) => (
                  <div key={track.id} onClick={() => play({
                    id: track.id, title: track.title, artist: track.artist,
                    audio_url: track.audio_url, cover_url: track.cover_url,
                    user_id: track.user_id || null, duration: track.duration, peaks: track.peaks,
                  })} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#666', width: 16 }}>{idx + 1}</span>
                    <div style={{ width: 32, height: 32, borderRadius: 2, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1a1a', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 10, color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#1c1c1c', borderRadius: 8, border: '1px solid #2a2a2a', padding: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Artistes en vue</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {artists.slice(0, 5).map((artist) => (
                  <Link key={artist.id} to={`/profil/${artist.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : '#121212', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontWeight: 800, fontSize: 11 }}>
                      {!artist.avatar_url && artist.username?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{artist.username}</div>
                  </Link>
                ))}
              </div>
            </div>

          </aside>
        )}
      </div>

      {/* EFFETS 3D ET ANIMATIONS */}
      <style>{`
        .featured-3d-card:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 217, 255, 0.15);
          border-color: rgba(0, 217, 255, 0.4);
        }
        
        .featured-3d-card:hover .featured-3d-bg {
          transform: scale(1.08);
          filter: blur(1px) brightness(0.7);
        }

        .featured-3d-card:hover h2 {
          color: #00d9ff;
          transition: color 0.3s ease;
        }

        a, div, button { outline: none !important; }
        a:focus, div:focus, button:focus { outline: none !important; box-shadow: none !important; }
      `}</style>
    </div>
  );
};