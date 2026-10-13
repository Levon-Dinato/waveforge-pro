// src/pages/CDJPage.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import {
  analyzeTrack,
  type AnalysisResult,
  type VocalSection,
} from '../utils/djAnalyzer';
import {
  downloadRekordboxXML,
  type RekordboxTrack,
} from '../utils/rekordboxExporter';
import {
  exportSeratoMP3,
  downloadSeratoMP3,
} from '../utils/seratoExporter';

interface HotCue {
  name: string;
  position: number;
  color: string;
}

const HOT_CUE_COLORS = [
  '#00ff88', '#ff3366', '#ffd43b', '#7c5cff',
  '#00d9ff', '#ff5cf0', '#ff8800', '#ff6b35',
];

export const CDJPage: React.FC = () => {
  const engine = useAudioEngineContext();
  const audioContext = engine.audioContext;

  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [hotCues, setHotCues] = useState<Array<HotCue | null>>(
    new Array(8).fill(null)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [tempo, setTempo] = useState(0);
  const [basePath, setBasePath] = useState(
    () => localStorage.getItem('waveforge-base-path') || 'C:/Users/NATO/Music/'
  );

  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const duration = buffer?.duration ?? 0;
  const bpm = analysis?.bpm ?? 120;

  // Sauvegarde du chemin
  useEffect(() => {
    localStorage.setItem('waveforge-base-path', basePath);
  }, [basePath]);

  // ============================================================
  // CHARGEMENT + ANALYSE
  // ============================================================
  const handleLoadFile = useCallback(
    async (file: File) => {
      if (!audioContext) return;

      setIsAnalyzing(true);
      setProgress(0);
      setAnalyzeStep('Chargement du fichier...');

      try {
        const arrayBuffer = await file.arrayBuffer();
        const decoded = await audioContext.decodeAudioData(arrayBuffer);

        setBuffer(decoded);
        setFileName(file.name);
        setCurrentTime(0);
        setHotCues(new Array(8).fill(null));

        const result = await analyzeTrack(decoded, (step) => {
          setAnalyzeStep(step);
          setProgress((p) => Math.min(95, p + 20));
        });

        setAnalysis(result);
        setProgress(100);

        const newCues: Array<HotCue | null> = new Array(8).fill(null);
        result.autoCues.forEach((cue, i) => {
          if (i < 8) {
            newCues[i] = {
              name: cue.name,
              position: cue.position,
              color: cue.color,
            };
          }
        });
        setHotCues(newCues);
      } catch (err) {
        console.error('Erreur analyse:', err);
        alert("Erreur lors de l'analyse du fichier");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [audioContext]
  );

  // ============================================================
  // LECTURE
  // ============================================================
  const stopSource = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {}
      sourceRef.current = null;
    }
  }, []);

  const playFrom = useCallback(
    (offset: number) => {
      if (!buffer || !audioContext) return;
      stopSource();
      if (audioContext.state === 'suspended') audioContext.resume();

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = 1 + tempo / 100;

      const gain = gainRef.current ?? audioContext.createGain();
      gainRef.current = gain;
      source.connect(gain);
      gain.connect(audioContext.destination);

      source.start(0, offset);
      sourceRef.current = source;
      startTimeRef.current = audioContext.currentTime;
      startOffsetRef.current = offset;
      setCurrentTime(offset);
    },
    [buffer, audioContext, tempo, stopSource]
  );

  const handlePlayPause = () => {
    if (!buffer) return;
    if (isPlaying) {
      stopSource();
      setIsPlaying(false);
    } else {
      playFrom(currentTime);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (!isPlaying || !audioContext) return;
    const update = () => {
      if (startTimeRef.current > 0 && audioContext) {
        const elapsed =
          (audioContext.currentTime - startTimeRef.current) * (1 + tempo / 100);
        setCurrentTime(Math.min(startOffsetRef.current + elapsed, duration));
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, audioContext, duration, tempo]);

  // ============================================================
  // HOT CUES
  // ============================================================
  const setHotCue = (index: number) => {
    if (!buffer) return;
    const newCues = [...hotCues];
    if (newCues[index]) {
      playFrom(newCues[index]!.position);
      setIsPlaying(true);
    } else {
      newCues[index] = {
        name: String.fromCharCode(65 + index),
        position: currentTime,
        color: HOT_CUE_COLORS[index],
      };
      setHotCues(newCues);
    }
  };

  const deleteHotCue = (index: number) => {
    const newCues = [...hotCues];
    newCues[index] = null;
    setHotCues(newCues);
  };

  // ============================================================
  // EXPORTS
  // ============================================================
  const handleExportRekordbox = () => {
    if (!analysis || !buffer) return;

    const activeCues = hotCues
      .filter((c): c is HotCue => c !== null)
      .map((c) => ({
        name: c.name,
        position: c.position,
        color: c.color,
      }));

    const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;

    const track: RekordboxTrack = {
      name: fileName.replace(/\.[^.]+$/, ''),
      artist: 'Unknown',
      filePath: `${normalizedBase}${fileName}`,
      bpm: analysis.bpm,
      key: analysis.camelot,
      duration: analysis.duration,
      hotCues: activeCues,
    };

    downloadRekordboxXML([track]);
  };

  const handleExportJSON = () => {
    if (!analysis) return;
    const data = {
      fileName,
      analysis,
      hotCues: hotCues.filter(Boolean),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^.]+$/, '')}-waveforge.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSerato = async () => {
    if (!analysis || !buffer || !fileName) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mp3,audio/mpeg';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.mp3')) {
        alert('⚠️ Serato ne supporte les tags que pour les MP3.\nUtilise un fichier MP3.');
        return;
      }

      try {
        const activeCues = hotCues
          .filter((c): c is HotCue => c !== null)
          .map((c) => ({
            name: c.name,
            position: c.position,
            color: c.color,
          }));

        const blob = await exportSeratoMP3({
          audioFile: file,
          bpm: analysis.bpm,
          key: analysis.key,
          cues: activeCues,
        });

        downloadSeratoMP3(blob, file.name);
      } catch (err) {
        console.error('Erreur export Serato:', err);
        alert('Erreur lors de la génération du MP3 Serato.');
      }
    };
    input.click();
  };

  // ============================================================
  // FORMAT
  // ============================================================
  const formatTime = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const timeToBarBeat = (time: number) => {
    if (bpm <= 0) return '0.0';
    const beatDur = 60 / bpm;
    const beats = time / beatDur;
    const bar = Math.floor(beats / 4) + 1;
    const beat = Math.floor(beats % 4) + 1;
    return `${bar}.${beat}`;
  };

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div
      style={{
        padding: 20,
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at center top, #14141f 0%, #050505 100%)',
        color: '#fff',
        fontFamily: '"Inter", -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 300 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}
            >
              🎛️ DJ Prep{' '}
              <span
                style={{
                  fontSize: 10,
                  color: '#ff5cf0',
                  marginLeft: 10,
                  padding: '3px 8px',
                  background: 'rgba(255, 92, 240, 0.15)',
                  border: '1px solid rgba(255, 92, 240, 0.4)',
                  borderRadius: 10,
                  verticalAlign: 'middle',
                  fontWeight: 700,
                }}
              >
                EXPERT
              </span>
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#666' }}>
              Charge · Analyse auto · Cue points · Export Serato / Rekordbox
            </p>

            <div
              style={{
                marginTop: 10,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: '#666',
                  fontWeight: 700,
                  letterSpacing: '1px',
                }}
              >
                📁 DOSSIER MUSIQUE
              </span>
              <input
                type="text"
                placeholder="D:/Musics/House Music - Tech House/House/"
                value={basePath}
                onChange={(e) => setBasePath(e.target.value)}
                style={{
                  flex: 1,
                  maxWidth: 500,
                  minWidth: 240,
                  padding: '6px 10px',
                  background: 'rgba(0, 217, 255, 0.05)',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: 4,
                  color: '#00d9ff',
                  fontSize: 10,
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: 8, color: '#666' }}>
                (slash / à la fin · sauvegardé auto)
              </span>
            </div>
          </div>

          {buffer && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={handleExportSerato}
                style={{
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #ff5cf0, #d63fb8)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 16px rgba(255, 92, 240, 0.4)',
                }}
              >
                🎧 EXPORT SERATO
              </button>
              <button
                onClick={handleExportRekordbox}
                style={{
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #00ff88, #00a850)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#000',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 16px rgba(0, 255, 136, 0.4)',
                }}
              >
                📁 EXPORT REKORDBOX
              </button>
              <button
                onClick={handleExportJSON}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(124, 92, 255, 0.15)',
                  border: '1px solid #7c5cff',
                  borderRadius: 6,
                  color: '#7c5cff',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                💾 JSON
              </button>
            </div>
          )}
        </div>

        {/* ZONE DE CHARGEMENT */}
        {!buffer && !isAnalyzing && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = '#00d9ff';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.3)';
            }}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleLoadFile(file);
            }}
            style={{
              padding: 80,
              textAlign: 'center',
              background: 'rgba(0, 217, 255, 0.03)',
              border: '2px dashed rgba(0, 217, 255, 0.3)',
              borderRadius: 16,
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          >
            <div style={{ fontSize: 72, marginBottom: 16 }}>🎵</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Charger un morceau
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#888',
                lineHeight: 1.6,
                maxWidth: 400,
                margin: '0 auto',
              }}
            >
              Clique ou glisse un fichier audio ici
              <br />
              <span style={{ fontSize: 10, color: '#666' }}>
                Analyse auto BPM · Tonalité · Cue points · Vocals
              </span>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleLoadFile(file);
            e.target.value = '';
          }}
        />

        {/* PROGRESS */}
        {isAnalyzing && (
          <div
            style={{
              padding: 60,
              textAlign: 'center',
              background: 'rgba(0, 217, 255, 0.03)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: 12,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                border: '3px solid rgba(0, 217, 255, 0.2)',
                borderTop: '3px solid #00d9ff',
                borderRadius: '50%',
                margin: '0 auto 20px',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              {analyzeStep}
            </div>
            <div
              style={{
                width: '60%',
                height: 4,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 2,
                margin: '20px auto 0',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #00d9ff, #7c5cff)',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 12 }}>
              {progress}%
            </div>
          </div>
        )}

        {/* INTERFACE */}
        {buffer && analysis && (
          <>
            {/* TRACK INFO */}
            <div
              style={{
                background:
                  'linear-gradient(180deg, #14141f 0%, #0d0d15 100%)',
                borderRadius: 12,
                padding: 20,
                marginBottom: 16,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 16,
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 9,
                      color: '#666',
                      letterSpacing: '1.5px',
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    MORCEAU CHARGÉ
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: 4,
                    }}
                  >
                    {fileName.replace(/\.[^.]+$/, '')}
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {formatTime(duration)} ·{' '}
                    {(buffer.sampleRate / 1000).toFixed(1)} kHz ·{' '}
                    {buffer.numberOfChannels}ch
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <BPMEditor
                    bpm={analysis.bpm}
                    onChange={(newBpm) =>
                      setAnalysis({ ...analysis, bpm: newBpm })
                    }
                  />
                  <StatBox label="KEY" value={analysis.key} color="#ff5cf0" />
                  <StatBox
                    label="CAMELOT"
                    value={analysis.camelot}
                    color="#ff5cf0"
                  />
                  <StatBox
                    label="VOCALS"
                    value={analysis.vocalSections.length.toString()}
                    color="#ff5cf0"
                  />
                  <StatBox
                    label="DURÉE"
                    value={formatTime(duration)}
                    color="#ffd43b"
                  />
                </div>
              </div>

              {/* Waveform + Bandes vocales */}
              <div
                style={{
                  height: 90,
                  background: '#050505',
                  borderRadius: 6,
                  border: '1px solid #1a1a1a',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <WaveformCanvas
                  buffer={buffer}
                  bpm={bpm}
                  vocalSections={analysis.vocalSections}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${
                      duration > 0 ? (currentTime / duration) * 100 : 0
                    }%`,
                    width: 2,
                    background: '#fff',
                    boxShadow: '0 0 8px #fff',
                  }}
                />
                {hotCues.map((cue, i) => {
                  if (!cue) return null;
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${(cue.position / duration) * 100}%`,
                        width: 2,
                        background: cue.color,
                        boxShadow: `0 0 6px ${cue.color}`,
                      }}
                    />
                  );
                })}
              </div>

              {/* Légende */}
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  marginTop: 8,
                  fontSize: 9,
                  color: '#666',
                  justifyContent: 'flex-end',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      width: 12,
                      height: 8,
                      background: 'rgba(255, 92, 240, 0.3)',
                      border: '1px solid rgba(255, 92, 240, 0.5)',
                      borderRadius: 2,
                    }}
                  />
                  VOCAL
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      width: 12,
                      height: 8,
                      background: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: 2,
                    }}
                  />
                  BEAT GRID
                </span>
              </div>

              {/* Barre de progression */}
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  const t = percent * duration;
                  setCurrentTime(t);
                  startOffsetRef.current = t;
                  if (isPlaying) playFrom(t);
                }}
                style={{
                  position: 'relative',
                  height: 6,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 3,
                  marginTop: 8,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${
                      duration > 0 ? (currentTime / duration) * 100 : 0
                    }%`,
                    background: 'linear-gradient(90deg, #00d9ff, #7c5cff)',
                    borderRadius: 3,
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  color: '#666',
                  fontFamily: 'monospace',
                  marginTop: 6,
                }}
              >
                <span>{formatTime(currentTime)}</span>
                <span style={{ color: '#ff5cf0' }}>
                  {timeToBarBeat(currentTime)}
                </span>
                <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* PLAYBACK */}
            <div
              style={{
                background:
                  'linear-gradient(180deg, #14141f 0%, #0d0d15 100%)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={handlePlayPause}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: isPlaying
                    ? 'linear-gradient(135deg, #00ff88, #00a850)'
                    : 'linear-gradient(135deg, #1a1a24, #0d0d15)',
                  border: `2px solid ${
                    isPlaying ? '#00ff88' : 'rgba(255,255,255,0.1)'
                  }`,
                  color: isPlaying ? '#000' : '#fff',
                  fontSize: 22,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isPlaying
                    ? '0 0 30px rgba(0, 255, 136, 0.6)'
                    : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>

              <button
                onClick={() => {
                  stopSource();
                  setIsPlaying(false);
                  setCurrentTime(0);
                }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1a1a24, #0d0d15)',
                  border: '2px solid rgba(255, 136, 0, 0.5)',
                  color: '#ff8800',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                CUE
              </button>

              <div style={{ flex: 1 }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    fontSize: 9,
                    color: '#666',
                    letterSpacing: '1px',
                    fontWeight: 700,
                  }}
                >
                  TEMPO
                </div>
                <input
                  type="range"
                  min={-16}
                  max={16}
                  step={0.1}
                  value={tempo}
                  onChange={(e) => setTempo(parseFloat(e.target.value))}
                  style={{ width: 140, accentColor: '#00d9ff' }}
                />
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color:
                      tempo === 0 ? '#fff' : tempo > 0 ? '#00ff88' : '#ff3366',
                    minWidth: 50,
                    textAlign: 'right',
                  }}
                >
                  {tempo > 0 ? '+' : ''}
                  {tempo.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* HOT CUES */}
            <div
              style={{
                background:
                  'linear-gradient(180deg, #14141f 0%, #0d0d15 100%)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: '#666',
                    letterSpacing: '1.5px',
                    fontWeight: 700,
                  }}
                >
                  HOT CUES · {hotCues.filter(Boolean).length}/8
                </div>
                <div style={{ fontSize: 9, color: '#666' }}>
                  Clic gauche = placer/rappel · Clic droit = supprimer
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: 8,
                }}
              >
                {hotCues.map((cue, i) => (
                  <button
                    key={i}
                    onClick={() => setHotCue(i)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (cue) deleteHotCue(i);
                    }}
                    style={{
                      padding: '14px 6px 10px',
                      background: cue
                        ? `linear-gradient(180deg, ${cue.color}44, ${cue.color}11)`
                        : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      border: `1.5px solid ${
                        cue ? cue.color : 'rgba(255,255,255,0.08)'
                      }`,
                      borderRadius: 8,
                      color: cue ? '#fff' : '#666',
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: cue ? `0 0 12px ${cue.color}44` : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <div>{String.fromCharCode(65 + i)}</div>
                    {cue ? (
                      <div
                        style={{
                          fontSize: 8,
                          color: cue.color,
                          opacity: 0.9,
                          fontFamily: 'monospace',
                        }}
                      >
                        {timeToBarBeat(cue.position)}
                      </div>
                    ) : (
                      <div style={{ fontSize: 8, color: '#444' }}>—</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* EXPORT */}
            <div
              style={{
                background:
                  'linear-gradient(135deg, rgba(0, 255, 136, 0.08), rgba(124, 92, 255, 0.05))',
                borderRadius: 12,
                padding: 20,
                border: '1px solid rgba(0, 255, 136, 0.3)',
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#00ff88',
                  marginBottom: 8,
                  letterSpacing: '0.5px',
                }}
              >
                ✅ Analyse terminée · Prêt à exporter
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#aaa',
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
              >
                <strong style={{ color: '#00d9ff' }}>
                  {analysis.bpm.toFixed(1)} BPM
                </strong>{' '}
                ·{' '}
                <strong style={{ color: '#ff5cf0' }}>
                  {analysis.key} ({analysis.camelot})
                </strong>{' '}
                ·{' '}
                <strong style={{ color: '#ff5cf0' }}>
                  {analysis.vocalSections.length} sections vocales
                </strong>{' '}
                ·{' '}
                <strong style={{ color: '#00ff88' }}>
                  {hotCues.filter(Boolean).length} cue points
                </strong>
                <br />
                <span style={{ color: '#666', fontSize: 10 }}>
                  ⚠️ Vérifie que ton <strong>DOSSIER MUSIQUE</strong> (en haut)
                  correspond au chemin où se trouvent tes MP3
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={handleExportSerato}
                  style={{
                    flex: 1,
                    minWidth: 220,
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, #ff5cf0, #d63fb8)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '1px',
                    boxShadow: '0 6px 20px rgba(255, 92, 240, 0.4)',
                  }}
                >
                  🎧 EXPORT SERATO MP3
                </button>
                <button
                  onClick={handleExportRekordbox}
                  style={{
                    flex: 1,
                    minWidth: 220,
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, #00ff88, #00a850)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#000',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '1px',
                    boxShadow: '0 6px 20px rgba(0, 255, 136, 0.4)',
                  }}
                >
                  📁 EXPORT REKORDBOX XML
                </button>
                <button
                  onClick={handleExportJSON}
                  style={{
                    padding: '14px 20px',
                    background: 'rgba(124, 92, 255, 0.15)',
                    border: '1px solid #7c5cff',
                    borderRadius: 8,
                    color: '#7c5cff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  💾 JSON
                </button>
                <button
                  onClick={() => {
                    setBuffer(null);
                    setAnalysis(null);
                    setFileName('');
                    setHotCues(new Array(8).fill(null));
                    stopSource();
                    setIsPlaying(false);
                  }}
                  style={{
                    padding: '14px 20px',
                    background: 'rgba(255, 51, 102, 0.1)',
                    border: '1px solid #ff3366',
                    borderRadius: 8,
                    color: '#ff3366',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🔄 NOUVEAU
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ============================================================
// WAVEFORM CANVAS (avec bandes vocales)
// ============================================================
const WaveformCanvas: React.FC<{
  buffer: AudioBuffer;
  bpm: number;
  vocalSections: VocalSection[];
}> = ({ buffer, bpm, vocalSections }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const W = rect.width;
    const H = rect.height;
    const duration = buffer.duration;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // BANDES VOCALES
    vocalSections.forEach((section) => {
      const x1 = (section.start / duration) * W;
      const x2 = (section.end / duration) * W;

      const gradient = ctx.createLinearGradient(x1, 0, x2, 0);
      gradient.addColorStop(0, 'rgba(255, 92, 240, 0.15)');
      gradient.addColorStop(0.5, 'rgba(255, 92, 240, 0.25)');
      gradient.addColorStop(1, 'rgba(255, 92, 240, 0.15)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x1, 0, x2 - x1, H);

      ctx.strokeStyle = 'rgba(255, 92, 240, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(x1, 0, x2 - x1, H);
      ctx.setLineDash([]);

      if (x2 - x1 > 40) {
        ctx.fillStyle = 'rgba(255, 92, 240, 0.9)';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VOCAL', (x1 + x2) / 2, 10);
      }
    });

    // WAVEFORM
    const channelData = buffer.getChannelData(0);
    const samplesPerPixel = Math.floor(channelData.length / W);
    const midY = H / 2;

    for (let x = 0; x < W; x++) {
      let min = 1;
      let max = -1;
      const start = x * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, channelData.length);
      for (let i = start; i < end; i += 4) {
        const s = channelData[i];
        if (s < min) min = s;
        if (s > max) max = s;
      }
      const h = Math.max(1, (max - min) * midY * 0.9);
      const intensity = Math.min(1, h / (midY * 0.9));
      ctx.fillStyle = `hsl(${200 - intensity * 100}, 80%, ${30 + intensity * 40}%)`;
      ctx.fillRect(x, midY - h / 2, 1, h);
    }

    // BEAT GRID
    if (bpm > 0) {
      const beatDur = 60 / bpm;
      const pixelsPerBeat = (beatDur / duration) * W;
      if (pixelsPerBeat > 4) {
        const numBeats = Math.floor(duration / beatDur);
        for (let i = 0; i < numBeats; i++) {
          const x = ((i * beatDur) / duration) * W;
          const isDownbeat = i % 4 === 0;
          ctx.strokeStyle = isDownbeat
            ? 'rgba(255,255,255,0.2)'
            : 'rgba(255,255,255,0.06)';
          ctx.lineWidth = isDownbeat ? 1.5 : 1;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
      }
    }
  }, [buffer, bpm, vocalSections]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
};

// ============================================================
// STAT BOX
// ============================================================
const StatBox: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => (
  <div style={{ textAlign: 'center' }}>
    <div
      style={{
        fontSize: 8,
        color: '#666',
        letterSpacing: '1.5px',
        fontWeight: 700,
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 16,
        fontWeight: 700,
        color,
        fontFamily: 'monospace',
        textShadow: `0 0 10px ${color}66`,
        letterSpacing: '0.5px',
      }}
    >
      {value}
    </div>
  </div>
);

// ============================================================
// BPM EDITOR
// ============================================================
const BPMEditor: React.FC<{
  bpm: number;
  onChange: (bpm: number) => void;
}> = ({ bpm, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(bpm.toFixed(1));

  useEffect(() => {
    setInputValue(bpm.toFixed(1));
  }, [bpm]);

  const handleSave = () => {
    const parsed = parseFloat(inputValue.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 40 && parsed <= 220) {
      onChange(Math.round(parsed * 10) / 10);
    } else {
      setInputValue(bpm.toFixed(1));
    }
    setIsEditing(false);
  };

  const isHouse = bpm >= 120 && bpm <= 130;
  const isDance = bpm >= 110 && bpm <= 145;
  const isTooSlow = bpm < 100;
  const isTooFast = bpm > 160;

  let rangeLabel = '⚠ À VÉRIFIER';
  let rangeColor = '#ffd43b';
  if (isHouse) {
    rangeLabel = '✓ HOUSE';
    rangeColor = '#00ff88';
  } else if (isDance) {
    rangeLabel = '✓ DANCE';
    rangeColor = '#00ff88';
  } else if (isTooSlow) {
    rangeLabel = '↓ TROP LENT';
    rangeColor = '#ff3366';
  } else if (isTooFast) {
    rangeLabel = '↑ TROP RAPIDE';
    rangeColor = '#ff3366';
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: 8,
          color: '#666',
          letterSpacing: '1.5px',
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        BPM
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          justifyContent: 'center',
        }}
      >
        <button
          onClick={() => onChange(Math.round((bpm / 2) * 10) / 10)}
          title="Diviser par 2"
          style={{
            width: 26,
            height: 26,
            background: 'rgba(255, 51, 102, 0.15)',
            border: '1px solid rgba(255, 51, 102, 0.5)',
            borderRadius: 4,
            color: '#ff3366',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          ÷2
        </button>

        {isEditing ? (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setInputValue(bpm.toFixed(1));
                setIsEditing(false);
              }
            }}
            autoFocus
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#00d9ff',
              fontFamily: 'monospace',
              letterSpacing: '0.5px',
              width: 80,
              background: 'rgba(0, 217, 255, 0.1)',
              border: '2px solid #00d9ff',
              borderRadius: 4,
              padding: '2px 6px',
              outline: 'none',
              textAlign: 'center',
            }}
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            title="Cliquer pour modifier manuellement"
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#00d9ff',
              fontFamily: 'monospace',
              textShadow: '0 0 10px #00d9ff66',
              letterSpacing: '0.5px',
              minWidth: 78,
              cursor: 'pointer',
              padding: '2px 6px',
              border: '2px solid transparent',
              borderRadius: 4,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            {bpm.toFixed(1)}
          </div>
        )}

        <button
          onClick={() => onChange(Math.round(bpm * 2 * 10) / 10)}
          title="Multiplier par 2"
          style={{
            width: 26,
            height: 26,
            background: 'rgba(0, 217, 255, 0.15)',
            border: '1px solid rgba(0, 217, 255, 0.5)',
            borderRadius: 4,
            color: '#00d9ff',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          ×2
        </button>
      </div>

      <div
        style={{
          fontSize: 7,
          marginTop: 3,
          fontWeight: 700,
          letterSpacing: '0.5px',
          color: rangeColor,
        }}
      >
        {isEditing
          ? '↵ ENTRÉE · ESC ANNULER'
          : `${rangeLabel} · CLIC POUR ÉDITER`}
      </div>
    </div>
  );
};