// src/pages/NouveautesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { OnlineUsersWidget } from '../components/OnlineUsersWidget';
import { ShareButton } from '../components/ShareButton';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../contexts/ThemeContext';
import { parseBlob } from 'music-metadata-browser';

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
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
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

export const NouveautesPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
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

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

  const [isCreatingPlaylistInMenu, setIsCreatingPlaylistInMenu] = useState(false);
  const [newPlaylistNameInMenu, setNewPlaylistNameInMenu] = useState('');

  const [exportingM3U, setExportingM3U] = useState(false);

  const colors = {
    bg: isDark ? '#05050a' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    panelBg: isDark ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
    inputBg: isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
    inputBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    rowHover: isDark ? 'rgba(0, 217, 255, 0.05)' : 'rgba(0, 217, 255, 0.08)',
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
    const { data, error } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
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
        if (!uploadForm.audio_url && !uploadForm.embed_code) throw new Error("Renseigne un lien ou un code d'intégration.");
        if (uploadForm.audio_url && (uploadForm.audio_url.endsWith('.mp3') || uploadForm.audio_url.includes('catbox'))) {
            finalAudioUrl = uploadForm.audio_url;
        } else if (uploadForm.audio_url) {
            uploadForm.purchase_url = uploadForm.audio_url;
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
        cover_url: coverUrl,
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

      {isDark && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(0, 217, 255, 0.15) 0%, transparent 60%)', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(124, 92, 255, 0.15) 0%, transparent 60%)', filter: 'blur(80px)' }} />
        </div>
      )}

      <div style={{ zIndex: 10, padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(5, 5, 10, 0.7)' : 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = colors.textMain} onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Retour au site
          </button>
          <span style={{ color: colors.border }}>|</span>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#00d9ff', filter: 'drop-shadow(0 0 10px rgba(0,217,255,0.8))' }}>🔥</span> Nouveautés
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
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '20px 16px', backdropFilter: 'blur(20px)', boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', padding: '0 8px 16px', margin: 0, color: colors.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>Genres</h3>
                <div onClick={() => setSelectedGenre(null)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', fontSize: 13, cursor: 'pointer', marginTop: 12, color: selectedGenre === null ? colors.textMain : colors.textMuted, fontWeight: selectedGenre === null ? 700 : 500, background: selectedGenre === null ? (isDark ? 'linear-gradient(90deg, rgba(0, 217, 255, 0.15) 0%, transparent 100%)' : 'rgba(0, 217, 255, 0.1)') : 'transparent', borderLeft: selectedGenre === null ? '3px solid #00d9ff' : '3px solid transparent', borderRadius: '0 8px 8px 0', transition: 'all 0.2s' }}>
                  <span style={{ color: selectedGenre === null ? '#00d9ff' : colors.textMuted }}>{Icons.music}</span>
                  <span style={{ flex: 1 }}>Tous les sons</span>
                  <span style={{ fontSize: 11, color: colors.textMuted, opacity: 0.7 }}>{tracks.length}</span>
                </div>
                <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto', marginTop: 8, scrollbarGutter: 'stable' }}>
                  {Array.from(new Set(tracks.map(t => (t.genre || 'Inconnu').trim()))).sort().map((genre) => (
                    <div key={genre} onClick={() => setSelectedGenre(genre)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', fontSize: 13, cursor: 'pointer', color: selectedGenre === genre ? colors.textMain : colors.textMuted, fontWeight: selectedGenre === genre ? 700 : 500, background: selectedGenre === genre ? (isDark ? 'linear-gradient(90deg, rgba(0, 217, 255, 0.15) 0%, transparent 100%)' : 'rgba(0, 217, 255, 0.1)') : 'transparent', borderLeft: selectedGenre === genre ? '3px solid #00d9ff' : '3px solid transparent', borderRadius: '0 8px 8px 0', transition: 'all 0.2s' }}>
                      <span style={{ color: selectedGenre === genre ? '#00d9ff' : colors.textMuted }}>{Icons.music}</span>
                      <span style={{ flex: 1 }}>{genre}</span>
                      <span style={{ fontSize: 11, color: colors.textMuted, opacity: 0.7 }}>{genreCounts[genre] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}

          <main style={{ flex: 1, minWidth: 0, width: '100%', minHeight: 'calc(100vh - 150px)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-1px', color: colors.textMain }}>
                  Nouveautés
                  {!loading && (
                    <span style={{ fontSize: '1rem', color: colors.textMuted, fontWeight: 600, marginLeft: 12 }}>
                      ({visibleTracks.length})
                    </span>
                  )}
                </h2>
                <p style={{ color: colors.textMuted, fontSize: 14, margin: '6px 0 0 0', fontWeight: 500 }}>Découvrez les derniers sons partagés par la communauté.</p>
              </div>
              {user && (
                <button onClick={() => setShowUploadModal(true)} style={{ padding: isMobile ? '10px 16px' : '12px 24px', background: 'linear-gradient(135deg, #00d9ff, #7c5cff)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13, boxShadow: '0 0 20px rgba(0, 217, 255, 0.4)', transition: 'transform 0.2s, box-shadow 0.2s', whiteSpace: 'nowrap' }}>
                  {isMobile ? '+ Son' : '+ Uploader'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, pointerEvents: 'none' }}>
                  {Icons.search}
                </div>
                <input type="text" placeholder="Rechercher un son, un artiste..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '10px 14px 10px 40px', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '10px', color: colors.textMain, fontFamily: 'Inter, sans-serif', fontSize: '13px', outline: 'none', width: '100%', transition: 'all 0.2s' }} />
              </div>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ padding: '10px 14px', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '10px', color: colors.textMain, fontFamily: 'Inter, sans-serif', fontSize: '13px', outline: 'none', cursor: 'pointer', flex: '0 1 180px' }}>
                <option value="recent" style={{ background: colors.bg, color: colors.textMain }}>Plus récents</option>
                <option value="likes" style={{ background: colors.bg, color: colors.textMain }}>Plus aimés</option>
                <option value="bpm" style={{ background: colors.bg, color: colors.textMain }}>BPM (Décroissant)</option>
                <option value="title" style={{ background: colors.bg, color: colors.textMain }}>Titre (A-Z)</option>
              </select>
            </div>

            {/* 🎛️ Barre d'actions */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => playTrackList(visibleTracks, false)}
                disabled={!visibleTracks.length}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                  background: 'linear-gradient(135deg, #00d9ff, #0099ff)', color: '#000',
                  border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 13,
                  cursor: visibleTracks.length ? 'pointer' : 'not-allowed',
                  opacity: visibleTracks.length ? 1 : 0.5,
                  boxShadow: '0 0 15px rgba(0,217,255,0.3)',
                }}
              >
                {Icons.listMusic} Tout lire
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
                {Icons.shuffle} Aléatoire
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
                {Icons.download} {exportingM3U ? 'Export...' : 'M3U'}
              </button>

              <span style={{ marginLeft: 'auto', fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>
                {visibleTracks.length} son{visibleTracks.length > 1 ? 's' : ''}
                {selectedGenre && ` · ${selectedGenre}`}
              </span>
            </div>

            <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, width: '100%', overflow: 'hidden', backdropFilter: 'blur(20px)', boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.05)' }}>
              <style>{`@keyframes skpulse{0%,100%{opacity:1}50%{opacity:.55}}`}</style>

              {!isMobile && (
                <div style={{ display: 'grid', gridTemplateColumns: '40px 40px minmax(200px, 1fr) 120px 140px 160px', gap: 16, padding: '16px', borderBottom: `1px solid ${colors.border}`, fontSize: 11, color: colors.textMuted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                  <div></div><div></div><div>Titre / Artistes</div><div>Genre</div><div>BPM / Clé</div><div style={{ textAlign: 'right' }}>Actions</div>
                </div>
              )}

              {loading ? (
                <div>
                  {Array.from({ length: 8 }).map((_, i) => {
                    const bgBlock = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr' : '40px 40px minmax(200px, 1fr) 120px 140px 160px',
                          gap: 16,
                          padding: '14px 16px',
                          alignItems: 'center',
                          borderBottom: `1px solid ${colors.border}`,
                          animation: 'skpulse 1.5s ease-in-out infinite',
                          animationDelay: `${i * 0.05}s`,
                        }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: bgBlock }} />
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: bgBlock }} />
                        <div>
                          <div style={{ height: 12, width: '55%', borderRadius: 4, background: bgBlock, marginBottom: 6 }} />
                          <div style={{ height: 10, width: '35%', borderRadius: 4, background: bgBlock }} />
                        </div>
                        {!isMobile && (
                          <>
                            <div style={{ height: 22, width: 70, borderRadius: 4, background: bgBlock }} />
                            <div style={{ height: 22, width: 110, borderRadius: 4, background: bgBlock }} />
                            <div style={{ height: 22, width: 110, borderRadius: 4, background: bgBlock, justifySelf: 'end' }} />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : paginatedTracks.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: colors.textMuted }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: colors.textMain, marginBottom: 8 }}>
                    {search || selectedGenre ? 'Aucun son ne correspond à ta recherche' : 'Aucun son pour le moment'}
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 20 }}>
                    {search || selectedGenre
                      ? "Essaie d'autres mots-clés ou change de genre."
                      : 'Sois le premier à partager un son !'}
                  </div>
                  {(search || selectedGenre) ? (
                    <button
                      onClick={() => { setSearch(''); setSelectedGenre(null); }}
                      style={{ padding: '10px 20px', background: '#00d9ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                    >
                      Réinitialiser les filtres
                    </button>
                  ) : user ? (
                    <button
                      onClick={() => setShowUploadModal(true)}
                      style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #00d9ff, #7c5cff)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                    >
                      + Uploader un son
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/auth')}
                      style={{ padding: '10px 20px', background: '#00d9ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                    >
                      Se connecter
                    </button>
                  )}
                </div>
              ) : paginatedTracks.map((track) => {
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                const isLiked = userLikes[track.id] || false;
                const isOwner = user?.id === track.user_id;

                if (editingId === track.id) {
                  return (
                    <div key={track.id} style={{ padding: '20px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 12, background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} style={{ flex: 1, padding: 10, background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.textMain, borderRadius: 6, minWidth: 150 }} placeholder="Titre" />
                        <input type="text" value={editForm.artist} onChange={e => setEditForm({...editForm, artist: e.target.value})} style={{ flex: 1, padding: 10, background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.textMain, borderRadius: 6, minWidth: 150 }} placeholder="Artiste" />
                        <input type="text" value={editForm.genre} onChange={e => setEditForm({...editForm, genre: e.target.value})} style={{ width: 140, padding: 10, background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.textMain, borderRadius: 6 }} placeholder="Genre" />
                        <input type="number" value={editForm.bpm} onChange={e => setEditForm({...editForm, bpm: Number(e.target.value)})} style={{ width: 90, padding: 10, background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.textMain, borderRadius: 6 }} placeholder="BPM" />
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={saveEdit} style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: 800 }}>Enregistrer</button>
                        <button onClick={() => setEditingId(null)} style={{ background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                      </div>
                    </div>
                  );
                }

                if (isMobile) {
                  return (
                    <div key={track.id} style={{ padding: '16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button onClick={(e) => handlePlayTrack(e, track)} style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', background: isThisPlaying ? '#00d9ff' : colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: isThisPlaying ? '#000' : colors.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          {isThisPlaying ? Icons.pause : Icons.play}
                        </button>
                        <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 8, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', position: 'relative' }}>
                          {isNew(track.created_at) && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 8, padding: '2px 5px', background: '#00d9ff', color: '#000', borderRadius: 4, fontWeight: 900, zIndex: 2, boxShadow: '0 0 10px rgba(0,217,255,0.5)' }}>NEW</span>}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{track.title}</div>
                          <div style={{ fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 11, color: colors.textMuted, paddingLeft: 52, flexWrap: 'wrap' }}>
                        <span style={{ background: colors.inputBg, padding: '2px 8px', borderRadius: 4 }}>{track.genre || 'Inconnu'}</span>
                        <span style={{ background: 'rgba(0,217,255,0.1)', color: '#00d9ff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{track.bpm} BPM</span>
                        {track.song_key && <span style={{ background: colors.inputBg, padding: '2px 8px', borderRadius: 4 }}>{track.song_key}</span>}
                        {track.duration > 0 && (
                          <span style={{ background: colors.inputBg, padding: '2px 8px', borderRadius: 4 }}>{formatDuration(track.duration)}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 20, paddingLeft: 52, alignItems: 'center' }}>
                         <button onClick={() => handleLike(track.id)} style={{ background: 'transparent', border: 'none', color: isLiked ? '#ff3366' : colors.textMuted, fontSize: 14 }}>{isLiked ? '❤️' : '🤍'} {track.likes_count}</button>
                         <button onClick={(e) => handleDownloadClick(e, track)} style={{ background: 'transparent', border: 'none', color: colors.textMuted }}>{Icons.download}</button>

                         <div style={{ position: 'relative' }}>
                            <button onClick={() => setAddingTrackId(addingTrackId === track.id ? null : track.id)} style={{ background: 'transparent', border: 'none', color: recentlyAdded === track.id ? '#10b981' : colors.textMuted, display: 'flex', alignItems: 'center' }}>
                              {recentlyAdded === track.id ? Icons.check : Icons.playlist}
                            </button>
                            {addingTrackId === track.id && (
                              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: colors.dropdownBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 8, width: 220, zIndex: 10, boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
                                {!isCreatingPlaylistInMenu ? (
                                  <>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6, padding: '0 4px' }}>Ajouter à...</div>
                                    {userPlaylists.length === 0 ? (
                                      <div style={{ fontSize: 11, color: colors.textMuted, padding: 4 }}>Aucune playlist.</div>
                                    ) : (
                                      userPlaylists.map(p => (
                                        <button key={p.id} onClick={() => handleAddToPlaylist(p.id, track.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', background: 'transparent', border: 'none', color: colors.textMain, fontSize: 12, cursor: 'pointer', borderRadius: 4 }} onMouseEnter={(e) => e.currentTarget.style.background = colors.rowHover} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                          {p.name}
                                        </button>
                                      ))
                                    )}
                                    <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 6, paddingTop: 6 }}>
                                      <button onClick={(e) => { e.stopPropagation(); setIsCreatingPlaylistInMenu(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '6px 8px', background: 'transparent', border: 'none', color: '#00d9ff', fontSize: 12, cursor: 'pointer', borderRadius: 4, fontWeight: 700 }}>
                                        {Icons.plus} Créer une playlist
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <form onSubmit={(e) => handleCreatePlaylistAndAdd(e, track.id)} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <input type="text" autoFocus placeholder="Nom..." value={newPlaylistNameInMenu} onChange={e => setNewPlaylistNameInMenu(e.target.value)} style={{ width: '100%', padding: '6px 8px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 4, color: colors.textMain, fontSize: 12, outline: 'none' }} />
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button type="submit" style={{ flex: 1, padding: '6px', background: '#00d9ff', color: '#000', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Créer</button>
                                      <button type="button" onClick={() => setIsCreatingPlaylistInMenu(false)} style={{ padding: '6px 8px', background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>X</button>
                                    </div>
                                  </form>
                                )}
                              </div>
                            )}
                          </div>
                         {isOwner && <button onClick={(e) => startEdit(e, track)} style={{ background: 'transparent', border: 'none', color: colors.textMuted }}>{Icons.edit}</button>}
                         {isOwner && <button onClick={(e) => handleDelete(e, track.id)} style={{ background: 'transparent', border: 'none', color: '#ff5c5c' }}>{Icons.trash}</button>}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={track.id} className="track-row" style={{ display: 'grid', gridTemplateColumns: '40px 40px minmax(200px, 1fr) 120px 140px 160px', gap: 16, padding: '14px 16px', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, cursor: 'pointer', transition: 'background 0.2s ease' }}
                  onMouseEnter={e => e.currentTarget.style.background = colors.rowHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <button onClick={(e) => handlePlayTrack(e, track)} style={{ width: 36, height: 36, borderRadius: '50%', background: isThisPlaying ? '#00d9ff' : colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: isThisPlaying ? '#000' : colors.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                      {isThisPlaying ? Icons.pause : Icons.play}
                    </button>
                    <div onClick={() => navigate(`/track/${track.id}`)} style={{ width: 44, height: 44, borderRadius: 8, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', flexShrink: 0, position: 'relative', border: `1px solid ${colors.border}` }}>
                      {isNew(track.created_at) && <span style={{ position: 'absolute', top: -6, right: -6, fontSize: 8, padding: '3px 6px', background: '#00d9ff', color: '#000', borderRadius: 4, fontWeight: 900, zIndex: 2 }}>NEW</span>}
                    </div>
                    <div onClick={() => navigate(`/track/${track.id}`)} style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isThisPlaying ? '#00d9ff' : colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{track.title}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                    </div>

                    <div style={{ fontSize: 12 }}>
                      <span style={{ background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, padding: '4px 10px', borderRadius: 4, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '100%' }}>
                        {track.genre || '—'}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ background: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0,217,255,0.2)', color: '#00d9ff', padding: '4px 8px', borderRadius: 4, fontWeight: 700, fontFamily: 'monospace' }}>
                        {track.bpm ? `${track.bpm}` : '—'}
                      </span>
                      <span style={{ color: colors.textMuted }}>·</span>
                      <span style={{ background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.textMuted, padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
                        {track.song_key || '—'}
                      </span>
                      {track.duration > 0 && (
                        <>
                          <span style={{ color: colors.textMuted }}>·</span>
                          <span style={{ background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.textMuted, padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
                            {formatDuration(track.duration)}
                          </span>
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button onClick={() => handleLike(track.id)} style={{ background: 'transparent', border: 'none', color: isLiked ? '#ff3366' : colors.textMuted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isLiked ? '❤️' : '🤍'} <span style={{ color: colors.textMuted, fontWeight: 600 }}>{track.likes_count}</span>
                      </button>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {track.purchase_url && <a href={track.purchase_url} target="_blank" rel="noopener noreferrer" style={{ color: '#00d9ff', display: 'flex', alignItems: 'center' }}>{Icons.buy}</a>}
                        <button onClick={(e) => handleDownloadClick(e, track)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>{Icons.download}</button>
                        <ShareButton url={`${window.location.origin}/share/${track.id}`} title={`${track.title} — ${track.artist}`} text={`Écoute sur DropZone DJ 🎵`} variant="icon" size="small" label="" position="bottom" />

                        {user && (
                          <div style={{ position: 'relative' }}>
                            <button onClick={() => setAddingTrackId(addingTrackId === track.id ? null : track.id)} style={{ background: 'transparent', border: 'none', color: recentlyAdded === track.id ? '#10b981' : colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              {recentlyAdded === track.id ? Icons.check : Icons.playlist}
                            </button>
                            {addingTrackId === track.id && (
                              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: colors.dropdownBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 8, width: 220, zIndex: 10, boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
                                {!isCreatingPlaylistInMenu ? (
                                  <>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6, padding: '0 4px' }}>Ajouter à...</div>
                                    {userPlaylists.length === 0 ? (
                                      <div style={{ fontSize: 11, color: colors.textMuted, padding: 4 }}>Aucune playlist.</div>
                                    ) : (
                                      userPlaylists.map(p => (
                                        <button key={p.id} onClick={() => handleAddToPlaylist(p.id, track.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', background: 'transparent', border: 'none', color: colors.textMain, fontSize: 12, cursor: 'pointer', borderRadius: 4 }} onMouseEnter={(e) => e.currentTarget.style.background = colors.rowHover} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                          {p.name}
                                        </button>
                                      ))
                                    )}
                                    <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 6, paddingTop: 6 }}>
                                      <button onClick={(e) => { e.stopPropagation(); setIsCreatingPlaylistInMenu(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '6px 8px', background: 'transparent', border: 'none', color: '#00d9ff', fontSize: 12, cursor: 'pointer', borderRadius: 4, fontWeight: 700 }}>
                                        {Icons.plus} Créer une playlist
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <form onSubmit={(e) => handleCreatePlaylistAndAdd(e, track.id)} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <input type="text" autoFocus placeholder="Nom..." value={newPlaylistNameInMenu} onChange={e => setNewPlaylistNameInMenu(e.target.value)} style={{ width: '100%', padding: '6px 8px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 4, color: colors.textMain, fontSize: 12, outline: 'none' }} />
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button type="submit" style={{ flex: 1, padding: '6px', background: '#00d9ff', color: '#000', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Créer</button>
                                      <button type="button" onClick={() => setIsCreatingPlaylistInMenu(false)} style={{ padding: '6px 8px', background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>X</button>
                                    </div>
                                  </form>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {isOwner && <button onClick={(e) => startEdit(e, track)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>{Icons.edit}</button>}
                        {isOwner && <button onClick={(e) => handleDelete(e, track.id)} style={{ background: 'transparent', border: 'none', color: '#ff5c5c', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>{Icons.trash}</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!loading && totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 40 }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, color: safeCurrentPage === 1 ? colors.textMuted : colors.textMain, padding: '10px 20px', borderRadius: 8, cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  ← Précédent
                </button>
                <span style={{ fontSize: 13, color: colors.textMuted, fontWeight: 600 }}>Page {safeCurrentPage} sur {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, color: safeCurrentPage === totalPages ? colors.textMuted : colors.textMain, padding: '10px 20px', borderRadius: 8, cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Suivant →
                </button>
              </div>
            )}
          </main>

          {!isMobile && (
            <aside style={{ width: 280, flexShrink: 0, position: 'sticky', top: 100, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1px', margin: '0 0 16px 0', color: colors.textMain, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#00d9ff' }}>🔥</span> Top 10
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {tracks.slice(0, 10).map((track, index) => (
                    <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate(`/track/${track.id}`)}>
                      <div style={{ width: 20, textAlign: 'center', fontSize: 14, color: index === 0 ? '#00d9ff' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : colors.textMuted, fontWeight: 900, fontStyle: 'italic' }}>{index + 1}</div>
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
          <div style={{ background: isDark ? 'rgba(15, 15, 20, 0.95)' : '#ffffff', border: `1px solid ${colors.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 0 50px rgba(0, 217, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.textMain, letterSpacing: '-0.5px' }}>Ajouter un son</h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setUploadType('file')} style={{ flex: 1, padding: 12, background: uploadType === 'file' ? 'linear-gradient(135deg, #00d9ff, #0099ff)' : 'transparent', color: uploadType === 'file' ? '#000' : colors.textMain, border: `1px solid ${colors.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s' }}>Fichier MP3</button>
              <button onClick={() => setUploadType('link')} style={{ flex: 1, padding: 12, background: uploadType === 'link' ? 'linear-gradient(135deg, #00d9ff, #0099ff)' : 'transparent', color: uploadType === 'link' ? '#000' : colors.textMain, border: `1px solid ${colors.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s' }}>Lien / Embed</button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {uploadType === 'file' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>Fichier Audio (MP3, WAV) *</label>
                    <input type="file" accept="audio/*" onChange={handleAudioFileChange} required style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                    {audioFile && <p style={{ fontSize: 11, color: '#00d9ff', marginTop: 4, fontWeight: 600 }}>Fichier sélectionné : {audioFile.name}</p>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>Image de couverture (Optionnel)</label>
                    <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                    {coverFile && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={URL.createObjectURL(coverFile)} alt="Cover preview" style={{ width: 50, height: 50, borderRadius: 6, objectFit: 'cover', border: `1px solid ${colors.border}` }} />
                        <span style={{ fontSize: 11, color: '#00d9ff', fontWeight: 600 }}>Pochette chargée ✓</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>Lien direct MP3 (ex: Catbox) ou Lien d'achat</label>
                    <input type="url" value={uploadForm.audio_url} onChange={e => setUploadForm({...uploadForm, audio_url: e.target.value})} placeholder="https://..." style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>Code d'intégration (Beatport, Audio.com, etc.)</label>
                    <textarea value={uploadForm.embed_code} onChange={e => setUploadForm({...uploadForm, embed_code: e.target.value})} placeholder="<iframe src='...'></iframe>" rows={3} style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, fontFamily: 'monospace' }} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>Titre *</label>
                  <input type="text" value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} required style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>Artiste *</label>
                  <input type="text" value={uploadForm.artist} onChange={e => setUploadForm({...uploadForm, artist: e.target.value})} required style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>Genre</label>
                  <input type="text" value={uploadForm.genre} onChange={e => setUploadForm({...uploadForm, genre: e.target.value})} placeholder="Ex: Techno" style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>BPM</label>
                  <input type="number" value={uploadForm.bpm} onChange={e => setUploadForm({...uploadForm, bpm: e.target.value})} placeholder="128" style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>Clé</label>
                  <input type="text" value={uploadForm.song_key} onChange={e => setUploadForm({...uploadForm, song_key: e.target.value})} placeholder="Am" style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
              </div>

              <button type="submit" disabled={uploading} style={{ marginTop: 12, padding: 16, background: '#00d9ff', color: '#000', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: uploading ? 'wait' : 'pointer', transition: 'opacity 0.2s', boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)' }}>
                {uploading ? 'Traitement en cours...' : 'Ajouter le son'}
              </button>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
};