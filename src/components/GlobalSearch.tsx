// src/components/GlobalSearch.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

const Icons = {
  search: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  music: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  playlist: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  close: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
};

export const GlobalSearch: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [results, setResults] = useState<{
    tracks: any[], artists: any[], playlists: any[]
  }>({ tracks: [], artists: [], playlists: [] });

  const colors = {
    inputBg: isDark ? '#121212' : '#f3f4f6',
    border: isDark ? '#222222' : '#e5e7eb',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    panelBg: isDark ? '#121212' : '#ffffff',
    hoverBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  };

  // Fermer le menu si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recherche avec délai (debounce) pour ne pas spammer Supabase
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ tracks: [], artists: [], playlists: [] });
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const searchTerm = `%${query.trim()}%`;

      try {
        const [tracksRes, artistsRes, playlistsRes] = await Promise.all([
          supabase.from('tracks').select('id, title, artist, cover_url').or(`title.ilike.${searchTerm},artist.ilike.${searchTerm}`).limit(3),
          supabase.from('profiles').select('id, username, avatar_url').ilike('username', searchTerm).limit(3),
          supabase.from('playlists').select('id, name, user_id').ilike('name', searchTerm).limit(3)
        ]);

        setResults({
          tracks: tracksRes.data || [],
          artists: artistsRes.data || [],
          playlists: playlistsRes.data || []
        });
        setIsOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300); // Attend 300ms après la dernière frappe

    return () => clearTimeout(timer);
  }, [query]);

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  const hasResults = results.tracks.length > 0 || results.artists.length > 0 || results.playlists.length > 0;

  return (
    <div ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
      
      {/* Barre de recherche */}
      <div style={{ display: 'flex', alignItems: 'center', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '0 12px', height: 40 }}>
        <span style={{ color: colors.textMuted, marginRight: 8 }}>{Icons.search}</span>
        <input 
          type="text" 
          placeholder="Rechercher un son, artiste, playlist..."
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => { if (query.length >= 2) setIsOpen(true); }}
          style={{ flex: 1, background: 'transparent', border: 'none', color: colors.textMain, outline: 'none', fontSize: 13 }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {Icons.close}
          </button>
        )}
      </div>

      {/* Menu déroulant des résultats */}
      {isOpen && query.length >= 2 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', overflow: 'hidden', zIndex: 9999 }}>
          
          {loading ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: colors.textMuted }}>Recherche en cours...</div>
          ) : !hasResults ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: colors.textMuted }}>Aucun résultat pour "{query}"</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Résultats Sons */}
              {results.tracks.length > 0 && (
                <div style={{ padding: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>Sons</div>
                  {results.tracks.map(track => (
                    <div key={track.id} onClick={() => handleNavigate(`/track/${track.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 6, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = colors.hoverBg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 32, height: 32, borderRadius: 4, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#333' }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted }}>{track.artist}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', color: colors.textMuted }}>{Icons.music}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Résultats Artistes */}
              {results.artists.length > 0 && (
                <div style={{ padding: 8, borderTop: results.tracks.length > 0 ? `1px solid ${colors.border}` : 'none' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>Artistes</div>
                  {results.artists.map(artist => (
                    <div key={artist.id} onClick={() => handleNavigate(`/premium/${artist.username}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 6, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = colors.hoverBg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : '#333' }} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMain }}>{artist.username}</div>
                      <div style={{ marginLeft: 'auto', color: colors.textMuted }}>{Icons.user}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Résultats Playlists */}
              {results.playlists.length > 0 && (
                <div style={{ padding: 8, borderTop: (results.tracks.length > 0 || results.artists.length > 0) ? `1px solid ${colors.border}` : 'none' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>Playlists</div>
                  {results.playlists.map(pl => (
                    <div key={pl.id} onClick={() => handleNavigate(`/mes-playlists`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 6, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = colors.hoverBg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 32, height: 32, borderRadius: 4, background: colors.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>{Icons.playlist}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMain }}>{pl.name}</div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
};