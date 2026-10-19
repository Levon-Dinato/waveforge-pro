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

        if (tracksData) {
          setTracks(tracksData as Track[]);
        }

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
      <div style={{ color: '#fff', padding: 60, textAlign: 'center', fontSize: 14, letterSpacing: '2px', opacity: 0.5 }}>
        CHARGEMENT...
      </div>
    );
  }

  const featured = tracks[0];
  const top10 = [...tracks].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 10);
  const newReleases = tracks.slice(1, 13); // 12 morceaux pour la grille

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 32,
      paddingBottom: 100, // Espace pour le lecteur
      fontFamily: 'monospace',
    }}>

      {/* ============ HEADER STYLE BEATPORT ============ */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        background: 'rgba(10, 12, 20, 0.8)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        gap: 16,
      }}>
        {/* Logo & Liens */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/" style={{ fontSize: 20, fontWeight: 900, color: '#fff', textDecoration: 'none' }}>
            WAVE<span style={{ color: '#00d9ff' }}>FORGE</span>
          </Link>
          {!isMobile && (
            <div style={{ display: 'flex', gap: 20 }}>
              <Link to="/nouveautes" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Sorties</Link>
              <Link to="/genres" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Genres</Link>
              <Link to="/artists" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Artistes</Link>
              <Link to="/live" style={{ color: '#ff3366', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>🔴 LIVE</Link>
            </div>
          )}
        </div>

        {/* Recherche & Connexion */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: isMobile ? '100%' : 'auto' }}>
          <Link to="/search" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', background: 'rgba(255,255,255,0.05)',
            borderRadius: 8, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13,
            flex: 1,
          }}>
            🔍 Rechercher...
          </Link>
          <Link to="/auth" style={{
            padding: '8px 16px', background: '#00d9ff', color: '#000',
            borderRadius: 8, fontWeight: 800, textDecoration: 'none', fontSize: 13,
          }}>
            Connexion
          </Link>
        </div>
      </div>

      {/* ============ CONTENU PRINCIPAL ============ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
        gap: 32,
        padding: '0 24px',
      }}>
        
        {/* COLONNE GAUCHE : À LA UNE + SORTIES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {/* À LA UNE */}
          {featured && (
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 24,
              background: '#0a0c14',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div 
                onClick={() => play(featured)}
                style={{
                  width: isMobile ? '100%' : 200, height: isMobile ? 200 : 200,
                  borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                  background: featured.cover_url ? `url(${featured.cover_url}) center/cover` : '#1a1c24',
                  cursor: 'pointer', position: 'relative',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }} className="hover-play">
                  <span style={{ fontSize: 40, color: '#00d9ff' }}>▶</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: '#00d9ff', fontWeight: 800, letterSpacing: '1.5px', marginBottom: 8 }}>À LA UNE</span>
                <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: '0 0 8px 0' }}>{featured.title}</h1>
                <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', margin: '0 0 16px 0' }}>{featured.artist}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 4 }}>{featured.bpm} BPM</span>
                  <span style={{ fontSize: 12, color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 4 }}>{featured.genre || 'Electronic'}</span>
                </div>
              </div>
            </div>
          )}

          {/* GRILLE DE SORTIES */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>Nouvelles sorties</h2>
              <Link to="/nouveautes" style={{ fontSize: 13, color: '#00d9ff', textDecoration: 'none' }}>Tout voir →</Link>
            </div>
            <TrackGrid tracks={newReleases} />
          </div>

        </div>

        {/* COLONNE DROITE : TOP 10 & ARTISTES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {/* TOP 10 */}
          <div style={{ background: 'rgba(15,18,28,0.6)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#00d9ff' }}>⬆</span> TOP 10
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {top10.map((track, idx) => (
                <div key={track.id} onClick={() => play(track)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#00d9ff', width: 20 }}>{idx + 1}</span>
                  <div style={{ width: 40, height: 40, borderRadius: 6, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1c24', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{track.bpm} BPM</div>
                </div>
              ))}
            </div>
          </div>

          {/* ARTISTES EN VUE */}
          <div style={{ background: 'rgba(15,18,28,0.6)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 16 }}>Artistes en vue</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {artists.slice(0, 5).map((artist) => (
                <Link key={artist.id} to={`/profil/${artist.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : 'linear-gradient(135deg, #00d9ff, #7c5cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 14 }}>
                    {!artist.avatar_url && artist.username?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{artist.username}</div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Animations */}
      <style>{`
        .hover-play:hover { opacity: 1 !important; }
      `}</style>
    </div>
  );
};