// src/pages/StudioPage.tsx
import React, { useState, useCallback } from 'react';
import { DropZone } from '../components/DropZone';
import { Waveform } from '../components/Waveform';
import { TrackSelector } from '../components/TrackSelector';
import { PianoRoll } from '../components/PianoRoll';
import { TimelineMarkers } from '../components/TimelineMarkers';
import { UploadProgress } from '../components/UploadProgress';
import { Tooltip } from '../components/Tooltip';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { exportMidi, download } from '../audio/midiExporter';
import { detectSections } from '../audio/sectionDetector';
import type { Section } from '../audio/sectionDetector';
import { quantizeNotes, detectKey, snapToKey } from '../audio/quantizer';
import type { QuantizeOptions } from '../audio/quantizer';

export const StudioPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const engine = useAudioEngineContext();
  const { result, finalNotes, isAnalyzing, isPlaying, currentTime, fileName, fileSize, fileFormat } = engine;

  const [sections, setSections] = useState<Section[]>([]);
  const [isDetectingSections, setIsDetectingSections] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [detectedKey, setDetectedKey] = useState<{ key: string; mode: 'major' | 'minor'; confidence: number } | null>(null);
  const [quantize, setQuantize] = useState<QuantizeOptions>({ grid: 16, swing: 0, strength: 0.8 });
  const [trackEnabled, setTrackEnabled] = useState({ melody: true, bass: true, harmony: true, drums: true });
  const [uploadProgress] = useState({ visible: false, percent: 0, loaded: 0, total: 0, stage: 'upload' as const });

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleExport = useCallback(() => {
    if (!result) return;
    let allNotes = [...(trackEnabled.melody ? finalNotes : [])];
    const melodicNotes = allNotes.filter((n) => n.track !== 'drums');
    let processed = quantizeNotes(melodicNotes, result.bpm, quantize);
    if (snapEnabled && detectedKey) {
      processed = snapToKey(processed, detectedKey.key, detectedKey.mode);
    }
    allNotes = processed;
    const blob = exportMidi(allNotes, result.bpm);
    download(blob, 'waveforge.mid');
  }, [result, finalNotes, quantize, snapEnabled, detectedKey, trackEnabled]);

  const handleDetectKey = useCallback(() => {
    if (finalNotes.length === 0) return;
    const key = detectKey(finalNotes);
    setDetectedKey(key);
  }, [finalNotes]);

  const handleDetectSections = useCallback(async () => {
    if (!engine.audioBuffer) return;
    setIsDetectingSections(true);
    try {
      const detected = await detectSections(engine.audioBuffer);
      setSections(detected);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDetectingSections(false);
    }
  }, [engine.audioBuffer]);

  return (
    <div
      className="fade-in"
      style={{
        padding: isMobile ? 12 : 20,
        display: 'grid',
        gap: isMobile ? 12 : 16,
      }}
    >
      {/* HEADER */}
      <div>
        <h2 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          🎹 <span style={{ color: 'var(--cyan)' }}>Studio</span>
        </h2>
        <p style={{ color: '#888', fontSize: 11, margin: 0 }}>
          Analyse audio → MIDI, quantisation, export multipiste
        </p>
      </div>

      <DropZone onFile={engine.loadFile} isAnalyzing={isAnalyzing} />

      {/* WAVEFORM */}
      {result && (
        <div className="panel" style={{ overflow: 'hidden', borderColor: 'rgba(0, 217, 255, 0.15)' }}>
          <div
            className="panel-header"
            style={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
              padding: '8px 12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--cyan)',
                  maxWidth: '70%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                🎵 {fileName || 'SANS TITRE'}
              </span>
              <span className="mono" style={{ fontSize: 10, color: '#888' }}>
                {formatTime(currentTime)} / {formatTime(result.duration)}
              </span>
            </div>
            <div
              className="label-uppercase"
              style={{ fontSize: 8, color: '#666', display: 'flex', gap: 6, flexWrap: 'wrap' }}
            >
              {fileFormat && <span>{fileFormat}</span>}
              <span>·</span>
              <span>{result.sampleRate} Hz</span>
              <span>·</span>
              <span>{formatTime(result.duration)}</span>
              <span>·</span>
              <span>{formatSize(fileSize)}</span>
              <span>·</span>
              <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{result.bpm} BPM</span>
            </div>
          </div>

          {sections.length > 0 && (
            <TimelineMarkers
              sections={sections}
              duration={result.duration}
              currentTime={currentTime}
              bpm={result.bpm}
              onSeek={engine.seek}
            />
          )}

          <Waveform
            audioBuffer={engine.audioBuffer}
            currentTime={currentTime}
            duration={result.duration}
            onSeek={engine.seek}
            height={isMobile ? 70 : 100}
            variant="full"
          />
        </div>
      )}

      {/* TRANSPORT */}
      {result && (
        <div className="panel slide-in" style={{ overflow: 'visible' }}>
          <div className="panel-header">
            <span>⚡ TRANSPORT & ANALYSE</span>
            <span className="mono" style={{ fontSize: 10, color: '#888' }}>
              {isAnalyzing ? '⏳ ANALYSE...' : `🎵 ${finalNotes.length}`}
            </span>
          </div>
          <div className="panel-body">
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Tooltip text="Joue l'audio original">
                <button className="btn-action" onClick={engine.playAudioOriginal}>
                  ▶ AUDIO
                </button>
              </Tooltip>
              <Tooltip text="Joue les notes MIDI">
                <button
                  className="btn-action primary"
                  onClick={engine.playMidi}
                  disabled={finalNotes.length === 0}
                >
                  ▶ MIDI
                </button>
              </Tooltip>
              <Tooltip text="Arrête la lecture">
                <button className="btn-action" onClick={engine.stopAll} disabled={!isPlaying}>
                  ⏹ STOP
                </button>
              </Tooltip>
              <Tooltip text="Exporte en MIDI">
                <button
                  className="btn-action primary"
                  onClick={handleExport}
                  disabled={finalNotes.length === 0}
                >
                  💾 EXPORT
                </button>
              </Tooltip>

              {!isMobile && <div style={{ flex: 1 }} />}
              {isMobile && <div style={{ width: '100%' }} />}

              <Tooltip text="Détecte les sections">
                <button
                  className="btn-action"
                  onClick={handleDetectSections}
                  disabled={isDetectingSections}
                  style={{
                    background: sections.length > 0 ? 'var(--cyan-dim)' : 'var(--bg-2)',
                    color: sections.length > 0 ? 'var(--cyan)' : 'var(--text)',
                    borderColor: sections.length > 0 ? 'var(--cyan)' : 'var(--border)',
                  }}
                >
                  {isDetectingSections ? '⏳...' : `🎬 SECTIONS${sections.length > 0 ? ` (${sections.length})` : ''}`}
                </button>
              </Tooltip>

              <Tooltip text="Options d'export">
                <button className="btn-action" onClick={() => setShowSettings(!showSettings)}>
                  {showSettings ? '✕' : '⚙️'} OPTIONS
                </button>
              </Tooltip>
            </div>

            {showSettings && (
              <div
                className="fade-in"
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                }}
              >
                <div className="label-uppercase" style={{ marginBottom: 12, color: 'var(--cyan)' }}>
                  ⚙️ OPTIONS D'EXPORT MIDI
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div className="label-uppercase" style={{ marginBottom: 6 }}>
                    Quantisation
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { v: 0, l: 'OFF' },
                      { v: 4, l: '1/4' },
                      { v: 8, l: '1/8' },
                      { v: 16, l: '1/16' },
                      { v: 32, l: '1/32' },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        onClick={() => setQuantize({ ...quantize, grid: opt.v as any })}
                        className="btn-action"
                        style={{
                          padding: '5px 10px',
                          fontSize: 10,
                          background: quantize.grid === opt.v ? 'var(--cyan)' : 'var(--bg-2)',
                          color: quantize.grid === opt.v ? 'var(--bg-0)' : 'var(--text)',
                          borderColor: quantize.grid === opt.v ? 'var(--cyan)' : 'var(--border)',
                        }}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div className="label-uppercase" style={{ marginBottom: 6 }}>
                    Force : {Math.round(quantize.strength * 100)}%
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={quantize.strength}
                    onChange={(e) => setQuantize({ ...quantize, strength: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div className="label-uppercase" style={{ marginBottom: 6 }}>
                    Swing : {Math.round(quantize.swing * 100)}%
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={quantize.swing}
                    onChange={(e) => setQuantize({ ...quantize, swing: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    className="btn-action"
                    onClick={() => setSnapEnabled(!snapEnabled)}
                    style={{
                      background: snapEnabled ? 'var(--green)' : 'var(--bg-2)',
                      color: snapEnabled ? 'var(--bg-0)' : 'var(--text)',
                      borderColor: snapEnabled ? 'var(--green)' : 'var(--border)',
                    }}
                  >
                    {snapEnabled ? '✅' : '⭕'} SNAP GAMME
                  </button>
                  {detectedKey ? (
                    <span className="mono" style={{ fontSize: 10, color: 'var(--cyan)' }}>
                      {detectedKey.key} {detectedKey.mode} ({(detectedKey.confidence * 100).toFixed(0)}%)
                    </span>
                  ) : (
                    <button
                      className="btn-action"
                      onClick={handleDetectKey}
                      style={{
                        background: 'var(--yellow)',
                        color: 'var(--bg-0)',
                        borderColor: 'var(--yellow)',
                      }}
                    >
                      🎼 DÉTECTER TONALITÉ
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TRACKS + PIANOROLL */}
      {result && (
        <>
          <TrackSelector
            tracks={[
              { id: 'melody', name: 'MELODY', color: '#7c5cff', icon: '🎼', enabled: trackEnabled.melody, count: finalNotes.length },
              { id: 'bass', name: 'BASS', color: '#00ff88', icon: '🎸', enabled: trackEnabled.bass, count: 0 },
              { id: 'harmony', name: 'CHORDS', color: '#ec4899', icon: '🎹', enabled: trackEnabled.harmony, count: 0 },
              { id: 'drums', name: 'DRUMS', color: '#ffb800', icon: '🥁', enabled: trackEnabled.drums, count: 0 },
            ]}
            onToggle={(id) => setTrackEnabled((prev) => ({ ...prev, [id]: !prev[id as keyof typeof prev] }))}
          />

          <UploadProgress
            percent={uploadProgress.percent}
            loaded={uploadProgress.loaded}
            total={uploadProgress.total}
            visible={uploadProgress.visible}
            stage={uploadProgress.stage}
          />

          <PianoRoll
            notes={finalNotes}
            duration={result.duration}
            currentTime={currentTime}
            bpm={result.bpm}
            grid={quantize.grid}
            onSeek={engine.seek}
          />
        </>
      )}
    </div>
  );
};