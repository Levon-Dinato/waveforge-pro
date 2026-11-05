// src/pages/MyPlaylistsPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useIsMobile } from '../hooks/useIsMobile';

const Icons = {
  playlist: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  play: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  trash: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  arrowLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  close: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
};

export const MyPlaylistsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  
  const { play, currentTrack, isPlaying, togglePlay } = usePlayer() as any;

  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      play({ 
        id: track.id, title: track.title, artist: track.artist, 
        audio_url: track.audio_url, cover_url: track.cover_url, 
        user_id: track.user_id, duration: track.duration, 
        peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, 
        genre: track.genre, player_bg_image_url: track.player_bg_image_url, 
        player_bg_color: track.player_bg_color 
      });
    }
  };

  const handlePlayAll = () => {
    if (playlistTracks.length > 0) {
      handlePlayTrack(playlistTracks[0]);
    }
  };

  const deletePlaylist = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer cette playlist ?")) return;
    await supabase.from('playlists').delete().eq('id', id);
    setPlaylists(playlists.filter(p => p.id !== id));
    if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
  };

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
      setPlaylistTracks(prev => prev.filter(t => t.id !== trackId));
    } catch (err) {
      alert("Erreur lors de la suppression du son.");
    }
  };

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

  // ✅ Fonction pour calculer le temps total
  const formatTotalDuration = (tracks: any[]) => {
    const totalSeconds = tracks.reduce((acc, t) => acc + (Number(t.duration) || 0), 0);
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins} min ${secs} sec`;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: colors.textMain, background: colors.bg, minHeight: '100vh' }}>Chargement...</div>;

  // ✅ Récupération de la cover pour le fond de la playlist
  const playlistCover = playlistTracks[0]?.cover_url || null;

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', paddingBottom: 100, fontFamily: 'Inter, sans-serif', color: colors.textMain }}>
      
      {/* ✅ VUE DÉTAIL D'UNE PLAYLIST (STYLE SOUNDCLOUD) */}
      {selectedPlaylist && (
        <div>
          {/* HERO SECTION */}
          <div style={{ 
            position: 'relative', 
            height: isMobile ? 'auto' : 340, 
            minHeight: isMobile ? 300 : 340,
            background: playlistCover ? `url(${playlistCover}) center/cover` : colors.panelBg,
            display: 'flex', 
            alignItems: 'center', 
            padding: isMobile ? '40px 20px' : '0 60px',
            overflow: 'hidden'
          }}>
            {/* Overlay sombre + flou */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(40px)' }} />
            {playlistCover && <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 0%, ${colors.bg} 100%)` }} />}

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: 32, width: '100%', maxWidth: 1200, margin: '0 auto' }}>
              
              {/* Pochette Géante */}
              <div style={{ 
                width: isMobile ? 160 : 220, height: isMobile ? 160 : 220, borderRadius: 12, 
                background: playlistCover ? `url(${playlistCover}) center/cover` : colors.panelBg, 
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)', flexShrink: 0, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent
              }}>
                {!playlistCover && Icons.playlist}
              </div>

              {/* Infos Playlist */}
              <div style={{ flex: 1, color: '#fff' }}>
                <button onClick={() => setSelectedPlaylist(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {Icons.arrowLeft} Retour aux playlists
                </button>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, opacity: 0.8 }}>Playlist</div>
                <h1 style={{ fontSize: isMobile ? 32 : 56, fontWeight: 900, margin: '0 0 16px 0', letterSpacing: '-1px', lineHeight: 1 }}>{selectedPlaylist.name}</h1>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600, opacity: 0.9 }}>
                  <span>{user?.email?.split('@')[0]}</span>
                  <span>•</span>
                  <span>{playlistTracks.length} sons</span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{Icons.clock} {formatTotalDuration(playlistTracks)}</span>
                </div>

                {playlistTracks.length > 0 && (
                  <button onClick={handlePlayAll} style={{ 
                    marginTop: 24, padding: '16px 36px', borderRadius: 30, 
                    background: colors.accent, color: '#000', border: 'none', 
                    fontSize: 16, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: `0 8px 20px ${colors.accent}40`, transition: 'transform 0.2s'
                  }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    {Icons.play} Tout lire
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* LISTE DES SONS */}
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px 12px' : '20px 60px' }}>
            {playlistTracks.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: colors.textMuted, border: `1px dashed ${colors.border}`, borderRadius: 16 }}>
                Cette playlist est vide. Ajoutez des sons depuis le lecteur audio !
              </div>
            ) : (
              <div>
                {/* Header Liste (Desktop) */}
                {!isMobile && (
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px 40px', gap: 16, padding: '0 16px 12px', borderBottom: `1px solid ${colors.border}`, fontSize: 11, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                    <div>#</div>
                    <div>Titre</div>
                    <div>BPM</div>
                    <div>Durée</div>
                    <div></div>
                  </div>
                )}

                {playlistTracks.map((track, index) => {
                  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                  return (
                    <div key={track.id} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? '40px 1fr 40px' : '40px 1fr 100px 80px 40px', 
                      gap: 16, 
                      padding: isMobile ? '12px 8px' : '12px 16px', 
                      alignItems: 'center', 
                      borderBottom: `1px solid ${colors.border}`,
                      transition: 'background 0.2s',
                      borderRadius: 8
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = colors.hoverBg; const playBtn = e.currentTarget.querySelector('.play-btn') as HTMLElement; if(playBtn) playBtn.style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; const playBtn = e.currentTarget.querySelector('.play-btn') as HTMLElement; if(playBtn) playBtn.style.opacity = '0'; }}>
                      
                      {/* Numéro de piste / Bouton Play au survol */}
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}>
                        <span style={{ position: 'absolute', color: colors.textMuted, fontSize: 14, fontWeight: 700, opacity: isThisPlaying ? 0 : 1 }}>{index + 1}</span>
                        <button onClick={() => handlePlayTrack(track)} className="play-btn" style={{ position: 'absolute', opacity: isThisPlaying ? 1 : 0, background: 'transparent', border: 'none', color: isThisPlaying ? colors.accent : colors.textMain, cursor: 'pointer', transition: 'opacity 0.2s', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isThisPlaying ? Icons.pause : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
                        </button>
                      </div>

                      {/* Cover + Titre */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 4, background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.border, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <Link to={`/track/${track.id}`} style={{ textDecoration: 'none' }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: isThisPlaying ? colors.accent : colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                          </Link>
                          <div style={{ fontSize: 13, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                        </div>
                      </div>

                      {/* BPM */}
                      {!isMobile && (
                        <div style={{ fontSize: 13, color: colors.textMuted, fontFamily: 'monospace' }}>
                          {track.bpm ? `${track.bpm}` : '-'}
                        </div>
                      )}

                      {/* Durée */}
                      {!isMobile && (
                        <div style={{ fontSize: 13, color: colors.textMuted, fontFamily: 'monospace' }}>
                          {track.duration ? `${Math.floor(track.duration / 60)}:${Math.floor(track.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                        </div>
                      )}

                      {/* Bouton Supprimer */}
                      <button 
                        onClick={(e) => removeTrackFromPlaylist(e, track.id)} 
                        style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, transition: 'color 0.2s' }}
                        title="Retirer de la playlist"
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ff5c5c'}
                        onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}
                      >
                        {Icons.trash}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ VUE GLOBALE (LISTE DES PLAYLISTS) */}
      {!selectedPlaylist && (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: isMobile ? '20px 12px' : '40px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, color: colors.textMain, margin: 0 }}>Mes Playlists</h1>
              <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: 14 }}>{playlists.length} playlist(s)</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: colors.accent, color: '#000', borderRadius: 8, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: `0 4px 15px ${colors.accent}40` }}>
              {Icons.plus} Créer une playlist
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '100%' : '280px'}, 1fr))`, gap: 20 }}>
            {playlists.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, border: `1px dashed ${colors.border}`, borderRadius: 16 }}>
                <div style={{ color: colors.textMuted, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{Icons.playlist}</div>
                <p style={{ color: colors.textMuted, fontWeight: 700 }}>Vous n'avez pas encore de playlist.</p>
                <p style={{ color: colors.textMuted, fontSize: 13 }}>Cliquez sur "Créer une playlist" pour organiser vos sons.</p>
              </div>
            ) : (
              playlists.map(p => (
                <div 
                  key={p.id}
                  onClick={() => openPlaylist(p)}
                  style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 10px 20px ${colors.accent}10`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${colors.accent}15`, color: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    {Icons.playlist}
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: colors.textMain, margin: '0 0 8px 0' }}>{p.name}</h3>
                  <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>
                    Créée le {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  
                  <button onClick={(e) => deletePlaylist(e, p.id)} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 4, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff5c5c'} onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}>
                    {Icons.trash}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODALE DE CRÉATION */}
      {showCreateModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowCreateModal(false)}>
          <div style={{ background: colors.modalBg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 400, position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer' }}>
              {Icons.close}
            </button>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: colors.textMain, margin: '0 0 24px 0' }}>Nouvelle Playlist</h2>
            <form onSubmit={handleCreatePlaylist} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Nom de la playlist</label>
                <input 
                  type="text" 
                  autoFocus 
                  required
                  placeholder="Ex: Mes sons préférés" 
                  value={newPlaylistName} 
                  onChange={e => setNewPlaylistName(e.target.value)} 
                  style={{ width: '100%', padding: '14px 16px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 10, color: colors.textMain, outline: 'none', fontSize: 15 }} 
                />
              </div>
              <button type="submit" disabled={isCreating} style={{ padding: 16, background: colors.accent, color: '#000', borderRadius: 10, fontWeight: 900, border: 'none', cursor: isCreating ? 'wait' : 'pointer', fontSize: 16, marginTop: 8 }}>
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