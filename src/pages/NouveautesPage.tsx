// src/pages/NouveautesPage.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnlineUsersWidget } from '../components/OnlineUsersWidget';
import { ShareButton } from '../components/ShareButton';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { detectBPM } from '../audio/bpmDetector';
import { detectKey } from '../audio/keyDetector';
import { parseBlob } from 'music-metadata';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useIsMobile } from '../hooks/useIsMobile';

const Icons = {
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  download: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  buy: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>,
};

// ✅ FONCTION INFAILLIBLE POUR FORCER LE TÉLÉCHARGEMENT
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
    console.error("Erreur lors du téléchargement:", error);
    // Fallback : ouvrir dans un nouvel onglet si le fetch échoue (CORS)
    window.open(url, '_blank');
  }
};

interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  song_key: string | null;
  camelot: string | null;
  likes_count: number;
  downloads: number;
  audio_url: string;
  duration: number;
  peaks: number[];
  cover_url: string | null;
  created_at: string;
  user_id: string | null;
  purchase_url: string | null;
}

const PREDEFINED_GENRES = [
  'Afro House', 'Amapiano', 'Ambient', 'Bass House / UK Garage',
  'Big Room / Mainstage', 'Breakbeat', 'Chillout / Downtempo',
  'Club House', 'Dance / Electro Pop', 'Deep House', 'Disco / Nu Disco',
  'Drum & Bass', 'Dubstep', 'Electro', 'Electro House', 'Electronica',
  'Funky House', 'Future House', 'Hard Techno', 'Hardcore', 'Hardstyle',
  'Hip-Hop', 'House', 'Indie Dance', 'Jackin House', 'Latin / Afro House',
  'Melodic House & Techno', 'Minimal / Deep Tech', 'Organic House / Downtempo',
  'Progressive House', 'Psytrance', 'Reggaeton', 'Tech House', 'Techno',
  'Trance', 'Trap', 'Vocal House', 'Inconnu',
];

const INPUT_STYLE: React.CSSProperties = {
  padding: '10px 14px',
  background: '#0a0a0a',
  border: '1px solid #222',
  borderRadius: '8px',
  color: '#fff',
  fontFamily: 'Inter, sans-serif',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.2s',
};

const isNew = (createdAt: string): boolean => {
  const created = new Date(createdAt).getTime();
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  return created > twentyFourHoursAgo;
};

const PEAKS_COUNT = 500;

const computePeaks = (audioBuffer: AudioBuffer): number[] => {
  const channel = audioBuffer.getChannelData(0);
  const samplesPerPeak = Math.floor(channel.length / PEAKS_COUNT);
  const peaks: number[] = [];
  for (let i = 0; i < PEAKS_COUNT; i++) {
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, channel.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(channel[j]);
      if (v > max) max = v;
    }
    peaks.push(Math.round(max * 100));
  }
  return peaks;
};

const analyzeAudioFile = async (
  file: File
): Promise<{ bpm: number; duration: number; confidence: number; peaks: number[] }> => {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const duration = audioBuffer.duration;
    const result = await detectBPM(audioBuffer);
    const peaks = computePeaks(audioBuffer);
    return { bpm: result.bpm, duration, confidence: result.confidence, peaks };
  } finally {
    await audioCtx.close();
  }
};

interface ExtractedMetadata {
  title: string | null;
  artist: string | null;
  genre: string | null;
  key: { key: string; camelot: string } | null;
  bpm: number | null;
  coverBlob: Blob | null;
}

