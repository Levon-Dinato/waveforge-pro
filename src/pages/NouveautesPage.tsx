import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { CommentSection } from '../components/CommentSection';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { detectBPM } from '../audio/bpmDetector';
import { parseBlob } from 'music-metadata';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer, type PlayerTrack } from '../contexts/PlayerContext';

interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  likes: number;
  audio_url: string;
  duration: number;
  peaks: number[];
  cover_url: string | null;
  created_at: string;
  user_id: string | null;
}

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
  borderRadius: '4px',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%',
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

const extractCoverFromMp3 = async (file: File): Promise<Blob | null> => {
  try {
    const metadata = await parseBlob(file);
    const pictures = metadata.common.picture;
    if (pictures && pictures.length > 0) {
      const pic = pictures[0];
      const blob = new Blob([pic.data as BlobPart], {
        type: pic.format || 'image/jpeg',
      });
      return blob;
    }
    return null;
  } catch (e) {
    return null;
  }
};

const uploadCoverToSupabase = async (
  blob: Blob,
  baseName: string
): Promise<string | null> => {
  try {
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const fileName = `covers/${baseName}.${ext}`;

    const { error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(fileName, blob, { upsert: true });

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
}

const Waveform: React.FC<WaveformProps> = ({ peaks, progress, onSeek, height = 42 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

    if (!peaks || peaks.length === 0) return;

    const barWidth = width / peaks.length;
    const midY = height / 2;
    const progressX = progress * width;

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const h = (peaks[i] / 100) * (height * 0.9);
      const y = midY - h / 2;

      if (x < progressX) {
        ctx.fillStyle = '#00d9ff';
        ctx.shadowColor = '#00d9ff';
        ctx.shadowBlur = 6;
      } else {
        ctx.fillStyle = 'rgba(0, 217, 255, 0.55)';
        ctx.shadowBlur = 0;
      }
      ctx.fillRect(x, y, Math.max(1, barWidth - 0.6), h);
    }
    ctx.shadowBlur = 0;
  }, [peaks, progress, height]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, ratio)));
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{
        width: '100%',
        height: height,
        cursor: onSeek ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};

