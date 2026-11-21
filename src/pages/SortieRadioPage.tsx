// src/pages/SortieRadioPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { PageMeta } from '../components/PageMeta';

const Icons = {
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  buy: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
};

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface Track {
  id: string; title: string; artist: string; genre: string; bpm: number; song_key: string | null;
  likes_count: number; audio_url: string; duration: number; peaks: number[]; cover_url: string | null;
  created_at: string; user_id: string | null; purchase_url: string | null;
}

export const SortieRadioPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const { currentTrack, isPlaying, play } = usePlayer();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    accent: isDark ? '#ffffff' : '#111111',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    panelBg: isDark ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
    inputBg: isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
    inputBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    rowHover: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)',
  };

  const loadTracks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .is('user_id', null)
      .neq('is_jingle', true)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setTracks(data.map((t: any) => ({ ...t, peaks: Array.isArray(t.peaks) ? t.peaks : [], cover_url: t.cover_url || null, likes_count: t.likes_count || 0, purchase_url: t.purchase_url || null })));
    }
    setLoading(false);
  };

  const loadUserLikes = async () => {
    if (!user) return;
    const { data } = await supabase.from('likes').select('track_id').eq('user_id', user.id);
    if (data) {
      const map: Record<string, boolean> = {};
      data.forEach((l) => { map[l.track_id] = true; });
      setUserLikes(map);
    }
  };

  useEffect(() => { loadTracks(); loadUserLikes(); }, [user]);

  const handlePlayTrack = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    if (!track.audio_url) return;
    const queue = tracks.filter((t) => t.audio_url).map((t) => ({ id: t.id, title: t.title, artist: t.artist, audio_url: t.audio_url, cover_url: t.cover_url, user_id: t.user_id, duration: t.duration, peaks: t.peaks, bpm: t.bpm, song_key: t.song_key, genre: t.genre }));
    play({ id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url, cover_url: track.cover_url, user_id: track.user_id, duration: track.duration, peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre }, queue);
  };

  const handleLike = async (trackId: string) => {
    if (!user) { navigate('/auth'); return; }
    const isLiked = userLikes[trackId];
    setUserLikes((prev) => ({ ...prev, [trackId]: !isLiked }));
    setTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, likes_count: t.likes_count + (isLiked ? -1 : 1) } : t));
    try {
      if (isLiked) await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', trackId);
      else await supabase.from('likes').insert({ user_id: user.id, track_id: trackId });
    } catch (err) {}
  };

  const visibleTracks = useMemo(() => {
    let list = [...tracks];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [tracks, search]);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(visibleTracks.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTracks = visibleTracks.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bg, fontFamily: 'Inter, sans-serif', color: colors.textMain, transition: 'background 0.3s ease' }}>
      <PageMeta title="Sortie Radio" description="Les sorties radio ELEKTRAQ — sélection IA / radar." />

      <div style={{ padding: isMobile ? '16px 12px' : '32px 24px', paddingBottom: 100, width: '100%', boxSizing: 'border-box', flex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* En-tête */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: colors.accent, marginBottom: 8 }}>
              <span style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))' }}>🎵</span> Sortie Radio
            </div>
            <h1 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>Sélection IA / Radar</h1>
            <p style={{ color: colors.textMuted, fontSize: 14, marginTop: 8 }}>Les titres repérés par le radar, pour ta programmation radio.</p>
          </div>

          {/* Recherche + compteur */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 10, flex: 1, minWidth: 200, maxWidth: 360 }}>
              {Icons.search}
              <input
                type="text"
                placeholder="Rechercher un titre ou un artiste..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: colors.textMain, fontSize: 13 }}
              />
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>{visibleTracks.length} titre{visibleTracks.length > 1 ? 's' : ''}</span>
          </div>

          {/* Tableau */}
          <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, width: '100%', overflow: 'hidden', backdropFilter: 'blur(20px)', boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.05)' }}>
            {!isMobile && (
              <div style={{ display: 'grid', gridTemplateColumns: '40px 40px minmax(200px, 1fr) 120px 140px 160px', gap: 16, padding: '14px 16px', borderBottom: `1px solid ${colors.border}`, fontSize: 11, color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <div></div><div></div><div>Titre / Artistes</div><div>Genre</div><div>BPM / Clé</div><div style={{ textAlign: 'right' }}>Actions</div>
              </div>
            )}

            {loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: colors.textMuted }}>Chargement...</div>
            ) : paginatedTracks.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: colors.textMuted }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: colors.textMain, marginBottom: 8 }}>Aucun titre pour le moment</div>
                <div style={{ fontSize: 13 }}>Lance le radar pour remplir la sélection radio.</div>
              </div>
            ) : paginatedTracks.map((track) => {
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              const isLiked = userLikes[track.id] || false;

              return (
                <div key={track.id} className="track-row" style={{ display: 'grid', gridTemplateColumns: isMobile ? '40px 44px minmax(0, 1fr) auto' : '40px 40px minmax(200px, 1fr) 120px 140px 160px', gap: 16, padding: '14px 16px', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, transition: 'background 0.2s ease' }}
                  onMouseEnter={e => e.currentTarget.style.background = colors.rowHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <button onClick={(e) => handlePlayTrack(e, track)} style={{ width: 36, height: 36, borderRadius: '50%', background: isThisPlaying ? '#ffffff' : colors.inputBg, border: `1px solid ${isThisPlaying ? '#ffffff' : colors.inputBorder}`, color: isThisPlaying ? '#000' : colors.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isThisPlaying ? '0 0 12px rgba(255,255,255,0.5)' : 'none' }}>
                    {isThisPlaying ? Icons.pause : Icons.play}
                  </button>
                  <div onClick={() => navigate(`/track/${track.id}`)} style={{ width: 44, height: 44, borderRadius: 10, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', flexShrink: 0, border: `1px solid ${colors.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: 'pointer' }} />
                  <div onClick={() => navigate(`/track/${track.id}`)} style={{ minWidth: 0, cursor: 'pointer' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isThisPlaying ? colors.accent : colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{track.title}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                  </div>

                  {!isMobile && (
                    <>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, padding: '4px 10px', borderRadius: 4, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '100%' }}>{track.genre || '—'}</span>
                      </div>
                      <div style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.06)', border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.15)', color: colors.accent, padding: '4px 8px', borderRadius: 4, fontWeight: 700, fontFamily: 'monospace' }}>{track.bpm ? `${track.bpm}` : '—'}</span>
                        <span style={{ color: colors.textMuted }}>·</span>
                        <span style={{ background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.textMuted, padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace' }}>{track.song_key || '—'}</span>
                        {track.duration > 0 && (<><span style={{ color: colors.textMuted }}>·</span><span style={{ background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.textMuted, padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace' }}>{formatDuration(track.duration)}</span></>)}
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button onClick={() => handleLike(track.id)} style={{ background: 'transparent', border: 'none', color: isLiked ? '#b0b0b0' : colors.textMuted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {isLiked ? '❤️' : '🤍'} <span style={{ color: colors.textMuted, fontWeight: 600 }}>{track.likes_count}</span>
                    </button>
                    {track.purchase_url && <a href={track.purchase_url} target="_blank" rel="noopener noreferrer" title="Acheter sur iTunes" style={{ color: colors.accent, display: 'flex', alignItems: 'center' }}>{Icons.buy}</a>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 32 }}>
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, color: safeCurrentPage === 1 ? colors.textMuted : colors.textMain, padding: '10px 20px', borderRadius: 8, cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                ← Précédent
              </button>
              <span style={{ fontSize: 13, color: colors.textMuted }}>{safeCurrentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, color: safeCurrentPage === totalPages ? colors.textMuted : colors.textMain, padding: '10px 20px', borderRadius: 8, cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                Suivant →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
