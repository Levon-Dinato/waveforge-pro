// src/pages/CDJPage.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import {
  analyzeTrack,
  type AnalysisResult,
  type VocalSection,
} from '../utils/djAnalyzer';
import {
  formatAnalysisAsText,
  generateAnalysisImage,
  downloadAnalysisImage,
  copyAnalysisToClipboard,
} from '../utils/analysisSheet';
import { useToast } from '../components/ui/Toast';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionTitle } from '../components/ui/SectionTitle';

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
  const { showToast } = useToast();

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

  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const duration = buffer?.duration ?? 0;
  const bpm = analysis?.bpm ?? 120;

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

        showToast('Analyse terminée ✓', 'success');
      } catch (err) {
        console.error('Erreur analyse:', err);
        showToast("Erreur lors de l'analyse du fichier", 'error');
      } finally {
        setIsAnalyzing(false);
      }
    },
    [audioContext, showToast]
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
  // COPIE ANALYSE (TEXTE)
  // ============================================================
  const handleCopyAnalysis = async () => {
    if (!analysis) return;

    const text = formatAnalysisAsText(fileName, analysis);
    const success = await copyAnalysisToClipboard(text);

    if (success) {
      showToast('📋 Analyse copiée dans le presse-papiers', 'success');
    } else {
      showToast('Impossible de copier. Copie manuellement.', 'error');
    }
  };

  // ============================================================
  // EXPORT FICHE PNG
  // ============================================================
  const handleExportImage = async () => {
    if (!analysis || !buffer) return;

    try {
      const blob = await generateAnalysisImage(fileName, buffer, analysis);
      downloadAnalysisImage(blob, fileName);
      showToast('🖼️ Fiche PNG téléchargée', 'success');
    } catch (err) {
      console.error('Erreur export image:', err);
      showToast('Erreur lors de la génération de la fiche', 'error');
    }
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
      className="wf-fade-in"
      style={{
        padding: 20,
        color: '#fff',
        fontFamily: '"Inter", -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* HEADER V3 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 24,
            paddingBottom: 20,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 300 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '-0.5px',
              }}
            >
              🎛️{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #00d9ff, #7c5cff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                DJ PREP
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: '#ff5cf0',
                  marginLeft: 10,
                  padding: '3px 8px',
                  background: 'rgba(255, 92, 240, 0.15)',
                  border: '1px solid rgba(255, 92, 240, 0.4)',
                  borderRadius: 10,
                  verticalAlign: 'middle',
                  fontWeight: 700,
                  letterSpacing: '1px',
                }}
              >
                EXPERT
              </span>
            </h1>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '1.5px',
                fontWeight: 600,
              }}
            >
              ANALYSE BPM · KEY · CUE POINTS · VOCALS · FICHE À COPIER
            </p>
          </div>

          {buffer && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={handleCopyAnalysis}
                style={{
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#000',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  boxShadow: '0 6px 20px rgba(0, 217, 255, 0.4)',
                  transition: 'all 0.2s',
                }}
              >
                📋 COPIER
              </button>
              <button
                onClick={handleExportImage}
                style={{
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #ff5cf0, #d63fb8)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  boxShadow: '0 6px 20px rgba(255, 92, 240, 0.4)',
                  transition: 'all 0.2s',
                }}
              >
                🖼️ FICHE PNG
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
              e.currentTarget.style.background = 'rgba(0, 217, 255, 0.06)';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.3)';
              e.currentTarget.style.background = 'rgba(0, 217, 255, 0.03)';
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
              borderRadius: 20,
              cursor: 'pointer',
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                fontSize: 72,
                marginBottom: 16,
                filter: 'drop-shadow(0 0 20px rgba(0, 217, 255, 0.6))',
              }}
            >
              🎵
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                marginBottom: 8,
                letterSpacing: '-0.3px',
              }}
            >
              Charger un morceau
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.6,
                maxWidth: 400,
                margin: '0 auto',
              }}
            >
              Clique ou glisse un fichier audio ici
              <br />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
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
          <GlassCard padding={60} glow="#00d9ff">
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  border: '3px solid rgba(0, 217, 255, 0.2)',
                  borderTop: '3px solid #00d9ff',
                  borderRadius: '50%',
                  margin: '0 auto 20px',
                  animation: 'spin 0.8s linear infinite',
                  boxShadow: '0 0 30px rgba(0, 217, 255, 0.5)',
                }}
              />
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 8,
                  letterSpacing: '0.5px',
                }}
              >
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
                    boxShadow: '0 0 12px #00d9ff',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.4)',
                  marginTop: 12,
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                }}
              >
                {progress}%
              </div>
            </div>
          </GlassCard>
        )}

        {/* INTERFACE */}
        {buffer && analysis && (
          <>
            {/* TRACK INFO */}
            <GlassCard padding={20} glow="#00d9ff" style={{ marginBottom: 16 }}>
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
                      color: 'rgba(255,255,255,0.4)',
                      letterSpacing: '1.5px',
                      fontWeight: 800,
                      marginBottom: 6,
                    }}
                  >
                    MORCEAU CHARGÉ
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: 6,
                      letterSpacing: '-0.3px',
                    }}
                  >
                    {fileName.replace(/\.[^.]+$/, '')}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.5)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {formatTime(duration)} ·{' '}
                    {(buffer.sampleRate / 1000).toFixed(1)} kHz ·{' '}
                    {buffer.numberOfChannels}ch
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <StatBox
                    label="BPM"
                    value={analysis.bpm.toFixed(1)}
                    color="#00d9ff"
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
                    color="#00ff88"
                  />
                  <StatBox
                    label="DURÉE"
                    value={formatTime(duration)}
                    color="#ffd43b"
                  />
                </div>
              </div>

              {/* Waveform */}
              <div
                style={{
                  height: 90,
                  background: '#050505',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.06)',
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
                  color: 'rgba(255,255,255,0.4)',
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
                  marginTop: 10,
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
                    boxShadow: '0 0 10px rgba(0, 217, 255, 0.6)',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: 'monospace',
                  marginTop: 8,
                  fontWeight: 600,
                }}
              >
                <span>{formatTime(currentTime)}</span>
                <span style={{ color: '#ff5cf0', fontWeight: 700 }}>
                  {timeToBarBeat(currentTime)}
                </span>
                <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </GlassCard>

            {/* PLAYBACK */}
            <GlassCard
              padding={16}
              glow="#00ff88"
              style={{ marginBottom: 16 }}
            >
              <div
                style={{
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
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  CUE
                </button>

                <div style={{ flex: 1 }} />

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: 'rgba(255,255,255,0.4)',
                      letterSpacing: '1.5px',
                      fontWeight: 800,
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
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color:
                        tempo === 0
                          ? '#fff'
                          : tempo > 0
                          ? '#00ff88'
                          : '#ff3366',
                      minWidth: 50,
                      textAlign: 'right',
                    }}
                  >
                    {tempo > 0 ? '+' : ''}
                    {tempo.toFixed(1)}%
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* HOT CUES */}
            <GlassCard
              padding={16}
              glow="#ff5cf0"
              style={{ marginBottom: 16 }}
            >
              <SectionTitle
                icon="🔥"
                title="HOT CUES"
                subtitle={`${hotCues.filter(Boolean).length}/8 · Clic gauche = placer/rappel · Clic droit = supprimer`}
              />

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
                      borderRadius: 10,
                      color: cue ? '#fff' : 'rgba(255,255,255,0.4)',
                      fontSize: 12,
                      fontWeight: 800,
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
                      <div
                        style={{
                          fontSize: 8,
                          color: 'rgba(255,255,255,0.2)',
                        }}
                      >
                        —
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* EXPORT V3 */}
            <div
              style={{
                position: 'relative',
                background:
                  'linear-gradient(135deg, rgba(0, 217, 255, 0.08), rgba(255, 92, 240, 0.05))',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: 16,
                padding: 24,
                border: '1px solid rgba(0, 217, 255, 0.3)',
                boxShadow:
                  '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 217, 255, 0.15)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -80,
                  right: -80,
                  width: 240,
                  height: 240,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(0, 217, 255, 0.2) 0%, transparent 70%)',
                  pointerEvents: 'none',
                  filter: 'blur(40px)',
                }}
              />
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: '#00d9ff',
                    marginBottom: 10,
                    letterSpacing: '-0.2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  ✅ Analyse terminée · Récupère tes infos
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.7,
                    marginBottom: 18,
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
                  <strong style={{ color: '#00ff88' }}>
                    {hotCues.filter(Boolean).length} cue points
                  </strong>{' '}
                  ·{' '}
                  <strong style={{ color: '#00ff88' }}>
                    {analysis.vocalSections.length} section(s) vocal
                  </strong>
                  <br />
                  <br />
                  <strong style={{ color: '#00d9ff' }}>📋 COPIER</strong> :
                  copie le texte formaté dans ton presse-papiers → colle dans
                  tes notes.
                  <br />
                  <strong style={{ color: '#ff5cf0' }}>🖼️ FICHE PNG</strong> :
                  télécharge une image avec tout dessus → garde-la pour placer
                  tes cue points dans Serato/Rekordbox.
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCopyAnalysis}
                    style={{
                      flex: 1,
                      minWidth: 200,
                      padding: '14px 20px',
                      background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
                      border: 'none',
                      borderRadius: 10,
                      color: '#000',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      letterSpacing: '1px',
                      boxShadow: '0 6px 20px rgba(0, 217, 255, 0.4)',
                      transition: 'all 0.2s',
                    }}
                  >
                    📋 COPIER L'ANALYSE
                  </button>
                  <button
                    onClick={handleExportImage}
                    style={{
                      flex: 1,
                      minWidth: 200,
                      padding: '14px 20px',
                      background: 'linear-gradient(135deg, #ff5cf0, #d63fb8)',
                      border: 'none',
                      borderRadius: 10,
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      letterSpacing: '1px',
                      boxShadow: '0 6px 20px rgba(255, 92, 240, 0.4)',
                      transition: 'all 0.2s',
                    }}
                  >
                    🖼️ EXPORT FICHE PNG
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
                      borderRadius: 10,
                      color: '#ff3366',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    🔄 NOUVEAU
                  </button>
                </div>
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
// WAVEFORM CANVAS
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
      ctx.fillStyle = `hsl(${200 - intensity * 100}, 80%, ${
        30 + intensity * 40
      }%)`;
      ctx.fillRect(x, midY - h / 2, 1, h);
    }

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
// STAT BOX V3
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
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: '1.5px',
        fontWeight: 800,
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 17,
        fontWeight: 800,
        color,
        fontFamily: 'monospace',
        textShadow: `0 0 12px ${color}80`,
        letterSpacing: '0.5px',
      }}
    >
      {value}
    </div>
  </div>
);