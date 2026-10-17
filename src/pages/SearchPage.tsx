import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePlayer } from '../contexts/PlayerContext';
import { useIsMobile } from '../hooks/useIsMobile';

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

interface Artist {
  id: string;
  username: string;
  avatar_url: string | null;
}

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const isMobile = useIsMobile(768);
  const { play } = usePlayer();

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'tracks' | 'artists'>('tracks');
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);

  useEffect(() => {
    const search = async () => {
      if (!initialQuery.trim()) {
        setTracks([]);
        setArtists([]);
        return;
      }

      setLoading(true);
      setHasSearched(true);
      
      try {
        // 1. Chercher les tracks (titre, artiste ou genre)
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*')
          .or(`title.ilike.%${initialQuery}%,artist.ilike.%${initialQuery}%,genre.ilike.%${initialQuery}%`)
          .order('created_at', { ascending: false });

        if (tracksData) setTracks(tracksData);

        // 2. Chercher les artistes
        const { data: artistsData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .ilike('username', `%${initialQuery}%`);

        if (artistsData) setArtists(artistsData);

      } catch (err) {
        console.error("Erreur recherche:", err);
      } finally {
        setLoading(false);
      }
    };
    search();
  }, [initialQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchParams({ q: query.trim() });
  };

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

  return (
    <div style={{ background: '#0a0c14', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', paddingBottom: 100 }}>
      
      {/* HEADER + BARRE DE RECHERCHE */}
      <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, margin: 0, marginBottom: 20 }}>
          Recherche
        </h1>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, maxWidth: 600 }}>
          <input 
            type="text" 
            placeholder="Cherche un titre, un artiste, un genre..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ 
              flex: 1,
              padding: '14px 20px', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: 50, 
              color: '#fff', 
              fontSize: '1rem',
              outline: 'none'
            }} 
          />
          <button type="submit" style={{ padding: '0 24px', background: '#e50000', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>
            Chercher
          </button>
        </form>
      </div>

      {/* RÉSULTATS */}
      {hasSearched && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          
          {/* Onglets de résultats */}
          <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
            <button 
              onClick={() => setActiveTab('tracks')}
              style={{ 
                background: 'none', border: 'none', padding: '10px 0', 
                color: activeTab === 'tracks' ? '#fff' : '#888', 
                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', 
                borderBottom: activeTab === 'tracks' ? '2px solid #e50000' : '2px solid transparent' 
              }}
            >
              Morceaux ({tracks.length})
            </button>
            <button 
              onClick={() => setActiveTab('artists')}
              style={{ 
                background: 'none', border: 'none', padding: '10px 0', 
                color: activeTab === 'artists' ? '#fff' : '#888', 
                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', 
                borderBottom: activeTab === 'artists' ? '2px solid #e50000' : '2px solid transparent' 
              }}
            >
              Artistes ({artists.length})
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Recherche en cours...</div>
          ) : (
            <>
              {/* ONGLET TRACKS */}
              {activeTab === 'tracks' && (
                <div>
                  {tracks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Aucun morceau trouvé pour "{initialQuery}".</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 15 }}>
                      {tracks.map((track) => (
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

              {/* ONGLET ARTISTES */}
              {activeTab === 'artists' && (
                <div>
                  {artists.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Aucun artiste trouvé pour "{initialQuery}".</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))', gap: 15 }}>
                      {artists.map((artist) => (
                        <Link key={artist.id} to={`/profil/${artist.id}`} style={{ textDecoration: 'none' }}>
                          <div style={{ background: 'rgba(20, 22, 30, 0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 15, display: 'flex', alignItems: 'center', gap: 15, transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(30, 33, 45, 0.9)'; e.currentTarget.style.borderColor = 'rgba(229, 0, 0, 0.3)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(20, 22, 30, 0.8)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'; }}>
                            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#222', flexShrink: 0, overflow: 'hidden', border: '2px solid #e50000' }}>
                              {artist.avatar_url ? <img src={artist.avatar_url} alt={artist.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🎧</div>}
                            </div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{artist.username}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <style>{`
        .hover-scale:hover .play-overlay { opacity: 1 !important; }
        .hover-scale:hover { transform: translateY(-3px); }
        .hover-scale { transition: transform 0.2s ease; }
      `}</style>
    </div>
  );
};