export const NouveautesPage: React.FC = () => {
  const { user } = useAuth();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    play,
    seek,
    setVolume,
    stop,
  } = usePlayer();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverTargetId, setCoverTargetId] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'likes' | 'bpm' | 'title'>('recent');
  const [filterGenre, setFilterGenre] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', genre: '', bpm: 0 });

  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur chargement:', error);
    } else {
      const normalized = (data || []).map((t: any) => ({
        ...t,
        peaks: Array.isArray(t.peaks) ? t.peaks : [],
        cover_url: t.cover_url || null,
        user_id: t.user_id || null,
      }));
      setTracks(normalized);
    }
    setLoading(false);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus('Analyse audio en cours...');

    try {
      let bpm = 0;
      let detectedDuration = 0;
      let peaks: number[] = [];

      try {
        const analysis = await analyzeAudioFile(file);
        bpm = analysis.bpm;
        detectedDuration = analysis.duration;
        peaks = analysis.peaks;
      } catch (analyzeErr) {
        console.warn('Analyse audio echouee :', analyzeErr);
      }

      setUploadStatus('Upload en cours...');
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = Date.now() + '_' + cleanName;

      const { error: uploadError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(AUDIO_BUCKET)
        .getPublicUrl(fileName);

      setUploadStatus('Extraction pochette...');
      const coverBlob = await extractCoverFromMp3(file);
      let coverUrl: string | null = null;

      if (coverBlob) {
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        coverUrl = await uploadCoverToSupabase(coverBlob, baseName);
      }

      setUploadStatus('Enregistrement...');
      const { data: inserted, error: insertError } = await supabase
        .from('tracks')
        .insert({
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: user?.email?.split('@')[0] || 'Anonyme',
          user_id: user?.id || null,
          genre: 'Inconnu',
          bpm,
          likes: 0,
          audio_url: urlData.publicUrl,
          duration: detectedDuration,
          peaks,
          cover_url: coverUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (inserted) {
        setTracks([inserted, ...tracks]);
        setEditingId(inserted.id);
        setEditForm({
          title: inserted.title,
          artist: inserted.artist,
          genre: inserted.genre,
          bpm: inserted.bpm,
        });
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

  const handleCoverClick = (trackId: string) => {
    setCoverTargetId(trackId);
    coverInputRef.current?.click();
  };

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const targetId = coverTargetId;
    if (!file || !targetId) return;

    setCoverUploading(targetId);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `covers/${Date.now()}_${targetId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(AUDIO_BUCKET)
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('tracks')
        .update({ cover_url: urlData.publicUrl })
        .eq('id', targetId);
      if (updateError) throw updateError;

      setTracks((prev) =>
        prev.map((t) => (t.id === targetId ? { ...t, cover_url: urlData.publicUrl } : t))
      );
    } catch (err: any) {
      console.error('Erreur pochette:', err);
      alert('Erreur pochette : ' + (err.message || err));
    } finally {
      setCoverUploading(null);
      setCoverTargetId(null);
      event.target.value = '';
    }
  };

  // ✅ Utilise le player global
  const handlePlayTrack = (track: Track) => {
    const playerTrack: PlayerTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      audio_url: track.audio_url,
      cover_url: track.cover_url,
      user_id: track.user_id,
      duration: track.duration,
      peaks: track.peaks,
    };
    play(playerTrack);
  };

  const handleSeekRatio = (ratio: number) => {
    seek(ratio);
  };

  const handleLike = async (id: string) => {
    const track = tracks.find((t) => t.id === id);
    if (!track) return;
    const newLikes = track.likes + 1;
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, likes: newLikes } : t)));
    const { error } = await supabase.from('tracks').update({ likes: newLikes }).eq('id', id);
    if (error) console.error('Erreur like:', error);
  };

  const handleDelete = async (id: string) => {
    const track = tracks.find((t) => t.id === id);
    if (!track) return;
    if (!window.confirm('Supprimer "' + track.title + '" ?')) return;

    // ✅ Si le morceau supprimé est celui du player global, on l'arrête
    if (currentTrack?.id === id) {
      stop();
    }

    try {
      const audioParts = track.audio_url.split('/' + AUDIO_BUCKET + '/');
      if (audioParts[1]) {
        await supabase.storage.from(AUDIO_BUCKET).remove([audioParts[1]]);
      }
      if (track.cover_url) {
        const coverParts = track.cover_url.split('/' + AUDIO_BUCKET + '/');
        if (coverParts[1]) {
          await supabase.storage.from(AUDIO_BUCKET).remove([coverParts[1]]);
        }
      }

      const { data: deleted, error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!deleted || deleted.length === 0) {
        alert('Suppression bloquee par la securite Supabase.');
        loadTracks();
        return;
      }

      setTracks((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      alert('Erreur suppression : ' + (err.message || err));
      loadTracks();
    }
  };

  const startEdit = (track: Track) => {
    setEditingId(track.id);
    setEditForm({
      title: track.title,
      artist: track.artist,
      genre: track.genre,
      bpm: track.bpm,
    });
  };

  const saveEdit = async () => {
    if (editingId === null) return;
    const { error } = await supabase.from('tracks').update(editForm).eq('id', editingId);
    if (error) {
      console.error('Erreur edition:', error);
      alert('Erreur sauvegarde : ' + error.message);
      return;
    }
    setTracks((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...editForm } : t)));
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const visibleTracks = useMemo(() => {
    let list = [...tracks];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.genre.toLowerCase().includes(q)
      );
    }
    if (filterGenre.trim()) {
      const g = filterGenre.toLowerCase();
      list = list.filter((t) => t.genre.toLowerCase().includes(g));
    }
    switch (sortBy) {
      case 'likes': list.sort((a, b) => b.likes - a.likes); break;
      case 'bpm': list.sort((a, b) => b.bpm - a.bpm); break;
      case 'title': list.sort((a, b) => a.title.localeCompare(b.title)); break;
      default:
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [tracks, search, sortBy, filterGenre]);

  const toggleComments = (trackId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', color: '#fff' }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        .track-card {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;
        }
        .new-badge {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>

      <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>Nouveautes DJ</h1>

      <input
        type="file"
        accept="audio/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        accept="image/*"
        ref={coverInputRef}
        onChange={handleCoverChange}
        style={{ display: 'none' }}
      />

      <GlassCard
        style={{
          padding: '20px',
          marginBottom: '20px',
          borderStyle: 'dashed',
          borderColor: '#00d9ff',
        }}
      >
        <h2 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
          Partager un nouveau son
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '15px' }}>
          BPM, duree et pochette (depuis les tags ID3) detectes automatiquement.
        </p>
        <button
          onClick={handleUploadClick}
          disabled={uploading}
          style={{
            padding: '8px 16px',
            background: uploading ? '#666' : '#00d9ff',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: uploading ? 'wait' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {uploading ? uploadStatus || 'Traitement...' : '+ Uploader un morceau'}
        </button>
      </GlassCard>

      <GlassCard style={{ padding: '15px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...INPUT_STYLE, flex: '2 1 200px' }}
          />
          <input
            type="text"
            placeholder="Genre"
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            style={{ ...INPUT_STYLE, flex: '1 1 100px' }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{ ...INPUT_STYLE, flex: '1 1 140px', cursor: 'pointer' }}
          >
            <option value="recent">Plus recents</option>
            <option value="likes">Plus aimes</option>
            <option value="bpm">BPM (eleve)</option>
            <option value="title">Titre (A-Z)</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 150px' }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Vol</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#00d9ff' }}
            />
          </div>
        </div>
      </GlassCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '20px' }}>
            Chargement...
          </div>
        )}

        {!loading && visibleTracks.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'rgba(255,255,255,0.4)',
              padding: '40px',
              fontSize: '0.9rem',
            }}
          >
            {tracks.length === 0 ? 'Aucun morceau pour le moment.' : 'Aucun resultat.'}
          </div>
        )}

        {visibleTracks.map((track, index) => {
          const isThisCurrent = currentTrack?.id === track.id;
          const isThisPlaying = isThisCurrent && isPlaying;
          const isEditing = editingId === track.id;
          const progress = isThisCurrent && duration > 0 ? currentTime / duration : 0;
          const isCoverLoading = coverUploading === track.id;
          const fresh = isNew(track.created_at);
          const showComments = openComments.has(track.id);

          return (
            <GlassCard
              key={track.id}
              className="track-card"
              style={{
                padding: '15px',
                borderColor: isThisPlaying ? '#00d9ff' : undefined,
                boxShadow: isThisPlaying
                  ? '0 0 20px rgba(0, 217, 255, 0.3)'
                  : undefined,
                animationDelay: `${Math.min(index * 40, 400)}ms`,
              }}
            >
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Titre"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    style={INPUT_STYLE}
                  />
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Artiste"
                      value={editForm.artist}
                      onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })}
                      style={{ ...INPUT_STYLE, flex: '1 1 120px' }}
                    />
                    <input
                      type="text"
                      placeholder="Genre"
                      value={editForm.genre}
                      onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                      style={{ ...INPUT_STYLE, flex: '1 1 100px' }}
                    />
                    <input
                      type="number"
                      placeholder="BPM"
                      value={editForm.bpm}
                      onChange={(e) =>
                        setEditForm({ ...editForm, bpm: parseInt(e.target.value) || 0 })
                      }
                      style={{ ...INPUT_STYLE, flex: '0 0 80px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={cancelEdit}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={saveEdit}
                      style={{
                        padding: '6px 12px',
                        background: '#00d9ff',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    onClick={() => handleCoverClick(track.id)}
                    title="Cliquez pour changer la pochette"
                    style={{
                      width: 70,
                      height: 70,
                      flexShrink: 0,
                      borderRadius: 8,
                      background: track.cover_url
                        ? `url(${track.cover_url}) center/cover`
                        : 'linear-gradient(135deg, rgba(0,217,255,0.2), rgba(124,92,255,0.15))',
                      border: '1px solid rgba(0, 217, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 217, 255, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {!track.cover_url && <span style={{ fontSize: 24, opacity: 0.6 }}>🎵</span>}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: '#00d9ff',
                        fontWeight: 700,
                        opacity: 0,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                    >
                      {isCoverLoading ? '...' : 'CHANGER'}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '10px',
                        marginBottom: '10px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3
                          style={{
                            margin: '0 0 5px 0',
                            fontSize: '1.05rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          {fresh && (
                            <span
                              className="new-badge"
                              style={{
                                fontSize: '0.6rem',
                                padding: '2px 6px',
                                background: 'linear-gradient(135deg, #ff5c5c, #ff8c00)',
                                color: '#fff',
                                borderRadius: 4,
                                fontWeight: 800,
                                letterSpacing: '1px',
                                flexShrink: 0,
                              }}
                            >
                              NOUVEAU
                            </span>
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {track.title} -{' '}
                            {track.user_id ? (
                              <Link
                                to={`/profil/${track.user_id}`}
                                style={{
                                  color: '#00d9ff',
                                  textDecoration: 'none',
                                  borderBottom: '1px dotted rgba(0, 217, 255, 0.5)',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderBottom = '1px solid #00d9ff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderBottom =
                                    '1px dotted rgba(0, 217, 255, 0.5)';
                                }}
                              >
                                {track.artist}
                              </Link>
                            ) : (
                              track.artist
                            )}
                          </span>
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: '#00d9ff' }}>
                          {track.genre} | {track.bpm} BPM
                          {track.duration ? ' | ' + formatTime(track.duration) : ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => handlePlayTrack(track)}
                          style={{
                            background: isThisPlaying
                              ? 'rgba(0, 217, 255, 0.15)'
                              : 'transparent',
                            border: isThisPlaying
                              ? '1px solid #00d9ff'
                              : '1px solid rgba(255,255,255,0.2)',
                            color: isThisPlaying ? '#00d9ff' : '#fff',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          {isThisPlaying
                            ? '⏸ Pause'
                            : isThisCurrent
                            ? '▶ Reprendre'
                            : '▶ Écouter'}
                        </button>

                        <button
                          onClick={() => toggleComments(track.id)}
                          style={{
                            background: showComments
                              ? 'rgba(0, 217, 255, 0.15)'
                              : 'transparent',
                            border: showComments
                              ? '1px solid #00d9ff'
                              : '1px solid rgba(255,255,255,0.2)',
                            color: showComments ? '#00d9ff' : '#fff',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          💬
                        </button>

                        <button
                          onClick={() => handleLike(track.id)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          Like {track.likes}
                        </button>
                        <button
                          onClick={() => startEdit(track)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(track.id)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 60, 60, 0.4)',
                            color: '#ff5c5c',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          Suppr
                        </button>
                      </div>
                    </div>

                    {track.peaks && track.peaks.length > 0 && (
                      <div>
                        <Waveform
                          peaks={track.peaks}
                          progress={progress}
                          onSeek={isThisCurrent ? handleSeekRatio : undefined}
                          height={42}
                        />
                        {isThisCurrent && (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.7rem',
                              color: 'rgba(255,255,255,0.5)',
                              marginTop: '4px',
                            }}
                          >
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {showComments && <CommentSection trackId={track.id} />}
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};