const normalizeGenre = (rawGenre: string): string => {
  const lower = rawGenre.toLowerCase();
  const mappings: { keywords: string[]; genre: string }[] = [
    { keywords: ['melodic techno', 'melodic house & techno'], genre: 'Melodic House & Techno' },
    { keywords: ['progressive house', 'progressive'], genre: 'Progressive House' },
    { keywords: ['tech house', 'techhouse'], genre: 'Tech House' },
    { keywords: ['jackin'], genre: 'Jackin House' },
    { keywords: ['vocal house'], genre: 'Vocal House' },
    { keywords: ['funky house'], genre: 'Funky House' },
    { keywords: ['electro house'], genre: 'Electro House' },
    { keywords: ['future house'], genre: 'Future House' },
    { keywords: ['bass house', 'uk garage', 'garage'], genre: 'Bass House / UK Garage' },
    { keywords: ['deep house'], genre: 'Deep House' },
    { keywords: ['afro house'], genre: 'Afro House' },
    { keywords: ['latin', 'brazilian'], genre: 'Latin / Afro House' },
    { keywords: ['club house'], genre: 'Club House' },
    { keywords: ['organic house', 'downtempo'], genre: 'Organic House / Downtempo' },
    { keywords: ['hard techno'], genre: 'Hard Techno' },
    { keywords: ['minimal', 'deep tech'], genre: 'Minimal / Deep Tech' },
    { keywords: ['techno'], genre: 'Techno' },
    { keywords: ['psytrance', 'psy trance'], genre: 'Psytrance' },
    { keywords: ['trance'], genre: 'Trance' },
    { keywords: ['drum and bass', 'drum & bass', 'dnb', 'd&b'], genre: 'Drum & Bass' },
    { keywords: ['dubstep'], genre: 'Dubstep' },
    { keywords: ['hardstyle'], genre: 'Hardstyle' },
    { keywords: ['hardcore'], genre: 'Hardcore' },
    { keywords: ['electronica'], genre: 'Electronica' },
    { keywords: ['indie dance'], genre: 'Indie Dance' },
    { keywords: ['big room', 'mainstage'], genre: 'Big Room / Mainstage' },
    { keywords: ['electro'], genre: 'Electro' },
    { keywords: ['club / dance', 'dance / club', 'dance/electro', 'electro pop'], genre: 'Dance / Electro Pop' },
    { keywords: ['club', 'dance'], genre: 'Dance / Electro Pop' },
    { keywords: ['hip hop', 'hip-hop', 'rap'], genre: 'Hip-Hop' },
    { keywords: ['trap'], genre: 'Trap' },
    { keywords: ['reggaeton'], genre: 'Reggaeton' },
    { keywords: ['amapiano'], genre: 'Amapiano' },
    { keywords: ['breakbeat', 'breaks'], genre: 'Breakbeat' },
    { keywords: ['nu disco', 'disco'], genre: 'Disco / Nu Disco' },
    { keywords: ['funk'], genre: 'Funky House' },
    { keywords: ['chillout', 'lounge'], genre: 'Chillout / Downtempo' },
    { keywords: ['ambient'], genre: 'Ambient' },
    { keywords: ['house'], genre: 'House' },
  ];
  for (const m of mappings) {
    if (m.keywords.some((kw) => lower.includes(kw))) return m.genre;
  }
  return rawGenre.length > 30 ? rawGenre.substring(0, 30) : rawGenre;
};

