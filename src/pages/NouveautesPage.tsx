import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { CommentSection } from '../components/CommentSection';
import { OnlineUsersWidget } from '../components/OnlineUsersWidget';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { detectBPM } from '../audio/bpmDetector';
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
  likes: number;
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

const extractMetadataFromMp3 = async (file: File): Promise<ExtractedMetadata> => {
  const result: ExtractedMetadata = { title: null, artist: null, genre: null, coverBlob: null };
  try {
    const metadata = await parseBlob(file);
    if (metadata.common.title) result.title = metadata.common.title.trim();
    if (metadata.common.artist) result.artist = metadata.common.artist.trim();
    if (metadata.common.genre && metadata.common.genre.length > 0) {
      result.genre = normalizeGenre(metadata.common.genre[0].trim());
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
// WAVEFORM DRAGGABLE
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
        <div
          style={{
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
          }}
        >
          {formatTime(hoverRatio * duration)}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// BOUTON PLAY CIRCULAIRE
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
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: size * 0.4,
        color: '#000',
        fontWeight: 900,
        boxShadow: '0 4px 16px rgba(0, 217, 255, 0.4)',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.08)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 217, 255, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 217, 255, 0.4)';
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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [, setReplaceStatus] = useState('');

  const [coverTargetId, setCoverTargetId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'likes' | 'bpm' | 'title'>('recent');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', genre: '', bpm: 0 });
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

  // ✅ PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadTracks();
  }, []);

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
      }));
      setTracks(normalized);
    }
    setLoading(false);
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
    return [...tracks].sort((a, b) => b.likes - a.likes).slice(0, 10);
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
      try {
        const analysis = await analyzeAudioFile(file);
        bpm = analysis.bpm;
        detectedDuration = analysis.duration;
        peaks = analysis.peaks;
      } catch (e) { console.warn(e); }

      setUploadStatus('Upload en cours...');
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = Date.now() + '_' + cleanName;
      const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(fileName);

      setUploadStatus('Extraction des tags ID3...');
      const metadata = await extractMetadataFromMp3(file);
      let coverUrl: string | null = null;
      if (metadata.coverBlob) {
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        coverUrl = await uploadCoverToSupabase(metadata.coverBlob, baseName);
      }

      const finalTitle = metadata.title || file.name.replace(/\.[^/.]+$/, '');
      const finalArtist = metadata.artist || user?.email?.split('@')[0] || 'Anonyme';
      const finalGenre = metadata.genre || 'Inconnu';

      setUploadStatus('Enregistrement...');
      const { data: inserted, error: insertError } = await supabase.from('tracks').insert({
        title: finalTitle, artist: finalArtist, user_id: user?.id || null,
        genre: finalGenre, bpm, likes: 0, downloads: 0,
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
      let bpm = track.bpm, newDuration = track.duration;
      let peaks: number[] = track.peaks;
      try {
        const analysis = await analyzeAudioFile(file);
        bpm = analysis.bpm; newDuration = analysis.duration; peaks = analysis.peaks;
      } catch (e) { console.warn(e); }

      setReplaceStatus('Upload...');
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const newFileName = Date.now() + '_' + cleanName;
      const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(newFileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(newFileName);

      setReplaceStatus('Tags ID3...');
      const metadata = await extractMetadataFromMp3(file);
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
      }).eq('id', targetId);
      if (updateError) throw updateError;

      const oldAudioParts = track.audio_url.split('/' + AUDIO_BUCKET + '/');
      if (oldAudioParts[1] && oldAudioParts[1] !== newFileName) {
        await supabase.storage.from(AUDIO_BUCKET).remove([oldAudioParts[1]]);
      }

      setTracks((prev) => prev.map((t) => t.id === targetId ? {
        ...t, audio_url: urlData.publicUrl, duration: newDuration, peaks, bpm,
        title: newTitle, artist: newArtist, genre: newGenre, cover_url: newCoverUrl,
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

  const handleCoverClick = (trackId: string) => {
    setCoverTargetId(trackId);
    coverInputRef.current?.click();
  };

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const targetId = coverTargetId;
    if (!file || !targetId) return;
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `covers/${Date.now()}_${targetId}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('tracks').update({ cover_url: urlData.publicUrl }).eq('id', targetId);
      if (updateError) throw updateError;
      setTracks((prev) => prev.map((t) => t.id === targetId ? { ...t, cover_url: urlData.publicUrl } : t));
    } catch (err: any) {
      console.error(err);
      alert('Erreur pochette : ' + (err.message || err));
    } finally {
      setCoverTargetId(null); event.target.value = '';
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

  const handleLike = async (id: string) => {
    const track = tracks.find((t) => t.id === id);
    if (!track) return;
    const newLikes = track.likes + 1;
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, likes: newLikes } : t)));
    await supabase.from('tracks').update({ likes: newLikes }).eq('id', id);
  };

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
      case 'likes': list.sort((a, b) => b.likes - a.likes); break;
      case 'bpm': list.sort((a, b) => b.bpm - a.bpm); break;
      case 'title': list.sort((a, b) => a.title.localeCompare(b.title)); break;
      default: list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [tracks, search, sortBy, selectedGenre]);

  // ✅ Reset page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, selectedGenre]);

  // ✅ Calcul pagination
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

  return (
    <div style={{
      padding: isMobile ? '12px' : '20px',
      fontFamily: 'monospace',
      color: '#fff',
      paddingBottom: isMobile ? 140 : 80,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .new-badge { animation: pulse 2s ease-in-out infinite; }
        .genre-item { transition: all 0.15s; }
        .genre-item:hover {
          background: rgba(0, 217, 255, 0.08) !important;
          color: #00d9ff !important;
          padding-left: 14px !important;
        }
        .track-row { animation: fadeIn 0.3s ease; }
        select option { background: #0a0c14 !important; color: #fff !important; padding: 8px !important; }
      `}</style>

      <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', marginBottom: 16 }}>Nouveautes DJ</h1>

      <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
      <input type="file" accept="image/*" ref={coverInputRef} onChange={handleCoverChange} style={{ display: 'none' }} />
      <input type="file" accept="audio/*" ref={replaceInputRef} onChange={handleReplaceChange} style={{ display: 'none' }} />

      <GlassCard style={{ padding: '14px', marginBottom: 16, borderStyle: 'dashed', borderColor: '#00d9ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>
              Partager un nouveau son
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
              Tags ID3 (titre, artiste, genre) + BPM détectés automatiquement
            </div>
          </div>
          <button onClick={handleUploadClick} disabled={uploading} style={{
            padding: '10px 18px',
            background: uploading ? '#666' : 'linear-gradient(135deg, #00d9ff, #0088ff)',
            color: '#000', border: 'none', borderRadius: '6px',
            cursor: uploading ? 'wait' : 'pointer',
            fontWeight: 800, fontSize: '0.85rem',
            fontFamily: 'monospace',
          }}>
            {uploading ? uploadStatus || 'Traitement...' : '+ UPLOADER'}
          </button>
        </div>
      </GlassCard>

      <div style={{
        display: 'flex',
        gap: 20,
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        {!isMobile && (
          <aside style={{ width: 220, flexShrink: 0 }}>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              padding: '14px 0',
              position: 'sticky',
              top: 20,
            }}>
              <h3 style={{
                fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px',
                padding: '0 14px 10px',
                margin: 0,
                color: 'rgba(255,255,255,0.7)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                🎵 MUSIC CATEGORY
              </h3>

              <div
                onClick={() => setSelectedGenre(null)}
                className="genre-item"
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '7px 14px', fontSize: '0.78rem',
                  cursor: 'pointer',
                  background: selectedGenre === null ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
                  color: selectedGenre === null ? '#00d9ff' : 'rgba(255,255,255,0.7)',
                  borderLeft: selectedGenre === null ? '2px solid #00d9ff' : '2px solid transparent',
                  fontWeight: selectedGenre === null ? 700 : 500,
                }}
              >
                <span>Tous les sons</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{tracks.length}</span>
              </div>

              {genreStats.map(([genre, count]) => {
                const isActive = selectedGenre === genre;
                return (
                  <div
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className="genre-item"
                    style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '7px 14px', fontSize: '0.78rem',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
                      color: isActive ? '#00d9ff' : 'rgba(255,255,255,0.7)',
                      borderLeft: isActive ? '2px solid #00d9ff' : '2px solid transparent',
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                      {genre}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', flexShrink: 0 }}>
                      {count}
                    </span>
                  </div>
                );
              })}

              {top10.length > 0 && (
                <>
                  <h3 style={{
                    fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px',
                    padding: '14px 14px 10px',
                    margin: 0,
                    marginTop: 10,
                    color: 'rgba(255,255,255,0.7)',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    ⭐ TOP 10 LIKES
                  </h3>
                  {top10.map((t, idx) => (
                    <div
                      key={t.id}
                      onClick={() => handlePlayTrack(t)}
                      className="genre-item"
                      style={{
                        display: 'flex', gap: 8, alignItems: 'center',
                        padding: '6px 14px', fontSize: '0.72rem',
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      <span style={{ color: '#00d9ff', fontWeight: 800, flexShrink: 0, width: 16 }}>
                        {idx + 1}
                      </span>
                      <div style={{
                        width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                        background: t.cover_url ? `url(${t.cover_url}) center/cover` : 'linear-gradient(135deg, #00d9ff, #7c5cff)',
                        border: '1px solid rgba(0, 217, 255, 0.2)',
                      }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </span>
                    </div>
                  ))}
                </>
              )}

              <div style={{ padding: '0 14px' }}>
                <OnlineUsersWidget />
              </div>
            </div>
          </aside>
        )}

        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            gap: 8,
            marginBottom: 14,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...INPUT_STYLE, flex: '1 1 200px', minWidth: 0 }}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ ...INPUT_STYLE, flex: '0 1 160px', cursor: 'pointer' }}
            >
              <option style={OPTION_STYLE} value="recent">Plus recents</option>
              <option style={OPTION_STYLE} value="likes">Plus aimes</option>
              <option style={OPTION_STYLE} value="bpm">BPM (eleve)</option>
              <option style={OPTION_STYLE} value="title">Titre (A-Z)</option>
            </select>
          </div>

          {isMobile && genreStats.length > 0 && (
            <div style={{
              display: 'flex', gap: 6, overflowX: 'auto',
              paddingBottom: 6, marginBottom: 12,
              WebkitOverflowScrolling: 'touch',
            }}>
              <button
                onClick={() => setSelectedGenre(null)}
                style={{
                  flexShrink: 0, padding: '5px 10px',
                  background: selectedGenre === null ? 'rgba(0, 217, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                  border: selectedGenre === null ? '1px solid #00d9ff' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20,
                  color: selectedGenre === null ? '#00d9ff' : 'rgba(255,255,255,0.7)',
                  fontSize: '0.72rem', fontWeight: 700,
                  fontFamily: 'monospace', cursor: 'pointer',
                }}
              >
                Tous {tracks.length}
              </button>
              {genreStats.map(([genre, count]) => {
                const isActive = selectedGenre === genre;
                return (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    style={{
                      flexShrink: 0, padding: '5px 10px',
                      background: isActive ? 'rgba(0, 217, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: isActive ? '1px solid #00d9ff' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 20,
                      color: isActive ? '#00d9ff' : 'rgba(255,255,255,0.7)',
                      fontSize: '0.72rem', fontWeight: isActive ? 700 : 500,
                      fontFamily: 'monospace', cursor: 'pointer',
                    }}
                  >
                    {genre} {count}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40 }}>
                Chargement...
              </div>
            )}

            {!loading && visibleTracks.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40, fontSize: '0.9rem' }}>
                {tracks.length === 0 ? 'Aucun morceau.' : selectedGenre ? `Aucun morceau dans "${selectedGenre}".` : 'Aucun resultat.'}
              </div>
            )}

            {paginatedTracks.map((track) => {
              const isThisCurrent = currentTrack?.id === track.id;
              const isThisPlaying = isThisCurrent && isPlaying;
              const isEditing = editingId === track.id;
              const progress = isThisCurrent && duration > 0 ? currentTime / duration : 0;
              const isReplacing = replacingId === track.id;
              const isDownloading = downloadingId === track.id;
              const fresh = isNew(track.created_at);
              const showComments = openComments.has(track.id);

              return (
                <div
                  key={track.id}
                  className="track-row"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: isThisPlaying ? '1px solid rgba(0, 217, 255, 0.5)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    padding: isMobile ? 10 : 12,
                    boxShadow: isThisPlaying ? '0 0 20px rgba(0, 217, 255, 0.15)' : 'none',
                    opacity: isReplacing ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input type="text" placeholder="Titre" value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        style={{ ...INPUT_STYLE, fontSize: '0.85rem' }} />
                      <input type="text" placeholder="Artiste" value={editForm.artist}
                        onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })}
                        style={{ ...INPUT_STYLE, fontSize: '0.85rem' }} />
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <select value={editForm.genre}
                          onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                          style={{ ...INPUT_STYLE, fontSize: '0.85rem', flex: '1 1 200px', cursor: 'pointer' }}>
                          <option style={OPTION_STYLE} value="Inconnu">-- Genre --</option>
                          {PREDEFINED_GENRES.map((g) => (
                            <option key={g} value={g} style={OPTION_STYLE}>{g}</option>
                          ))}
                        </select>
                        <input type="number" placeholder="BPM" value={editForm.bpm}
                          onChange={(e) => setEditForm({ ...editForm, bpm: parseInt(e.target.value) || 0 })}
                          style={{ ...INPUT_STYLE, fontSize: '0.85rem', flex: '0 0 90px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={cancelEdit} style={{
                          padding: '6px 14px', background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
                          borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem',
                        }}>Annuler</button>
                        <button onClick={saveEdit} style={{
                          padding: '6px 14px', background: '#00d9ff', color: '#000',
                          border: 'none', borderRadius: 4, cursor: 'pointer',
                          fontWeight: 800, fontSize: '0.78rem',
                        }}>Enregistrer</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      gap: 12,
                      flexDirection: isMobile ? 'column' : 'row',
                    }}>
                      <div
                        onClick={() => !isReplacing && handleCoverClick(track.id)}
                        title="Cliquez pour changer la pochette"
                        style={{
                          width: isMobile ? '100%' : 120,
                          height: isMobile ? 140 : 120,
                          flexShrink: 0,
                          borderRadius: 6,
                          background: track.cover_url
                            ? `url(${track.cover_url}) center/cover`
                            : 'linear-gradient(135deg, rgba(0,217,255,0.2), rgba(124,92,255,0.15))',
                          border: '1px solid rgba(0, 217, 255, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isReplacing ? 'wait' : 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {!track.cover_url && <span style={{ fontSize: 32, opacity: 0.5 }}>🎵</span>}
                        {isReplacing && (
                          <div style={{
                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
                          }}>
                            <div style={{
                              width: 24, height: 24,
                              border: '2px solid rgba(0, 217, 255, 0.3)',
                              borderTop: '2px solid #00d9ff',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                            }} />
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {fresh && (
                                <span className="new-badge" style={{
                                  fontSize: '0.55rem', padding: '1px 5px',
                                  background: 'linear-gradient(135deg, #00d9ff, #7c5cff)',
                                  color: '#fff', borderRadius: 3,
                                  fontWeight: 800, letterSpacing: '0.5px',
                                }}>NEW</span>
                              )}
                              <h3 style={{
                                margin: 0, fontSize: isMobile ? '0.9rem' : '0.95rem',
                                fontWeight: 700, lineHeight: 1.3,
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                <span style={{ color: '#fff' }}>{track.title}</span>
                                <span style={{ color: 'rgba(255,255,255,0.4)' }}> - </span>
                                {track.user_id ? (
                                  <Link to={`/profil/${track.user_id}`} style={{
                                    color: '#00d9ff', textDecoration: 'none',
                                  }}>{track.artist}</Link>
                                ) : (
                                  <span style={{ color: '#00d9ff' }}>{track.artist}</span>
                                )}
                              </h3>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button
                              onClick={() => handleLike(track.id)}
                              title="Like"
                              style={{
                                background: 'transparent', border: 'none',
                                color: track.likes > 0 ? '#ff5c5c' : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer', fontSize: '1rem',
                                padding: 4,
                              }}
                            >
                              {track.likes > 0 ? '♥' : '♡'}
                            </button>
                            <button
                              onClick={() => toggleComments(track.id)}
                              style={{
                                background: 'transparent', border: 'none',
                                color: showComments ? '#00d9ff' : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer', fontSize: '0.9rem',
                                padding: 4,
                              }}
                              title="Commenter"
                            >
                              💬
                            </button>
                            <button
                              onClick={() => startEdit(track)}
                              disabled={isReplacing}
                              style={{
                                background: 'transparent', border: 'none',
                                color: 'rgba(255,255,255,0.4)',
                                cursor: 'pointer', fontSize: '0.85rem',
                                padding: 4,
                              }}
                              title="Modifier"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleReplaceClick(track.id)}
                              disabled={isReplacing}
                              style={{
                                background: 'transparent', border: 'none',
                                color: '#00d9ff', cursor: 'pointer', fontSize: '0.85rem',
                                padding: 4,
                              }}
                              title="Remplacer"
                            >
                              {isReplacing ? '...' : '🔄'}
                            </button>
                            <button
                              onClick={() => handleDelete(track.id)}
                              disabled={isReplacing}
                              style={{
                                background: 'transparent', border: 'none',
                                color: 'rgba(255, 100, 100, 0.6)',
                                cursor: 'pointer', fontSize: '0.85rem',
                                padding: 4,
                              }}
                              title="Supprimer"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <PlayButton
                            isPlaying={isThisPlaying}
                            isCurrent={isThisCurrent}
                            onClick={() => handlePlayTrack(track)}
                            size={isMobile ? 42 : 52}
                          />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                                {isThisCurrent ? formatTime(currentTime) : '0:00'}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                                {formatTime(track.duration)}
                              </span>
                            </div>
                            <Waveform
                              peaks={track.peaks}
                              progress={progress}
                              onSeek={isThisCurrent ? handleSeekRatio : undefined}
                              height={isMobile ? 32 : 42}
                              duration={track.duration}
                            />
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}>
                          <button
                            onClick={() => handleDownload(track)}
                            disabled={isDownloading}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '7px 14px',
                              background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
                              color: '#000',
                              border: 'none',
                              borderRadius: 4,
                              cursor: isDownloading ? 'wait' : 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              fontFamily: 'monospace',
                              flexShrink: 0,
                              boxShadow: '0 2px 8px rgba(0, 217, 255, 0.3)',
                            }}
                          >
                            {isDownloading ? '...' : user ? '⬇ Download' : '🔒 Download'}
                          </button>

                          <div style={{
                            display: 'flex',
                            gap: 8,
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.55)',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                          }}>
                            <span style={{
                              display: 'flex', alignItems: 'center', gap: 3,
                              padding: '2px 6px',
                              background: 'rgba(0, 217, 255, 0.08)',
                              borderRadius: 3,
                              color: '#00d9ff',
                            }}>
                              🎵 {track.genre}
                            </span>
                            <span>⚡ {track.bpm} BPM</span>
                            <span>⬇ {track.downloads}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {showComments && !isEditing && (
                    <div style={{ marginTop: 10 }}>
                      <CommentSection trackId={track.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ✅ PAGINATION */}
          {!loading && totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
              marginTop: 20,
              paddingTop: 20,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  color: safeCurrentPage === 1 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  opacity: safeCurrentPage === 1 ? 0.4 : 1,
                }}
                onMouseEnter={(e) => {
                  if (safeCurrentPage !== 1) {
                    e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                ← Précédent
              </button>

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
                  if (p === '...') {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        style={{
                          padding: '8px 6px',
                          color: 'rgba(255,255,255,0.3)',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                        }}
                      >
                        ...
                      </span>
                    );
                  }

                  const isActive = p === safeCurrentPage;
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      style={{
                        minWidth: 36,
                        padding: '8px 10px',
                        background: isActive
                          ? 'linear-gradient(135deg, #00d9ff, #0088ff)'
                          : 'rgba(255,255,255,0.03)',
                        border: isActive
                          ? '1px solid #00d9ff'
                          : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        color: isActive ? '#000' : 'rgba(255,255,255,0.7)',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        fontWeight: isActive ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: isActive ? '0 0 12px rgba(0, 217, 255, 0.4)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.4)';
                          e.currentTarget.style.color = '#00d9ff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                        }
                      }}
                    >
                      {p}
                    </button>
                  );
                });
              })()}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  color: safeCurrentPage === totalPages ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  opacity: safeCurrentPage === totalPages ? 0.4 : 1,
                }}
                onMouseEnter={(e) => {
                  if (safeCurrentPage !== totalPages) {
                    e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                Suivant →
              </button>
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div style={{
              textAlign: 'center',
              marginTop: 12,
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.4)',
              fontFamily: 'monospace',
              letterSpacing: '0.5px',
            }}>
              Page {safeCurrentPage} sur {totalPages} · {visibleTracks.length} morceaux
            </div>
          )}
        </main>
      </div>
    </div>
  );
};