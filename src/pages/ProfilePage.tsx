// src/pages/ProfilePage.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlayer } from '../contexts/PlayerContext';

const Icons = {
  music: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  playlist: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  heart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  heartFilled: <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  user: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  play: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  playCircle: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  external: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  chevronLeft: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>,
  chevronRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
};

type Tab = 'tracks' | 'playlists' | 'likes' | 'about';

const ITEMS_PER_PAGE = 24;

// ✅ Composant Pagination réutilisable
const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  colors: any;
  accent: string;
}> = ({ currentPage, totalPages, onPageChange, colors, accent }) => {
  if (totalPages <= 1) return null;

  // Génère la liste des pages à afficher (avec ellipses)
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: 32,
        flexWrap: 'wrap',
      }}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          color: currentPage === 1 ? colors.textMuted : colors.textMain,
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          opacity: currentPage === 1 ? 0.4 : 1,
        }}
      >
        {Icons.chevronLeft}
      </button>

      {pageNumbers.map((p, i) =>
        p === '...' ? (
          <span
            key={`ellipsis-${i}`}
            style={{ color: colors.textMuted, padding: '0 6px', fontWeight: 700 }}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            style={{
              minWidth: 36,
              height: 36,
              padding: '0 8px',
              borderRadius: 8,
              border: `1px solid ${p === currentPage ? accent : colors.border}`,
              background: p === currentPage ? accent : 'transparent',
              color: p === currentPage ? '#000' : colors.textMain,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          color: currentPage === totalPages ? colors.textMuted : colors.textMain,
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          opacity: currentPage === totalPages ? 0.4 : 1,
        }}
      >
        {Icons.chevronRight}
      </button>
    </div>
  );
};

// ✅ Composant TrackRow
const TrackRow: React.FC<{
  track: any;
  isThisPlaying: boolean;
  isOwner: boolean;
  isLiked: boolean;
  onPlay: () => void;
  onToggleLike: () => void;
  onDelete?: () => void;
  colors: any;
  recentlyAdded?: boolean;
  openMenu?: boolean;
  onToggleMenu?: () => void;
  playlists?: any[];
  onAddToPlaylist?: (playlistId: string) => void;
}> = ({ track, isThisPlaying, isOwner, isLiked, onPlay, onToggleLike, onDelete, colors, recentlyAdded, openMenu, onToggleMenu, playlists, onAddToPlaylist }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        background: hovered ? colors.hoverBg : colors.panelBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        transition: 'background 0.15s',
      }}
    >
      <button
        onClick={onPlay}
        style={{
          width: 44, height: 44, borderRadius: '50%',
          background: isThisPlaying ? colors.accent : 'transparent',
          border: `1px solid ${isThisPlaying ? colors.accent : colors.border}`,
          color: isThisPlaying ? '#000' : colors.textMain,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
        }}
      >
        {isThisPlaying ? Icons.pause : Icons.play}
      </button>

      <div style={{ width: 48, height: 48, borderRadius: 8, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#333', flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <Link to={`/track/${track.id}`} style={{ textDecoration: 'none' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: isThisPlaying ? colors.accent : colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {track.title}
          </div>
        </Link>
        <div style={{ fontSize: 13, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.artist}{track.bpm ? ` • ${track.bpm} BPM` : ''}{track.song_key && track.song_key !== '--' ? ` • ${track.song_key}` : ''}
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
        title={isLiked ? 'Retirer des likes' : 'Ajouter aux likes'}
        style={{ background: 'transparent', border: 'none', color: isLiked ? '#ef4444' : colors.textMuted, cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', transition: 'transform 0.15s' }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isLiked ? Icons.heartFilled : Icons.heart}
      </button>

      {isOwner && onToggleMenu && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
            style={{ width: 32, height: 32, borderRadius: 6, background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {recentlyAdded ? Icons.check : Icons.playlist}
          </button>
          {openMenu && playlists && onAddToPlaylist && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 8, width: 200, zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8, padding: '0 4px' }}>
                Ajouter à...
              </div>
              {playlists.length === 0 ? (
                <div style={{ fontSize: 12, color: colors.textMuted, padding: 4 }}>Aucune playlist.</div>
              ) : (
                playlists.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onAddToPlaylist(p.id)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', background: 'transparent', border: 'none', color: colors.textMain, fontSize: 12, cursor: 'pointer', borderRadius: 4 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = colors.hoverBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {isOwner && onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Supprimer ce son"
          style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 8 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}
        >
          {Icons.trash}
        </button>
      )}

      <Link to={`/track/${track.id}`} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 6, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
        Voir
      </Link>
    </div>
  );
};

// ✅ Skeleton loader
const ProfileSkeleton: React.FC<{ colors: any }> = ({ colors }) => (
  <div style={{ background: colors.bg, minHeight: '100vh', padding: '60px 20px' }}>
    <style>{`@keyframes dz-pulse { 0%,100% { opacity: .4 } 50% { opacity: .9 } }`}</style>
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 40 }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: colors.panelBg, animation: 'dz-pulse 1.5s infinite' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 32, width: 200, background: colors.panelBg, borderRadius: 8, marginBottom: 12, animation: 'dz-pulse 1.5s infinite' }} />
          <div style={{ height: 16, width: 300, background: colors.panelBg, borderRadius: 4, marginBottom: 8, animation: 'dz-pulse 1.5s infinite' }} />
          <div style={{ height: 16, width: 250, background: colors.panelBg, borderRadius: 4, animation: 'dz-pulse 1.5s infinite' }} />
        </div>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 80, background: colors.panelBg, borderRadius: 12, marginBottom: 12, animation: 'dz-pulse 1.5s infinite', animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  </div>
);

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { play, currentTrack, isPlaying } = usePlayer();

  const [profile, setProfile] = useState<any>(null);
  const [userTracks, setUserTracks] = useState<any[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [userLikes, setUserLikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('tracks');

  // ✅ ÉTATS DE PAGINATION
  const [tracksPage, setTracksPage] = useState(1);
  const [likesPage, setLikesPage] = useState(1);
  const [playlistsPage, setPlaylistsPage] = useState(1);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const [myLikedTrackIds, setMyLikedTrackIds] = useState<Set<string>>(new Set());

  const isOwner = user?.id === id;
  const topRef = useRef<HTMLDivElement>(null);

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    border: isDark ? '#222222' : '#e5e7eb',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    accent: '#00d9ff',
    hoverBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
  };

  // ✅ Reset pagination quand on change d'onglet
  useEffect(() => {
    setTracksPage(1);
    setLikesPage(1);
    setPlaylistsPage(1);
  }, [activeTab]);

  // ✅ Scroll auto en haut au changement de page
  const goToPage = (setter: React.Dispatch<React.SetStateAction<number>>, page: number) => {
    setter(page);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  // Fermeture dropdown
  useEffect(() => {
    if (!addingTrackId) return;
    const handleClickOutside = () => setAddingTrackId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [addingTrackId]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (!profileData) { setProfile(null); setLoading(false); return; }
        setProfile(profileData);

        const { data: tracksData } = await supabase.from('tracks').select('*').eq('user_id', id).order('created_at', { ascending: false });
        if (tracksData) setUserTracks(tracksData);

        const { data: playlistsData } = await supabase.from('playlists').select('*').eq('user_id', id).order('created_at', { ascending: false });
        if (playlistsData) setUserPlaylists(playlistsData);

        const { data: likesData } = await supabase.from('likes').select('track_id, tracks (*)').eq('user_id', id).order('created_at', { ascending: false });
        if (likesData) {
          const likedTracks = likesData.map((like) => like.tracks).filter(Boolean);
          setUserLikes(likedTracks);
        }

        const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id);
        setFollowersCount(followers || 0);

        const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id);
        setFollowingCount(following || 0);

        if (user && user.id !== id) {
          const { data: followData } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', id).maybeSingle();
          setIsFollowing(!!followData);
        }

        if (user) {
          const { data: myLikes } = await supabase.from('likes').select('track_id').eq('user_id', user.id);
          if (myLikes) setMyLikedTrackIds(new Set(myLikes.map((l) => l.track_id)));
        }
      } catch (err) {
        console.error('Erreur de chargement:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [id, user]);

  const handleFollow = async () => {
    if (!user) { navigate('/auth'); return; }
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id);
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: id });
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
    } catch (err) { console.error(err); alert('Erreur'); }
    finally { setFollowLoading(false); }
  };

  const handlePlay = (track: any) => {
    play({ id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url, cover_url: track.cover_url, user_id: track.user_id, duration: track.duration, peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre, player_bg_image_url: track.player_bg_image_url, player_bg_color: track.player_bg_color });
  };

  const handlePlayAll = () => { if (userTracks.length > 0) handlePlay(userTracks[0]); };

  const handleToggleLike = async (trackId: string) => {
    if (!user) { navigate('/auth'); return; }
    if (myLikedTrackIds.has(trackId)) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', trackId);
      setMyLikedTrackIds((prev) => { const n = new Set(prev); n.delete(trackId); return n; });
    } else {
      await supabase.from('likes').insert({ user_id: user.id, track_id: trackId });
      setMyLikedTrackIds((prev) => new Set(prev).add(trackId));
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPlaylistName.trim()) return;
    const { data, error } = await supabase.from('playlists').insert({ user_id: user.id, name: newPlaylistName.trim() }).select().single();
    if (!error && data) {
      setUserPlaylists([data, ...userPlaylists]);
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
    }
  };

  const handleDeletePlaylist = async (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer cette playlist ?')) return;
    await supabase.from('playlists').delete().eq('id', playlistId);
    setUserPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  };

  const handleAddTrackToPlaylist = async (playlistId: string, trackId: string) => {
    try {
      const { error } = await supabase.from('playlist_tracks').insert({ playlist_id: playlistId, track_id: trackId });
      if (error) {
        if (error.code === '23505') alert('Ce son est déjà dans cette playlist !');
        else throw error;
      } else {
        setRecentlyAdded(trackId);
        setTimeout(() => { setRecentlyAdded(null); setAddingTrackId(null); }, 800);
      }
    } catch { alert("Erreur lors de l'ajout."); }
  };

  const socials = useMemo(() => {
    if (!profile) return [];
    return [
      { url: profile.instagram_url, label: 'Instagram', color: '#E1306C' },
      { url: profile.spotify_url, label: 'Spotify', color: '#1DB954' },
      { url: profile.soundcloud_url, label: 'SoundCloud', color: '#FF5500' },
      { url: profile.tiktok_url, label: 'TikTok', color: '#ffffff' },
      { url: profile.youtube_url, label: 'YouTube', color: '#FF0000' },
      { url: profile.beatport_url, label: 'Beatport', color: '#01FF95' },
    ].filter((s) => s.url && s.url.trim() !== '');
  }, [profile]);

  // ✅ Pagination des données
  const paginatedTracks = useMemo(() => {
    const start = (tracksPage - 1) * ITEMS_PER_PAGE;
    return userTracks.slice(start, start + ITEMS_PER_PAGE);
  }, [userTracks, tracksPage]);

  const paginatedLikes = useMemo(() => {
    const start = (likesPage - 1) * ITEMS_PER_PAGE;
    return userLikes.slice(start, start + ITEMS_PER_PAGE);
  }, [userLikes, likesPage]);

  const paginatedPlaylists = useMemo(() => {
    const start = (playlistsPage - 1) * ITEMS_PER_PAGE;
    return userPlaylists.slice(start, start + ITEMS_PER_PAGE);
  }, [userPlaylists, playlistsPage]);

  const tracksTotalPages = Math.ceil(userTracks.length / ITEMS_PER_PAGE);
  const likesTotalPages = Math.ceil(userLikes.length / ITEMS_PER_PAGE);
  const playlistsTotalPages = Math.ceil(userPlaylists.length / ITEMS_PER_PAGE);

  if (loading) return <ProfileSkeleton colors={colors} />;
  if (!profile) return (
    <div style={{ padding: 40, textAlign: 'center', color: colors.textMain, background: colors.bg, minHeight: '100vh' }}>
      <h2 style={{ fontSize: 24, fontWeight: 900 }}>Profil introuvable</h2>
      <Link to="/" style={{ color: colors.accent }}>Retour à l'accueil</Link>
    </div>
  );

  const themeColor = profile.theme_color || colors.accent;

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', fontFamily: 'Inter, sans-serif', paddingBottom: 40 }}>
      <style>{`
        @media (max-width: 640px) {
          .profile-header { padding: 40px 16px 20px !important; }
          .profile-avatar { width: 90px !important; height: 90px !important; }
          .profile-name { font-size: 24px !important; }
        }
      `}</style>

      {/* ✅ Ref pour le scroll auto */}
      <div ref={topRef} />

      {/* HEADER */}
      <div style={{ background: `linear-gradient(180deg, ${themeColor}25 0%, ${themeColor}08 40%, ${colors.bg} 100%)`, borderBottom: `1px solid ${colors.border}`, paddingTop: 20 }}>
        <div className="profile-header" style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px 24px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="profile-avatar" style={{ width: 120, height: 120, borderRadius: '50%', background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : `linear-gradient(135deg, ${themeColor}40, ${themeColor}20)`, border: `4px solid ${themeColor}`, flexShrink: 0, boxShadow: `0 8px 30px ${themeColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 900, color: themeColor }}>
            {!profile.avatar_url && profile.username?.charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 250 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <h1 className="profile-name" style={{ fontSize: 32, fontWeight: 900, color: colors.textMain, margin: 0, letterSpacing: '-1px' }}>
                {profile.username}
              </h1>
              {profile.is_premium && (
                <span style={{ fontSize: 10, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#000', padding: '4px 10px', borderRadius: 20, fontWeight: 900, letterSpacing: '0.5px', boxShadow: '0 2px 10px rgba(251, 191, 36, 0.4)' }}>
                  ⭐ PREMIUM
                </span>
              )}
              {profile.is_premium && !isOwner && (
                <Link to={`/premium/${profile.username}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: themeColor, color: '#000', borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>
                  {Icons.external} Voir la page officielle
                </Link>
              )}
              {isOwner ? (
                <button onClick={() => navigate('/settings')} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {Icons.settings} Modifier
                </button>
              ) : (
                <button onClick={handleFollow} disabled={followLoading} title={isFollowing ? 'Se désabonner' : "S'abonner"} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: followLoading ? 'wait' : 'pointer', background: isFollowing ? 'transparent' : themeColor, color: isFollowing ? colors.textMain : '#000', border: isFollowing ? `1px solid ${colors.border}` : 'none', transition: 'all 0.2s', boxShadow: isFollowing ? 'none' : `0 4px 15px ${themeColor}40` }}>
                  {isFollowing ? '✓ Suivi' : '+ Suivre'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: colors.textMuted }}><strong style={{ color: colors.textMain, fontWeight: 800 }}>{followersCount}</strong> abonné{followersCount > 1 ? 's' : ''}</span>
              <span style={{ fontSize: 14, color: colors.textMuted }}><strong style={{ color: colors.textMain, fontWeight: 800 }}>{followingCount}</strong> abonnement{followingCount > 1 ? 's' : ''}</span>
              <span style={{ fontSize: 14, color: colors.textMuted }}><strong style={{ color: colors.textMain, fontWeight: 800 }}>{userTracks.length}</strong> son{userTracks.length > 1 ? 's' : ''}</span>
            </div>

            <p style={{ color: colors.textMuted, fontSize: 15, lineHeight: 1.5, marginBottom: 16, maxWidth: 600 }}>
              {profile.bio || 'Aucune biographie pour le moment.'}
            </p>

            {socials.length > 0 && (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {socials.map((s) => (
                  <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: s.color, textDecoration: 'none', fontWeight: 700, borderBottom: `1px solid ${s.color}40`, paddingBottom: 2 }}>
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: 24, borderBottom: `1px solid ${colors.border}`, overflowX: 'auto', paddingTop: 20, position: 'sticky', top: 0, background: colors.bg, zIndex: 10 }}>
          {[
            { id: 'tracks', label: 'Sons', icon: Icons.music, count: userTracks.length },
            { id: 'playlists', label: 'Playlists', icon: Icons.playlist, count: userPlaylists.length },
            { id: 'likes', label: 'Likes', icon: Icons.heart, count: userLikes.length },
            { id: 'about', label: 'À propos', icon: Icons.user, count: null },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} style={{ background: 'transparent', border: 'none', padding: '12px 0', borderBottom: activeTab === tab.id ? `2px solid ${themeColor}` : '2px solid transparent', color: activeTab === tab.id ? themeColor : colors.textMuted, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
              {tab.icon} {tab.label}
              {tab.count !== null && <span style={{ fontSize: 11, background: colors.panelBg, padding: '2px 8px', borderRadius: 10, color: colors.textMuted }}>{tab.count}</span>}
            </button>
          ))}
        </div>

        <div style={{ padding: '32px 0' }}>
          {/* ✅ SONS avec pagination */}
          {activeTab === 'tracks' && (
            userTracks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, border: `1px dashed ${colors.border}`, borderRadius: 16 }}>
                <div style={{ color: colors.textMuted, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{Icons.music}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: colors.textMain, marginBottom: 8 }}>Aucun son publié</h3>
                <p style={{ color: colors.textMuted, marginBottom: 20 }}>Cet artiste n'a pas encore publié de morceaux.</p>
                {isOwner && (
                  <button onClick={() => navigate('/settings')} style={{ padding: '10px 20px', background: themeColor, color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>
                    Publier mon premier son
                  </button>
                )}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ fontSize: 13, color: colors.textMuted, fontWeight: 600 }}>
                    {userTracks.length} son{userTracks.length > 1 ? 's' : ''} • Page {tracksPage}/{tracksTotalPages || 1}
                  </div>
                  {userTracks.length > 1 && (
                    <button onClick={handlePlayAll} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: themeColor, color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: `0 4px 15px ${themeColor}40` }}>
                      {Icons.playCircle} Tout lire
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {paginatedTracks.map((track) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      isThisPlaying={currentTrack?.id === track.id && isPlaying}
                      isOwner={!!isOwner}
                      isLiked={myLikedTrackIds.has(track.id)}
                      onPlay={() => handlePlay(track)}
                      onToggleLike={() => handleToggleLike(track.id)}
                      onDelete={isOwner ? () => {
                        if (!window.confirm('Supprimer ce son ?')) return;
                        supabase.from('tracks').delete().eq('id', track.id).then(() => {
                          setUserTracks((prev) => prev.filter((t) => t.id !== track.id));
                        });
                      } : undefined}
                      colors={colors}
                      recentlyAdded={recentlyAdded === track.id}
                      openMenu={addingTrackId === track.id}
                      onToggleMenu={() => setAddingTrackId(addingTrackId === track.id ? null : track.id)}
                      playlists={userPlaylists}
                      onAddToPlaylist={(plId) => handleAddTrackToPlaylist(plId, track.id)}
                    />
                  ))}
                </div>

                {/* ✅ Pagination Sons */}
                <Pagination
                  currentPage={tracksPage}
                  totalPages={tracksTotalPages}
                  onPageChange={(p) => goToPage(setTracksPage, p)}
                  colors={colors}
                  accent={themeColor}
                />
              </>
            )
          )}

          {/* ✅ PLAYLISTS avec pagination */}
          {activeTab === 'playlists' && (
            <div>
              {isOwner && (
                <div style={{ marginBottom: 24 }}>
                  {!showCreatePlaylist ? (
                    <button onClick={() => setShowCreatePlaylist(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: themeColor, color: '#000', borderRadius: 8, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                      {Icons.plus} Créer une playlist
                    </button>
                  ) : (
                    <form onSubmit={handleCreatePlaylist} style={{ display: 'flex', gap: 8, maxWidth: 400 }}>
                      <input type="text" placeholder="Nom de la playlist..." autoFocus value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} style={{ flex: 1, padding: '10px 14px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none' }} />
                      <button type="submit" style={{ padding: '0 16px', background: themeColor, color: '#000', borderRadius: 8, fontWeight: 800, border: 'none', cursor: 'pointer' }}>Créer</button>
                      <button type="button" onClick={() => setShowCreatePlaylist(false)} style={{ padding: '0 16px', background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                    </form>
                  )}
                </div>
              )}

              {userPlaylists.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, border: `1px dashed ${colors.border}`, borderRadius: 16 }}>
                  <div style={{ color: colors.textMuted, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{Icons.playlist}</div>
                  <p style={{ color: colors.textMuted }}>Aucune playlist publique.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                    {paginatedPlaylists.map((p) => (
                      <div key={p.id} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20, position: 'relative', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = themeColor; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'translateY(0)'; }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: `${themeColor}15`, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                          {Icons.playlist}
                        </div>
                        <h4 style={{ fontSize: 15, fontWeight: 800, color: colors.textMain, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h4>
                        <p style={{ fontSize: 12, color: colors.textMuted, margin: 0 }}>Créée le {new Date(p.created_at).toLocaleDateString('fr-FR')}</p>
                        {isOwner && (
                          <button onClick={(e) => handleDeletePlaylist(e, p.id)} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 4 }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}>
                            {Icons.trash}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Pagination currentPage={playlistsPage} totalPages={playlistsTotalPages} onPageChange={(p) => goToPage(setPlaylistsPage, p)} colors={colors} accent={themeColor} />
                </>
              )}
            </div>
          )}

          {/* ✅ LIKES avec pagination */}
          {activeTab === 'likes' && (
            userLikes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, border: `1px dashed ${colors.border}`, borderRadius: 16 }}>
                <div style={{ color: colors.textMuted, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{Icons.heart}</div>
                <p style={{ color: colors.textMuted }}>Aucun son liké pour le moment.</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16, fontSize: 13, color: colors.textMuted, fontWeight: 600 }}>
                  {userLikes.length} son{userLikes.length > 1 ? 's' : ''} liké{userLikes.length > 1 ? 's' : ''} • Page {likesPage}/{likesTotalPages || 1}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {paginatedLikes.map((track) => (
                    <TrackRow key={track.id} track={track} isThisPlaying={currentTrack?.id === track.id && isPlaying} isOwner={false} isLiked={myLikedTrackIds.has(track.id)} onPlay={() => handlePlay(track)} onToggleLike={() => handleToggleLike(track.id)} colors={colors} />
                  ))}
                </div>

                <Pagination currentPage={likesPage} totalPages={likesTotalPages} onPageChange={(p) => goToPage(setLikesPage, p)} colors={colors} accent={themeColor} />
              </>
            )
          )}

          {/* À PROPOS */}
          {activeTab === 'about' && (
            <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 32, maxWidth: 600 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: colors.textMain, margin: '0 0 16px 0' }}>Biographie</h3>
              <p style={{ color: colors.textMuted, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 32 }}>
                {profile.bio || 'Aucune biographie.'}
              </p>

              <h3 style={{ fontSize: 18, fontWeight: 800, color: colors.textMain, margin: '0 0 16px 0' }}>Réseaux</h3>
              {socials.length === 0 ? (
                <p style={{ color: colors.textMuted }}>Aucun réseau renseigné.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {socials.map((s) => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: s.color, fontWeight: 700, width: 100 }}>{s.label}</span>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: colors.textMuted, textDecoration: 'none', fontSize: 14 }}>{s.url}</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};