function normalizeKeyFromTag(rawKey: string): { key: string; camelot: string } | null {
  if (!rawKey) return null;
  const cleaned = rawKey.trim().toUpperCase();
  const camelotMatch = cleaned.match(/^(\d{1,2})([AB])$/);
  if (camelotMatch) {
    const camelot = `${camelotMatch[1]}${camelotMatch[2]}`;
    const camelotToKey: Record<string, string> = {
      '1A': 'G#m', '1B': 'B', '2A': 'D#m', '2B': 'F#', '3A': 'A#m', '3B': 'C#',
      '4A': 'Fm', '4B': 'G#', '5A': 'Cm', '5B': 'D#', '6A': 'Gm', '6B': 'A#',
      '7A': 'Dm', '7B': 'F', '8A': 'Am', '8B': 'C', '9A': 'Em', '9B': 'G',
      '10A': 'Bm', '10B': 'D', '11A': 'F#m', '11B': 'A', '12A': 'C#m', '12B': 'E',
    };
    return { key: camelotToKey[camelot] || camelot, camelot };
  }
  const keyMatch = cleaned.match(/^([A-G][#B]?)\s*(M|MIN|MINOR|MAJ|MAJOR)?/);
  if (keyMatch) {
    const note = keyMatch[1].replace('B', 'b');
    const isMinor = keyMatch[2] === 'M' || keyMatch[2] === 'MIN' || keyMatch[2] === 'MINOR';
    const musicalKey = isMinor ? `${note}m` : note;
    const keyToCamelot: Record<string, string> = {
      'C': '8B', 'Cm': '5A', 'C#': '3B', 'C#m': '12A', 'Db': '3B', 'Dbm': '12A',
      'D': '10B', 'Dm': '7A', 'D#': '5B', 'D#m': '2A', 'Eb': '5B', 'Ebm': '2A',
      'E': '12B', 'Em': '9A', 'F': '7B', 'Fm': '4A', 'F#': '2B', 'F#m': '11A',
      'Gb': '2B', 'Gbm': '11A', 'G': '9B', 'Gm': '6A', 'G#': '4B', 'G#m': '1A',
      'Ab': '4B', 'Abm': '1A', 'A': '11B', 'Am': '8A', 'A#': '6B', 'A#m': '3A',
      'Bb': '6B', 'Bbm': '3A', 'B': '1B', 'Bm': '10A',
    };
    const camelot = keyToCamelot[musicalKey] || '?';
    return { key: musicalKey, camelot };
  }
  return null;
}

const extractMetadataFromMp3 = async (file: File): Promise<ExtractedMetadata> => {
  const result: ExtractedMetadata = { title: null, artist: null, genre: null, key: null, bpm: null, coverBlob: null };
  try {
    const metadata = await parseBlob(file);
    if (metadata.common.title) result.title = metadata.common.title.trim();
    if (metadata.common.artist) result.artist = metadata.common.artist.trim();
    if (metadata.common.genre && metadata.common.genre.length > 0) result.genre = normalizeGenre(metadata.common.genre[0].trim());
    if (metadata.common.bpm) {
      const tagBpm = Math.round(Number(metadata.common.bpm));
      if (tagBpm > 0 && tagBpm < 300) result.bpm = tagBpm;
    }
    if (metadata.common.key) result.key = normalizeKeyFromTag(metadata.common.key.trim());
    const pictures = metadata.common.picture;
    if (pictures && pictures.length > 0) {
      const pic = pictures[0];
      result.coverBlob = new Blob([pic.data as BlobPart], { type: pic.format || 'image/jpeg' });
    }
  } catch (e) {
    console.warn('Erreur extraction metadata:', e);
  }
  return result;
};

const uploadCoverToSupabase = async (blob: Blob, baseName: string): Promise<string | null> => {
  try {
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const fileName = `covers/${baseName}.${ext}`;
    const { error } = await supabase.storage.from(AUDIO_BUCKET).upload(fileName, blob, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  } catch (e) {
    return null;
  }
};

export const NouveautesPage: React.FC = () => {
  const { user, username } = useAuth(); 
  const navigate = useNavigate();
  const isMobile = useIsMobile(1024);
  const { currentTrack, isPlaying, play, stop } = usePlayer();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'likes' | 'bpm' | 'title'>('recent');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', genre: '', bpm: 0, purchase_url: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadTracks();
    if (user) loadUserLikes();
  }, [user]);

  const loadTracks = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Erreur chargement:', error);
    } else {
      const normalized = (data || []).map((t: any) => ({
        ...t,
        peaks: Array.isArray(t.peaks) ? t.peaks : [],
        cover_url: t.cover_url || null,
        user_id: t.user_id || null,
        downloads: t.downloads || 0,
        likes_count: t.likes_count || 0,
        song_key: t.song_key || null,
        camelot: t.camelot || null,
        purchase_url: t.purchase_url || null,
      }));
      setTracks(normalized);
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

  const handleLike = async (trackId: string) => {
    if (!user) { navigate('/auth'); return; }
    const isCurrentlyLiked = userLikes[trackId];
    setUserLikes((prev) => ({ ...prev, [trackId]: !isCurrentlyLiked }));
    setTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, likes_count: t.likes_count + (isCurrentlyLiked ? -1 : 1) } : t));

    try {
      if (isCurrentlyLiked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', trackId);
      } else {
        await supabase.from('likes').insert({ user_id: user.id, track_id: trackId });
      }
    } catch (err) {
      console.error('Erreur like:', err);
      setUserLikes((prev) => ({ ...prev, [trackId]: isCurrentlyLiked }));
      setTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, likes_count: t.likes_count + (isCurrentlyLiked ? 1 : -1) } : t));
    }
  };

  const genreStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tracks) {
      const g = (t.genre || 'Inconnu').trim();
      if (!g) continue;
      counts[g] = (counts[g] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0]));
  }, [tracks]);

  const top10Tracks = useMemo(() => {
    return [...tracks].sort((a, b) => b.likes_count - a.likes_count).slice(0, 10);
  }, [tracks]);

  const trendingArtists = useMemo(() => {
    const counts: Record<string, number> = {};
    tracks.forEach(t => { counts[t.artist] = (counts[t.artist] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [tracks]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus('Analyse audio...');
    try {
      let bpm = 0, detectedDuration = 0;
      let peaks: number[] = [];
      let detectedKey: string | null = null;
      let detectedCamelot: string | null = null;

      const arrayBuffer = await file.arrayBuffer();
      const metadata = await extractMetadataFromMp3(file);

      try {
        const analysis = await analyzeAudioFile(file);
        detectedDuration = analysis.duration;
        peaks = analysis.peaks;
        bpm = metadata.bpm ? metadata.bpm : analysis.bpm;
      } catch (e) {
        console.warn('Analyse audio échouée:', e);
        if (metadata.bpm) bpm = metadata.bpm;
        peaks = new Array(500).fill(0); 
      }

      setUploadStatus('Upload...');
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = Date.now() + '_' + cleanName;
      const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(fileName);

      let coverUrl: string | null = null;
      if (metadata.coverBlob) {
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        coverUrl = await uploadCoverToSupabase(metadata.coverBlob, baseName);
      }

      const finalTitle = metadata.title || file.name.replace(/\.[^/.]+$/, '');
      const finalArtist = metadata.artist || username || user?.email?.split('@')[0] || 'Anonyme';
      const finalGenre = metadata.genre || 'Inconnu';

      if (metadata.key) {
        detectedKey = metadata.key.key;
        detectedCamelot = metadata.key.camelot;
      } else {
        try {
          setUploadStatus('Détection tonalité...');
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioCtx();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
          const keyResult = await detectKey(audioBuffer);
          detectedKey = keyResult.key;
          detectedCamelot = keyResult.camelot;
          await audioCtx.close();
        } catch (e) {}
      }

      setUploadStatus('Enregistrement...');
      
      const payload = {
        title: finalTitle, 
        artist: finalArtist, 
        user_id: user?.id || null,
        genre: finalGenre, 
        bpm: bpm, 
        song_key: detectedKey, 
        camelot: detectedCamelot,
        likes_count: 0, 
        downloads: 0, 
        audio_url: String(urlData.publicUrl),
        duration: detectedDuration, 
        peaks: JSON.stringify(peaks),
        cover_url: coverUrl,
      };

      const { data: inserted, error: insertError } = await supabase.from('tracks').insert(payload).select().single();

      if (insertError) throw insertError;

      if (inserted) {
        setTracks([inserted, ...tracks]);
        setEditingId(inserted.id);
        setEditForm({ title: inserted.title, artist: inserted.artist, genre: inserted.genre, bpm: inserted.bpm, purchase_url: '' });
      }
      setUploadStatus('');
    } catch (err: any) {
      console.error('Erreur upload:', err);
      alert('Erreur upload : ' + (err.message || err));
      setUploadStatus('');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handlePlayTrack = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    play({
      id: track.id, title: track.title, artist: track.artist,
      audio_url: track.audio_url, cover_url: track.cover_url,
      user_id: track.user_id || null, duration: track.duration, peaks: track.peaks,
      bpm: track.bpm, song_key: track.song_key, genre: track.genre,
    });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const track = tracks.find((t) => t.id === id);
    if (!track) return;
    if (!window.confirm('Supprimer "' + track.title + '" ?')) return;
    if (currentTrack?.id === id) stop();
    try {
      const audioParts = track.audio_url.split('/' + AUDIO_BUCKET + '/');
      if (audioParts[1]) await supabase.storage.from(AUDIO_BUCKET).remove([audioParts[1]]);
      if (track.cover_url) {
        const coverParts = track.cover_url.split('/' + AUDIO_BUCKET + '/');
        if (coverParts[1]) await supabase.storage.from(AUDIO_BUCKET).remove([coverParts[1]]);
      }
      const { data: deleted, error } = await supabase.from('tracks').delete().eq('id', id).select();
      if (error) throw error;
      if (!deleted || deleted.length === 0) { alert('Suppression bloquée.'); loadTracks(); return; }
      setTracks((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      console.error(err);
      alert('Erreur suppression : ' + (err.message || err));
      loadTracks();
    }
  };

  const startEdit = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    setEditingId(track.id);
    setEditForm({ title: track.title, artist: track.artist, genre: track.genre, bpm: track.bpm, purchase_url: track.purchase_url || '' });
  };

  const saveEdit = async () => {
    if (editingId === null) return;
    const { error } = await supabase.from('tracks').update(editForm).eq('id', editingId);
    if (error) { alert('Erreur sauvegarde : ' + error.message); return; }
    setTracks((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...editForm } : t)));
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

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
  const paginatedTracks = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return visibleTracks.slice(start, start + ITEMS_PER_PAGE);
  }, [visibleTracks, safeCurrentPage]);

  return (
    <div style={{
      padding: isMobile ? '16px' : '32px 24px',
      fontFamily: 'Inter, sans-serif',
      color: '#fff',
      paddingBottom: isMobile ? 140 : 80,
      background: '#0a0a0a',
      minHeight: '100vh',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <style>{`
        .list-row { transition: background 0.2s ease; }
        .list-row:hover { background: #121212 !important; }
        .list-row:hover .row-actions { opacity: 1 !important; }
        .genre-link { transition: all 0.2s ease; }
        .genre-link:hover { color: #fff !important; background: #121212; }
      `}</style>

      <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', width: '100%', maxWidth: 1600, margin: '0 auto' }}>
        
        {!isMobile && (
          <aside style={{ width: 200, flexShrink: 0, position: 'sticky', top: 32 }}>
            <div style={{ padding: '0 0 16px 0' }}>
              <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', padding: '0 12px 16px', margin: 0, color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #222' }}>Genres</h3>
              
              <div onClick={() => setSelectedGenre(null)} className="genre-link" style={{ 
                padding: '10px 12px', fontSize: 13, cursor: 'pointer', marginTop: 8,
                color: selectedGenre === null ? '#00d9ff' : '#888', fontWeight: selectedGenre === null ? 600 : 400, 
                borderLeft: selectedGenre === null ? '2px solid #00d9ff' : '2px solid transparent',
                borderBottom: '1px solid #1a1a1a'
              }}>
                Tous les sons
              </div>

              <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                {genreStats.map(([genre], index) => {
                  const isActive = selectedGenre === genre;
                  return (
                    <div key={genre} onClick={() => setSelectedGenre(genre)} className="genre-link" style={{ 
                      padding: '10px 12px', fontSize: 13, cursor: 'pointer', 
                      color: isActive ? '#00d9ff' : '#888', fontWeight: isActive ? 600 : 400, 
                      borderLeft: isActive ? '2px solid #00d9ff' : '2px solid transparent',
                      borderBottom: index === genreStats.length - 1 ? 'none' : '1px solid #1a1a1a' 
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{genre}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Nouveautés</h1>
              <p style={{ color: '#666', fontSize: 14, marginTop: 8 }}>Découvrez les derniers sons partagés par la communauté.</p>
            </div>
            <button onClick={handleUploadClick} disabled={uploading} style={{ padding: '10px 20px', background: uploading ? '#222' : '#fff', color: uploading ? '#666' : '#000', border: 'none', borderRadius: 8, cursor: uploading ? 'wait' : 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.2s' }}>
              {uploading ? uploadStatus || 'Traitement...' : '+ Uploader'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
            <input type="text" placeholder="Rechercher un son, un artiste..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...INPUT_STYLE, flex: '1 1 250px' }} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ ...INPUT_STYLE, flex: '0 1 180px', cursor: 'pointer' }}>
              <option value="recent">Plus récents</option>
              <option value="likes">Plus aimés</option>
              <option value="bpm">BPM</option>
              <option value="title">Titre (A-Z)</option>
            </select>
          </div>

          {!search && !selectedGenre && top10Tracks.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#fff' }}>Recommandations</h2>
                <button style={{ background: 'transparent', border: 'none', color: '#00d9ff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                  Tout voir →
                </button>
              </div>
              
              <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '48px 48px minmax(200px, 2fr) 1fr 1fr 120px', gap: 16, padding: '12px 16px', borderBottom: '1px solid #222', fontSize: 11, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <div></div><div></div><div>Titre / Artistes</div><div>Genre</div><div>BPM / Clé</div><div style={{ textAlign: 'right' }}>Actions</div>
                </div>

                {top10Tracks.slice(0, 5).map((track) => {
                  const isThisCurrent = currentTrack?.id === track.id;
                  const isThisPlaying = isThisCurrent && isPlaying;
                  const isLiked = userLikes[track.id] || false;

                  return (
                    <div key={track.id} className="list-row" style={{ display: 'grid', gridTemplateColumns: '48px 48px minmax(200px, 2fr) 1fr 1fr 120px', gap: 16, padding: '12px 16px', alignItems: 'center', borderBottom: '1px solid #222', cursor: 'pointer' }}>
                      <button onClick={(e) => handlePlayTrack(e, track)} style={{ width: 36, height: 36, borderRadius: '50%', background: isThisPlaying ? '#00d9ff' : 'transparent', border: isThisPlaying ? 'none' : '1px solid #444', color: isThisPlaying ? '#000' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                        {isThisPlaying ? Icons.pause : Icons.play}
                      </button>
                      
                      <div onClick={() => navigate(`/track/${track.id}`)} style={{ width: 44, height: 44, borderRadius: 6, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1a1a', border: '1px solid #222', flexShrink: 0 }} />

                      <div onClick={() => navigate(`/track/${track.id}`)} style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isThisPlaying ? '#00d9ff' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{track.title}</div>
                        <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                      </div>

                      <div style={{ fontSize: 13, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.genre || '—'}</div>
                      <div style={{ fontSize: 13, color: '#aaa', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{track.bpm ? `${track.bpm} BPM` : '—'} · {track.song_key || '—'}</div>

                      <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button onClick={(e) => { e.stopPropagation(); handleLike(track.id); }} style={{ background: 'transparent', border: 'none', color: isLiked ? '#ff3366' : '#555', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
                          {isLiked ? '❤️' : '🤍'} <span style={{ fontSize: 12, color: '#666' }}>{track.likes_count}</span>
                        </button>
                        <div className="row-actions" style={{ display: 'flex', gap: 12, opacity: 0, transition: 'opacity 0.2s' }}>
                          
                          {/* ✅ BOUTON ACHETER */}
                          {track.purchase_url && (
                            <a href={track.purchase_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="Acheter" style={{ background: 'transparent', border: 'none', color: '#00d9ff', cursor: 'pointer', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                              {Icons.buy}
                            </a>
                          )}

                          {/* ✅ BOUTON TÉLÉCHARGER INFAILLIBLE */}
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              forceDownload(track.audio_url, `${track.artist} - ${track.title}.mp3`); 
                            }} 
                            title="Télécharger" 
                            style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} 
                            onMouseEnter={(e) => e.currentTarget.style.color = '#00d9ff'} 
                            onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                          >
                            {Icons.download}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px 0' }}>Toutes les sorties</h2>
            <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '48px 48px minmax(200px, 2fr) 1fr 1fr 120px', gap: 16, padding: '12px 16px', borderBottom: '1px solid #222', fontSize: 11, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <div></div><div></div><div>Titre / Artistes</div><div>Genre</div><div>BPM / Clé</div><div style={{ textAlign: 'right' }}>Actions</div>
              </div>

              {loading && <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>Chargement...</div>}

              {paginatedTracks.map((track) => {
                const isThisCurrent = currentTrack?.id === track.id;
                const isThisPlaying = isThisCurrent && isPlaying;
                const isLiked = userLikes[track.id] || false;
                const isEditing = editingId === track.id;
                const isOwner = user?.id === track.user_id;

                if (isEditing) {
                  return (
                    <div key={track.id} style={{ padding: '16px', borderBottom: '1px solid #222', display: 'flex', flexDirection: 'column', gap: 12, background: '#1a1a1a' }}>
                      <input type="text" placeholder="Titre" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={{ ...INPUT_STYLE, padding: '10px' }} />
                      <input type="text" placeholder="Artiste" value={editForm.artist} onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })} style={{ ...INPUT_STYLE, padding: '10px' }} />
                      <div style={{ display: 'flex', gap: 12 }}>
                        <select value={editForm.genre} onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })} style={{ ...INPUT_STYLE, flex: 1, cursor: 'pointer', padding: '10px' }}>
                          {PREDEFINED_GENRES.map((g) => (<option key={g} value={g}>{g}</option>))}
                        </select>
                        <input type="number" placeholder="BPM" value={editForm.bpm} onChange={(e) => setEditForm({ ...editForm, bpm: parseInt(e.target.value) || 0 })} style={{ ...INPUT_STYLE, width: 100, padding: '10px' }} />
                      </div>
                      <input 
                        type="url" 
                        placeholder="Lien d'achat (Beatport, etc.)" 
                        value={editForm.purchase_url} 
                        onChange={(e) => setEditForm({ ...editForm, purchase_url: e.target.value })} 
                        style={{ ...INPUT_STYLE, padding: '10px' }} 
                      />
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                        <button onClick={cancelEdit} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
                        <button onClick={saveEdit} style={{ padding: '8px 16px', background: '#fff', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Enregistrer</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={track.id} className="list-row" style={{ display: 'grid', gridTemplateColumns: '48px 48px minmax(200px, 2fr) 1fr 1fr 120px', gap: 16, padding: '12px 16px', alignItems: 'center', borderBottom: '1px solid #222', cursor: 'pointer' }}>
                    <button onClick={(e) => handlePlayTrack(e, track)} style={{ width: 36, height: 36, borderRadius: '50%', background: isThisPlaying ? '#00d9ff' : 'transparent', border: isThisPlaying ? 'none' : '1px solid #444', color: isThisPlaying ? '#000' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                      {isThisPlaying ? Icons.pause : Icons.play}
                    </button>
                    
                    <div onClick={() => navigate(`/track/${track.id}`)} style={{ width: 44, height: 44, borderRadius: 6, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1a1a', border: '1px solid #222', flexShrink: 0, position: 'relative' }}>
                      {isNew(track.created_at) && (
                        <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 9, padding: '2px 6px', background: '#fff', color: '#000', borderRadius: 4, fontWeight: 900, zIndex: 2 }}>NEW</span>
                      )}
                    </div>

                    <div onClick={() => navigate(`/track/${track.id}`)} style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isThisPlaying ? '#00d9ff' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{track.title}</div>
                      <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                    </div>

                    <div style={{ fontSize: 13, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.genre || '—'}</div>
                    <div style={{ fontSize: 13, color: '#aaa', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{track.bpm ? `${track.bpm} BPM` : '—'} · {track.song_key || '—'}</div>

                    <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button onClick={(e) => { e.stopPropagation(); handleLike(track.id); }} style={{ background: 'transparent', border: 'none', color: isLiked ? '#ff3366' : '#555', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
                        {isLiked ? '❤️' : '🤍'} <span style={{ fontSize: 12, color: '#666' }}>{track.likes_count}</span>
                      </button>

                      <div className="row-actions" style={{ display: 'flex', gap: 12, opacity: 0, transition: 'opacity 0.2s' }}>
                        
                        {/* ✅ BOUTON ACHETER */}
                        {track.purchase_url && (
                          <a 
                            href={track.purchase_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()} 
                            title="Acheter" 
                            style={{ background: 'transparent', border: 'none', color: '#00d9ff', cursor: 'pointer', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                          >
                            {Icons.buy}
                          </a>
                        )}

                        {/* ✅ BOUTON TÉLÉCHARGER INFAILLIBLE */}
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            forceDownload(track.audio_url, `${track.artist} - ${track.title}.mp3`); 
                          }} 
                          title="Télécharger" 
                          style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} 
                          onMouseEnter={(e) => e.currentTarget.style.color = '#00d9ff'} 
                          onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                        >
                          {Icons.download}
                        </button>

                        <div onClick={(e) => e.stopPropagation()}>
                          <ShareButton url={`${window.location.origin}/share/${track.id}`} title={`${track.title} — ${track.artist}`} text={`Écoute "${track.title}" par ${track.artist} sur DropZone DJ 🎵`} variant="icon" size="small" label="" position="bottom" />
                        </div>

                        {isOwner && (
                          <>
                            <button onClick={(e) => startEdit(e, track)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Modifier">{Icons.edit}</button>
                            <button onClick={(e) => handleDelete(e, track.id)} style={{ background: 'transparent', border: 'none', color: '#ff5c5c', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Supprimer">{Icons.trash}</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!loading && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 40 }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} style={{ background: 'transparent', border: '1px solid #222', color: safeCurrentPage === 1 ? '#444' : '#fff', padding: '8px 16px', borderRadius: 8, cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13, transition: 'all 0.2s' }}>←</button>
              <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>Page {safeCurrentPage} sur {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} style={{ background: 'transparent', border: '1px solid #222', color: safeCurrentPage === totalPages ? '#444' : '#fff', padding: '8px 16px', borderRadius: 8, cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, transition: 'all 0.2s' }}>→</button>
            </div>
          )}
        </main>

        {!isMobile && (
          <aside style={{ width: 280, flexShrink: 0, position: 'sticky', top: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', margin: '0 0 16px 0', color: '#fff', textTransform: 'uppercase' }}>Top 10</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {top10Tracks.map((track, index) => (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate(`/track/${track.id}`)}>
                    <div style={{ width: 20, textAlign: 'center', fontSize: 13, color: index < 3 ? '#00d9ff' : '#555', fontWeight: 900, fontStyle: 'italic' }}>{index + 1}</div>
                    <div style={{ width: 36, height: 36, borderRadius: 4, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1a1a', flexShrink: 0, border: '1px solid #222' }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', margin: '0 0 16px 0', color: '#fff', textTransform: 'uppercase' }}>Artistes en vue</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {trendingArtists.map((artist) => (
                  <div key={artist.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1a1a', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#00d9ff' }}>
                      {artist.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{artist.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
              <OnlineUsersWidget />
            </div>

          </aside>
        )}

      </div>
    </div>
  );
};