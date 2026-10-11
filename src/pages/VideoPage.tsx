// src/pages/VideoPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { Visualizer, type VisualizerStyle, type VisualizerConfig } from '../components/video/Visualizer';
import {
  recordVisualizer,
  downloadVideo,
  formatSize,
  formatDuration,
  type ExportResult,
} from '../audio/videoExporter';

interface VideoExportEntry {
  id: string;
  timestamp: number;
  title: string;
  style: VisualizerStyle;
  duration: number;
  size: number;
  blob: Blob;
}

const STYLES: { id: VisualizerStyle; label: string; icon: string }[] = [
  { id: 'bars', label: 'Barres', icon: '📊' },
  { id: 'wave', label: 'Wave', icon: '〰️' },
  { id: 'circle', label: 'Cercle', icon: '⭕' },
  { id: 'particles', label: 'Particules', icon: '✨' },
];

const COLOR_PRESETS = [
  { primary: '#00d9ff', accent: '#7c5cff', bg: '#0a0a14', name: 'Cyan/Violet' },
  { primary: '#00ff88', accent: '#00b866', bg: '#0a140a', name: 'Vert néon' },
  { primary: '#ff3366', accent: '#ff5cf0', bg: '#140a0a', name: 'Rose/Rouge' },
  { primary: '#ffd43b', accent: '#ff8800', bg: '#141005', name: 'Or/Orange' },
  { primary: '#7c5cff', accent: '#00d9ff', bg: '#0a0a20', name: 'Violet/Cyan' },
  { primary: '#ffffff', accent: '#888888', bg: '#000000', name: 'Blanc/Noir' },
];

