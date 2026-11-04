// src/pages/MyPlaylistsPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlayer } from '../contexts/PlayerContext';

const Icons = {
  playlist: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  play: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  trash: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  arrowLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  close: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
};

export const MyPlaylistsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { play, currentTrack, isPlaying } = usePlayer();

  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ ÉTATS POUR LA CRÉATION DE PLAYLIST
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    border: isDark ? '#222222' : '#e5e7eb',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    accent: '#00d9ff',
    hoverBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
    modalBg: isDark ? '#121212' : '#ffffff',
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchPlaylists();
  }, [user]);

  const fetchPlaylists = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) setPlaylists(data);
    setLoading(false);
  };

  const openPlaylist = async (playlist: any) => {
    setSelectedPlaylist(playlist);
    
    const { data, error } = await supabase
      .from('playlist_tracks')
      .select(`
        id,
        track_id,
        tracks (*)
      `)
      .eq('playlist_id', playlist.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const tracks = data.map(item => item.tracks).filter(Boolean);
      setPlaylistTracks(tracks);
    }
  };

  const handlePlayTrack = (track: any) => {
    if (!user) return;
    play({ 
      id: track.id, title: track.title, artist: track.artist, 
      audio_url: track.audio_url, cover_url: track.cover_url, 
      user_id: track.user_id, duration: track.duration, 
      peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, 
      genre: track.genre, player_bg_image_url: track.player_bg_image_url, 
      player_bg_color: track.player_bg_color 
    });
  };

  const deletePlaylist = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer cette playlist ?")) return;
    
    await supabase.from('playlists').delete().eq('id', id);
    setPlaylists(playlists.filter(p => p.id !== id));
    if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
  };

  // ✅ FONCTION POUR RETIRER UN SON DE LA PLAYLIST
  const removeTrackFromPlaylist = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    if (!selectedPlaylist) return;
    if (!window.confirm("Retirer ce son de la playlist ?")) return;

    try {
      const { error } = await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', selectedPlaylist.id)
        .eq('track_id', trackId);

      if (error) throw error;
      
      // Mise à jour locale de l'UI
      setPlaylistTracks(prev => prev.filter(t => t.id !== trackId));
    } catch (err) {
      alert("Erreur lors de la suppression du son.");
    }
  };

  // ✅ FONCTION CRÉER UNE PLAYLIST
  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPlaylistName.trim()) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase.from('playlists').insert({
        user_id: user.id,
        name: newPlaylistName.trim()
      }).select().single();

      if (error) throw error;
      
      setPlaylists([data, ...playlists]);
      setNewPlaylistName('');
      setShowCreateModal(false);
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: colors.textMain, background: colors.bg, minHeight: '100vh' }}>Chargement...</div>;

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {selectedPlaylist && (
              <button onClick={() => setSelectedPlaylist(null)} style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {Icons.arrowLeft}
              </button>
            )}
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: colors.textMain, margin: 0 }}>
                {selectedPlaylist ? selectedPlaylist.name : 'Mes Playlists'}
              </h1>
              <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: 14 }}>
                {selectedPlaylist ? `${playlistTracks.length} morceau(x)` : `${playlists.length} playlist(s)`}
              </p>
            </div>
          </div>

          {/* ✅ BOUTON CRÉER UNE PLAYLIST (Visible seulement sur la vue globale) */}
          {!selectedPlaylist && (
            <button 
              onClick={() => setShowCreateModal(true)} 
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: colors.accent, color: '#000', borderRadius: 8, fontWeight: 800, border: 'none', cursor: 'pointer' }}
            >
              {Icons.plus} Créer une playlist
            </button>
          )}
        </div>

        {/* Vue Liste des Playlists */}
        {!selectedPlaylist && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {playlists.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, border: `1px dashed ${colors.border}`, borderRadius: 16 }}>
                <div style={{ color: colors.textMuted, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{Icons.playlist}</div>
                <p style={{ color: colors.textMuted }}>Vous n'avez pas encore de playlist.</p>
                <p style={{ color: colors.textMuted, fontSize: 13 }}>Cliquez sur "Créer une playlist" pour commencer.</p>
              </div>
            ) : (
              playlists.map(p => (
                <div 
                  key={p.id}
                  onClick={() => openPlaylist(p)}
                  style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${colors.accent}15`, color: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    {Icons.playlist}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: colors.textMain, margin: '0 0 4px 0' }}>{p.name}</h3>
                  <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>
                    Créée le {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  
                  <button onClick={(e) => deletePlaylist(e, p.id)} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 4 }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff5c5c'} onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}>
                    {Icons.trash}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Vue Morceaux d'une Playlist */}
        {selectedPlaylist && (
          <div style={{ background: colors.panelBg, borderRadius: 16, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            {playlistTracks.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>
                Cette playlist est vide. Ajoutez des sons depuis le lecteur audio ou depuis votre profil !
              </div>
            ) : (
              playlistTracks.map((track, index) => {
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                return (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: index < playlistTracks.length - 1 ? `1px solid ${colors.border}` : 'none' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    
                    <button onClick={() => handlePlayTrack(track)} style={{ width: 36, height: 36, borderRadius: '50%', background: isThisPlaying ? colors.accent : 'transparent', border: `1px solid ${isThisPlaying ? colors.accent : colors.border}`, color: isThisPlaying ? '#000' : colors.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      {isThisPlaying ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      )}
                    </button>

                    <div style={{ width: 44, height: 44, borderRadius: 6, background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.border, flexShrink: 0 }} />
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link to={`/track/${track.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isThisPlaying ? colors.accent : colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      </Link>
                      <div style={{ fontSize: 12, color: colors.textMuted }}>{track.artist}</div>
                    </div>

                    <div style={{ fontSize: 12, color: colors.textMuted, fontFamily: 'monospace', marginRight: 16 }}>
                      {track.bpm ? `${track.bpm} BPM` : ''}
                    </div>

                    {/* ✅ BOUTON SUPPRIMER DU SON DE LA PLAYLIST */}
                    <button 
                      onClick={(e) => removeTrackFromPlaylist(e, track.id)} 
                      style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, transition: 'all 0.2s' }}
                      title="Retirer de la playlist"
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ff5c5c'; e.currentTarget.style.background = 'rgba(255,92,92,0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.background = 'transparent'; }}
                    >
                      {Icons.trash}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ✅ MODALE DE CRÉATION DE PLAYLIST */}
      {showCreateModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowCreateModal(false)}>
          <div style={{ background: colors.modalBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 32, width: '100%', maxWidth: 400, position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer' }}>
              {Icons.close}
            </button>
            
            <h2 style={{ fontSize: 20, fontWeight: 900, color: colors.textMain, margin: '0 0 20px 0' }}>Nouvelle Playlist</h2>
            
            <form onSubmit={handleCreatePlaylist} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 700 }}>Nom de la playlist</label>
                <input 
                  type="text" 
                  autoFocus 
                  required
                  placeholder="Ex: Mes sons préférés" 
                  value={newPlaylistName} 
                  onChange={e => setNewPlaylistName(e.target.value)} 
                  style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none' }} 
                />
              </div>
              <button type="submit" disabled={isCreating} style={{ padding: 14, background: colors.accent, color: '#000', borderRadius: 8, fontWeight: 800, border: 'none', cursor: isCreating ? 'wait' : 'pointer' }}>
                {isCreating ? 'Création...' : 'Créer la playlist'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};