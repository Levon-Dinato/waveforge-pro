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
  padding: '8px 12px',
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: '6px',
  color: '#fff',
  fontFamily: 'Inter, sans-serif',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.2s',
};

const isNew = (createdAt: string): boolean => {
  const created = new Date(createdAt).getTime();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return created > sevenDaysAgo;
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
  const { user } = useAuth();
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
  const [editForm, setEditForm] = useState({ title: '', artist: '', genre: '', bpm: 0 });

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

  // ✅ FONCTION DE TÉLÉCHARGEMENT CORRIGÉE (Via Fetch)
  const handleDownload = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    try {
      const response = await fetch(track.audio_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${track.artist} - ${track.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur de téléchargement :", err);
      alert("Impossible de télécharger le fichier.");
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
      const finalArtist = metadata.artist || user?.email?.split('@')[0] || 'Anonyme';
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
      const { data: inserted, error: insertError } = await supabase.from('tracks').insert({
        title: finalTitle, artist: finalArtist, user_id: user?.id || null,
        genre: finalGenre, bpm, song_key: detectedKey, camelot: detectedCamelot,
        likes_count: 0, downloads: 0, audio_url: urlData.publicUrl, duration: detectedDuration, peaks, cover_url: coverUrl,
      }).select().single();

      if (insertError) throw insertError;

      if (inserted) {
        setTracks([inserted, ...tracks]);
        setEditingId(inserted.id);
        setEditForm({ title: inserted.title, artist: inserted.artist, genre: inserted.genre, bpm: inserted.bpm });
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
    setEditForm({ title: track.title, artist: track.artist, genre: track.genre, bpm: track.bpm });
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
      padding: isMobile ? '12px' : '24px',
      fontFamily: 'Inter, sans-serif',
      color: '#fff',
      paddingBottom: isMobile ? 140 : 80,
      background: '#121212',
      minHeight: '100vh',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <style>{`
        .list-row:hover { background: rgba(255,255,255,0.03) !important; }
        .list-row:hover .row-actions { opacity: 1 !important; }
        .genre-link:hover { color: #fff !important; }
      `}</style>

      <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', width: '100%', maxWidth: 1600, margin: '0 auto' }}>
        
        {/* --- COLONNE GAUCHE (GENRES) --- */}
        {!isMobile && (
          <aside style={{ width: 200, flexShrink: 0, position: 'sticky', top: 20 }}>
            <div style={{ padding: '16px 0' }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', padding: '0 12px 12px', margin: 0, color: '#666', borderBottom: '1px solid #2a2a2a' }}>GENRES</h3>
              <div onClick={() => setSelectedGenre(null)} className="genre-link" style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: selectedGenre === null ? '#fff' : '#888', fontWeight: selectedGenre === null ? 600 : 400, borderLeft: selectedGenre === null ? '2px solid #fff' : '2px solid transparent' }}>
                Tous les sons
              </div>
              <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                {genreStats.map(([genre]) => {
                  const isActive = selectedGenre === genre;
                  return (
                    <div key={genre} onClick={() => setSelectedGenre(genre)} className="genre-link" style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: isActive ? '#fff' : '#888', fontWeight: isActive ? 600 : 400, borderLeft: isActive ? '2px solid #fff' : '2px solid transparent' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{genre}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        {/* --- COLONNE CENTRALE (CONTENU) --- */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 700, margin: 0 }}>Nouveautés</h1>
              <p style={{ color: '#888', fontSize: 13, marginTop: 6 }}>Découvrez les derniers sons partagés par la communauté.</p>
            </div>
            <button onClick={handleUploadClick} disabled={uploading} style={{ padding: '8px 16px', background: uploading ? '#333' : '#fff', color: uploading ? '#888' : '#000', border: 'none', borderRadius: 4, cursor: uploading ? 'wait' : 'pointer', fontWeight: 600, fontSize: 12 }}>
              {uploading ? uploadStatus || 'Traitement...' : 'Uploader'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...INPUT_STYLE, flex: '1 1 200px' }} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ ...INPUT_STYLE, flex: '0 1 150px', cursor: 'pointer' }}>
              <option value="recent">Plus récents</option>
              <option value="likes">Plus aimés</option>
              <option value="bpm">BPM</option>
              <option value="title">Titre (A-Z)</option>
            </select>
          </div>

          {/* ✅ SECTION RECOMMANDATIONS (LISTE) */}
          {!search && !selectedGenre && top10Tracks.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>Recommandations</h2>
                <button style={{ background: 'transparent', border: 'none', color: '#00d9ff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                  Tout voir →
                </button>
              </div>
              
              <div style={{ background: 'transparent', width: '100%' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '40px 48px minmax(200px, 2fr) 1fr 1fr 80px', 
                  gap: 16, 
                  padding: '0 12px 12px', 
                  borderBottom: '1px solid #2a2a2a', 
                  fontSize: 11, 
                  color: '#888', 
                  fontWeight: 500 
                }}>
                  <div></div>
                  <div></div>
                  <div>Titre / Artistes</div>
                  <div>Genre</div>
                  <div>BPM / Clé</div>
                  <div style={{ textAlign: 'right' }}>Actions</div>
                </div>

                {top10Tracks.slice(0, 5).map((track) => {
                  const isThisCurrent = currentTrack?.id === track.id;
                  const isThisPlaying = isThisCurrent && isPlaying;
                  const isLiked = userLikes[track.id] || false;

                  return (
                    <div 
                      key={track.id} 
                      className="list-row" 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '40px 48px minmax(200px, 2fr) 1fr 1fr 80px', 
                        gap: 16, 
                        padding: '10px 12px', 
                        alignItems: 'center', 
                        borderBottom: '1px solid #1a1a1a', 
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                        borderRadius: 6,
                      }}
                    >
                      <button 
                        onClick={(e) => handlePlayTrack(e, track)} 
                        style={{ 
                          background: 'transparent', border: 'none', 
                          color: isThisPlaying ? '#00d9ff' : '#fff', 
                          cursor: 'pointer', fontSize: 14, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}
                      >
                        {isThisPlaying ? '⏸' : '▶'}
                      </button>
                      
                      <div 
                        onClick={() => navigate(`/track/${track.id}`)} 
                        style={{ 
                          width: 44, height: 44, borderRadius: 4, 
                          background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222',
                          border: '1px solid #333',
                          flexShrink: 0
                        }} 
                      />

                      <div onClick={() => navigate(`/track/${track.id}`)} style={{ minWidth: 0 }}>
                        <div style={{ 
                          fontSize: 13, fontWeight: 600, 
                          color: isThisPlaying ? '#00d9ff' : '#fff', 
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          marginBottom: 4
                        }}>
                          {track.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {track.artist}
                        </div>
                      </div>

                      <div style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {track.genre || '—'}
                      </div>

                      <div style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' }}>
                        {track.bpm ? `${track.bpm} BPM` : '—'} · {track.song_key || '—'}
                      </div>

                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleLike(track.id); }} 
                          style={{ 
                            background: 'transparent', border: 'none', 
                            color: isLiked ? '#ff3366' : '#666',
                            cursor: 'pointer', fontSize: 14, 
                            display: 'flex', alignItems: 'center', gap: 4 
                          }}
                        >
                          {isLiked ? '❤️' : '🤍'} <span style={{ fontSize: 11, color: '#666' }}>{track.likes_count}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ✅ SECTION NOUVELLES SORTIES (LISTE) */}
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 20px 0' }}>Nouvelles sorties</h2>
            <div style={{ background: 'transparent', width: '100%' }}>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '40px 48px minmax(200px, 2fr) 1fr 1fr 120px', 
                gap: 16, 
                padding: '0 12px 12px', 
                borderBottom: '1px solid #2a2a2a', 
                fontSize: 11, 
                color: '#888', 
                fontWeight: 500 
              }}>
                <div></div>
                <div></div>
                <div>Titre / Artistes</div>
                <div>Genre</div>
                <div>BPM / Clé</div>
                <div style={{ textAlign: 'right' }}>Actions</div>
              </div>

              {loading && <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>Chargement...</div>}

              {paginatedTracks.map((track) => {
                const isThisCurrent = currentTrack?.id === track.id;
                const isThisPlaying = isThisCurrent && isPlaying;
                const isLiked = userLikes[track.id] || false;
                const isEditing = editingId === track.id;
                const isOwner = user?.id === track.user_id;

                if (isEditing) {
                  return (
                    <div key={track.id} style={{ padding: '16px 12px', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: 8, background: '#181818' }}>
                      <input type="text" placeholder="Titre" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={{ ...INPUT_STYLE, padding: '8px' }} />
                      <input type="text" placeholder="Artiste" value={editForm.artist} onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })} style={{ ...INPUT_STYLE, padding: '8px' }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select value={editForm.genre} onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })} style={{ ...INPUT_STYLE, flex: 1, cursor: 'pointer', padding: '8px' }}>
                          {PREDEFINED_GENRES.map((g) => (<option key={g} value={g}>{g}</option>))}
                        </select>
                        <input type="number" placeholder="BPM" value={editForm.bpm} onChange={(e) => setEditForm({ ...editForm, bpm: parseInt(e.target.value) || 0 })} style={{ ...INPUT_STYLE, width: 80, padding: '8px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button onClick={cancelEdit} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Annuler</button>
                        <button onClick={saveEdit} style={{ padding: '6px 12px', background: '#fff', color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Enregistrer</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={track.id} 
                    className="list-row" 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '40px 48px minmax(200px, 2fr) 1fr 1fr 120px', 
                      gap: 16, 
                      padding: '10px 12px', 
                      alignItems: 'center', 
                      borderBottom: '1px solid #1a1a1a', 
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      borderRadius: 6,
                    }}
                  >
                    <button 
                      onClick={(e) => handlePlayTrack(e, track)} 
                      style={{ 
                        background: 'transparent', border: 'none', 
                        color: isThisPlaying ? '#00d9ff' : '#fff', 
                        cursor: 'pointer', fontSize: 14, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center' 
                      }}
                    >
                      {isThisPlaying ? '⏸' : '▶'}
                    </button>
                    
                    <div 
                      onClick={() => navigate(`/track/${track.id}`)} 
                      style={{ 
                        width: 44, height: 44, borderRadius: 4, 
                        background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222',
                        border: '1px solid #333',
                        flexShrink: 0,
                        position: 'relative'
                      }} 
                    >
                      {isNew(track.created_at) && (
                        <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 8, padding: '2px 4px', background: '#fff', color: '#000', borderRadius: 2, fontWeight: 700, zIndex: 2 }}>NEW</span>
                      )}
                    </div>

                    <div onClick={() => navigate(`/track/${track.id}`)} style={{ minWidth: 0 }}>
                      <div style={{ 
                        fontSize: 13, fontWeight: 600, 
                        color: isThisPlaying ? '#00d9ff' : '#fff', 
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        marginBottom: 4
                      }}>
                        {track.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {track.artist}
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {track.genre || '—'}
                    </div>

                    <div style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' }}>
                      {track.bpm ? `${track.bpm} BPM` : '—'} · {track.song_key || '—'}
                    </div>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleLike(track.id); }} 
                        style={{ 
                          background: 'transparent', border: 'none', 
                          color: isLiked ? '#ff3366' : '#666',
                          cursor: 'pointer', fontSize: 14, 
                          display: 'flex', alignItems: 'center', gap: 4 
                        }}
                      >
                        {isLiked ? '❤️' : '🤍'} <span style={{ fontSize: 11, color: '#666' }}>{track.likes_count}</span>
                      </button>

                      <div className="row-actions" style={{ display: 'flex', gap: 8, opacity: 0, transition: 'opacity 0.2s' }}>
                        <button onClick={(e) => handleDownload(e, track)} style={{ background: 'transparent', border: 'none', color: '#00d9ff', cursor: 'pointer', fontSize: 14 }} title="Télécharger">⬇️</button>
                        
                        <div onClick={(e) => e.stopPropagation()}>
                          <ShareButton url={`${window.location.origin}/share/${track.id}`} title={`${track.title} — ${track.artist}`} text={`Écoute "${track.title}" par ${track.artist} sur DropZone DJ 🎵`} variant="icon" size="small" label="" position="bottom" />
                        </div>

                        {isOwner && (
                          <>
                            <button onClick={(e) => startEdit(e, track)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13 }} title="Modifier">✏️</button>
                            <button onClick={(e) => handleDelete(e, track.id)} style={{ background: 'transparent', border: 'none', color: '#ff5c5c', cursor: 'pointer', fontSize: 13 }} title="Supprimer">🗑️</button>
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 40 }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} style={{ background: 'transparent', border: '1px solid #333', color: safeCurrentPage === 1 ? '#444' : '#fff', padding: '6px 12px', borderRadius: 4, cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 12 }}>←</button>
              <span style={{ fontSize: 12, color: '#888' }}>{safeCurrentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} style={{ background: 'transparent', border: '1px solid #333', color: safeCurrentPage === totalPages ? '#444' : '#fff', padding: '6px 12px', borderRadius: 4, cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 12 }}>→</button>
            </div>
          )}
        </main>

        {/* --- COLONNE DROITE (TOP 10 / ARTISTES) --- */}
        {!isMobile && (
          <aside style={{ width: 280, flexShrink: 0, position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            <div style={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 8, padding: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', margin: '0 0 16px 0', color: '#fff' }}>TOP 10</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {top10Tracks.map((track, index) => (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate(`/track/${track.id}`)}>
                    <div style={{ width: 16, textAlign: 'center', fontSize: 12, color: '#666', fontWeight: 600 }}>{index + 1}</div>
                    <div style={{ width: 32, height: 32, borderRadius: 4, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 8, padding: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', margin: '0 0 16px 0', color: '#fff' }}>Artistes en vue</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {trendingArtists.map((artist) => (
                  <div key={artist.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#888' }}>
                      {artist.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{artist.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 8, padding: 16 }}>
              <OnlineUsersWidget />
            </div>

          </aside>
        )}

      </div>
    </div>
  );
};