export const VideoPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const engine = useAudioEngineContext();
  const hasAudio = !!engine.audioBuffer;

  const [config, setConfig] = useState<VisualizerConfig>({
    style: 'bars',
    primaryColor: '#00d9ff',
    accentColor: '#7c5cff',
    bgColor: '#0a0a14',
    title: 'Mon morceau',
    subtitle: 'WaveForge PRO',
    showGrid: true,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exports, setExports] = useState<VideoExportEntry[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Init audio context
  useEffect(() => {
    if (!engine.audioContext) return;
    audioContextRef.current = engine.audioContext;

    const analyser = engine.audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.82;
    analyserRef.current = analyser;

    return () => {
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch {}
      }
    };
  }, [engine.audioContext]);

  // Met à jour le titre par défaut selon le morceau
  useEffect(() => {
    if (engine.fileName && config.title === 'Mon morceau') {
      const name = engine.fileName.replace(/\.[^.]+$/, '');
      setConfig((c) => ({ ...c, title: name }));
    }
  }, [engine.fileName]);

  // ============================================================
  // PREVIEW (play/pause)
  // ============================================================
  const handlePlayPreview = useCallback(() => {
    if (!engine.audioBuffer || !audioContextRef.current || !analyserRef.current) return;

    if (isPlaying) {
      // Stop
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch {}
        sourceRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    // Play
    const source = audioContextRef.current.createBufferSource();
    source.buffer = engine.audioBuffer;
    source.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);
    source.start(0);
    sourceRef.current = source;
    setIsPlaying(true);

    source.onended = () => {
      setIsPlaying(false);
      sourceRef.current = null;
    };
  }, [engine.audioBuffer, isPlaying]);

  // ============================================================
  // EXPORT
  // ============================================================
  const handleExport = useCallback(async () => {
    if (!engine.audioBuffer || !analyserRef.current || !canvasRef.current) {
      alert('Charge un audio dans le Studio d\'abord.');
      return;
    }

    // Stoppe la preview si active
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
      setIsPlaying(false);
    }

    try {
      setIsExporting(true);
      setExportProgress(0);

      const result: ExportResult = await recordVisualizer({
        audioBuffer: engine.audioBuffer,
        canvas: canvasRef.current,
        analyser: analyserRef.current,
        duration: engine.audioBuffer.duration,
        onProgress: setExportProgress,
      });

      // Télécharge automatiquement
      const filename = `waveforge-video-${Date.now()}.${result.extension}`;
      downloadVideo(result.blob, filename);

      // Ajoute à l'historique
      setExports((prev) => [
        {
          id: `ve-${Date.now()}`,
          timestamp: Date.now(),
          title: config.title || 'Sans titre',
          style: config.style,
          duration: result.duration,
          size: result.size,
          blob: result.blob,
        },
        ...prev,
      ]);
    } catch (e: any) {
      console.error('Erreur export vidéo:', e);
      alert(`Erreur lors de l'export : ${e.message}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [engine.audioBuffer, config.title, config.style]);

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div
      className="fade-in"
      style={{
        padding: isMobile ? 12 : 20,
        display: 'grid',
        gap: isMobile ? 14 : 20,
      }}
    >
      {/* HEADER */}
      <div>
        <h2 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          🎬 <span style={{ color: '#ff5cf0' }}>Générateur de clip</span>
          <span
            style={{
              fontSize: 10,
              color: '#ff5cf0',
              marginLeft: 10,
              padding: '2px 8px',
              background: 'rgba(255, 92, 240, 0.15)',
              border: '1px solid rgba(255, 92, 240, 0.4)',
              borderRadius: 10,
              verticalAlign: 'middle',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            PRO
          </span>
        </h2>
        <p style={{ color: '#888', fontSize: 11, margin: 0 }}>
          Transforme ton morceau en clip vidéo 1080p synchronisé · 100% local · 100% gratuit
        </p>
      </div>

      {/* ÉTAT VIDE */}
      {!hasAudio && (
        <div
          className="panel"
          style={{
            padding: isMobile ? 24 : 40,
            textAlign: 'center',
            borderStyle: 'dashed',
            borderColor: 'rgba(255, 92, 240, 0.3)',
          }}
        >
          <div style={{ fontSize: isMobile ? 40 : 52, marginBottom: 16 }}>🎬</div>
          <div style={{ fontSize: 15, color: '#fff', marginBottom: 10, fontWeight: 600 }}>
            Aucun audio chargé
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#888',
              marginBottom: 24,
              maxWidth: 450,
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}
          >
            Charge un morceau dans le Studio pour créer un clip vidéo synchronisé.
          </div>
          <Link
            to="/studio"
            className="btn-action primary"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #ff5cf0, #d63fb8)',
              color: '#fff',
              borderColor: 'transparent',
              padding: '12px 24px',
              fontSize: 12,
            }}
          >
            🎹 Aller au Studio
          </Link>
        </div>
      )}

      {/* INTERFACE */}
      {hasAudio && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(340px, 420px) 1fr',
            gap: isMobile ? 16 : 20,
            alignItems: 'start',
          }}
        >
          {/* COLONNE GAUCHE : CONTROLS */}
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Style */}
            <div className="panel" style={{ padding: 16 }}>
              <div
                className="label-uppercase"
                style={{ fontSize: 10, color: '#666', letterSpacing: '1px', marginBottom: 10 }}
              >
                🎨 STYLE DU VISUALISEUR
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setConfig({ ...config, style: s.id })}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 6,
                      border:
                        config.style === s.id
                          ? '1px solid #ff5cf0'
                          : '1px solid var(--border)',
                      background:
                        config.style === s.id
                          ? 'rgba(255, 92, 240, 0.15)'
                          : 'var(--bg-1)',
                      color: config.style === s.id ? '#ff5cf0' : '#ccc',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Couleurs */}
            <div className="panel" style={{ padding: 16 }}>
              <div
                className="label-uppercase"
                style={{ fontSize: 10, color: '#666', letterSpacing: '1px', marginBottom: 10 }}
              >
                🎨 PALETTE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {COLOR_PRESETS.map((p) => {
                  const isActive =
                    config.primaryColor === p.primary && config.accentColor === p.accent;
                  return (
                    <button
                      key={p.name}
                      onClick={() =>
                        setConfig({
                          ...config,
                          primaryColor: p.primary,
                          accentColor: p.accent,
                          bgColor: p.bg,
                        })
                      }
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        border: isActive ? `2px solid ${p.primary}` : '1px solid var(--border)',
                        background: p.bg,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.2s',
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${p.primary}, ${p.accent})`,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          color: isActive ? p.primary : '#aaa',
                          fontWeight: 600,
                        }}
                      >
                        {p.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 12,
                  cursor: 'pointer',
                  fontSize: 11,
                  color: '#ccc',
                }}
              >
                <input
                  type="checkbox"
                  checked={config.showGrid}
                  onChange={(e) => setConfig({ ...config, showGrid: e.target.checked })}
                  style={{ accentColor: '#ff5cf0' }}
                />
                Afficher la grille de fond
              </label>
            </div>

            {/* Texte */}
            <div className="panel" style={{ padding: 16 }}>
              <div
                className="label-uppercase"
                style={{ fontSize: 10, color: '#666', letterSpacing: '1px', marginBottom: 10 }}
              >
                📝 TEXTE À L'ÉCRAN
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#666', marginBottom: 4 }}>TITRE</div>
                  <input
                    type="text"
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    placeholder="Titre du morceau"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-1)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: '#fff',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#666', marginBottom: 4 }}>SOUS-TITRE</div>
                  <input
                    type="text"
                    value={config.subtitle}
                    onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                    placeholder="Nom artiste / label"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-1)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: '#fff',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : PREVIEW + EXPORT */}
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Preview */}
            <div className="panel" style={{ padding: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div
                  className="label-uppercase"
                  style={{ fontSize: 10, color: '#666', letterSpacing: '1px' }}
                >
                  👁️ APERÇU · 1920×1080
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 9,
                    color: isPlaying ? '#00ff88' : '#666',
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: isPlaying ? '#00ff88' : '#444',
                      boxShadow: isPlaying ? '0 0 8px #00ff88' : 'none',
                    }}
                  />
                  {isPlaying ? 'LIVE' : 'IDLE'}
                </div>
              </div>

              <Visualizer
                analyser={analyserRef.current}
                isActive={isPlaying}
                config={config}
                registerCanvas={(c) => { canvasRef.current = c; }}
              />

              {/* Boutons de lecture */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={handlePlayPreview}
                  disabled={isExporting}
                  className="btn-action primary"
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: isPlaying ? '#ff3366' : '#ff5cf0',
                    color: isPlaying ? '#fff' : '#000',
                    borderColor: 'transparent',
                    fontWeight: 700,
                    fontSize: 11,
                    justifyContent: 'center',
                  }}
                >
                  {isPlaying ? '⏹ STOP' : '▶ LIRE L\'APERÇU'}
                </button>
              </div>
            </div>

            {/* Export */}
            <div
              className="panel"
              style={{
                padding: 16,
                borderColor: 'rgba(255, 92, 240, 0.3)',
                background: 'linear-gradient(135deg, rgba(255, 92, 240, 0.05), transparent)',
              }}
            >
              <div
                className="label-uppercase"
                style={{ fontSize: 10, color: '#ff5cf0', letterSpacing: '1px', marginBottom: 10 }}
              >
                📼 EXPORT VIDÉO
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: '#888',
                  lineHeight: 1.6,
                  marginBottom: 12,
                }}
              >
                ⚠️ L'export se fait en <strong style={{ color: '#ff5cf0' }}>temps réel</strong> :
                une vidéo de {formatDuration(engine.audioBuffer?.duration ?? 0)} prendra autant de
                temps à générer. Ne ferme pas l'onglet pendant l'export.
              </div>

              <button
                onClick={handleExport}
                disabled={isExporting}
                style={{
                  width: '100%',
                  padding: '14px',
                  border: 'none',
                  borderRadius: 8,
                  background: isExporting
                    ? 'linear-gradient(135deg, #666, #444)'
                    : 'linear-gradient(135deg, #ff5cf0, #d63fb8)',
                  color: isExporting ? '#888' : '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  cursor: isExporting ? 'wait' : 'pointer',
                  boxShadow: isExporting ? 'none' : '0 4px 20px rgba(255, 92, 240, 0.4)',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isExporting
                  ? `⏳ GÉNÉRATION... ${Math.floor(exportProgress)}%`
                  : '🎬 GÉNÉRER LE CLIP VIDÉO'}
                {isExporting && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      height: 3,
                      width: `${exportProgress}%`,
                      background: '#fff',
                      transition: 'width 0.2s linear',
                    }}
                  />
                )}
              </button>
            </div>

            {/* Historique */}
            {exports.length > 0 && (
              <div className="panel" style={{ padding: 16 }}>
                <div
                  className="label-uppercase"
                  style={{ fontSize: 10, color: '#666', letterSpacing: '1px', marginBottom: 10 }}
                >
                  📦 EXPORTS RÉCENTS · {exports.length}
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {exports.slice(0, 5).map((exp) => (
                    <div
                      key={exp.id}
                      style={{
                        padding: 10,
                        background: 'var(--bg-1)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 11,
                            color: '#fff',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {exp.title}
                        </div>
                        <div
                          className="mono"
                          style={{ fontSize: 9, color: '#666', marginTop: 2 }}
                        >
                          {exp.style} · {formatDuration(exp.duration)} · {formatSize(exp.size)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const filename = `waveforge-video-${exp.id}.webm`;
                          downloadVideo(exp.blob, filename);
                        }}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(255, 92, 240, 0.1)',
                          border: '1px solid #ff5cf0',
                          borderRadius: 4,
                          color: '#ff5cf0',
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        💾
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};