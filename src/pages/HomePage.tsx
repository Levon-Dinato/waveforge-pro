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

  const panelStyle: React.CSSProperties = {
    background: '#1c1c1c',
    borderRadius: 8,
    border: '1px solid #2a2a2a',
    padding: 20,
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 32,
      paddingBottom: 100,
      fontFamily: 'Inter, sans-serif',
      color: '#fff',
    }}>

      {/* ✅ HERO AVEC LE NOUVEAU SLOGAN */}
      <div style={{ paddingBottom: 16, borderBottom: '1px solid #2a2a2a' }}>
        <h1 style={{ 
          fontSize: isMobile ? '1.8rem' : '2.5rem', 
          fontWeight: 800, 
          margin: '0 0 12px 0',
          letterSpacing: '-0.5px',
          lineHeight: 1.1
        }}>
          Les nouvelles sorties et les remixes.
        </h1>
        <p style={{ 
          color: '#999', 
          fontSize: isMobile ? 14 : 16, 
          maxWidth: 800, 
          margin: 0,
          lineHeight: 1.5
        }}>
          Les promos, edits et morceaux exclusifs autorisés au partage. 
          <br style={{ display: isMobile ? 'none' : 'block' }} />
          Nouveautés House, Tech House, EDM, Dance et Underground. Une communauté où les DJs présentent leurs productions et leurs découvertes.
        </p>
      </div>

      {/* BARRE DE NAVIGATION INTERNE */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 16,
        borderBottom: '1px solid #2a2a2a',
      }}>
        <div style={{ display: 'flex', gap: 24, overflowX: 'auto', width: '100%' }}>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>Accueil</Link>
          <Link to="/nouveautes" style={{ color: '#999', textDecoration: 'none', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>Sorties</Link>
          <Link to="/genres" style={{ color: '#999', textDecoration: 'none', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>Genres</Link>
          <Link to="/artists" style={{ color: '#999', textDecoration: 'none', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>Artistes</Link>
          <Link to="/live" style={{ color: '#ff3366', textDecoration: 'none', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>🔴 LIVE</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 32 }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {featured && (
            <div style={{ ...panelStyle, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 24 }}>
              <div 
                onClick={() => play(featured)}
                style={{
                  width: isMobile ? '100%' : 200, height: isMobile ? 200 : 200,
                  borderRadius: 4, overflow: 'hidden', flexShrink: 0,
                  background: featured.cover_url ? `url(${featured.cover_url}) center/cover` : '#1a1a1a',
                  cursor: 'pointer', position: 'relative',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }} className="hover-play">
                  <span style={{ fontSize: 40, color: '#00d9ff' }}>▶</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: '#999', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>À LA UNE</span>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>{featured.title}</h1>
                <p style={{ fontSize: 16, color: '#999', margin: '0 0 16px 0' }}>{featured.artist}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 11, color: '#fff', background: '#121212', padding: '4px 8px', borderRadius: 4, border: '1px solid #2a2a2a' }}>{featured.bpm} BPM</span>
                  <span style={{ fontSize: 11, color: '#fff', background: '#121212', padding: '4px 8px', borderRadius: 4, border: '1px solid #2a2a2a' }}>{featured.genre || 'Electronic'}</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Nouvelles sorties</h2>
              <Link to="/nouveautes" style={{ fontSize: 12, color: '#00d9ff', textDecoration: 'none', fontWeight: 600 }}>Tout voir →</Link>
            </div>
            <TrackGrid tracks={newReleases} />
          </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div style={panelStyle}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              TOP 10
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {top10.map((track, idx) => (
                <div key={track.id} onClick={() => play(track)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#999', width: 20 }}>{idx + 1}</span>
                  <div style={{ width: 36, height: 36, borderRadius: 2, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1a1a', flexShrink: 0, border: '1px solid #2a2a2a' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                    <div style={{ fontSize: 11, color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                  </div>
                  <div style={{ fontSize: 10, color: '#666' }}>{track.bpm}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={panelStyle}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Artistes en vue</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {artists.slice(0, 5).map((artist) => (
                <Link key={artist.id} to={`/profil/${artist.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : '#121212', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontWeight: 800, fontSize: 12 }}>
                    {!artist.avatar_url && artist.username?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{artist.username}</div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .hover-play:hover { opacity: 1 !important; }
        a, div, button { outline: none !important; }
        a:focus, div:focus, button:focus { outline: none !important; box-shadow: none !important; }
      `}</style>
    </div>
  );
};