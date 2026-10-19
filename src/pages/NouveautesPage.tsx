// src/pages/NouveautesPage.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { CommentSection } from '../components/CommentSection';
import { OnlineUsersWidget } from '../components/OnlineUsersWidget';
import { ShareButton } from '../components/ShareButton';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { detectBPM } from '../audio/bpmDetector';
import { detectKey, getCamelotColor, ALL_KEYS } from '../audio/keyDetector';
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

const formatTime = (sec: number): string => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
};

const INPUT_STYLE: React.CSSProperties = {
  padding: '8px 10px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(0,255,255,0.3)',
  borderRadius: '6px',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%',
  colorScheme: 'dark',
};

const OPTION_STYLE: React.CSSProperties = {
  background: '#0a0c14',
  color: '#fff',
  padding: '8px',
  fontFamily: 'monospace',
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

const downsamplePeaks = (peaks: number[], targetCount: number): number[] => {
  if (!peaks || peaks.length === 0) return [];
  if (peaks.length <= targetCount) return peaks;
  const step = peaks.length / targetCount;
  const result: number[] = [];
  for (let i = 0; i < targetCount; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    let max = 0;
    for (let j = start; j < end && j < peaks.length; j++) {
      if (peaks[j] > max) max = peaks[j];
    }
    result.push(max);
  }
  return result;
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
      '1A': 'G#m', '1B': 'B', '2A': 'D#m', '2B': 'F#',
      '3A': 'A#m', '3B': 'C#', '4A': 'Fm', '4B': 'G#',
      '5A': 'Cm', '5B': 'D#', '6A': 'Gm', '6B': 'A#',
      '7A': 'Dm', '7B': 'F', '8A': 'Am', '8B': 'C',
      '9A': 'Em', '9B': 'G', '10A': 'Bm', '10B': 'D',
      '11A': 'F#m', '11B': 'A', '12A': 'C#m', '12B': 'E',
    };
    return { key: camelotToKey[camelot] || camelot, camelot };
  }

  const keyMatch = cleaned.match(/^([A-G][#B]?)\s*(M|MIN|MINOR|MAJ|MAJOR)?/);
  if (keyMatch) {
    const note = keyMatch[1].replace('B', 'b');
    const isMinor = keyMatch[2] === 'M' || keyMatch[2] === 'MIN' || keyMatch[2] === 'MINOR';
    const musicalKey = isMinor ? `${note}m` : note;

    const keyToCamelot: Record<string, string> = {
      'C': '8B', 'Cm': '5A',
      'C#': '3B', 'C#m': '12A', 'Db': '3B', 'Dbm': '12A',
      'D': '10B', 'Dm': '7A',
      'D#': '5B', 'D#m': '2A', 'Eb': '5B', 'Ebm': '2A',
      'E': '12B', 'Em': '9A',
      'F': '7B', 'Fm': '4A',
      'F#': '2B', 'F#m': '11A', 'Gb': '2B', 'Gbm': '11A',
      'G': '9B', 'Gm': '6A',
      'G#': '4B', 'G#m': '1A', 'Ab': '4B', 'Abm': '1A',
      'A': '11B', 'Am': '8A',
      'A#': '6B', 'A#m': '3A', 'Bb': '6B', 'Bbm': '3A',
      'B': '1B', 'Bm': '10A',
    };
    const camelot = keyToCamelot[musicalKey] || '?';
    return { key: musicalKey, camelot };
  }
  return null;
}

const extractMetadataFromMp3 = async (file: File): Promise<ExtractedMetadata> => {
  const result: ExtractedMetadata = {
    title: null, artist: null, genre: null, key: null, bpm: null, coverBlob: null,
  };
  try {
    const metadata = await parseBlob(file);
    if (metadata.common.title) result.title = metadata.common.title.trim();
    if (metadata.common.artist) result.artist = metadata.common.artist.trim();
    if (metadata.common.genre && metadata.common.genre.length > 0) {
      result.genre = normalizeGenre(metadata.common.genre[0].trim());
    }

    if (metadata.common.bpm) {
      const tagBpm = Math.round(Number(metadata.common.bpm));
      if (tagBpm > 0 && tagBpm < 300) {
        result.bpm = tagBpm;
      }
    }

    if (metadata.common.key) {
      const rawKey = metadata.common.key.trim();
      result.key = normalizeKeyFromTag(rawKey);
    }

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

// ═══════════════════════════════════════════════════════════
// WAVEFORM
// ═══════════════════════════════════════════════════════════
interface WaveformProps {
  peaks: number[];
  progress: number;
  onSeek?: (ratio: number) => void;
  height?: number;
  duration?: number;
}

const Waveform: React.FC<WaveformProps> = ({
  peaks, progress, onSeek, height = 50, duration = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayPeaks = useMemo(() => downsamplePeaks(peaks, 240), [peaks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    if (displayPeaks.length === 0) return;

    const midY = height / 2;
    const progressX = progress * width;
    const barWidth = width / displayPeaks.length;

    for (let i = 0; i < displayPeaks.length; i++) {
      const x = i * barWidth;
      const h = (displayPeaks[i] / 100) * (height * 0.85);
      const y = midY - h / 2;
      const isPlayed = x < progressX;

      if (isPlayed) {
        ctx.fillStyle = '#00d9ff';
      } else {
        ctx.fillStyle = hoverRatio !== null && i / displayPeaks.length <= hoverRatio
          ? 'rgba(255, 255, 255, 0.4)'
          : 'rgba(255, 255, 255, 0.22)';
      }
      ctx.fillRect(x, y, Math.max(1, barWidth - 0.5), h);
    }

    if (hoverRatio !== null && onSeek) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(hoverRatio * width - 0.5, 0, 1, height);
    }

    if (onSeek || progress > 0) {
      const cursorX = Math.max(2, Math.min(width - 2, progressX));
      const haloGrad = ctx.createRadialGradient(cursorX, midY, 0, cursorX, midY, 14);
      haloGrad.addColorStop(0, 'rgba(0, 217, 255, 0.4)');
      haloGrad.addColorStop(1, 'rgba(0, 217, 255, 0)');
      ctx.fillStyle = haloGrad;
      ctx.fillRect(cursorX - 14, 0, 28, height);

      ctx.fillStyle = '#fff';
      ctx.fillRect(cursorX - 1, 0, 2, height);

      const dotY = midY;
      const dotR = isDragging ? 8 : hoverRatio !== null ? 7 : 5;

      ctx.beginPath();
      ctx.arc(cursorX, dotY, dotR + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 217, 255, 0.3)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cursorX, dotY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#00d9ff';
      ctx.shadowBlur = 10;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cursorX, dotY, dotR * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#00d9ff';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [displayPeaks, progress, height, hoverRatio, onSeek, isDragging]);

  const getRatioFromEvent = (clientX: number): number | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const ratio = getRatioFromEvent(e.clientX);
    if (ratio === null) return;
    setIsDragging(true);
    onSeek(ratio);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const ratio = getRatioFromEvent(e.clientX);
    if (ratio === null) return;
    setHoverRatio(ratio);
    if (isDragging && onSeek) onSeek(ratio);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const touch = e.touches[0];
    const ratio = getRatioFromEvent(touch.clientX);
    if (ratio === null) return;
    setIsDragging(true);
    onSeek(ratio);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    e.preventDefault();
    const touch = e.touches[0];
    const ratio = getRatioFromEvent(touch.clientX);
    if (ratio !== null) onSeek(ratio);
  };

  const handleTouchEnd = () => setIsDragging(false);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setHoverRatio(null);
        setIsDragging(false);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: '100%',
        height,
        cursor: onSeek ? (isDragging ? 'grabbing' : 'grab') : 'default',
        position: 'relative',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 4,
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {hoverRatio !== null && duration > 0 && (
        <div style={{
          position: 'absolute',
          left: `${hoverRatio * 100}%`,
          top: -26,
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.95)',
          border: '1px solid rgba(0, 217, 255, 0.5)',
          borderRadius: 4,
          padding: '2px 7px',
          fontSize: 10,
          fontFamily: 'monospace',
          color: '#00d9ff',
          fontWeight: 700,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 5,
        }}>
          {formatTime(hoverRatio * duration)}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// BOUTON PLAY
// ═══════════════════════════════════════════════════════════
const PlayButton: React.FC<{
  isPlaying: boolean;
  isCurrent: boolean;
  onClick: () => void;
  size?: number;
}> = ({ isPlaying, isCurrent, onClick, size = 52 }) => {
  const bg = isCurrent && isPlaying
    ? 'linear-gradient(135deg, #00e5ff, #0088ff)'
    : 'linear-gradient(135deg, #00d9ff, #0088ff)';

  return (
    <button
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: bg, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: size * 0.4, color: '#000', fontWeight: 900,
        boxShadow: '0 4px 16px rgba(0, 217, 255, 0.4)',
        transition: 'all 0.15s ease',
      }}
    >
      {isCurrent && isPlaying ? '⏸' : '▶'}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════
export const NouveautesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const { currentTrack, isPlaying, currentTime, duration, play, seek, stop } = usePlayer();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [, setReplaceStatus] = useState('');

  const [bpmCandidates, setBpmCandidates] = useState<{ trackId: string; candidates: number[]; current: number } | null>(null);
  const [detectingBpm, setDetectingBpm] = useState<string | null>(null);
  const [detectingKey, setDetectingKey] = useState<string | null>(null);
  const [keyPicker, setKeyPicker] = useState<string | null>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'likes' | 'bpm' | 'title'>('recent');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', genre: '', bpm: 0 });
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

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
    if (!user) {
      navigate('/auth');
      return;
    }
    const isCurrentlyLiked = userLikes[trackId];
    setUserLikes((prev) => ({ ...prev, [trackId]: !isCurrentlyLiked }));

    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? { ...t, likes_count: t.likes_count + (isCurrentlyLiked ? -1 : 1) }
          : t
      )
    );

    try {
      if (isCurrentlyLiked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', trackId);
      } else {
        await supabase.from('likes').insert({ user_id: user.id, track_id: trackId });
      }
    } catch (err) {
      console.error('Erreur like:', err);
      setUserLikes((prev) => ({ ...prev, [trackId]: isCurrentlyLiked }));
      setTracks((prev) =>
        prev.map((t) =>
          t.id === trackId
            ? { ...t, likes_count: t.likes_count + (isCurrentlyLiked ? 1 : -1) }
            : t
        )
      );
    }
  };

  const genreStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tracks) {
      const g = (t.genre || 'Inconnu').trim();
      if (!g) continue;
      counts[g] = (counts[g] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
  }, [tracks]);

  const top10 = useMemo(() => {
    return [...tracks].sort((a, b) => b.likes_count - a.likes_count).slice(0, 10);
  }, [tracks]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus('Analyse audio en cours...');
    try {
      let bpm = 0, detectedDuration = 0;
      let peaks: number[] = [];
      let detectedKey: string | null = null;
      let detectedCamelot: string | null = null;

      const arrayBuffer = await file.arrayBuffer();

      setUploadStatus('Extraction des tags ID3...');
      const metadata = await extractMetadataFromMp3(file);

      try {
        setUploadStatus('Analyse audio en cours...');
        const analysis = await analyzeAudioFile(file);
        detectedDuration = analysis.duration;
        peaks = analysis.peaks;

        if (metadata.bpm) {
          bpm = metadata.bpm;
        } else {
          bpm = analysis.bpm;
        }
      } catch (e) {
        console.warn('Analyse audio échouée:', e);
        if (metadata.bpm) bpm = metadata.bpm;
      }

      setUploadStatus('Upload en cours...');
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
          setUploadStatus('Détection tonalité (Meyda)...');
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioCtx();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
          const keyResult = await detectKey(audioBuffer);
          detectedKey = keyResult.key;
          detectedCamelot = keyResult.camelot;
          await audioCtx.close();
        } catch (e) {
          console.warn('Détection clé échouée:', e);
        }
      }

      setUploadStatus('Enregistrement...');
      const { data: inserted, error: insertError } = await supabase.from('tracks').insert({
        title: finalTitle, artist: finalArtist, user_id: user?.id || null,
        genre: finalGenre, bpm,
        song_key: detectedKey, camelot: detectedCamelot,
        likes_count: 0, downloads: 0,
        audio_url: urlData.publicUrl, duration: detectedDuration, peaks, cover_url: coverUrl,
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

  const handleDownload = async (track: Track) => {
    if (!user) {
      if (window.confirm('Vous devez être connecté pour télécharger.\n\nSe connecter maintenant ?')) navigate('/auth');
      return;
    }
    setDownloadingId(track.id);
    try {
      const response = await fetch(track.audio_url);
      if (!response.ok) throw new Error('Impossible de récupérer le fichier');
      const blob = await response.blob();
      const safeName = track.title.replace(/[^a-zA-Z0-9._-]/g, '_');
      const artistName = track.artist.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${artistName}_-_${safeName}.mp3`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const newDownloads = (track.downloads || 0) + 1;
      await supabase.from('tracks').update({ downloads: newDownloads }).eq('id', track.id);
      setTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, downloads: newDownloads } : t)));
    } catch (err: any) {
      console.error(err);
      alert('Erreur téléchargement : ' + (err.message || err));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDetectBpm = async (track: Track) => {
    setDetectingBpm(track.id);
    try {
      const response = await fetch(track.audio_url);
      if (!response.ok) throw new Error('Impossible de charger le fichier');
      const arrayBuffer = await response.arrayBuffer();

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      } finally {
        await audioCtx.close();
      }

      const result = await detectBPM(audioBuffer);

      const uniqueCandidates = Array.from(new Set([
        result.bpm,
        ...result.candidates.slice(0, 8),
      ])).filter((b) => b >= 60 && b <= 250).slice(0, 6);

      setBpmCandidates({
        trackId: track.id,
        candidates: uniqueCandidates,
        current: track.bpm,
      });
    } catch (err: any) {
      console.error('Erreur détection BPM:', err);
      alert('Erreur analyse BPM : ' + (err.message || err));
    } finally {
      setDetectingBpm(null);
    }
  };

  const handleSelectBpm = async (trackId: string, bpm: number) => {
    try {
      const { error } = await supabase.from('tracks').update({ bpm }).eq('id', trackId);
      if (error) throw error;
      setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, bpm } : t)));
      setBpmCandidates(null);
    } catch (err: any) {
      console.error('Erreur sauvegarde BPM:', err);
      alert('Erreur : ' + (err.message || err));
    }
  };

  const handleAutoDetectKey = async (track: Track) => {
    setDetectingKey(track.id);
    try {
      const response = await fetch(track.audio_url);
      if (!response.ok) throw new Error('Impossible de charger le fichier');
      const arrayBuffer = await response.arrayBuffer();

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      } finally {
        await audioCtx.close();
      }

      const result = await detectKey(audioBuffer);

      const { error } = await supabase.from('tracks').update({
        song_key: result.key,
        camelot: result.camelot,
      }).eq('id', track.id);
      if (error) throw error;

      setTracks((prev) => prev.map((t) => t.id === track.id
        ? { ...t, song_key: result.key, camelot: result.camelot }
        : t));
      setKeyPicker(null);
    } catch (err: any) {
      console.error('Erreur détection key:', err);
      alert('Erreur analyse key : ' + (err.message || err));
    } finally {
      setDetectingKey(null);
    }
  };

  const handleSelectKey = async (trackId: string, key: string, camelot: string) => {
    try {
      const { error } = await supabase
        .from('tracks')
        .update({ song_key: key, camelot })
        .eq('id', trackId);
      if (error) throw error;

      setTracks((prev) => prev.map((t) => t.id === trackId
        ? { ...t, song_key: key, camelot }
        : t));
      setKeyPicker(null);
    } catch (err: any) {
      console.error('Erreur sauvegarde Key:', err);
      alert('Erreur : ' + (err.message || err));
    }
  };

  const handleReplaceClick = (trackId: string) => {
    setReplaceTargetId(trackId);
    replaceInputRef.current?.click();
  };

  const handleReplaceChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const targetId = replaceTargetId;
    if (!file || !targetId) return;
    const track = tracks.find((t) => t.id === targetId);
    if (!track) { setReplaceTargetId(null); event.target.value = ''; return; }

    if (!window.confirm(`Remplacer le fichier audio de "${track.title}" ?`)) {
      setReplaceTargetId(null); event.target.value = ''; return;
    }
    if (currentTrack?.id === targetId) stop();
    setReplacingId(targetId);
    setReplaceStatus('Analyse...');

    try {
      let newDuration = track.duration;
      let peaks: number[] = track.peaks;
      let bpm = track.bpm;
      let newKey = track.song_key;
      let newCamelot = track.camelot;

      const metadata = await extractMetadataFromMp3(file);

      try {
        const analysis = await analyzeAudioFile(file);
        newDuration = analysis.duration;
        peaks = analysis.peaks;
        bpm = metadata.bpm || analysis.bpm;
      } catch (e) { console.warn(e); }

      if (metadata.key) {
        newKey = metadata.key.key;
        newCamelot = metadata.key.camelot;
      }

      setReplaceStatus('Upload...');
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const newFileName = Date.now() + '_' + cleanName;
      const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(newFileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(newFileName);

      let newCoverUrl: string | null = track.cover_url;
      if (metadata.coverBlob) {
        const baseName = newFileName.replace(/\.[^/.]+$/, '');
        const uploaded = await uploadCoverToSupabase(metadata.coverBlob, baseName);
        if (uploaded) newCoverUrl = uploaded;
      }

      const newTitle = metadata.title || track.title;
      const newArtist = metadata.artist || track.artist;
      const newGenre = metadata.genre || track.genre;

      setReplaceStatus('Mise à jour...');
      const { error: updateError } = await supabase.from('tracks').update({
        audio_url: urlData.publicUrl, duration: newDuration, peaks, bpm,
        title: newTitle, artist: newArtist, genre: newGenre, cover_url: newCoverUrl,
        song_key: newKey, camelot: newCamelot,
      }).eq('id', targetId);
      if (updateError) throw updateError;

      const oldAudioParts = track.audio_url.split('/' + AUDIO_BUCKET + '/');
      if (oldAudioParts[1] && oldAudioParts[1] !== newFileName) {
        await supabase.storage.from(AUDIO_BUCKET).remove([oldAudioParts[1]]);
      }

      setTracks((prev) => prev.map((t) => t.id === targetId ? {
        ...t, audio_url: urlData.publicUrl, duration: newDuration, peaks, bpm,
        title: newTitle, artist: newArtist, genre: newGenre, cover_url: newCoverUrl,
        song_key: newKey, camelot: newCamelot,
      } : t));
      setReplaceStatus('');
    } catch (err: any) {
      console.error(err);
      alert('Erreur remplacement : ' + (err.message || err));
      setReplaceStatus('');
    } finally {
      setReplacingId(null); setReplaceTargetId(null); event.target.value = '';
    }
  };

  const handlePlayTrack = (track: Track) => {
    play({
      id: track.id, title: track.title, artist: track.artist,
      audio_url: track.audio_url, cover_url: track.cover_url,
      user_id: track.user_id, duration: track.duration, peaks: track.peaks,
    });
  };

  const handleSeekRatio = (ratio: number) => seek(ratio);

  const handleDelete = async (id: string) => {
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

  const startEdit = (track: Track) => {
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
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.genre.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case 'likes': list.sort((a, b) => b.likes_count - a.likes_count); break;
      case 'bpm': list.sort((a, b) => b.bpm - a.bpm); break;
      case 'title': list.sort((a, b) => a.title.localeCompare(b.title)); break;
      default: list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [tracks, search, sortBy, selectedGenre]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, selectedGenre]);

  const totalPages = Math.max(1, Math.ceil(visibleTracks.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTracks = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return visibleTracks.slice(start, start + ITEMS_PER_PAGE);
  }, [visibleTracks, safeCurrentPage]);

  const toggleComments = (trackId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  // ─── STYLE GLOBAL PANEL ───
  const PANEL_STYLE: React.CSSProperties = {
    background: 'rgba(15, 18, 28, 0.65)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  };

  return (
    <div style={{
      padding: isMobile ? '12px' : '24px',
      fontFamily: 'monospace',
      color: '#fff',
      paddingBottom: isMobile ? 140 : 80,
      background: '#0a0c14',
      minHeight: '100vh'
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .new-badge { animation: pulse 2s ease-in-out infinite; }
        .genre-item { transition: all 0.15s; }
        .genre-item:hover { background: rgba(0, 217, 255, 0.08) !important; color: #00d9ff !important; padding-left: 14px !important; }
        .track-card { animation: fadeIn 0.3s ease; }
        .key-btn { transition: all 0.15s ease; }
        .key-btn:hover { transform: scale(1.05); }
        select option { background: #0a0c14 !important; color: #fff !important; padding: 8px !important; }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 900, margin: 0 }}>Nouveautés <span style={{ color: '#00d9ff' }}>DJ</span></h1>
        <p style={{ color: '#888', fontSize: 12, marginTop: 6 }}>Découvrez les derniers sons partagés par la communauté.</p>
      </div>

      <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
      <input type="file" accept="audio/*" ref={replaceInputRef} onChange={handleReplaceChange} style={{ display: 'none' }} />

      <GlassCard style={{ padding: '16px', marginBottom: 20, borderStyle: 'dashed', borderColor: 'rgba(0, 217, 255, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>Partager un nouveau son</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Tags ID3 (BPM + Key) · Analyse audio · Détection auto</div>
          </div>
          <button onClick={handleUploadClick} disabled={uploading} style={{
            padding: '10px 20px', background: uploading ? '#666' : 'linear-gradient(135deg, #00d9ff, #0088ff)',
            color: '#000', border: 'none', borderRadius: '8px', cursor: uploading ? 'wait' : 'pointer',
            fontWeight: 800, fontSize: '0.85rem', fontFamily: 'monospace', boxShadow: '0 4px 16px rgba(0, 217, 255, 0.3)',
          }}>
            {uploading ? uploadStatus || 'Traitement...' : '+ UPLOADER'}
          </button>
        </div>
      </GlassCard>

      <div style={{ display: 'flex', gap: 20, flexDirection: isMobile ? 'column' : 'row' }}>
        {!isMobile && (
          <aside style={{ width: 220, flexShrink: 0 }}>
            <div style={{ ...PANEL_STYLE, padding: '16px 0', position: 'sticky', top: 20 }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', padding: '0 16px 12px', margin: 0, color: 'rgba(255,255,255,0.7)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                🎵 MUSIC CATEGORY
              </h3>
              <div onClick={() => setSelectedGenre(null)} className="genre-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: '0.78rem', cursor: 'pointer', background: selectedGenre === null ? 'rgba(0, 217, 255, 0.1)' : 'transparent', color: selectedGenre === null ? '#00d9ff' : 'rgba(255,255,255,0.7)', borderLeft: selectedGenre === null ? '2px solid #00d9ff' : '2px solid transparent', fontWeight: selectedGenre === null ? 700 : 500 }}>
                <span>Tous les sons</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{tracks.length}</span>
              </div>
              {genreStats.map(([genre, count]) => {
                const isActive = selectedGenre === genre;
                return (
                  <div key={genre} onClick={() => setSelectedGenre(genre)} className="genre-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: '0.78rem', cursor: 'pointer', background: isActive ? 'rgba(0, 217, 255, 0.1)' : 'transparent', color: isActive ? '#00d9ff' : 'rgba(255,255,255,0.7)', borderLeft: isActive ? '2px solid #00d9ff' : '2px solid transparent', fontWeight: isActive ? 700 : 500 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{genre}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', flexShrink: 0 }}>{count}</span>
                  </div>
                );
              })}
              {top10.length > 0 && (
                <>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', padding: '16px 16px 12px', margin: 0, marginTop: 10, color: 'rgba(255,255,255,0.7)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    ⭐ TOP 10 LIKES
                  </h3>
                  {top10.map((t, idx) => (
                    <div key={t.id} onClick={() => handlePlayTrack(t)} className="genre-item" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 16px', fontSize: '0.72rem', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                      <span style={{ color: '#00d9ff', fontWeight: 800, flexShrink: 0, width: 16 }}>{idx + 1}</span>
                      <div style={{ width: 28, height: 28, borderRadius: 4, flexShrink: 0, background: t.cover_url ? `url(${t.cover_url}) center/cover` : 'linear-gradient(135deg, #00d9ff, #7c5cff)', border: '1px solid rgba(0, 217, 255, 0.2)' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                    </div>
                  ))}
                </>
              )}
              <div style={{ padding: '0 16px', marginTop: 12 }}>
                <OnlineUsersWidget />
              </div>
            </div>
          </aside>
        )}

        <main style={{ flex: 1, minWidth: 0 }}>
          {/* FILTRES */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...INPUT_STYLE, flex: '1 1 200px', minWidth: 0 }} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ ...INPUT_STYLE, flex: '0 1 160px', cursor: 'pointer' }}>
              <option style={OPTION_STYLE} value="recent">Plus recents</option>
              <option style={OPTION_STYLE} value="likes">Plus aimes</option>
              <option style={OPTION_STYLE} value="bpm">BPM (eleve)</option>
              <option style={OPTION_STYLE} value="title">Titre (A-Z)</option>
            </select>
          </div>

          {/* GENRES MOBILE */}
          {isMobile && genreStats.length > 0 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 16, WebkitOverflowScrolling: 'touch' }}>
              <button onClick={() => setSelectedGenre(null)} style={{ flexShrink: 0, padding: '6px 12px', background: selectedGenre === null ? 'rgba(0, 217, 255, 0.2)' : 'rgba(255,255,255,0.03)', border: selectedGenre === null ? '1px solid #00d9ff' : '1px solid rgba(255,255,255,0.1)', borderRadius: 20, color: selectedGenre === null ? '#00d9ff' : 'rgba(255,255,255,0.7)', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace', cursor: 'pointer' }}>Tous {tracks.length}</button>
              {genreStats.map(([genre, count]) => {
                const isActive = selectedGenre === genre;
                return (
                  <button key={genre} onClick={() => setSelectedGenre(genre)} style={{ flexShrink: 0, padding: '6px 12px', background: isActive ? 'rgba(0, 217, 255, 0.2)' : 'rgba(255,255,255,0.03)', border: isActive ? '1px solid #00d9ff' : '1px solid rgba(255,255,255,0.1)', borderRadius: 20, color: isActive ? '#00d9ff' : 'rgba(255,255,255,0.7)', fontSize: '0.72rem', fontWeight: isActive ? 700 : 500, fontFamily: 'monospace', cursor: 'pointer' }}>{genre} {count}</button>
                );
              })}
            </div>
          )}

          {/* ✅ GRILLE DES TRACKS (Style Accueil) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 150 : 200}px, 1fr))`,
            gap: 16,
          }}>
            {loading && <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40 }}>Chargement...</div>}
            {!loading && visibleTracks.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40, fontSize: '0.9rem' }}>
                {tracks.length === 0 ? 'Aucun morceau.' : selectedGenre ? `Aucun morceau dans "${selectedGenre}".` : 'Aucun resultat.'}
              </div>
            )}

            {paginatedTracks.map((track) => {
              const isThisCurrent = currentTrack?.id === track.id;
              const isThisPlaying = isThisCurrent && isPlaying;
              const isEditing = editingId === track.id;
              const isReplacing = replacingId === track.id;
              const isDownloading = downloadingId === track.id;
              const fresh = isNew(track.created_at);
              const showComments = openComments.has(track.id);
              const isLiked = userLikes[track.id] || false;

              return (
                <div key={track.id} className="track-card">
                  {/* OVERLAY COMMENTAIRES */}
                  {showComments && !isEditing && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => toggleComments(track.id)}>
                      <div onClick={(e) => e.stopPropagation()} style={{ background: '#0a0c14', border: '1px solid rgba(0,217,255,0.3)', borderRadius: 12, padding: 20, width: '100%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                          <h3 style={{ margin: 0, fontSize: 16 }}>Commentaires</h3>
                          <button onClick={() => toggleComments(track.id)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20 }}>×</button>
                        </div>
                        <CommentSection trackId={track.id} />
                      </div>
                    </div>
                  )}

                  {/* EDITION INLINE (remplace la carte) */}
                  {isEditing ? (
                    <div style={{ ...PANEL_STYLE, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input type="text" placeholder="Titre" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={{ ...INPUT_STYLE, fontSize: '0.85rem' }} />
                      <input type="text" placeholder="Artiste" value={editForm.artist} onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })} style={{ ...INPUT_STYLE, fontSize: '0.85rem' }} />
                      <div style={{ display: 'flex', gap: 4 }}>
                        <select value={editForm.genre} onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })} style={{ ...INPUT_STYLE, fontSize: '0.85rem', flex: 1, cursor: 'pointer' }}>
                          <option style={OPTION_STYLE} value="Inconnu">-- Genre --</option>
                          {PREDEFINED_GENRES.map((g) => (<option key={g} value={g} style={OPTION_STYLE}>{g}</option>))}
                        </select>
                        <input type="number" placeholder="BPM" value={editForm.bpm} onChange={(e) => setEditForm({ ...editForm, bpm: parseInt(e.target.value) || 0 })} style={{ ...INPUT_STYLE, fontSize: '0.85rem', width: 60 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={cancelEdit} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem' }}>Annuler</button>
                        <button onClick={saveEdit} style={{ padding: '4px 8px', background: '#00d9ff', color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 800, fontSize: '0.7rem' }}>OK</button>
                      </div>
                    </div>
                  ) : (
                    /* CARTE NORMALE */
                    <div
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(40, 42, 55, 0.9)';
                        e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.4)';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 217, 255, 0.15)';
                        const overlay = e.currentTarget.querySelector('.play-overlay') as HTMLElement;
                        if (overlay) overlay.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isThisPlaying ? 'rgba(40, 42, 55, 0.9)' : 'rgba(30, 32, 42, 0.6)';
                        e.currentTarget.style.borderColor = isThisPlaying ? 'rgba(0, 217, 255, 0.4)' : 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = isThisPlaying ? '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 217, 255, 0.15)' : 'none';
                        const overlay = e.currentTarget.querySelector('.play-overlay') as HTMLElement;
                        if (overlay) overlay.style.opacity = isThisPlaying ? '1' : '0';
                      }}
                      style={{
                        color: '#fff',
                        background: isThisPlaying ? 'rgba(40, 42, 55, 0.9)' : 'rgba(30, 32, 42, 0.6)',
                        border: isThisPlaying ? '1px solid rgba(0, 217, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 16,
                        padding: 12,
                        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        position: 'relative',
                        boxShadow: isThisPlaying ? '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 217, 255, 0.15)' : 'none',
                      }}
                    >
                      {/* Pochette + Overlay Play */}
                      <div style={{
                        width: '100%', aspectRatio: '1', borderRadius: 10,
                        background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1c24',
                        position: 'relative', overflow: 'hidden',
                      }}>
                        {!track.cover_url && (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎵</div>
                        )}
                        
                        <div className="play-overlay" style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)',
                          opacity: isThisPlaying ? 1 : 0,
                          transition: 'opacity 0.3s ease',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <PlayButton isPlaying={isThisPlaying} isCurrent={isThisCurrent} onClick={() => handlePlayTrack(track)} size={48} />
                        </div>

                        {isReplacing && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                            <div style={{ width: 24, height: 24, border: '2px solid rgba(0, 217, 255, 0.3)', borderTop: '2px solid #00d9ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          </div>
                        )}

                        {/* Badge BPM & New */}
                        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                          {fresh && <span className="new-badge" style={{ fontSize: '0.55rem', padding: '2px 6px', background: 'linear-gradient(135deg, #00d9ff, #7c5cff)', color: '#fff', borderRadius: 4, fontWeight: 800 }}>NEW</span>}
                          <span style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, color: '#00d9ff', border: '1px solid rgba(0, 217, 255, 0.3)' }}>{track.bpm} BPM</span>
                        </div>
                      </div>

                      {/* Infos */}
                      <div style={{ padding: '0 4px' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isThisPlaying ? '#00d9ff' : '#fff' }}>
                          {track.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                          {track.artist}
                        </div>
                      </div>

                      {/* Actions (Like + Download + Menu) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <button onClick={() => handleLike(track.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: isLiked ? '#ff3366' : 'rgba(255, 255, 255, 0.4)', fontSize: 12, fontWeight: 600 }}>
                          {isLiked ? '❤️' : '🤍'} {track.likes_count}
                        </button>
                        
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.3)', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.genre}</span>
                          <button onClick={() => handleDownload(track)} disabled={isDownloading} title="Télécharger" style={{ background: 'transparent', border: 'none', color: user ? '#00d9ff' : 'rgba(255,255,255,0.3)', cursor: isDownloading ? 'wait' : 'pointer', fontSize: 14, padding: 0 }}>
                            {isDownloading ? '...' : user ? '⬇' : '🔒'}
                          </button>
                        </div>
                      </div>

                      {/* Menu d'actions caché (survol) */}
                      <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button onClick={() => toggleComments(track.id)} style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: showComments ? '#00d9ff' : '#fff', cursor: 'pointer', padding: 4, borderRadius: 4, fontSize: 10 }}>💬</button>
                        <ShareButton url={`${window.location.origin}/share/${track.id}`} title={`${track.title} — ${track.artist}`} text={`Écoute "${track.title}" par ${track.artist} sur WaveForge PRO 🎵`} variant="icon" size="small" label="" position="bottom" />
                        
                        {/* ✅ SEUL LE CRÉATEUR PEUT MODIFIER OU SUPPRIMER */}
                        {user?.id === track.user_id && (
                          <>
                            <button onClick={() => startEdit(track)} style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, borderRadius: 4, fontSize: 10 }}>✏️</button>
                            <button onClick={() => handleDelete(track.id)} style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#ff5c5c', cursor: 'pointer', padding: 4, borderRadius: 4, fontSize: 10 }}>🗑️</button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* PAGINATION MODERNE */}
          {!loading && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32, paddingBottom: 16 }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: safeCurrentPage === 1 ? '#444' : '#fff', padding: '8px 16px', borderRadius: 8, cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>← Précédent</button>
              
              {(() => {
                const pages: (number | string)[] = [];
                const maxVisible = isMobile ? 3 : 7;
                if (totalPages <= maxVisible + 2) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  if (safeCurrentPage <= 4) {
                    for (let i = 1; i <= maxVisible; i++) pages.push(i);
                    pages.push('...');
                    pages.push(totalPages);
                  } else if (safeCurrentPage >= totalPages - 3) {
                    pages.push(1);
                    pages.push('...');
                    for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    pages.push('...');
                    for (let i = safeCurrentPage - 2; i <= safeCurrentPage + 2; i++) pages.push(i);
                    pages.push('...');
                    pages.push(totalPages);
                  }
                }
                return pages.map((p, idx) => {
                  if (p === '...') return <span key={`e-${idx}`} style={{ color: '#666', fontSize: '0.75rem' }}>...</span>;
                  const isActive = p === safeCurrentPage;
                  return (
                    <button key={p} onClick={() => setCurrentPage(p as number)} style={{ background: isActive ? '#00d9ff' : 'transparent', border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)', color: isActive ? '#000' : '#888', width: 34, height: 34, borderRadius: '50%', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>{p}</button>
                  );
                });
              })()}

              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: safeCurrentPage === totalPages ? '#444' : '#fff', padding: '8px 16px', borderRadius: 8, cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>Suivant →</button>
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.5px', marginBottom: 20 }}>
              Page {safeCurrentPage} sur {totalPages} · {visibleTracks.length} morceaux
            </div>
          )}
        </main>
      </div>

      {/* POPUP BPM */}
      {bpmCandidates && (
        <div onClick={() => setBpmCandidates(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, rgba(15, 18, 28, 0.98) 0%, rgba(10, 12, 20, 0.99) 100%)', border: '1px solid rgba(0, 217, 255, 0.4)', borderRadius: 16, padding: 24, maxWidth: 480, width: '100%', boxShadow: '0 24px 70px rgba(0, 0, 0, 0.8)', fontFamily: 'monospace', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(0, 217, 255, 0.7)', fontWeight: 800, letterSpacing: '1.5px', marginBottom: 4 }}>🎯 CORRECTION BPM</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Choisis le bon tempo</div>
              </div>
              <button onClick={() => setBpmCandidates(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255, 60, 60, 0.08)', border: '1px solid rgba(255, 60, 60, 0.3)', color: '#ff5c5c', cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>BPM actuel : <span style={{ color: '#ffd43b', fontWeight: 700 }}>{bpmCandidates.current}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {bpmCandidates.candidates.map((bpm) => {
                const isCurrent = bpm === bpmCandidates.current;
                return (
                  <button key={bpm} onClick={() => handleSelectBpm(bpmCandidates.trackId, bpm)} style={{ padding: '14px 8px', background: isCurrent ? 'linear-gradient(135deg, rgba(255, 212, 59, 0.25), rgba(255, 140, 0, 0.1))' : 'rgba(255, 255, 255, 0.03)', border: isCurrent ? '1px solid rgba(255, 212, 59, 0.6)' : '1px solid rgba(0, 217, 255, 0.3)', borderRadius: 8, color: isCurrent ? '#ffd43b' : '#00d9ff', fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer' }}>
                    {bpm}
                    <div style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: 4 }}>BPM</div>
                    {isCurrent && <div style={{ fontSize: '0.55rem', marginTop: 2 }}>ACTUEL</div>}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Si aucun BPM ne correspond, clique sur le plus proche puis corrige via ✏️ Edit.</div>
          </div>
        </div>
      )}

      {/* POPUP KEY */}
      {keyPicker && (
        <div onClick={() => setKeyPicker(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, rgba(15, 18, 28, 0.98) 0%, rgba(10, 12, 20, 0.99) 100%)', border: '1px solid rgba(124, 92, 255, 0.4)', borderRadius: 16, padding: 24, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(0, 0, 0, 0.8), 0 0 40px rgba(124, 92, 255, 0.2)', fontFamily: 'monospace', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(124, 92, 255, 0.9)', fontWeight: 800, letterSpacing: '1.5px', marginBottom: 4 }}>🎼 TONALITÉ</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Choisis la tonalité du morceau</div>
              </div>
              <button onClick={() => setKeyPicker(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255, 60, 60, 0.08)', border: '1px solid rgba(255, 60, 60, 0.3)', color: '#ff5c5c', cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>

            <button onClick={() => { const track = tracks.find((t) => t.id === keyPicker); if (track) handleAutoDetectKey(track); }} disabled={detectingKey === keyPicker} style={{ width: '100%', padding: '12px', marginBottom: 20, background: 'rgba(0, 217, 255, 0.08)', border: '1px dashed rgba(0, 217, 255, 0.4)', borderRadius: 8, color: '#00d9ff', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, cursor: detectingKey === keyPicker ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {detectingKey === keyPicker ? '⏳ Analyse en cours...' : '🎼 Détection automatique (Meyda)'}
            </button>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8, letterSpacing: '1px', fontWeight: 700 }}>MAJEURS (B)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: 8 }}>
                {ALL_KEYS.filter((k) => !k.isMinor).map((k) => {
                  const color = getCamelotColor(k.camelot);
                  return (
                    <button key={k.key} className="key-btn" onClick={() => handleSelectKey(keyPicker, k.key, k.camelot)} style={{ padding: '10px 6px', background: `${color}15`, border: `1px solid ${color}60`, borderRadius: 6, color: color, fontFamily: 'monospace', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800 }}>{k.key}</div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.7, marginTop: 2 }}>{k.camelot}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8, letterSpacing: '1px', fontWeight: 700 }}>MINEURS (A)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: 8 }}>
                {ALL_KEYS.filter((k) => k.isMinor).map((k) => {
                  const color = getCamelotColor(k.camelot);
                  return (
                    <button key={k.key} className="key-btn" onClick={() => handleSelectKey(keyPicker, k.key, k.camelot)} style={{ padding: '10px 6px', background: `${color}15`, border: `1px solid ${color}60`, borderRadius: 6, color: color, fontFamily: 'monospace', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800 }}>{k.key}</div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.7, marginTop: 2 }}>{k.camelot}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
              Astuce : Serato / Mixed In Key affichent la clé exacte de tes morceaux.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};