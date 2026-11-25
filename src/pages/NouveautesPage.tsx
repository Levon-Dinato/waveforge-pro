// src/pages/NouveautesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { OnlineUsersWidget } from '../components/OnlineUsersWidget';
import { ShareButton } from '../components/ShareButton';
import { TrackGrid } from '../components/TrackGrid';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../contexts/ThemeContext';
import { parseBlob } from 'music-metadata-browser';
import { detectKey } from '../audio/keyDetector';
import { PageMeta } from '../components/PageMeta';
import { useTranslation } from 'react-i18next';

const Icons = {
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  download: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  buy: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  music: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  sun: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
  moon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
  playlist: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  plus: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  shuffle: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>,
  listMusic: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15V6"></path><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path><path d="M12 12H3"></path><path d="M16 6H3"></path><path d="M12 18H3"></path></svg>,
};

const forceDownload = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    window.open(url, '_blank');
  }
};

interface Track {
  id: string; title: string; artist: string; genre: string; bpm: number; song_key: string | null; camelot: string | null;
  likes_count: number; downloads: number; audio_url: string; duration: number; peaks: number[]; cover_url: string | null; created_at: string; user_id: string | null; purchase_url: string | null; embed_code?: string;
}

const isNew = (createdAt: string): boolean => (Date.now() - new Date(createdAt).getTime()) < 24 * 60 * 60 * 1000;

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const decodeAndDetectKey = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const result = await detectKey(audioBuffer);
    if (result && result.key !== 'Inconnu' && result.camelot && result.camelot !== '?') {
      return result.camelot;
    }
  } catch (e) {
    console.warn('Analyse audio de la tonalité impossible:', e);
  }
  return '';
};

