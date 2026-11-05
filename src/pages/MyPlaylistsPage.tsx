// src/pages/MyPlaylistsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
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
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  shuffle: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>,
  download: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
};

const formatDuration = (seconds?: number) => {
  const s = Math.floor(Number(seconds) || 0);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
};

const formatTotalDuration = (tracks: any[]) => {
  const totalSeconds = tracks.reduce((acc, t) => acc + (Number(t.duration) || 0), 0);
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins} min ${secs.toString().padStart(2, '0')} sec`;
};

export const MyPlaylistsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);

  const { play, currentTrack, isPlaying, togglePlay } = usePlayer() as any;

  const [playlists, setPlaylists] = useState<any[]>([]);
  const [trackCounts, setTrackCounts] = useState<Record<string, number>>({});
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 🔍 Recherche + tri
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'added' | 'title' | 'bpm' | 'duration'>('added');

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

    if (!error && data) {
      setPlaylists(data);

      // 📊 Charger les compteurs de sons pour toutes les playlists
      if (data.length > 0) {
        const ids = data.map((p: any) => p.id);
        const { data: counts } = await supabase
          .from('playlist_tracks')
          .select('playlist_id')
          .in('playlist_id', ids);

        if (counts) {
          const map: Record<string, number> = {};
          counts.forEach((c: any) => {
            map[c.playlist_id] = (map[c.playlist_id] || 0) + 1;
          });
          setTrackCounts(map);
        }
      }
    }
    setLoading(false);
  };

  const openPlaylist = async (playlist: any) => {
    setSearchQuery('');
    setSortBy('added');
    setSelectedPlaylist(playlist);
    setLoadingTracks(true);

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
      const tracks = data.map((item) => item.tracks).filter(Boolean);
      setPlaylistTracks(tracks);
    } else {
      setPlaylistTracks([]);
    }
    setLoadingTracks(false);
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
        player_bg_color: track.player_bg_color,
      });
    }
  };

  const handlePlayAll = () => {
    if (playlistTracks.length > 0) handlePlayTrack(playlistTracks[0]);
  };

  // 🔀 Shuffle
  const handleShuffle = () => {
    if (playlistTracks.length === 0) return;
    const shuffled = [...playlistTracks].sort(() => Math.random() - 0.5);
    handlePlayTrack(shuffled[0]);
  };

  // ⬇️ Export M3U
  const handleExportM3U = () => {
    if (!selectedPlaylist || playlistTracks.length === 0) return;

    let content = '#EXTM3U\n';
    playlistTracks.forEach((track) => {
      const dur = Math.floor(Number(track.duration) || 0);
      content += `#EXTINF:${dur},${track.artist} - ${track.title}\n`;
      content += `${track.audio_url}\n`;
    });

    const blob = new Blob([content], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(selectedPlaylist.name || 'playlist').replace(/[^a-z0-9-_]/gi, '_')}.m3u`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deletePlaylist = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer cette playlist ?')) return;
    await supabase.from('playlists').delete().eq('id', id);
    setPlaylists(playlists.filter((p) => p.id !== id));
    if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
  };

  const removeTrackFromPlaylist = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    if (!selectedPlaylist) return;
    if (!window.confirm('Retirer ce son de la playlist ?')) return;

    try {
      const { error } = await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', selectedPlaylist.id)
        .eq('track_id', trackId);

      if (error) throw error;
      setPlaylistTracks((prev) => prev.filter((t) => t.id !== trackId));
    } catch {
      alert('Erreur lors de la suppression du son.');
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPlaylistName.trim()) return;
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({ user_id: user.id, name: newPlaylistName.trim() })
        .select()
        .single();
      if (error) throw error;
      setPlaylists([data, ...playlists]);
      setNewPlaylistName('');
      setShowCreateModal(false);
    } catch (err: any) {
      alert('Erreur : ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // 🎯 Tracks filtrés + triés
  const visibleTracks = useMemo(() => {
    let arr = [...playlistTracks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      arr = arr.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.artist?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'title') arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else if (sortBy === 'bpm') arr.sort((a, b) => (Number(b.bpm) || 0) - (Number(a.bpm) || 0));
    else if (sortBy === 'duration') arr.sort((a, b) => (Number(b.duration) || 0) - (Number(a.duration) || 0));

    return arr;
  }, [playlistTracks, searchQuery, sortBy]);

  // 💀 Skeleton loader
  if (loading) {
    return (
      <div style={{ background: colors.bg, minHeight: '100vh', padding: '40px 20px' }}>
        <style>{`@keyframes dz-pulse { 0%,100% { opacity: .4 } 50% { opacity: .9 } }`}</style>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ height: 36, width: 220, background: colors.panelBg, borderRadius: 8, marginBottom: 40, animation: 'dz-pulse 1.5s infinite' }} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 180, background: colors.panelBg, borderRadius: 16, animation: 'dz-pulse 1.5s infinite', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const playlistCover =
    selectedPlaylist?.cover_url || playlistTracks[0]?.cover_url || null;

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', paddingBottom: 100, fontFamily: 'Inter, sans-serif', color: colors.textMain }}>

      {/* ==================== VUE DÉTAIL PLAYLIST ==================== */}
      {selectedPlaylist && (
        <div>
          {/* HERO */}
          <div style={{
            position: 'relative',
            height: isMobile ? 'auto' : 340,
            minHeight: isMobile ? 300 : 340,
            background: playlistCover ? `url(${playlistCover}) center/cover` : colors.panelBg,
            display: 'flex',
            alignItems: 'center',
            padding: isMobile ? '40px 20px' : '0 60px',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(40px)' }} />
            {playlistCover && (
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 0%, ${colors.bg} 100%)` }} />
            )}

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: 32, width: '100%', maxWidth: 1200, margin: '0 auto' }}>
              {/* Pochette */}
              <div style={{
                width: isMobile ? 160 : 220,
                height: isMobile ? 160 : 220,
                borderRadius: 12,
                background: playlistCover ? `url(${playlistCover}) center/cover` : colors.panelBg,
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: colors.accent,
              }}>
                {!playlistCover && Icons.playlist}
              </div>

              {/* Infos */}
              <div style={{ flex: 1, color: '#fff' }}>
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}
                >
                  {Icons.arrowLeft} Retour aux playlists
                </button>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, opacity: 0.8 }}>
                  Playlist
                </div>
                <h1 style={{ fontSize: isMobile ? 32 : 56, fontWeight: 900, margin: '0 0 16px 0', letterSpacing: '-1px', lineHeight: 1 }}>
                  {selectedPlaylist.name}
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600, opacity: 0.9, flexWrap: 'wrap' }}>
                  <span>{user?.email?.split('@')[0]}</span>
                  <span>•</span>
                  <span>{playlistTracks.length} sons</span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {Icons.clock} {formatTotalDuration(playlistTracks)}
                  </span>
                </div>

                {playlistTracks.length > 0 && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                    <button
                      onClick={handlePlayAll}
                      style={{
                        padding: '14px 32px', borderRadius: 30,
                        background: colors.accent, color: '#000',
                        border: 'none', fontSize: 15, fontWeight: 900,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        boxShadow: `0 8px 20px ${colors.accent}40`, transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      {Icons.play} Tout lire
                    </button>

                    <button
                      onClick={handleShuffle}
                      style={{
                        padding: '14px 24px', borderRadius: 30,
                        background: 'rgba(255,255,255,0.1)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontSize: 14, fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8,
                        backdropFilter: 'blur(10px)', transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    >
                      {Icons.shuffle} Aléatoire
                    </button>

                    <button
                      onClick={handleExportM3U}
                      title="Exporter en .m3u (VLC, iTunes, mobile, TV…)"
                      style={{
                        padding: '14px 24px', borderRadius: 30,
                        background: 'rgba(255,255,255,0.1)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontSize: 14, fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8,
                        backdropFilter: 'blur(10px)', transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    >
                      {Icons.download} Exporter .m3u
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* LISTE */}
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px 12px' : '20px 60px' }}>
            {loadingTracks ? (
              <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Chargement des sons…</div>
            ) : playlistTracks.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', border: `1px dashed ${colors.border}`, borderRadius: 16 }}>
                <div style={{ color: colors.textMuted, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{Icons.playlist}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px 0' }}>Cette playlist est vide</h3>
                <p style={{ color: colors.textMuted, marginBottom: 20, fontSize: 14 }}>
                  Ajoute des sons depuis les Nouveautés ou le Feed pour commencer.
                </p>
                <button
                  onClick={() => navigate('/nouveautes')}
                  style={{ padding: '12px 24px', background: colors.accent, color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                >
                  Découvrir des sons
                </button>
              </div>
            ) : (
              <div>
                {/* 🔍 Toolbar recherche + tri */}
                {playlistTracks.length > 1 && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexDirection: isMobile ? 'column' : 'row' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, display: 'flex' }}>
                        {Icons.search}
                      </span>
                      <input
                        type="text"
                        placeholder="Rechercher un son, un artiste…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%', padding: '12px 16px 12px 40px',
                          background: colors.panelBg, border: `1px solid ${colors.border}`,
                          borderRadius: 10, color: colors.textMain, outline: 'none', fontSize: 14,
                        }}
                      />
                    </div>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      style={{
                        padding: '12px 16px', background: colors.panelBg,
                        border: `1px solid ${colors.border}`, borderRadius: 10,
                        color: colors.textMain, outline: 'none', fontSize: 14,
                        cursor: 'pointer', minWidth: isMobile ? '100%' : 200,
                      }}
                    >
                      <option value="added">Ajout récent</option>
                      <option value="title">Titre (A-Z)</option>
                      <option value="bpm">BPM (desc)</option>
                      <option value="duration">Durée (desc)</option>
                    </select>
                  </div>
                )}

                {/* Header desktop */}
                {!isMobile && (
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px 40px', gap: 16, padding: '0 16px 12px', borderBottom: `1px solid ${colors.border}`, fontSize: 11, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                    <div>#</div>
                    <div>Titre</div>
                    <div>BPM</div>
                    <div>Durée</div>
                    <div></div>
                  </div>
                )}

                {visibleTracks.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>
                    Aucun son ne correspond à «&nbsp;{searchQuery}&nbsp;».
                  </div>
                ) : (
                  visibleTracks.map((track, index) => {
                    const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                    return (
                      <div
                        key={track.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '40px 1fr 40px' : '40px 1fr 100px 80px 40px',
                          gap: 16,
                          padding: isMobile ? '12px 8px' : '12px 16px',
                          alignItems: 'center',
                          borderBottom: `1px solid ${colors.border}`,
                          transition: 'background 0.2s',
                          borderRadius: 8,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = colors.hoverBg;
                          const playBtn = e.currentTarget.querySelector('.play-btn') as HTMLElement;
                          if (playBtn) playBtn.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          const playBtn = e.currentTarget.querySelector('.play-btn') as HTMLElement;
                          if (playBtn && !isThisPlaying) playBtn.style.opacity = '0';
                        }}
                      >
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}>
                          <span style={{ position: 'absolute', color: colors.textMuted, fontSize: 14, fontWeight: 700, opacity: isThisPlaying ? 0 : 1 }}>
                            {index + 1}
                          </span>
                          <button
                            onClick={() => handlePlayTrack(track)}
                            className="play-btn"
                            style={{
                              position: 'absolute', opacity: isThisPlaying ? 1 : 0,
                              background: 'transparent', border: 'none',
                              color: isThisPlaying ? colors.accent : colors.textMain,
                              cursor: 'pointer', transition: 'opacity 0.2s',
                              width: '100%', height: '100%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            {isThisPlaying ? Icons.pause : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            )}
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 4, background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.border, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <Link to={`/track/${track.id}`} style={{ textDecoration: 'none' }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: isThisPlaying ? colors.accent : colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {track.title}
                              </div>
                            </Link>
                            <div style={{ fontSize: 13, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {track.artist}
                            </div>
                          </div>
                        </div>

                        {!isMobile && (
                          <div style={{ fontSize: 13, color: colors.textMuted, fontFamily: 'monospace' }}>
                            {track.bpm ? `${track.bpm}` : '-'}
                          </div>
                        )}

                        {!isMobile && (
                          <div style={{ fontSize: 13, color: colors.textMuted, fontFamily: 'monospace' }}>
                            {formatDuration(track.duration)}
                          </div>
                        )}

                        <button
                          onClick={(e) => removeTrackFromPlaylist(e, track.id)}
                          style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, transition: 'color 0.2s' }}
                          title="Retirer de la playlist"
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ff5c5c')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}
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
        </div>
      )}

      {/* ==================== VUE GLOBALE ==================== */}
      {!selectedPlaylist && (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: isMobile ? '20px 12px' : '40px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, color: colors.textMain, margin: 0 }}>Mes Playlists</h1>
              <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: 14 }}>{playlists.length} playlist(s)</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: colors.accent, color: '#000', borderRadius: 8, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: `0 4px 15px ${colors.accent}40` }}
            >
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
              playlists.map((p) => {
                const count = trackCounts[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => openPlaylist(p)}
                    style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.accent;
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 10px 20px ${colors.accent}10`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = colors.border;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: p.cover_url ? `url(${p.cover_url}) center/cover` : `${colors.accent}15`,
                      color: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                    }}>
                      {!p.cover_url && Icons.playlist}
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: colors.textMain, margin: '0 0 8px 0' }}>{p.name}</h3>
                    <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>
                      {count} son{count > 1 ? 's' : ''} • créée le {new Date(p.created_at).toLocaleDateString('fr-FR')}
                    </p>

                    <button
                      onClick={(e) => deletePlaylist(e, p.id)}
                      style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 4, transition: 'color 0.2s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ff5c5c')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}
                    >
                      {Icons.trash}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ==================== MODALE CRÉATION ==================== */}
      {showCreateModal && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{ background: colors.modalBg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 400, position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCreateModal(false)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer' }}
            >
              {Icons.close}
            </button>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: colors.textMain, margin: '0 0 24px 0' }}>Nouvelle Playlist</h2>
            <form onSubmit={handleCreatePlaylist} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Nom de la playlist
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Ex: Mes sons préférés"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  style={{ width: '100%', padding: '14px 16px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 10, color: colors.textMain, outline: 'none', fontSize: 15, boxSizing: 'border-box' }}
                />
              </div>
              <button
                type="submit"
                disabled={isCreating}
                style={{ padding: 16, background: colors.accent, color: '#000', borderRadius: 10, fontWeight: 900, border: 'none', cursor: isCreating ? 'wait' : 'pointer', fontSize: 16, marginTop: 8 }}
              >
                {isCreating ? 'Création…' : 'Créer la playlist'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};