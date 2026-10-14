import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { CommentSection } from '../components/CommentSection';
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
  'Techno', 'Melodic Techno', 'Tech House', 'House', 'Deep House',
  'Afro House', 'Progressive', 'Minimal', 'Trance', 'Psytrance',
  'Hardstyle', 'Hardcore', 'Drum & Bass', 'Dubstep', 'Bass House',
  'Electro', 'Disco', 'Funk', 'Hip-Hop', 'Trap', 'Reggaeton',
  'Ambient', 'Chillout', 'Breakbeat', 'Inconnu',
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
    { keywords: ['melodic techno'], genre: 'Melodic Techno' },
    { keywords: ['tech house', 'techhouse'], genre: 'Tech House' },
    { keywords: ['deep house'], genre: 'Deep House' },
    { keywords: ['afro house', 'afrohouse'], genre: 'Afro House' },
    { keywords: ['bass house'], genre: 'Bass House' },
    { keywords: ['hardstyle'], genre: 'Hardstyle' },
    { keywords: ['hardcore', 'hard core'], genre: 'Hardcore' },
    { keywords: ['drum and bass', 'drum & bass', 'dnb', 'd&b'], genre: 'Drum & Bass' },
    { keywords: ['dubstep'], genre: 'Dubstep' },
    { keywords: ['psytrance', 'psy trance'], genre: 'Psytrance' },
    { keywords: ['trance'], genre: 'Trance' },
    { keywords: ['progressive'], genre: 'Progressive' },
    { keywords: ['minimal'], genre: 'Minimal' },
    { keywords: ['techno'], genre: 'Techno' },
    { keywords: ['electro'], genre: 'Electro' },
    { keywords: ['reggaeton'], genre: 'Reggaeton' },
    { keywords: ['hip hop', 'hip-hop', 'hiphop', 'rap'], genre: 'Hip-Hop' },
    { keywords: ['trap'], genre: 'Trap' },
    { keywords: ['breakbeat', 'break beat'], genre: 'Breakbeat' },
    { keywords: ['ambient'], genre: 'Ambient' },
    { keywords: ['chillout', 'chill out', 'lounge'], genre: 'Chillout' },
    { keywords: ['disco'], genre: 'Disco' },
    { keywords: ['funk'], genre: 'Funk' },
    { keywords: ['dance', 'club'], genre: 'House' },
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
      const rawGenre = metadata.common.genre[0].trim();
      result.genre = normalizeGenre(rawGenre);
    }
    const pictures = metadata.common.picture;
    if (pictures && pictures.length > 0) {
      const pic = pictures[0];
      result.coverBlob = new Blob([pic.data as BlobPart], {
        type: pic.format || 'image/jpeg',
      });
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

interface WaveformProps {
  peaks: number[];
  progress: number;
  onSeek?: (ratio: number) => void;
  height?: number;
  duration?: number;
  compact?: boolean;
}

const Waveform: React.FC<WaveformProps> = ({
  peaks, progress, onSeek, height = 56, duration = 0, compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);

  const displayPeaks = useMemo(
    () => downsamplePeaks(peaks, compact ? 100 : 180),
    [peaks, compact]
  );

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
      const h = (displayPeaks[i] / 100) * (height * 0.42);
      const isPlayed = x < progressX;
      ctx.fillStyle = isPlayed ? 'rgba(0, 217, 255, 0.10)' : 'rgba(0, 217, 255, 0.04)';
      ctx.fillRect(x, midY + 1, Math.max(1, barWidth - 0.5), Math.min(h * 0.4, 5));
    }

    for (let i = 0; i < displayPeaks.length; i++) {
      const x = i * barWidth;
      const h = (displayPeaks[i] / 100) * (height * 0.42);
      const y = midY - h;
      const isPlayed = x < progressX;
      const isHovered = hoverRatio !== null && i / displayPeaks.length <= hoverRatio;

      const grad = ctx.createLinearGradient(x, y, x, midY);
      if (isPlayed) {
        grad.addColorStop(0, '#00e5ff');
        grad.addColorStop(0.5, '#00c4ff');
        grad.addColorStop(1, '#0088ff');
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0, 217, 255, 0.6)';
        ctx.shadowBlur = h > height * 0.3 ? 8 : 5;
      } else if (isHovered) {
        grad.addColorStop(0, 'rgba(0, 217, 255, 0.75)');
        grad.addColorStop(1, 'rgba(0, 136, 255, 0.4)');
        ctx.fillStyle = grad;
        ctx.shadowBlur = 0;
      } else {
        grad.addColorStop(0, 'rgba(120, 180, 220, 0.35)');
        grad.addColorStop(1, 'rgba(80, 130, 180, 0.18)');
        ctx.fillStyle = grad;
        ctx.shadowBlur = 0;
      }
      ctx.fillRect(x, y, Math.max(1, barWidth - 0.6), h);
      ctx.fillRect(x, midY, Math.max(1, barWidth - 0.6), h);
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(0, 217, 255, 0.15)';
    ctx.fillRect(0, midY - 0.5, width, 1);

    if (progress > 0 && progress < 1) {
      const haloGrad = ctx.createLinearGradient(progressX - 8, 0, progressX + 8, 0);
      haloGrad.addColorStop(0, 'rgba(0, 217, 255, 0)');
      haloGrad.addColorStop(0.5, 'rgba(0, 217, 255, 0.15)');
      haloGrad.addColorStop(1, 'rgba(0, 217, 255, 0)');
      ctx.fillStyle = haloGrad;
      ctx.fillRect(progressX - 8, 0, 16, height);

      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#00d9ff';
      ctx.shadowBlur = 12;
      ctx.fillRect(progressX - 1, 0, 2, height);

      ctx.beginPath();
      ctx.arc(progressX, 4, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 14;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(progressX - 3, height - 1);
      ctx.lineTo(progressX + 3, height - 1);
      ctx.lineTo(progressX, height - 5);
      ctx.closePath();
      ctx.fillStyle = '#00d9ff';
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    if (hoverRatio !== null && onSeek) {
      const hoverX = hoverRatio * width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(hoverX - 0.5, 0, 1, height);
    }
  }, [displayPeaks, progress, height, hoverRatio, onSeek]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHoverRatio(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverRatio(null)}
      style={{
        width: '100%',
        height,
        cursor: onSeek ? 'pointer' : 'default',
        position: 'relative',
        borderRadius: 8,
        background: 'linear-gradient(180deg, rgba(0, 217, 255, 0.04) 0%, rgba(0, 0, 0, 0.15) 50%, rgba(0, 217, 255, 0.03) 100%)',
        padding: '2px 0',
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {hoverRatio !== null && duration > 0 && !compact && (
        <div
          style={{
            position: 'absolute',
            left: `${hoverRatio * 100}%`,
            top: -24,
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

interface IconButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
  color?: string;
  children: React.ReactNode;
  size?: 'normal' | 'small';
}

const IconButton: React.FC<IconButtonProps> = ({
  onClick, disabled, title, active, color = '#fff', children, size = 'normal',
}) => {
  const padding = size === 'small' ? '4px 8px' : '5px 10px';
  const fontSize = size === 'small' ? '0.75rem' : '0.8rem';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: active ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
        border: active ? '1px solid #00d9ff' : `1px solid ${color}44`,
        color: active ? '#00d9ff' : color,
        padding,
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize,
        fontFamily: 'monospace',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
};

export const NouveautesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const { currentTrack, isPlaying, currentTime, duration, volume, play, seek, setVolume, stop } = usePlayer();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replaceStatus, setReplaceStatus] = useState('');

  const [coverTargetId, setCoverTargetId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'likes' | 'bpm' | 'title'>('recent');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', genre: '', bpm: 0 });
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

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
      setReplaceTargetId(null);
      event.target.value = '';
      return;
    }
    if (currentTrack?.id === targetId) stop();
    setReplacingId(targetId);
    setReplaceStatus('Analyse audio...');

    try {
      let bpm = track.bpm, newDuration = track.duration;
      let peaks: number[] = track.peaks;
      try {
        const analysis = await analyzeAudioFile(file);
        bpm = analysis.bpm;
        newDuration = analysis.duration;
        peaks = analysis.peaks;
      } catch (e) { console.warn(e); }

      setReplaceStatus('Upload en cours...');
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const newFileName = Date.now() + '_' + cleanName;
      const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(newFileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(newFileName);

      setReplaceStatus('Extraction des tags ID3...');
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
      setReplacingId(null);
      setReplaceTargetId(null);
      event.target.value = '';
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
      setCoverTargetId(null);
      event.target.value = '';
    }
  };

  const handlePlayTrack = (track: Track) => {
    play({
      id: track.id,
      title: track.title,
      artist: track.artist,
      audio_url: track.audio_url,
      cover_url: track.cover_url,
      user_id: track.user_id,
      duration: track.duration,
      peaks: track.peaks,
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

  const toggleComments = (trackId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const containerPadding = isMobile ? '12px' : '20px';
  const titleSize = isMobile ? '1.5rem' : '2rem';
  const cardPadding = isMobile ? '12px' : '15px';
  const coverSize = isMobile ? 56 : 70;

  return (
    <div style={{ padding: containerPadding, fontFamily: 'monospace', color: '#fff', paddingBottom: isMobile ? 140 : 20 }}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .track-card { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
        .new-badge { animation: pulse 2s ease-in-out infinite; }
        .genre-tab:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 217, 255, 0.25); }
        select option { background: #0a0c14 !important; color: #fff !important; padding: 8px !important; }
      `}</style>

      <h1 style={{ fontSize: titleSize, marginBottom: isMobile ? 14 : 20 }}>Nouveautes DJ</h1>

      <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
      <input type="file" accept="image/*" ref={coverInputRef} onChange={handleCoverChange} style={{ display: 'none' }} />
      <input type="file" accept="audio/*" ref={replaceInputRef} onChange={handleReplaceChange} style={{ display: 'none' }} />

      <GlassCard style={{
        padding: isMobile ? '14px' : '20px',
        marginBottom: isMobile ? 14 : 20,
        borderStyle: 'dashed',
        borderColor: '#00d9ff',
      }}>
        <h2 style={{ fontSize: isMobile ? '1rem' : '1.2rem', marginBottom: 8 }}>
          Partager un nouveau son
        </h2>
        {!isMobile && (
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '15px' }}>
            Titre, artiste, genre, BPM, duree et pochette extraits des tags ID3 automatiquement.
          </p>
        )}
        <button onClick={handleUploadClick} disabled={uploading} style={{
          padding: isMobile ? '10px 14px' : '8px 16px',
          background: uploading ? '#666' : '#00d9ff', color: '#000',
          border: 'none', borderRadius: '6px',
          cursor: uploading ? 'wait' : 'pointer',
          fontWeight: 'bold',
          fontSize: isMobile ? '0.85rem' : '0.9rem',
          width: isMobile ? '100%' : 'auto',
        }}>
          {uploading ? uploadStatus || 'Traitement...' : '+ Uploader un morceau'}
        </button>
      </GlassCard>

      {!loading && genreStats.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          paddingBottom: 8, marginBottom: 12,
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch',
        }}>
          <button onClick={() => setSelectedGenre(null)} className="genre-tab" style={{
            flexShrink: 0, padding: isMobile ? '6px 12px' : '8px 14px',
            background: selectedGenre === null ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.25), rgba(0, 136, 255, 0.1))' : 'rgba(255, 255, 255, 0.03)',
            border: selectedGenre === null ? '1px solid rgba(0, 217, 255, 0.7)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 20, color: selectedGenre === null ? '#00d9ff' : 'rgba(255,255,255,0.75)',
            fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: selectedGenre === null ? 800 : 600,
            cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: selectedGenre === null ? '0 0 16px rgba(0, 217, 255, 0.35)' : 'none',
          }}>
            <span>Tout</span>
            <span style={{
              fontSize: '0.7rem', padding: '1px 7px', borderRadius: 10,
              background: selectedGenre === null ? 'rgba(0, 217, 255, 0.25)' : 'rgba(255,255,255,0.08)',
              color: selectedGenre === null ? '#00d9ff' : 'rgba(255,255,255,0.5)', fontWeight: 700,
            }}>{tracks.length}</span>
          </button>

          {genreStats.map(([genre, count]) => {
            const isActive = selectedGenre === genre;
            return (
              <button key={genre} onClick={() => setSelectedGenre(genre)} className="genre-tab" style={{
                flexShrink: 0, padding: isMobile ? '6px 12px' : '8px 14px',
                background: isActive ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.25), rgba(0, 136, 255, 0.1))' : 'rgba(255, 255, 255, 0.03)',
                border: isActive ? '1px solid rgba(0, 217, 255, 0.7)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 20, color: isActive ? '#00d9ff' : 'rgba(255,255,255,0.75)',
                fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: isActive ? 800 : 600,
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: isActive ? '0 0 16px rgba(0, 217, 255, 0.35)' : 'none',
              }}>
                <span>{genre}</span>
                <span style={{
                  fontSize: '0.7rem', padding: '1px 7px', borderRadius: 10,
                  background: isActive ? 'rgba(0, 217, 255, 0.25)' : 'rgba(255,255,255,0.08)',
                  color: isActive ? '#00d9ff' : 'rgba(255,255,255,0.5)', fontWeight: 700,
                }}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <GlassCard style={{ padding: isMobile ? '12px' : '15px', marginBottom: 14 }}>
        <div style={{
          display: 'flex',
          gap: isMobile ? 8 : 10,
          flexDirection: isMobile ? 'column' : 'row',
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          alignItems: isMobile ? 'stretch' : 'center',
        }}>
          <input type="text" placeholder="Rechercher..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ ...INPUT_STYLE, flex: isMobile ? 'unset' : '2 1 200px' }} />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
            style={{ ...INPUT_STYLE, flex: isMobile ? 'unset' : '1 1 160px', cursor: 'pointer' }}>
            <option style={OPTION_STYLE} value="recent">Plus recents</option>
            <option style={OPTION_STYLE} value="likes">Plus aimes</option>
            <option style={OPTION_STYLE} value="bpm">BPM (eleve)</option>
            <option style={OPTION_STYLE} value="title">Titre (A-Z)</option>
          </select>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            flex: isMobile ? 'unset' : '1 1 150px',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Vol</span>
            <input type="range" min="0" max="1" step="0.01" value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#00d9ff' }} />
          </div>
        </div>
      </GlassCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 15 }}>
        {loading && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '20px' }}>Chargement...</div>}

        {!loading && visibleTracks.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '40px', fontSize: '0.9rem' }}>
            {tracks.length === 0 ? 'Aucun morceau pour le moment.' : selectedGenre ? `Aucun morceau dans le genre "${selectedGenre}".` : 'Aucun resultat.'}
          </div>
        )}

        {visibleTracks.map((track, index) => {
          const isThisCurrent = currentTrack?.id === track.id;
          const isThisPlaying = isThisCurrent && isPlaying;
          const isEditing = editingId === track.id;
          const progress = isThisCurrent && duration > 0 ? currentTime / duration : 0;
          const isReplacing = replacingId === track.id;
          const isDownloading = downloadingId === track.id;
          const fresh = isNew(track.created_at);
          const showComments = openComments.has(track.id);

          return (
            <GlassCard key={track.id} className="track-card" style={{
              padding: cardPadding,
              borderColor: isThisPlaying ? '#00d9ff' : undefined,
              boxShadow: isThisPlaying ? '0 0 20px rgba(0, 217, 255, 0.3)' : undefined,
              animationDelay: `${Math.min(index * 40, 400)}ms`,
              opacity: isReplacing ? 0.6 : 1, transition: 'opacity 0.2s',
            }}>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input type="text" placeholder="Titre" value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={INPUT_STYLE} />
                  <input type="text" placeholder="Artiste" value={editForm.artist}
                    onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })} style={INPUT_STYLE} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select value={editForm.genre}
                      onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                      style={{ ...INPUT_STYLE, flex: '1 1 140px', cursor: 'pointer' }}>
                      <option style={OPTION_STYLE} value="Inconnu">-- Genre --</option>
                      {PREDEFINED_GENRES.map((g) => (
                        <option key={g} value={g} style={OPTION_STYLE}>{g}</option>
                      ))}
                    </select>
                    <input type="number" placeholder="BPM" value={editForm.bpm}
                      onChange={(e) => setEditForm({ ...editForm, bpm: parseInt(e.target.value) || 0 })}
                      style={{ ...INPUT_STYLE, flex: '0 0 90px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={cancelEdit} style={{
                      padding: '8px 14px', background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
                      borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace',
                    }}>Annuler</button>
                    <button onClick={saveEdit} style={{
                      padding: '8px 14px', background: '#00d9ff', color: '#000',
                      border: 'none', borderRadius: '6px', cursor: 'pointer',
                      fontWeight: 'bold', fontFamily: 'monospace',
                    }}>Enregistrer</button>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? 10 : 14,
                  alignItems: 'flex-start',
                }}>
                  <div style={{
                    display: 'flex',
                    gap: isMobile ? 10 : 14,
                    width: '100%',
                    alignItems: 'flex-start',
                  }}>
                    <div onClick={() => !isReplacing && handleCoverClick(track.id)}
                      title="Cliquez pour changer la pochette"
                      style={{
                        width: coverSize, height: coverSize, flexShrink: 0, borderRadius: 8,
                        background: track.cover_url
                          ? `url(${track.cover_url}) center/cover`
                          : 'linear-gradient(135deg, rgba(0,217,255,0.2), rgba(124,92,255,0.15))',
                        border: '1px solid rgba(0, 217, 255, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: isReplacing ? 'wait' : 'pointer',
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      {!track.cover_url && <span style={{ fontSize: 22, opacity: 0.6 }}>🎵</span>}
                      {isReplacing && (
                        <div style={{
                          position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.75)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
                        }}>
                          <div style={{
                            width: 20, height: 20, border: '2px solid rgba(0, 217, 255, 0.3)',
                            borderTop: '2px solid #00d9ff', borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                          }} />
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        marginBottom: 4, flexWrap: 'wrap',
                      }}>
                        {fresh && (
                          <span className="new-badge" style={{
                            fontSize: '0.55rem', padding: '2px 5px',
                            background: 'linear-gradient(135deg, #ff5c5c, #ff8c00)',
                            color: '#fff', borderRadius: 4, fontWeight: 800,
                            letterSpacing: '0.5px', flexShrink: 0,
                          }}>NOUVEAU</span>
                        )}
                        <h3 style={{
                          margin: 0, fontSize: isMobile ? '0.95rem' : '1.05rem',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: isMobile ? 'normal' : 'nowrap',
                          lineHeight: 1.3, flex: 1, minWidth: 0,
                        }}>
                          <span style={{ color: '#fff' }}>{track.title}</span>
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}> - </span>
                          {track.user_id ? (
                            <Link to={`/profil/${track.user_id}`} style={{
                              color: '#00d9ff', textDecoration: 'none',
                              borderBottom: '1px dotted rgba(0, 217, 255, 0.5)',
                            }}>{track.artist}</Link>
                          ) : (
                            <span style={{ color: '#00d9ff' }}>{track.artist}</span>
                          )}
                        </h3>
                      </div>

                      <div style={{
                        fontSize: isMobile ? '0.72rem' : '0.8rem',
                        color: '#00d9ff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.4,
                      }}>
                        {track.genre} · {track.bpm} BPM
                        {track.duration ? ' · ' + formatTime(track.duration) : ''}
                        {' · ⬇️ ' + (track.downloads || 0)}
                        {isReplacing && replaceStatus && (
                          <span style={{ color: '#ffd43b' }}> · {replaceStatus}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: 6,
                    flexShrink: 0,
                    width: isMobile ? '100%' : 'auto',
                    overflowX: isMobile ? 'auto' : 'visible',
                    paddingBottom: isMobile ? 4 : 0,
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'thin',
                  }}>
                    <IconButton
                      onClick={() => handlePlayTrack(track)}
                      disabled={isReplacing}
                      active={isThisPlaying}
                      size={isMobile ? 'small' : 'normal'}
                    >
                      {isThisPlaying ? '⏸' : isThisCurrent ? '▶' : '▶ Écouter'}
                    </IconButton>

                    <IconButton
                      onClick={() => toggleComments(track.id)}
                      active={showComments}
                      size={isMobile ? 'small' : 'normal'}
                    >
                      💬
                    </IconButton>

                    <IconButton
                      onClick={() => handleDownload(track)}
                      disabled={isDownloading}
                      title={user ? 'Télécharger' : 'Connectez-vous'}
                      color={user ? '#00ff88' : 'rgba(255,255,255,0.4)'}
                      size={isMobile ? 'small' : 'normal'}
                    >
                      {isDownloading ? '...' : user ? '⬇️' : '🔒'}
                    </IconButton>

                    <IconButton
                      onClick={() => handleLike(track.id)}
                      size={isMobile ? 'small' : 'normal'}
                    >
                      ♥ {track.likes}
                    </IconButton>

                    <IconButton
                      onClick={() => handleReplaceClick(track.id)}
                      disabled={isReplacing}
                      title="Remplacer"
                      color="#ffd43b"
                      size={isMobile ? 'small' : 'normal'}
                    >
                      {isReplacing ? '...' : '🔄'}
                    </IconButton>

                    <IconButton
                      onClick={() => startEdit(track)}
                      disabled={isReplacing}
                      size={isMobile ? 'small' : 'normal'}
                    >
                      ✏️
                    </IconButton>

                    <IconButton
                      onClick={() => handleDelete(track.id)}
                      disabled={isReplacing}
                      color="#ff5c5c"
                      size={isMobile ? 'small' : 'normal'}
                    >
                      🗑️
                    </IconButton>
                  </div>
                </div>
              )}

              {!isEditing && track.peaks && track.peaks.length > 0 && (
                <div style={{ marginTop: isMobile ? 8 : 10 }}>
                  <Waveform
                    peaks={track.peaks}
                    progress={progress}
                    onSeek={isThisCurrent && !isReplacing ? handleSeekRatio : undefined}
                    height={isMobile ? 42 : 56}
                    duration={track.duration}
                    compact={isMobile}
                  />
                  {isThisCurrent && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)',
                      marginTop: 4,
                    }}>
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  )}
                </div>
              )}

              {showComments && !isEditing && <CommentSection trackId={track.id} />}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};