export const NouveautesPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const { t } = useTranslation();
  const { currentTrack, isPlaying, play, stop } = usePlayer();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'likes' | 'bpm' | 'title'>('recent');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', genre: '', bpm: 0, purchase_url: '' });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');

  const [uploadForm, setUploadForm] = useState({ title: '', artist: '', genre: '', bpm: '', song_key: '', audio_url: '', embed_code: '', purchase_url: '' });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [linkCoverUrl, setLinkCoverUrl] = useState('');
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [metaMsg, setMetaMsg] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

  const [isCreatingPlaylistInMenu, setIsCreatingPlaylistInMenu] = useState(false);
  const [newPlaylistNameInMenu, setNewPlaylistNameInMenu] = useState('');

  const [exportingM3U, setExportingM3U] = useState(false);

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
    dropdownBg: isDark ? '#18181b' : '#ffffff',
  };

  useEffect(() => {
    loadTracks();
    if (user) {
      loadUserLikes();
      loadUserPlaylists();
    }
  }, [user]);

  // ⌨️ Raccourci clavier Espace : play/pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (!currentTrack) return;
      e.preventDefault();
      if (isPlaying) stop();
      else play(currentTrack as any);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentTrack, isPlaying, play, stop]);

  const loadTracks = async () => {
    setLoading(true);
    // ✅ Exclut les jingles radio (is_jingle = true) de la page Nouveautés.
    // On garde les morceaux où is_jingle est false OU null (anciens sons sans ce champ).
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .or('is_jingle.is.null,is_jingle.eq.false')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setTracks(data.map((t: any) => ({ ...t, peaks: Array.isArray(t.peaks) ? t.peaks : [], cover_url: t.cover_url || null, user_id: t.user_id || null, downloads: t.downloads || 0, likes_count: t.likes_count || 0, song_key: t.song_key || null, camelot: t.camelot || null, purchase_url: t.purchase_url || null })));
    }
    setLoading(false);
  };

  const loadUserLikes = async () => {
    if (!user) return;
    const { data } = await supabase.from('likes').select('track_id').eq('user_id', user.id);
    if (data) {
      const likesMap: Record<string, boolean> = {};
      data.forEach((like) => { likesMap[like.track_id] = true; });
      setUserLikes(likesMap);
    }
  };

  const loadUserPlaylists = async () => {
    if (!user) return;
    const { data } = await supabase.from('playlists').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setUserPlaylists(data);
  };

  const handleAddToPlaylist = async (playlistId: string, trackId: string) => {
    try {
      const { error } = await supabase.from('playlist_tracks').insert({
        playlist_id: playlistId,
        track_id: trackId
      });

      if (error) {
        if (error.code === '23505') alert("Ce son est déjà dans cette playlist !");
        else throw error;
      } else {
        setRecentlyAdded(trackId);
        setTimeout(() => {
          setRecentlyAdded(null);
          setAddingTrackId(null);
        }, 1000);
      }
    } catch (err) {
      alert("Erreur lors de l'ajout.");
    }
  };

  const handleCreatePlaylistAndAdd = async (e: React.FormEvent, trackId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !newPlaylistNameInMenu.trim()) return;

    try {
      const { data: newPlaylist, error: createError } = await supabase.from('playlists').insert({
        user_id: user.id,
        name: newPlaylistNameInMenu.trim()
      }).select().single();

      if (createError) throw createError;

      const { error: addError } = await supabase.from('playlist_tracks').insert({
        playlist_id: newPlaylist.id,
        track_id: trackId
      });

      if (addError) throw addError;

      setUserPlaylists(prev => [newPlaylist, ...prev]);
      setRecentlyAdded(trackId);
      setNewPlaylistNameInMenu('');
      setIsCreatingPlaylistInMenu(false);

      setTimeout(() => {
        setRecentlyAdded(null);
        setAddingTrackId(null);
      }, 1500);

    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const handleLike = async (trackId: string) => {
    if (!user) { navigate('/auth'); return; }
    const isCurrentlyLiked = userLikes[trackId];
    setUserLikes((prev) => ({ ...prev, [trackId]: !isCurrentlyLiked }));
    setTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, likes_count: t.likes_count + (isCurrentlyLiked ? -1 : 1) } : t));
    try {
      if (isCurrentlyLiked) await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', trackId);
      else await supabase.from('likes').insert({ user_id: user.id, track_id: trackId });
    } catch (err) {}
  };

  const handlePlayTrack = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    if (!user) {
      alert("🔒 Inscrivez-vous gratuitement pour écouter les morceaux en entier.");
      navigate('/auth');
      return;
    }
    if (!track.audio_url) return;
    play({ id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url, cover_url: track.cover_url, user_id: track.user_id || null, duration: track.duration, peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre });
  };

  // 🔍 Récupère titre/artiste/pochette depuis les balises méta de la page promo
  const fetchMetaFromUrl = async () => {
    const target = uploadForm.purchase_url || uploadForm.audio_url;
    if (!target) { setMetaMsg('⚠️ ' + t('nouveautes.fetch_meta_no_url')); return; }
    setFetchingMeta(true); setMetaMsg('');
    try {
      // 1. Via notre endpoint Vercel
      let data: any = null;
      try {
        const r = await fetch('/api/scrape-meta?url=' + encodeURIComponent(target));
        if (r.ok) {
          const j = await r.json();
          if (!j.error) data = j;
        }
      } catch (e) {}

      // 2. Fallback navigateur : lecteur r.jina.ai (passe les protections Cloudflare)
      if (!data) {
        const r2 = await fetch('https://r.jina.ai/' + target);
        if (!r2.ok) throw new Error('jina');
        const text = await r2.text();
        const m = text.match(/^Title:\s*(.+)$/m);
        if (m && m[1]) {
          const full = m[1].trim();
          let title = full; let artist = '';
          const sep = full.match(/\s+[-–—]\s+/);
          if (sep) { const parts = full.split(sep[0]); if (parts.length === 2) { title = parts[1].trim(); artist = parts[0].trim(); } }
          data = { title, artist, cover: '' };
          const img = text.match(/!\[[^\]]*\]\((https?:\/\/[^)]+\.(?:jpg|jpeg|png|webp)[^)]*)\)/i);
          if (img && img[1]) data.cover = img[1];
        }
      }

      if (!data || (!data.title && !data.cover)) { setMetaMsg('❌ ' + t('nouveautes.fetch_meta_error')); return; }
      if (data.title) setUploadForm(f => ({ ...f, title: f.title || data.title }));
      if (data.artist) setUploadForm(f => ({ ...f, artist: f.artist || data.artist }));
      if (data.cover) setLinkCoverUrl(data.cover);
      setMetaMsg('✅ ' + t('nouveautes.fetch_meta_ok'));
    } catch (e) {
      setMetaMsg('❌ ' + t('nouveautes.fetch_meta_error'));
    } finally {
      setFetchingMeta(false);
    }
  };

  // ▶️ Lecture depuis la grille (TrackGrid)
  const handleGridPlay = (track: any) => {
    if (!user) { alert("🔒 Inscrivez-vous gratuitement pour écouter les morceaux en entier."); navigate('/auth'); return; }
    if (!track.audio_url) {
      // ✅ Promo sans audio direct : on ouvre la page officielle de l'artiste
      if (track.purchase_url) window.open(track.purchase_url, '_blank');
      else alert("Cette promo s'écoute sur la plateforme de l'artiste.");
      return;
    }
    play({ id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url, cover_url: track.cover_url, user_id: track.user_id || null, duration: track.duration, peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre });
  };

  const handleDownloadClick = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    if (!user) {
      alert("🔒 Inscrivez-vous gratuitement pour télécharger les morceaux.");
      navigate('/auth');
      return;
    }
    forceDownload(track.audio_url, `${track.artist} - ${track.title}.mp3`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer ce son ?')) return;
    if (currentTrack?.id === id) stop();
    try {
      const track = tracks.find((t) => t.id === id);
      if (track) {
        const audioParts = track.audio_url.split('/' + AUDIO_BUCKET + '/');
        if (audioParts[1]) await supabase.storage.from(AUDIO_BUCKET).remove([audioParts[1]]);
      }
      await supabase.from('tracks').delete().eq('id', id);
      setTracks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {}
  };

  const startEdit = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    setEditingId(track.id);
    setEditForm({ title: track.title, artist: track.artist, genre: track.genre, bpm: track.bpm, purchase_url: track.purchase_url || '' });
  };

  const saveEdit = async () => {
    if (editingId === null) return;
    await supabase.from('tracks').update(editForm).eq('id', editingId);
    setTracks((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...editForm } : t)));
    setEditingId(null);
  };

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);

    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    let guessArtist = "";
    let guessTitle = fileNameWithoutExt;
    let guessKey = "";

    if (fileNameWithoutExt.includes(' - ')) {
      const parts = fileNameWithoutExt.split(' - ');
      guessArtist = parts[0].trim();
      guessTitle = parts.slice(1).join(' - ').trim();
    }

    const keyMatch = fileNameWithoutExt.match(/(?:\[|\()([A-G][#b]?m?(?:aj|in|j)?|[1-9][0-9]?[AB])(?:\]|\))/i);
    if (keyMatch) {
      guessKey = keyMatch[1];
    }

    setUploadForm(prev => ({
      ...prev,
      title: prev.title || guessTitle,
      artist: prev.artist || guessArtist,
      song_key: prev.song_key || guessKey,
    }));

    try {
      const metadata = await parseBlob(file, { skipCovers: false });
      const { common, native } = metadata;

      let nativeKey = "";

      if ((native as any)['ID3v2.3']) {
        const tkey = (native as any)['ID3v2.3'].find((tag: any) => tag.id === 'TKEY');
        if (tkey) nativeKey = tkey.value as string;
      }
      if (!nativeKey && (native as any)['ID3v2.4']) {
        const tkey = (native as any)['ID3v2.4'].find((tag: any) => tag.id === 'TKEY');
        if (tkey) nativeKey = tkey.value as string;
      }
      if (!nativeKey && (native as any)['ID3v2.2']) {
        const tke = (native as any)['ID3v2.2'].find((tag: any) => tag.id === 'TKE');
        if (tke) nativeKey = tke.value as string;
      }

      const scanTXXX = (tags: any[]) => {
        for (const tag of tags) {
          if (tag.id === 'TXXX' && tag.description) {
            const desc = tag.description.toUpperCase();
            if (desc.includes('KEY') || desc.includes('INITIAL') || desc.includes('CAMELOT') || desc.includes('SERATO')) {
              if (tag.value) return tag.value.toString().trim();
            }
          }
        }
        return "";
      };

      if (!nativeKey && (native as any)['ID3v2.3']) {
        nativeKey = scanTXXX((native as any)['ID3v2.3']);
      }
      if (!nativeKey && (native as any)['ID3v2.4']) {
        nativeKey = scanTXXX((native as any)['ID3v2.4']);
      }

      if (!nativeKey && common.comment && common.comment.length > 0) {
        const commentText = (common.comment as any[])?.[0]?.text;
        if (commentText) {
           const camelotMatch = commentText.match(/\b([1-9][0-9]?[AB])\b/i);
           if (camelotMatch) nativeKey = camelotMatch[1];
        }
      }

      let finalKey = common.key || nativeKey || guessKey;

      if (finalKey) {
        finalKey = finalKey.trim();
        if (/^[1-9][0-9]?[AB]$/i.test(finalKey)) {
          finalKey = finalKey.toUpperCase();
        }
      }

      setUploadForm(prev => ({
        ...prev,
        title: common.title || prev.title,
        artist: common.artist || prev.artist,
        genre: common.genre?.[0] || prev.genre,
        bpm: common.bpm ? String(Math.round(common.bpm)) : prev.bpm,
        song_key: finalKey || prev.song_key
      }));

      if (common.picture && common.picture.length > 0) {
        const pic = common.picture[0];
        const dataArray = pic.data instanceof Uint8Array ? pic.data : new Uint8Array(pic.data as any);
        const blob = new Blob([dataArray as any], { type: pic.format });
        const coverFileFromTag = new File([blob], `cover-${Date.now()}.jpg`, { type: pic.format });
        setCoverFile(coverFileFromTag);
      }
    } catch (err: any) {
      console.warn("Impossible de lire les tags ID3", err);
    }

    // Détection de la tonalité même si les tags sont illisibles/absents
    decodeAndDetectKey(file).then((audioCamelot) => {
      if (audioCamelot) {
        setUploadForm((prev) => ({ ...prev, song_key: audioCamelot }));
      }
    }).catch(() => {});
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Connecte-toi pour uploader.");
    if (!uploadForm.title || !uploadForm.artist) return alert("Titre et Artiste obligatoires.");

    setUploading(true);
    try {
      let finalAudioUrl = uploadForm.audio_url;
      let coverUrl = null;

      if (uploadType === 'file') {
        if (!audioFile) throw new Error("Sélectionne un fichier audio.");
        const audioExt = audioFile.name.split('.').pop();
        const audioName = `${user.id}/${Date.now()}-audio.${audioExt}`;
        const { error: audioError } = await supabase.storage.from(AUDIO_BUCKET).upload(audioName, audioFile);
        if (audioError) throw audioError;
        const { data: audioUrlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(audioName);
        finalAudioUrl = audioUrlData.publicUrl;

        if (coverFile) {
          const coverExt = coverFile.name.split('.').pop();
          const coverName = `${user.id}/${Date.now()}-cover.${coverExt}`;
          const { error: coverError } = await supabase.storage.from(AUDIO_BUCKET).upload(coverName, coverFile);
          if (!coverError) {
            const { data: coverUrlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(coverName);
            coverUrl = coverUrlData.publicUrl;
          }
        }
      } else {
        if (!uploadForm.audio_url && !uploadForm.embed_code && !uploadForm.purchase_url) throw new Error("Renseigne un lien audio, un lien officiel ou un code d'intégration.");
        if (uploadForm.audio_url && (uploadForm.audio_url.endsWith('.mp3') || uploadForm.audio_url.includes('catbox'))) {
            finalAudioUrl = uploadForm.audio_url;
        } else if (uploadForm.audio_url) {
            if (!uploadForm.purchase_url) uploadForm.purchase_url = uploadForm.audio_url;
            finalAudioUrl = '';
        }
      }

      const { data, error: dbError } = await supabase.from('tracks').insert({
        user_id: user.id,
        title: uploadForm.title,
        artist: uploadForm.artist,
        genre: uploadForm.genre || 'Inconnu',
        bpm: Number(uploadForm.bpm) || 0,
        song_key: uploadForm.song_key || null,
        audio_url: finalAudioUrl,
        cover_url: coverUrl || linkCoverUrl,
        embed_code: uploadForm.embed_code || null,
        purchase_url: uploadForm.purchase_url || null,
        peaks: [],
        duration: 0,
        likes_count: 0,
        downloads: 0
      }).select().single();

      if (dbError) throw dbError;

      if (data) setTracks((prev) => [data, ...prev]);

      setShowUploadModal(false);
      setUploadForm({ title: '', artist: '', genre: '', bpm: '', song_key: '', audio_url: '', embed_code: '', purchase_url: '' });
      setAudioFile(null);
      setCoverFile(null);
      alert("Son ajouté avec succès ! 🎵");
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const visibleTracks = useMemo(() => {
    let list = [...tracks];
    if (selectedGenre) list = list.filter((t) => (t.genre || 'Inconnu').trim() === selectedGenre);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case 'likes': list.sort((a, b) => b.likes_count - a.likes_count); break;
      case 'bpm': list.sort((a, b) => b.bpm - a.bpm); break;
      case 'title': list.sort((a, b) => a.title.localeCompare(b.title)); break;
      default: list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [tracks, search, sortBy, selectedGenre]);

  useEffect(() => { setCurrentPage(1); }, [search, sortBy, selectedGenre]);

  const totalPages = Math.max(1, Math.ceil(visibleTracks.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTracks = visibleTracks.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tracks.forEach((t) => {
      const g = (t.genre || 'Inconnu').trim();
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [tracks]);

  // ▶️ Lecture d'une liste (avec option shuffle)
  // ⚠️ Lance uniquement le premier son. Pour l'enchaînement, étendre PlayerContext avec une queue.
  const playTrackList = (list: Track[], shuffle = false) => {
    if (!user) {
      alert('🔒 Inscrivez-vous gratuitement pour écouter les morceaux.');
      navigate('/auth');
      return;
    }
    if (!list.length) return;

    const ordered = [...list];
    if (shuffle) {
      for (let i = ordered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
      }
    }

    const first = ordered[0];
    if (!first.audio_url) return;

    play({
      id: first.id, title: first.title, artist: first.artist,
      audio_url: first.audio_url, cover_url: first.cover_url,
      user_id: first.user_id || null, duration: first.duration,
      peaks: first.peaks, bpm: first.bpm, song_key: first.song_key, genre: first.genre,
    });
  };

  // ⬇️ Export M3U de la liste visible
  const handleExportM3U = () => {
    if (!visibleTracks.length) return;
    setExportingM3U(true);
    try {
      const lines = ['#EXTM3U'];
      visibleTracks.forEach((t) => {
        const dur = Math.round(t.duration || 0);
        const artist = t.artist || 'Artiste inconnu';
        const title = t.title || 'Sans titre';
        lines.push(`#EXTINF:${dur},${artist} - ${title}`);
        if (t.audio_url) lines.push(t.audio_url);
      });
      const blob = new Blob([lines.join('\n')], { type: 'audio/x-mpegurl;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const label = selectedGenre ? `-${selectedGenre.replace(/\s+/g, '_')}` : '';
      a.download = `nouveautes${label}-${new Date().toISOString().slice(0, 10)}.m3u`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExportingM3U(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bg, fontFamily: 'Inter, sans-serif', color: colors.textMain, position: 'relative', transition: 'background 0.3s ease' }}>

      <PageMeta title="DJ Only / Promos" description="Les dernières sorties et exclusivités des DJs indépendants sur ELEKTRAQ." />

      <div style={{ zIndex: 10, padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(10, 10, 10, 0.7)' : 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = colors.textMain} onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            {t('nouveautes.back')}
          </button>
          <span style={{ color: colors.border }}>|</span>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.5px' }}>
            <span style={{ color: colors.accent, filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))' }}>🔥</span> {t('nouveautes.title')}
          </h1>
        </div>

        <button
          onClick={toggleTheme}
          style={{
            background: isDark ? '#ffffff' : '#1a1a1a',
            border: `1px solid ${isDark ? '#e5e7eb' : '#333333'}`,
            color: isDark ? '#000000' : '#ffffff',
            padding: 8,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}
        >
          {isDark ? Icons.sun : Icons.moon}
        </button>
      </div>

      <div style={{ padding: isMobile ? '16px 12px' : '32px 24px', paddingBottom: 100, width: '100%', boxSizing: 'border-box', flex: 1, position: 'relative', zIndex: 10, minHeight: 'calc(100vh - 150px)', scrollbarGutter: 'stable' }}>

        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', width: '100%', maxWidth: 1600, margin: '0 auto' }}>

          {!isMobile && (
            <aside style={{ width: 240, flexShrink: 0, position: 'sticky', top: 100, alignSelf: 'flex-start' }}>
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '20px 12px', backdropFilter: 'blur(20px)', boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', padding: '0 10px 14px', margin: 0, color: colors.textMuted, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {t('nouveautes.genres')}
                  <span style={{ fontSize: 10, fontWeight: 700, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: colors.accent, padding: '2px 8px', borderRadius: 20 }}>{Array.from(new Set(tracks.map(t => (t.genre || '').trim()).filter(Boolean))).length}</span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div onClick={() => setSelectedGenre(null)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', fontSize: 13, cursor: 'pointer', color: selectedGenre === null ? colors.textMain : colors.textMuted, fontWeight: selectedGenre === null ? 700 : 500, background: selectedGenre === null ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.1)') : 'transparent', borderRadius: 10, transition: 'all 0.15s' }}
                    onMouseEnter={(e) => { if (selectedGenre !== null) e.currentTarget.style.background = colors.rowHover; }}
                    onMouseLeave={(e) => { if (selectedGenre !== null) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: selectedGenre === null ? (isDark ? 'linear-gradient(135deg, #ffffff, #b0b0b0)' : '#111111') : colors.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedGenre === null ? (isDark ? '#000' : '#ffffff') : colors.textMuted, flexShrink: 0, fontSize: 12 }}>{Icons.music}</span>
                    <span style={{ flex: 1 }}>{t('nouveautes.all_tracks')}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: colors.inputBg, color: colors.textMuted, padding: '2px 7px', borderRadius: 20 }}>{tracks.length}</span>
                  </div>

                  <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', marginTop: 6, scrollbarGutter: 'stable', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {Array.from(new Set(tracks.map(t => (t.genre || 'Inconnu').trim()))).sort().map((genre, gi) => {
                      const genreColors = ['#888888', '#b0b0b0', '#777777', '#999999', '#aaaaaa', '#808080', '#909090', '#858585'];
                      const gColor = genreColors[gi % genreColors.length];
                      const isSel = selectedGenre === genre;
                      return (
                        <div key={genre} onClick={() => setSelectedGenre(genre)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', fontSize: 13, cursor: 'pointer', color: isSel ? colors.textMain : colors.textMuted, fontWeight: isSel ? 700 : 500, background: isSel ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.1)') : 'transparent', borderRadius: 10, transition: 'all 0.15s' }}
                          onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = colors.rowHover; }}
                          onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: gColor, flexShrink: 0, boxShadow: `0 0 6px ${gColor}80` }} />
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{genre}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, background: colors.inputBg, color: isSel ? gColor : colors.textMuted, padding: '2px 7px', borderRadius: 20 }}>{genreCounts[genre] || 0}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>
          )}

          <main style={{ flex: 1, minWidth: 0, width: '100%', minHeight: 'calc(100vh - 150px)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)', border: isDark ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(0, 0, 0, 0.2)', padding: '5px 12px', borderRadius: 20, fontSize: 10, fontWeight: 800, color: colors.textMain, letterSpacing: '1.5px', marginBottom: 14, textTransform: 'uppercase' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.textMain, boxShadow: `0 0 8px ${isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)'}` }} />
                  {t('nouveautes.badge')}
                </div>
                <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 900, margin: 0, letterSpacing: '-1.5px', color: colors.textMain, lineHeight: 1.1 }}>
                  {t('nouveautes.latest')}
                  {!loading && (
                    <span style={{ fontSize: '1.1rem', color: colors.textMuted, fontWeight: 700, marginLeft: 12, letterSpacing: '0' }}>
                      {visibleTracks.length}
                    </span>
                  )}
                </h2>
                <p style={{ color: colors.textMuted, fontSize: 15, margin: '10px 0 0 0', fontWeight: 500, maxWidth: 480, lineHeight: 1.5 }}>
                  {t('nouveautes.subtitle')}
                </p>
                <div onClick={() => navigate('/mastering')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '6px 14px', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', border: `1px solid ${colors.border}`, borderRadius: 20, fontSize: 12, fontWeight: 700, color: colors.textMuted, cursor: 'pointer', textDecoration: 'none' }}>
                  🎚️ {t('nouveautes.mastering_hint')}
                </div>
              </div>
              {user && (
                <button onClick={() => { setRightsAccepted(false); setLinkCoverUrl(''); setMetaMsg(''); setShowUploadModal(true); }} style={{ padding: isMobile ? '10px 16px' : '12px 24px', background: isDark ? '#ffffff' : '#111111', color: isDark ? '#000' : '#ffffff', border: '1px solid transparent', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13, boxShadow: isDark ? '0 0 20px rgba(255, 255, 255, 0.25)' : '0 4px 16px rgba(0,0,0,0.15)', transition: 'transform 0.2s, box-shadow 0.2s', whiteSpace: 'nowrap' }}>
                  {isMobile ? t('nouveautes.upload_short') : t('nouveautes.upload')}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 260px' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, pointerEvents: 'none', display: 'flex' }}>
                  {Icons.search}
                </div>
                <input type="text" placeholder={t('nouveautes.search')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '11px 14px 11px 42px', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '10px', color: colors.textMain, fontFamily: 'Inter, sans-serif', fontSize: '13px', outline: 'none', width: '100%', transition: 'all 0.2s', boxSizing: 'border-box' }} />
              </div>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ padding: '11px 14px', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '10px', color: colors.textMain, fontFamily: 'Inter, sans-serif', fontSize: '13px', outline: 'none', cursor: 'pointer', flex: '0 1 200px', boxSizing: 'border-box' }}>
                <option value="recent" style={{ background: colors.bg, color: colors.textMain }}>{t('nouveautes.sort_recent')}</option>
                <option value="likes" style={{ background: colors.bg, color: colors.textMain }}>{t('nouveautes.sort_likes')}</option>
                <option value="bpm" style={{ background: colors.bg, color: colors.textMain }}>{t('nouveautes.sort_bpm')}</option>
                <option value="title" style={{ background: colors.bg, color: colors.textMain }}>{t('nouveautes.sort_title')}</option>
              </select>
            </div>

            {/* 🎛️ Barre d'actions */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => playTrackList(visibleTracks, false)}
                disabled={!visibleTracks.length}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                  background: isDark ? '#ffffff' : '#111111', color: isDark ? '#000' : '#ffffff',
                  border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 13,
                  cursor: visibleTracks.length ? 'pointer' : 'not-allowed',
                  opacity: visibleTracks.length ? 1 : 0.5,
                  boxShadow: isDark ? '0 0 15px rgba(255,255,255,0.25)' : '0 4px 14px rgba(0,0,0,0.15)',
                }}
              >
                {Icons.listMusic} {t('nouveautes.play_all')}
              </button>

              <button
                onClick={() => playTrackList(visibleTracks, true)}
                disabled={!visibleTracks.length}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                  background: colors.inputBg, color: colors.textMain,
                  border: `1px solid ${colors.inputBorder}`, borderRadius: 10, fontWeight: 700, fontSize: 13,
                  cursor: visibleTracks.length ? 'pointer' : 'not-allowed',
                  opacity: visibleTracks.length ? 1 : 0.5,
                }}
              >
                {Icons.shuffle} {t('nouveautes.shuffle')}
              </button>

              <button
                onClick={handleExportM3U}
                disabled={!visibleTracks.length || exportingM3U}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                  background: 'transparent', color: colors.textMain,
                  border: `1px solid ${colors.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13,
                  cursor: (visibleTracks.length && !exportingM3U) ? 'pointer' : 'not-allowed',
                  opacity: (visibleTracks.length && !exportingM3U) ? 1 : 0.5,
                }}
              >
                {Icons.download} {exportingM3U ? t('nouveautes.exporting') : 'M3U'}
              </button>

              <span style={{ marginLeft: 'auto', fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>
                {t('nouveautes.tracks', { count: visibleTracks.length })}
                {selectedGenre && ` · ${selectedGenre}`}
              </span>
            </div>

            <TrackGrid tracks={paginatedTracks as any} onPlay={handleGridPlay} />

            {!loading && totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 40 }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, color: safeCurrentPage === 1 ? colors.textMuted : colors.textMain, padding: '10px 20px', borderRadius: 8, cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {t('nouveautes.prev')}
                </button>
                <span style={{ fontSize: 13, color: colors.textMuted, fontWeight: 600 }}>{t('nouveautes.page', { current: safeCurrentPage, total: totalPages })}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, color: safeCurrentPage === totalPages ? colors.textMuted : colors.textMain, padding: '10px 20px', borderRadius: 8, cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {t('nouveautes.next')}
                </button>
              </div>
            )}
          </main>

          {!isMobile && (
            <aside style={{ width: 280, flexShrink: 0, position: 'sticky', top: 100, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1px', margin: '0 0 16px 0', color: colors.textMain, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: colors.accent }}>🔥</span> {t('nouveautes.top10')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {tracks.slice(0, 10).map((track, index) => (
                    <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate(`/track/${track.id}`)}>
                      <div style={{ width: 20, textAlign: 'center', fontSize: 14, color: index === 0 ? '#ffffff' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : colors.textMuted, fontWeight: 900, fontStyle: 'italic' }}>{index + 1}</div>
                      <div style={{ width: 36, height: 36, borderRadius: 6, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', flexShrink: 0, border: `1px solid ${colors.border}` }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.05)' }}>
                <OnlineUsersWidget />
              </div>
            </aside>
          )}
        </div>
      </div>

      {showUploadModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: isDark ? 'rgba(15, 15, 20, 0.95)' : '#ffffff', border: `1px solid ${colors.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 0 50px rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.textMain, letterSpacing: '-0.5px' }}>{t('nouveautes.modal_title')}</h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setUploadType('file')} style={{ flex: 1, padding: 12, background: uploadType === 'file' ? 'linear-gradient(135deg, #ffffff, #0099ff)' : 'transparent', color: uploadType === 'file' ? '#000' : colors.textMain, border: `1px solid ${colors.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s' }}>{t('nouveautes.file_tab')}</button>
              <button onClick={() => setUploadType('link')} style={{ flex: 1, padding: 12, background: uploadType === 'link' ? 'linear-gradient(135deg, #ffffff, #0099ff)' : 'transparent', color: uploadType === 'link' ? '#000' : colors.textMain, border: `1px solid ${colors.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s' }}>{t('nouveautes.link_tab')}</button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {uploadType === 'file' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>{t('nouveautes.audio_label')}</label>
                    <input type="file" accept="audio/*" onChange={handleAudioFileChange} required style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                    {audioFile && <p style={{ fontSize: 11, color: colors.textMain, marginTop: 4, fontWeight: 600 }}>{t('nouveautes.file_selected')} {audioFile.name}</p>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>{t('nouveautes.cover_label')}</label>
                    <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                    {coverFile && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={URL.createObjectURL(coverFile)} alt="Cover preview" style={{ width: 50, height: 50, borderRadius: 6, objectFit: 'cover', border: `1px solid ${colors.border}` }} />
                        <span style={{ fontSize: 11, color: colors.textMain, fontWeight: 600 }}>{t('nouveautes.cover_loaded')}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>{t('nouveautes.link_label')}</label>
                    <input type="url" value={uploadForm.audio_url} onChange={e => setUploadForm({...uploadForm, audio_url: e.target.value})} placeholder="https://.../track.mp3" style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                    <p style={{ margin: '6px 0 0 0', fontSize: 11, color: colors.textMuted, lineHeight: 1.5 }}>{t('nouveautes.link_hint')}</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>{t('nouveautes.purchase_label')}</label>
                    <input type="url" value={uploadForm.purchase_url} onChange={e => setUploadForm({...uploadForm, purchase_url: e.target.value})} placeholder="https://pro.music-worx.com/release/..." style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                      <button type="button" onClick={fetchMetaFromUrl} disabled={fetchingMeta} style={{ padding: '8px 14px', background: 'transparent', border: `1px dashed ${colors.border}`, borderRadius: 8, color: colors.textMain, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {fetchingMeta ? t('nouveautes.fetch_meta_loading') : '🔍 ' + t('nouveautes.fetch_meta')}
                      </button>
                      {linkCoverUrl && <img src={linkCoverUrl} alt="cover" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', border: `1px solid ${colors.border}` }} />}
                    </div>
                    {metaMsg && <p style={{ margin: '6px 0 0 0', fontSize: 11, color: metaMsg.startsWith('✅') ? '#00c878' : '#ff6b6b', fontWeight: 600 }}>{metaMsg}</p>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>{t('nouveautes.embed_label')}</label>
                    <textarea value={uploadForm.embed_code} onChange={e => setUploadForm({...uploadForm, embed_code: e.target.value})} placeholder="<iframe src='...'></iframe>" rows={3} style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, fontFamily: 'monospace' }} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>{t('nouveautes.title_label')}</label>
                  <input type="text" value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} required style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>{t('nouveautes.artist_label')}</label>
                  <input type="text" value={uploadForm.artist} onChange={e => setUploadForm({...uploadForm, artist: e.target.value})} required style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>{t('nouveautes.genre_label')}</label>
                  <input type="text" value={uploadForm.genre} onChange={e => setUploadForm({...uploadForm, genre: e.target.value})} placeholder="Ex: Techno" style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>{t('nouveautes.bpm_label')}</label>
                  <input type="number" value={uploadForm.bpm} onChange={e => setUploadForm({...uploadForm, bpm: e.target.value})} placeholder="128" style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>{t('nouveautes.key_label')}</label>
                  <input type="text" value={uploadForm.song_key} onChange={e => setUploadForm({...uploadForm, song_key: e.target.value})} placeholder="Am" style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12, fontSize: 12, color: colors.textMuted, cursor: 'pointer', fontWeight: 600, lineHeight: 1.5 }}>
                <input type="checkbox" checked={rightsAccepted} onChange={(e) => setRightsAccepted(e.target.checked)} style={{ marginTop: 2, accentColor: '#00c878', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }} />
                <span>{t('nouveautes.rights_label')}</span>
              </label>

              <button type="submit" disabled={uploading || !rightsAccepted} style={{ marginTop: 12, padding: 16, background: '#ffffff', color: '#000', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: (uploading || !rightsAccepted) ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s', boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)', opacity: rightsAccepted ? 1 : 0.5 }}>
                {uploading ? t('nouveautes.processing') : t('nouveautes.submit')}
              </button>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
};