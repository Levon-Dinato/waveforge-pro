import { useCallback, useState } from 'react';
import { VideoBackground } from './components/VideoBackground';
import { DropZone } from './components/DropZone';
import { PianoRoll } from './components/PianoRoll';
import { StemPlayer } from './components/StemPlayer';
import { MelodyGenerator } from './components/MelodyGenerator';
import { useAudioEngine } from './hooks/useAudioEngine';
import { exportMidi, download } from './audio/midiExporter';
import { separateVocals, checkDemucsHealth } from './audio/demucsClient';
import { transcribeDrums } from './audio/drumDetector';
import { transcribeBass } from './audio/bassDetector';
import { transcribeChords } from './audio/chordDetector';
import { quantizeNotes, detectKey, snapToKey } from './audio/quantizer';
import type { QuantizeOptions } from './audio/quantizer';
import './styles.css';

export default function App() {
  const engine = useAudioEngine();
  const { result, finalNotes, isAnalyzing, isPlaying, currentTime } = engine;

  const [isSeparating, setIsSeparating] = useState(false);
  const [isAnalyzingVocals, setIsAnalyzingVocals] = useState(false);
  const [isAnalyzingDrums, setIsAnalyzingDrums] = useState(false);
  const [isAnalyzingBass, setIsAnalyzingBass] = useState(false);
  const [isAnalyzingChords, setIsAnalyzingChords] = useState(false);
  const [stems, setStems] = useState<{ vocals: string; noVocals: string } | null>(null);
  const [drumNotes, setDrumNotes] = useState<any[] | null>(null);
  const [bassNotes, setBassNotes] = useState<any[] | null>(null);
  const [chordNotes, setChordNotes] = useState<any[] | null>(null);
  const [demucsOnline, setDemucsOnline] = useState<boolean | null>(null);

  const [quantize, setQuantize] = useState<QuantizeOptions>({
    grid: 16,
    swing: 0,
    strength: 0.8,
  });
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [detectedKey, setDetectedKey] = useState<{
    key: string;
    mode: 'major' | 'minor';
    confidence: number;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  useState(() => {
    checkDemucsHealth().then(setDemucsOnline);
  });

  const handleExport = useCallback(() => {
    if (!result) return;

    let allNotes = [
      ...finalNotes,
      ...(drumNotes || []),
      ...(bassNotes || []),
      ...(chordNotes || []),
    ];

    const melodicNotes = allNotes.filter((n) => n.track !== 'drums');
    const drumNotesOnly = allNotes.filter((n) => n.track === 'drums');

    let processed = quantizeNotes(melodicNotes, result.bpm, quantize);

    if (snapEnabled && detectedKey) {
      processed = snapToKey(processed, detectedKey.key, detectedKey.mode);
    }

    allNotes = [...processed, ...drumNotesOnly];

    const blob = exportMidi(allNotes, result.bpm);
    download(blob, 'waveforge.mid');
  }, [
    result,
    finalNotes,
    drumNotes,
    bassNotes,
    chordNotes,
    quantize,
    snapEnabled,
    detectedKey,
  ]);

  const handleDetectKey = useCallback(() => {
    const allNotes = [...finalNotes, ...(bassNotes || []), ...(chordNotes || [])];
    if (allNotes.length === 0) return;

    const key = detectKey(allNotes);
    setDetectedKey(key);
    console.log(
      `🎼 Tonalité détectée : ${key.key} ${key.mode} (confiance ${(key.confidence * 100).toFixed(0)}%)`
    );
  }, [finalNotes, bassNotes, chordNotes]);

  const handleAnalyzeVocals = useCallback(async () => {
    if (!stems?.vocals) return;
    setIsAnalyzingVocals(true);
    try {
      const ctx = new AudioContext();
      const buffer = await fetch(stems.vocals)
        .then((r) => r.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf));

      const { analyzeMonophonic } = await import('./audio/basicPitchEngine');
      const vocalNotes = analyzeMonophonic(buffer);

      engine.loadNotesFromBuffer(vocalNotes);
      console.log(`✅ ${vocalNotes.length} notes détectées sur vocals.wav`);
    } catch (e) {
      console.error('Erreur analyse voix :', e);
      alert('Erreur : ' + (e as Error).message);
    } finally {
      setIsAnalyzingVocals(false);
    }
  }, [stems, engine]);

  const handleAnalyzeDrums = useCallback(async () => {
    if (!stems?.noVocals) return;
    setIsAnalyzingDrums(true);
    try {
      const ctx = new AudioContext();
      const buffer = await fetch(stems.noVocals)
        .then((r) => r.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf));

      const drums = await transcribeDrums(buffer);
      setDrumNotes(drums);
      console.log(`✅ ${drums.length} événements batterie détectés`);
    } catch (e) {
      console.error('Erreur analyse batterie :', e);
      alert('Erreur : ' + (e as Error).message);
    } finally {
      setIsAnalyzingDrums(false);
    }
  }, [stems]);

  const handleAnalyzeBass = useCallback(async () => {
    if (!stems?.noVocals) return;
    setIsAnalyzingBass(true);
    try {
      const ctx = new AudioContext();
      const buffer = await fetch(stems.noVocals)
        .then((r) => r.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf));

      const bass = await transcribeBass(buffer);
      setBassNotes(bass);
      console.log(`✅ ${bass.length} notes de basse détectées`);
    } catch (e) {
      console.error('Erreur analyse basse :', e);
      alert('Erreur : ' + (e as Error).message);
    } finally {
      setIsAnalyzingBass(false);
    }
  }, [stems]);

  const handleAnalyzeChords = useCallback(async () => {
    if (!stems?.noVocals) return;
    setIsAnalyzingChords(true);
    try {
      const ctx = new AudioContext();
      const buffer = await fetch(stems.noVocals)
        .then((r) => r.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf));

      const chords = await transcribeChords(buffer);
      setChordNotes(chords);
      console.log(`✅ ${chords.length} notes d'accords détectées`);
    } catch (e) {
      console.error('Erreur analyse accords :', e);
      alert('Erreur : ' + (e as Error).message);
    } finally {
      setIsAnalyzingChords(false);
    }
  }, [stems]);

  const handleSeparate = useCallback(async () => {
    if (!engine.audioBuffer) return;
    setIsSeparating(true);
    try {
      const wav = audioBufferToWav(engine.audioBuffer);
      const file = new File([wav], 'input.wav', { type: 'audio/wav' });
      const res = await separateVocals(file);
      setStems({ vocals: res.vocalsUrl, noVocals: res.noVocalsUrl });
      console.log('✅ Stems séparés :', res);
    } catch (e) {
      console.error('Erreur séparation :', e);
      alert('Erreur : ' + (e as Error).message);
    } finally {
      setIsSeparating(false);
    }
  }, [engine.audioBuffer]);

  return (
    <>
      <VideoBackground />

      <div
        className="studio-grid"
        style={{
          minHeight: '100vh',
          padding: 20,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* HEADER */}
          <header
            className="fade-in"
            style={{
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 16,
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  boxShadow: '0 0 20px rgba(0, 217, 255, 0.4)',
                }}
              >
                🎹
              </div>
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    color: '#fff',
                  }}
                >
                  WAVEFORGE{' '}
                  <span style={{ color: 'var(--cyan)', fontWeight: 300 }}>
                    PRO
                  </span>
                </h1>
                <p
                  className="label-uppercase"
                  style={{ margin: 0, fontSize: 9, color: '#666' }}
                >
                  Audio → MIDI Studio
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {demucsOnline !== null && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    background: demucsOnline
                      ? 'rgba(0, 255, 136, 0.08)'
                      : 'rgba(255, 51, 102, 0.08)',
                    border: `1px solid ${
                      demucsOnline
                        ? 'rgba(0, 255, 136, 0.3)'
                        : 'rgba(255, 51, 102, 0.3)'
                    }`,
                    borderRadius: 4,
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    color: demucsOnline ? '#00ff88' : '#ff3366',
                    letterSpacing: '0.05em',
                  }}
                >
                  <div
                    className={`led ${demucsOnline ? 'active' : ''}`}
                    style={{
                      background: demucsOnline ? '#00ff88' : '#ff3366',
                    }}
                  />
                  DEMUCS {demucsOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
              )}
            </div>
          </header>

          {/* DROP ZONE */}
          <DropZone onFile={engine.loadFile} isAnalyzing={isAnalyzing} />

          {/* CONTENU */}
          {result && (
            <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
              {/* PIANO ROLL */}
              <PianoRoll
                notes={[
                  ...finalNotes,
                  ...(drumNotes || []),
                  ...(bassNotes || []),
                  ...(chordNotes || []),
                ]}
                duration={result.duration}
                currentTime={currentTime}
                onSeek={engine.seek}
              />

              {/* BARRE DE BOUTONS */}
              <div className="panel slide-in">
                <div className="panel-header">
                  <span>⚡ TRANSPORT & ANALYSE</span>
                  <span className="mono" style={{ fontSize: 10, color: '#888' }}>
                    {isAnalyzing
                      ? '⏳ ANALYSE...'
                      : `🎵 ${finalNotes.length}${
                          drumNotes ? ` + 🥁 ${drumNotes.length}` : ''
                        }${
                          bassNotes ? ` + 🎸 ${bassNotes.length}` : ''
                        }${
                          chordNotes ? ` + 🎹 ${chordNotes.length}` : ''
                        } · ${result.duration.toFixed(2)}s`}
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
                    <button
                      className="btn-action"
                      onClick={engine.playAudioOriginal}
                    >
                      ▶ AUDIO
                    </button>
                    <button
                      className="btn-action primary"
                      onClick={engine.playMidi}
                      disabled={finalNotes.length === 0}
                    >
                      ▶ MIDI
                    </button>
                    <button
                      className="btn-action"
                      onClick={engine.stopAll}
                      disabled={!isPlaying}
                    >
                      ⏹ STOP
                    </button>
                    <button
                      className="btn-action primary"
                      onClick={handleExport}
                      disabled={
                        finalNotes.length === 0 &&
                        !drumNotes &&
                        !bassNotes &&
                        !chordNotes
                      }
                    >
                      💾 EXPORT MIDI
                    </button>
                    <div
                      style={{
                        width: 1,
                        height: 20,
                        background: 'var(--border)',
                        margin: '0 4px',
                      }}
                    />
                    <button
                      className="btn-action"
                      onClick={handleSeparate}
                      disabled={isSeparating || demucsOnline === false}
                    >
                      {isSeparating ? '⏳ SÉPARATION...' : '🎤 SÉPARER STEMS'}
                    </button>

                    {stems && (
                      <>
                        <button
                          className="btn-action"
                          onClick={handleAnalyzeVocals}
                          disabled={isAnalyzingVocals}
                          style={{ borderColor: 'rgba(255, 184, 0, 0.3)' }}
                        >
                          {isAnalyzingVocals ? '⏳' : '🎼'} VOIX
                        </button>
                        <button
                          className="btn-action"
                          onClick={handleAnalyzeDrums}
                          disabled={isAnalyzingDrums}
                          style={{ borderColor: 'rgba(0, 255, 136, 0.3)' }}
                        >
                          {isAnalyzingDrums ? '⏳' : '🥁'} BATTERIE
                        </button>
                        <button
                          className="btn-action"
                          onClick={handleAnalyzeBass}
                          disabled={isAnalyzingBass}
                          style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}
                        >
                          {isAnalyzingBass ? '⏳' : '🎸'} BASSE
                        </button>
                        <button
                          className="btn-action"
                          onClick={handleAnalyzeChords}
                          disabled={isAnalyzingChords}
                          style={{ borderColor: 'rgba(236, 72, 153, 0.3)' }}
                        >
                          {isAnalyzingChords ? '⏳' : '🎹'} ACCORDS
                        </button>
                      </>
                    )}

                    <div style={{ flex: 1 }} />

                    <button
                      className="btn-action"
                      onClick={() => setShowSettings(!showSettings)}
                    >
                      {showSettings ? '✕' : '⚙️'} OPTIONS
                    </button>
                    <button
                      className="btn-action"
                      onClick={() => setShowGenerator(!showGenerator)}
                      style={{
                        background: showGenerator
                          ? 'var(--cyan)'
                          : 'var(--bg-2)',
                        color: showGenerator ? 'var(--bg-0)' : 'var(--text)',
                        borderColor: showGenerator ? 'var(--cyan)' : 'var(--border)',
                      }}
                    >
                      {showGenerator ? '✕' : '🎼'} GÉNÉRATEUR
                    </button>
                  </div>

                  {/* OPTIONS */}
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
                      <div
                        className="label-uppercase"
                        style={{ marginBottom: 12, color: 'var(--cyan)' }}
                      >
                        ⚙️ OPTIONS D'EXPORT MIDI
                      </div>

                      {/* Quantize */}
                      <div style={{ marginBottom: 12 }}>
                        <div
                          className="label-uppercase"
                          style={{ marginBottom: 6 }}
                        >
                          Quantisation
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[
                            { v: 0, l: 'OFF' },
                            { v: 4, l: '1/4' },
                            { v: 8, l: '1/8' },
                            { v: 16, l: '1/16' },
                            { v: 32, l: '1/32' },
                          ].map((opt) => (
                            <button
                              key={opt.v}
                              onClick={() =>
                                setQuantize({ ...quantize, grid: opt.v as any })
                              }
                              className="btn-action"
                              style={{
                                padding: '5px 10px',
                                fontSize: 10,
                                background:
                                  quantize.grid === opt.v
                                    ? 'var(--cyan)'
                                    : 'var(--bg-2)',
                                color:
                                  quantize.grid === opt.v
                                    ? 'var(--bg-0)'
                                    : 'var(--text)',
                                borderColor:
                                  quantize.grid === opt.v
                                    ? 'var(--cyan)'
                                    : 'var(--border)',
                              }}
                            >
                              {opt.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Force */}
                      <div style={{ marginBottom: 12 }}>
                        <div
                          className="label-uppercase"
                          style={{ marginBottom: 6 }}
                        >
                          Force : {Math.round(quantize.strength * 100)}%
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={quantize.strength}
                          onChange={(e) =>
                            setQuantize({
                              ...quantize,
                              strength: parseFloat(e.target.value),
                            })
                          }
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Swing */}
                      <div style={{ marginBottom: 12 }}>
                        <div
                          className="label-uppercase"
                          style={{ marginBottom: 6 }}
                        >
                          Swing : {Math.round(quantize.swing * 100)}%
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={quantize.swing}
                          onChange={(e) =>
                            setQuantize({
                              ...quantize,
                              swing: parseFloat(e.target.value),
                            })
                          }
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Snap */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <button
                          className="btn-action"
                          onClick={() => setSnapEnabled(!snapEnabled)}
                          style={{
                            background: snapEnabled
                              ? 'var(--green)'
                              : 'var(--bg-2)',
                            color: snapEnabled ? 'var(--bg-0)' : 'var(--text)',
                            borderColor: snapEnabled
                              ? 'var(--green)'
                              : 'var(--border)',
                          }}
                        >
                          {snapEnabled ? '✅' : '⭕'} SNAP GAMME
                        </button>
                        {detectedKey ? (
                          <span
                            className="mono"
                            style={{ fontSize: 10, color: 'var(--cyan)' }}
                          >
                            {detectedKey.key} {detectedKey.mode} (
                            {(detectedKey.confidence * 100).toFixed(0)}%)
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

              {/* GÉNÉRATEUR */}
              {showGenerator && (
                <div className="slide-in">
                  <MelodyGenerator bpm={result.bpm} />
                </div>
              )}

              {/* STEMS SÉPARÉS */}
              {stems && (
                <>
                  <div className="panel slide-in delay-1">
                    <div className="panel-header">
                      <span>🎉 STEMS SÉPARÉS</span>
                    </div>
                    <div className="panel-body">
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        {stems.vocals && (
                          <a
                            href={stems.vocals}
                            download="vocals.wav"
                            className="btn-action"
                            style={{
                              textDecoration: 'none',
                              color: 'var(--cyan)',
                              borderColor: 'rgba(0, 217, 255, 0.3)',
                              display: 'inline-block',
                            }}
                          >
                            🎤 VOCALS.WAV
                          </a>
                        )}
                        {stems.noVocals && (
                          <a
                            href={stems.noVocals}
                            download="no_vocals.wav"
                            className="btn-action"
                            style={{
                              textDecoration: 'none',
                              color: 'var(--cyan)',
                              borderColor: 'rgba(0, 217, 255, 0.3)',
                              display: 'inline-block',
                            }}
                          >
                            🎸 NO_VOCALS.WAV
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="slide-in delay-2">
                    <StemPlayer
                      audioBuffer={engine.audioBuffer}
                      stems={[
                        {
                          id: 'vocals',
                          name: 'VOIX',
                          url: stems.vocals,
                          color: '#ff3366',
                          icon: '🎤',
                        },
                        {
                          id: 'no_vocals',
                          name: 'INSTRUMENTAL',
                          url: stems.noVocals,
                          color: '#00ff88',
                          icon: '🎸',
                        },
                      ].filter((s) => s.url)}
                    />
                  </div>
                </>
              )}

              {/* BATTERIE */}
              {drumNotes && drumNotes.length > 0 && (
                <div
                  className="panel slide-in delay-3"
                  style={{ borderColor: 'rgba(0, 255, 136, 0.2)' }}
                >
                  <div
                    className="panel-header"
                    style={{ color: 'var(--green)' }}
                  >
                    <span>🥁 BATTERIE DÉTECTÉE (BASIC PITCH)</span>
                    <span className="mono" style={{ fontSize: 10 }}>
                      {drumNotes.length} HITS
                    </span>
                  </div>
                  <div className="panel-body">
                    <div
                      style={{
                        display: 'flex',
                        gap: 20,
                        flexWrap: 'wrap',
                        fontSize: 11,
                      }}
                    >
                      <span>
                        <span className="label-uppercase">KICK :</span>{' '}
                        <strong className="mono" style={{ color: 'var(--green)' }}>
                          {drumNotes.filter((n) => n.midi === 36).length}
                        </strong>
                      </span>
                      <span>
                        <span className="label-uppercase">SNARE :</span>{' '}
                        <strong className="mono" style={{ color: 'var(--green)' }}>
                          {drumNotes.filter((n) => n.midi === 38).length}
                        </strong>
                      </span>
                      <span>
                        <span className="label-uppercase">HIHAT :</span>{' '}
                        <strong className="mono" style={{ color: 'var(--green)' }}>
                          {drumNotes.filter((n) => n.midi === 42).length}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* BASSE */}
              {bassNotes && bassNotes.length > 0 && (
                <div
                  className="panel slide-in delay-3"
                  style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}
                >
                  <div
                    className="panel-header"
                    style={{ color: 'var(--purple)' }}
                  >
                    <span>🎸 BASSE DÉTECTÉE</span>
                    <span className="mono" style={{ fontSize: 10 }}>
                      {bassNotes.length} NOTES
                    </span>
                  </div>
                  <div className="panel-body">
                    <div
                      style={{
                        display: 'flex',
                        gap: 20,
                        flexWrap: 'wrap',
                        fontSize: 11,
                      }}
                    >
                      <span>
                        <span className="label-uppercase">MIN :</span>{' '}
                        <strong className="mono" style={{ color: 'var(--purple)' }}>
                          {Math.min(...bassNotes.map((n) => n.midi))}
                        </strong>
                      </span>
                      <span>
                        <span className="label-uppercase">MAX :</span>{' '}
                        <strong className="mono" style={{ color: 'var(--purple)' }}>
                          {Math.max(...bassNotes.map((n) => n.midi))}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ACCORDS */}
              {chordNotes && chordNotes.length > 0 && (
                <div
                  className="panel slide-in delay-3"
                  style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}
                >
                  <div
                    className="panel-header"
                    style={{ color: '#ec4899' }}
                  >
                    <span>🎹 ACCORDS DÉTECTÉS</span>
                    <span className="mono" style={{ fontSize: 10 }}>
                      {chordNotes.length} NOTES
                    </span>
                  </div>
                  <div className="panel-body">
                    <div
                      style={{
                        display: 'flex',
                        gap: 20,
                        flexWrap: 'wrap',
                        fontSize: 11,
                      }}
                    >
                      <span>
                        <span className="label-uppercase">MIN :</span>{' '}
                        <strong className="mono" style={{ color: '#ec4899' }}>
                          {Math.min(...chordNotes.map((n) => n.midi))}
                        </strong>
                      </span>
                      <span>
                        <span className="label-uppercase">MAX :</span>{' '}
                        <strong className="mono" style={{ color: '#ec4899' }}>
                          {Math.max(...chordNotes.map((n) => n.midi))}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FOOTER */}
          <footer
            style={{
              marginTop: 32,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
              textAlign: 'center',
              fontSize: 10,
              color: '#555',
              letterSpacing: '0.05em',
            }}
          >
            WAVEFORGE PRO · YIN · TONE.JS · DEMUCS · BASIC PITCH · v1.0
          </footer>
        </div>
      </div>
    </>
  );
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++)
    channels.push(buffer.getChannelData(i));

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = Math.max(-1, Math.min(1, channels[ch][i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}