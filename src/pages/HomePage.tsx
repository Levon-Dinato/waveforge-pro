// src/pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrackGrid } from '../components/TrackGrid';
import type { Track } from '../components/TrackGrid';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';
import { EventsTicker } from '../components/EventsTicker';

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
      gap: isMobile ? 20 : 32, // ✅ Moins d'espace entre les blocs sur mobile
      paddingBottom: 100,
      fontFamily: 'Inter, sans-serif',
      color: '#fff',
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden',
      background: '#121212',
      boxSizing: 'border-box', // ✅ Sécurité anti-débordement
    }}>

      <EventsTicker />

      {/* CONTENEUR CENTRAL */}
      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto', 
        width: '100%', 
        padding: isMobile ? '0 12px' : '0 20px', // ✅ Padding réduit sur mobile
        display: 'flex', 
        flexDirection: 'column', 
        gap: isMobile ? 20 : 32 
      }}>

        {/* HERO SECTION */}
        <div style={{ 
          position: 'relative',
          borderRadius: 8, 
          overflow: 'hidden',
          border: '1px solid #2a2a2a',
          width: '100%',
          height: isMobile ? 280 : 400, // ✅ Un peu moins haut sur mobile
          background: '#000',
        }}>
          <video
            autoPlay loop muted playsInline
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', opacity: 0.4,
            }}
          >
            <source src="/videos/hero-video.mp4" type="video/mp4" />
          </video>

          <div style={{ 
            position: 'absolute', inset: 0, 
            background: isMobile 
              ? 'linear-gradient(to top, #121212 40%, transparent 100%)' // ✅ Dégradé vertical sur mobile
              : 'linear-gradient(90deg, #121212 30%, transparent 90%)' 
          }} />

          <div style={{ 
            position: 'relative', 
            padding: isMobile ? '24px 16px' : '48px',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end', // ✅ Texte poussé vers le bas sur mobile
            height: '100%',
          }}>
            <h1 style={{ 
              fontSize: isMobile ? '1.8rem' : '3rem', fontWeight: 700, 
              margin: '0 0 12px 0', letterSpacing: '-1px', lineHeight: 1.1, maxWidth: 600,
            }}>
              Les nouvelles sorties et les remixes.
            </h1>
            <p style={{ color: '#aaa', fontSize: isMobile ? 13 : 15, maxWidth: 500, margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Les promos, edits et morceaux exclusifs autorisés au partage.
            </p>
            
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/nouveautes" style={{ 
                padding: '10px 20px', background: '#fff', color: '#000', 
                borderRadius: 4, fontWeight: 600, textDecoration: 'none', fontSize: 13,
                flex: isMobile ? 1 : 'none', // ✅ Boutons prennent toute la largeur sur mobile
                textAlign: 'center',
              }}>
                Écouter
              </Link>
              <Link to="/auth" style={{ 
                padding: '10px 20px', background: 'transparent', color: '#fff', 
                border: '1px solid #333', borderRadius: 4, fontWeight: 600, textDecoration: 'none', fontSize: 13,
                flex: isMobile ? 1 : 'none',
                textAlign: 'center',
              }}>
                Rejoindre
              </Link>
            </div>
          </div>
        </div>

        {/* NAVIGATION INTERNE (Scrollable horizontalement sur mobile) */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          borderBottom: '1px solid #2a2a2a', 
          paddingBottom: 12, 
          gap: 20, 
          overflowX: 'auto', 
          width: '100%',
          // ✅ Cache la barre de défilement moche sur mobile
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
          <style>{`.internal-nav::-webkit-scrollbar { display: none; }`}</style>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Accueil</Link>
          <Link to="/nouveautes" style={{ color: '#888', textDecoration: 'none', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>Sorties</Link>
          <Link to="/events" style={{ color: '#888', textDecoration: 'none', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>Événements</Link>
          <Link to="/genres" style={{ color: '#888', textDecoration: 'none', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>Genres</Link>
          <Link to="/artists" style={{ color: '#888', textDecoration: 'none', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>Artistes</Link>
          <Link to="/live" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ff3366', textDecoration: 'none', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3366' }} /> LIVE
          </Link>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div style={{ 
          display: 'flex', 
          gap: isMobile ? 20 : 32, 
          alignItems: 'flex-start', 
          width: '100%',
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          
          {/* COLONNE GAUCHE */}
          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
            
            {/* MODULE À LA UNE */}
            {featured && (
              <div 
                onClick={playFeatured}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                  height: isMobile ? 200 : 320, // ✅ Plus petit sur mobile
                  borderRadius: 8,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid #2a2a2a',
                  marginBottom: isMobile ? 20 : 32,
                  width: '100%',
                }}
              >
                <div 
                  style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${featured.cover_url || ''})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }} 
                />
                
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 80%)' }} />

                <div style={{ position: 'relative', padding: isMobile ? 16 : 24, width: '100%', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button 
                    style={{
                      width: isMobile ? 44 : 56, height: isMobile ? 44 : 56, borderRadius: '50%',
                      background: '#fff', color: '#000', border: 'none',
                      fontSize: isMobile ? 16 : 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    ▶
                  </button>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 9, color: '#fff', background: '#00d9ff', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                      À LA UNE
                    </span>
                    <h2 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, margin: '6px 0 2px 0', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {featured.title}
                    </h2>
                    <p style={{ fontSize: isMobile ? 12 : 14, color: '#ccc', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {featured.artist}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: '#fff', margin: 0 }}>Nouvelles sorties</h2>
              <Link to="/nouveautes" style={{ fontSize: 13, color: '#00d9ff', textDecoration: 'none', fontWeight: 500 }}>Tout voir →</Link>
            </div>
            
            <TrackGrid tracks={newReleases} />
          </div>

          {/* COLONNE DROITE (Cachée sur mobile, gérée par TrackGrid si besoin) */}
          {!isMobile && (
            <aside style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div style={{ background: '#181818', borderRadius: 8, border: '1px solid #2a2a2a', padding: 16 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: '0 0 16px 0' }}>TOP 10</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {top10.map((track, idx) => (
                    <div key={track.id} onClick={() => play({
                      id: track.id, title: track.title, artist: track.artist,
                      audio_url: track.audio_url, cover_url: track.cover_url,
                      user_id: track.user_id || null, duration: track.duration, peaks: track.peaks,
                    })} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#666', width: 16, textAlign: 'center' }}>{idx + 1}</span>
                      <div style={{ width: 36, height: 36, borderRadius: 4, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                        <div style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#181818', borderRadius: 8, border: '1px solid #2a2a2a', padding: 16 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: '0 0 16px 0' }}>Artistes en vue</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {artists.slice(0, 5).map((artist) => (
                    <Link key={artist.id} to={`/profil/${artist.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : '#222', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontWeight: 700, fontSize: 12 }}>
                        {!artist.avatar_url && artist.username?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{artist.username}</div>
                    </Link>
                  ))}
                </div>
              </div>

            </aside>
          )}
        </div>
      </div>
    </div>
  );
};