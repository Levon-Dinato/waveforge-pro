// src/pages/NouveautesPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { DeleteButton } from '../components/DeleteButton';

// ✅ SVG Icons
const Icons = {
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
};

interface Track {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string;
  bpm: number;
  song_key: string | null;
  genre: string;
  duration: number;
  user_id: string;
  likes_count: number;
  created_at: string;
}

interface Artist {
  id: string;
  username: string;
  avatar_url?: string;
}

const ITEMS_PER_PAGE = 15;

const PAGINATION_BTN: React.CSSProperties = {
  background: 'transparent', border: '1px solid #222', color: '#fff',
  minWidth: 36, height: 36, borderRadius: 8, fontWeight: 700, fontSize: 13,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s ease', padding: '0 10px',
};

export const NouveautesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { play, currentTrack, isPlaying } = usePlayer();
  const isMobile = useIsMobile(1024);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('Tout');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: tracksData } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
      if (tracksData) setTracks(tracksData);

      const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url').limit(10);
      if (profilesData) setArtists(profilesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGenre, searchQuery]);

  const handlePlay = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    play({
      id: track.id, title: track.title, artist: track.artist,
      audio_url: track.audio_url, cover_url: track.cover_url,
      user_id: track.user_id, duration: track.duration, peaks: track.peaks,
    });
  };

  const genres = ['Tout', ...Array.from(new Set(tracks.map(t => t.genre).filter(Boolean)))];

  const filteredTracks = tracks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'Tout' || t.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  // ✅ CALCUL DU TOP 10 (LIGNE MANQUANTE)
  const top10 = [...tracks].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 10);

  // Calcul de la pagination
  const recommendations = filteredTracks.slice(0, 5);
  const allReleases = filteredTracks.slice(5);
  const totalPages = Math.max(1, Math.ceil(allReleases.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReleases = allReleases.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const Pagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) {
        pages.push(i);
      } else if (Math.abs(i - safePage) === 2) {
        pages.push('...');
      }
    }
    const cleanedPages = pages.filter((p, i) => !(p === '...' && pages[i - 1] === '...'));

    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setCurrentPage(Math.max(1, safePage - 1))} disabled={safePage === 1} style={{ ...PAGINATION_BTN, opacity: safePage === 1 ? 0.3 : 1, cursor: safePage === 1 ? 'default' : 'pointer' }}>←</button>
        {cleanedPages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ color: '#555', padding: '0 6px' }}>…</span>
          ) : (
            <button key={p} onClick={() => setCurrentPage(p as number)} style={{ ...PAGINATION_BTN, background: p === safePage ? '#00d9ff' : 'transparent', color: p === safePage ? '#000' : '#888', border: p === safePage ? 'none' : '1px solid #222' }}>{p}</button>
          )
        )}
        <button onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages} style={{ ...PAGINATION_BTN, opacity: safePage === totalPages ? 0.3 : 1, cursor: safePage === totalPages ? 'default' : 'pointer' }}>→</button>
      </div>
    );
  };

  const TrackRow = ({ track }: { track: Track }) => {
    const isThisTrack = currentTrack?.id === track.id;
    const isThisPlaying = isThisTrack && isPlaying;
    const canEdit = isAdmin || user?.id === track.user_id;

    return (
      <div 
        onClick={() => navigate(`/track/${track.id}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderBottom: '1px solid #222', cursor: 'pointer', transition: 'background 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <div 
          onClick={(e) => handlePlay(e, track)} 
          style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: isThisPlaying ? '#00d9ff' : 'transparent', border: isThisPlaying ? 'none' : '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isThisPlaying ? '#000' : '#888', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          {isThisPlaying ? Icons.pause : Icons.play}
        </div>

        <div style={{ width: 44, height: 44, borderRadius: 6, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1a1a', flexShrink: 0, border: '1px solid #222' }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
          <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{track.artist}</div>
        </div>

        {!isMobile && (
          <>
            <div style={{ width: 120, fontSize: 12, color: '#aaa' }}>{track.genre}</div>
            <div style={{ width: 80, fontSize: 12, color: '#aaa', fontFamily: 'monospace' }}>{track.bpm} BPM</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: 80, justifyContent: 'flex-end' }}>
              <div style={{ color: '#ff3366', fontSize: 12 }}>❤️ {track.likes_count || 0}</div>
              {canEdit && <DeleteButton table="tracks" itemId={track.id} itemOwnerId={track.user_id} onDeleted={fetchData} />}
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) return <div style={{ color: '#888', padding: 40, textAlign: 'center' }}>Chargement...</div>;

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: isMobile ? '16px' : '40px 24px', display: 'flex', gap: 32, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* 🟢 COLONNE GAUCHE (GENRES) */}
        {isMobile ? (
          <div style={{ width: '100%', overflowX: 'auto', display: 'flex', gap: 8, paddingBottom: 8, scrollbarWidth: 'none' }}>
            {genres.map(g => (
              <button key={g} onClick={() => setSelectedGenre(g)} style={{ padding: '8px 16px', borderRadius: 20, whiteSpace: 'nowrap', border: 'none', background: selectedGenre === g ? '#fff' : '#121212', color: selectedGenre === g ? '#000' : '#888', fontWeight: 600, fontSize: 13 }}>
                {g}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ width: 200, flexShrink: 0, position: 'sticky', top: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Genres</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {genres.map(g => (
                <button key={g} onClick={() => setSelectedGenre(g)} style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', background: selectedGenre === g ? 'rgba(255,255,255,0.05)' : 'transparent', color: selectedGenre === g ? '#fff' : '#888', fontWeight: selectedGenre === g ? 700 : 500, fontSize: 13, cursor: 'pointer', borderLeft: selectedGenre === g ? '2px solid #00d9ff' : '2px solid transparent' }}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 🟢 COLONNE CENTRALE */}
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>Nouveautés</h1>
            <div style={{ position: 'relative', width: isMobile ? '100%' : 250 }}>
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#666' }}>{Icons.search}</div>
              <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 36px', background: '#121212', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 13 }} />
            </div>
          </div>

          {safePage === 1 && recommendations.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Recommandations</h2>
                <span style={{ fontSize: 12, color: '#666' }}>Sélection du moment</span>
              </div>
              <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
                {recommendations.map(t => <TrackRow key={t.id} track={t} />)}
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                {selectedGenre === 'Tout' ? 'Toutes les sorties' : `Sorties ${selectedGenre}`}
              </h2>
              <span style={{ fontSize: 12, color: '#666' }}>{allReleases.length} morceaux</span>
            </div>
            <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
              {paginatedReleases.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#666', fontStyle: 'italic' }}>Aucun morceau dans cette catégorie.</div>
              ) : (
                paginatedReleases.map(t => <TrackRow key={t.id} track={t} />)
              )}
            </div>
            
            <Pagination />
          </div>
        </div>

        {/* 🟢 COLONNE DROITE (TOP 10 & ARTISTES) */}
        <div style={{ width: isMobile ? '100%' : 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: '#fff', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Top 10</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {top10.map((track, idx) => (
                <div key={track.id} onClick={() => navigate(`/track/${track.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <span style={{ fontSize: 14, fontWeight: 900, fontStyle: 'italic', color: idx < 3 ? '#00d9ff' : '#444', width: 20 }}>{idx + 1}</span>
                  <div style={{ width: 36, height: 36, borderRadius: 4, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                    <div style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: '#fff', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Artistes en vue</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {artists.slice(0, 5).map(artist => (
                <div key={artist.id} onClick={() => navigate(`/profil/${artist.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : '#1a1a1a', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d9ff', fontWeight: 700, fontSize: 12 }}>
                    {!artist.avatar_url && artist.username?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{artist.username}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};