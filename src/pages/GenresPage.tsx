import React, { useState, useEffect } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { supabase } from '../lib/supabase';

const GENRES = [
  { name: 'House', color: '#00d9ff', icon: '🏠' },
  { name: 'Techno', color: '#7c5cff', icon: '🎛️' },
  { name: 'Hardcore', color: '#ff5c5c', icon: '⚡' },
  { name: 'Hardstyle', color: '#ffd43b', icon: '🔊' },
  { name: 'Deep House', color: '#00ff88', icon: '🌊' },
  { name: 'Tech House', color: '#a08aff', icon: '🎧' },
  { name: 'Drum & Bass', color: '#ff8c00', icon: '🥁' },
  { name: 'Dubstep', color: '#ff5cf0', icon: '👾' },
  { name: 'Trance', color: '#00e5ff', icon: '🌌' },
  { name: 'Afro House', color: '#ffb800', icon: '🌍' },
  { name: 'Amapiano', color: '#4ade80', icon: '🎹' },
  { name: 'Disco', color: '#f472b6', icon: '🪩' },
];

interface Track {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string;
  duration: number;
  peaks: number[];
  user_id: string | null;
  genre: string;
}

export const GenresPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const { play } = usePlayer();
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTracks = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setTracks(data);
      setLoading(false);
    };
    fetchTracks();
  }, []);

  const handlePlay = (track: Track) => {
    play({
      id: track.id,
      title: track.title,
      artist: track.artist,
      audio_url: track.audio_url,
      cover_url: track.cover_url,
      user_id: track.user_id,
      duration: track.duration,
      peaks: track.peaks,
    });
  };

  const filteredTracks = selectedGenre 
    ? tracks.filter(t => (t.genre || '').toLowerCase().includes(selectedGenre.toLowerCase()))
    : tracks;

  return (
    <div style={{ background: '#0a0c14', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', paddingBottom: 100 }}>
      
      {/* HEADER */}
      <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, margin: 0 }}>
          Explorer par <span style={{ color: '#e50000' }}>Genre</span>
        </h1>
        <p style={{ color: '#888', marginTop: 8, fontSize: '0.9rem' }}>
          Trouve le son parfait pour ton prochain set.
        </p>
      </div>

      {/* BOUTON RETOUR */}
      {selectedGenre && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', marginBottom: 20 }}>
          <button 
            onClick={() => setSelectedGenre(null)}
            style={{ background: 'transparent', border: '1px solid #333', color: '#fff', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}
          >
            ← Retour aux genres
          </button>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
        
        {/* GRILLE DES GENRES */}
        {!selectedGenre && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 15 }}>
            {GENRES.map((genre) => (
              <div 
                key={genre.name}
                onClick={() => setSelectedGenre(genre.name)}
                style={{
                  background: `linear-gradient(135deg, ${genre.color}30, ${genre.color}10)`,
                  border: `1px solid ${genre.color}40`,
                  borderRadius: 12,
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: 120,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 10px 30px ${genre.color}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: 32 }}>{genre.icon}</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: genre.color }}>{genre.name}</div>
              </div>
            ))}
          </div>
        )}

        {/* LISTE DES MORCEAUX */}
        {selectedGenre && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
              {selectedGenre} <span style={{ color: '#666', fontSize: 16, fontWeight: 400 }}>({filteredTracks.length} morceaux)</span>
            </h2>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Chargement...</div>
            ) : filteredTracks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Aucun morceau dans ce genre pour le moment.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 15 }}>
                {filteredTracks.map((track) => (
                  <div key={track.id} onClick={() => handlePlay(track)} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} className="hover-scale">
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 6, overflow: 'hidden', marginBottom: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                      {track.cover_url ? (
                        <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎵</div>
                      )}
                      <div className="play-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e50000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#fff', paddingLeft: 3 }}>▶</div>
                      </div>
                    </div>
                    <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                    <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 2 }}>{track.artist}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`
        .hover-scale:hover .play-overlay { opacity: 1 !important; }
        .hover-scale:hover { transform: translateY(-3px); }
        .hover-scale { transition: transform 0.2s ease; }
      `}</style>
    </div>
  );
};