import { useCallback, useState } from 'react';
import { VideoBackground } from './components/VideoBackground';
import { DropZone } from './components/DropZone';
import { PianoRoll } from './components/PianoRoll';
import { StemPlayer } from './components/StemPlayer';
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
        style={{
          padding: 24,
          maxWidth: 1000,
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <header
          style={{
            marginBottom: 32,
            textAlign: 'center',
            animation: 'fadeInUp 0.6s ease both',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: '-1.5px',
              background: 'linear-gradient(135deg, #7c5cff 0%, #ff5c9d 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 20px rgba(124, 92, 255, 0.4))',
            }}
          >
            🎹 WaveForge PRO
          </h1>
          <p
            style={{
              margin: '8px 0 0',
              color: '#aaa',
              fontSize: 15,
              letterSpacing: 0.5,
            }}
          >
            De l'onde à la note. Instantanément.
          </p>
          {demucsOnline !== null && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 12,
                padding: '4px 12px',
                background: demucsOnline
                  ? 'rgba(74, 222, 128, 0.1)'
                  : 'rgba(255, 92, 157, 0.1)',
                border: `1px solid ${
                  demucsOnline
                    ? 'rgba(74, 222, 128, 0.3)'
                    : 'rgba(255, 92, 157, 0.3)'
                }`,
                borderRadius: 20,
                fontSize: 12,
                color: demucsOnline ? '#4ade80' : '#ff5c9d',
              }}
            >
              {demucsOnline
                ? '🟢 Serveur Demucs en ligne'
                : '🔴 Séparation de stems : disponible en local'}
            </div>
          )}
        </header>

        <DropZone onFile={engine.loadFile} isAnalyzing={isAnalyzing} />

        {result && (
          <div
            style={{
              marginTop: 24,
              display: 'grid',
              gap: 16,
              animation: 'fadeInUp 0.5s ease both',
            }}
          >
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

            <div className="glass" style={{ padding: 16 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={engine.playAudioOriginal}
                  style={btnStyle('#3a3a4a')}
                >
                  ▶ Audio original
                </button>
                <button
                  onClick={engine.playMidi}
                  style={btnStyle('#7c5cff')}
                  disabled={finalNotes.length === 0}
                >
                  ▶ MIDI
                </button>
                <button
                  onClick={engine.stopAll}
                  style={btnStyle('#3a3a4a')}
                  disabled={!isPlaying}
                >
                  ⏹ Stop
                </button>
                <button
                  onClick={handleExport}
                  style={btnStyle('#ff5c9d')}
                  disabled={
                    finalNotes.length === 0 &&
                    !drumNotes &&
                    !bassNotes &&
                    !chordNotes
                  }
                >
                  💾 Export .mid
                </button>
                <button
                  onClick={handleSeparate}
                  disabled={isSeparating || demucsOnline === false}
                  style={btnStyle('#0ea5e9')}
                >
                  {isSeparating
                    ? '⏳ Séparation en cours…'
                    : '🎤 Séparer les stems'}
                </button>

                {stems && (
                  <button
                    onClick={handleAnalyzeVocals}
                    disabled={isAnalyzingVocals}
                    style={btnStyle('#f59e0b')}
                  >
                    {isAnalyzingVocals
                      ? '⏳ Analyse voix…'
                      : '🎼 Analyser la voix'}
                  </button>
                )}

                {stems && (
                  <button
                    onClick={handleAnalyzeDrums}
                    disabled={isAnalyzingDrums}
                    style={btnStyle('#10b981')}
                  >
                    {isAnalyzingDrums
                      ? '⏳ Analyse batterie…'
                      : '🥁 Analyser la batterie'}
                  </button>
                )}

                {stems && (
                  <button
                    onClick={handleAnalyzeBass}
                    disabled={isAnalyzingBass}
                    style={btnStyle('#8b5cf6')}
                  >
                    {isAnalyzingBass
                      ? '⏳ Analyse basse…'
                      : '🎸 Analyser la basse'}
                  </button>
                )}

                {stems && (
                  <button
                    onClick={handleAnalyzeChords}
                    disabled={isAnalyzingChords}
                    style={btnStyle('#ec4899')}
                  >
                    {isAnalyzingChords
                      ? '⏳ Analyse accords…'
                      : '🎹 Analyser les accords'}
                  </button>
                )}

                <button
                  onClick={() => setShowSettings(!showSettings)}
                  style={btnStyle('#6b7280')}
                >
                  {showSettings ? '✕ Fermer' : '⚙️ Options'}
                </button>

                <div
                  style={{
                    marginLeft: 'auto',
                    color: '#aaa',
                    fontSize: 14,
                  }}
                >
                  {isAnalyzing
                    ? '⏳ Analyse…'
                    : `🎵 ${finalNotes.length}${
                        drumNotes ? ` + 🥁 ${drumNotes.length}` : ''
                      }${
                        bassNotes ? ` + 🎸 ${bassNotes.length}` : ''
                      }${chordNotes ? ` + 🎹 ${chordNotes.length}` : ''} · ${result.duration.toFixed(2)}s`}
                </div>
              </div>

              {showSettings && (
                <div
                  className="glass"
                  style={{ padding: 16, marginTop: 16 }}
                >
                  <h3
                    style={{
                      margin: '0 0 16px',
                      fontSize: 14,
                      color: '#e8e8f0',
                    }}
                  >
                    ⚙️ Options d'export MIDI
                  </h3>

                  <div style={{ marginBottom: 12 }}>
                    <label
                      style={{
                        fontSize: 12,
                        color: '#aaa',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Quantisation
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { v: 0, l: 'Off' },
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
                          style={{
                            ...btnStyle(
                              quantize.grid === opt.v ? '#7c5cff' : '#2a2a3a'
                            ),
                            fontSize: 12,
                            padding: '6px 12px',
                          }}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label
                      style={{
                        fontSize: 12,
                        color: '#aaa',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Force : {Math.round(quantize.strength * 100)}%
                    </label>
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

                  <div style={{ marginBottom: 12 }}>
                    <label
                      style={{
                        fontSize: 12,
                        color: '#aaa',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Swing : {Math.round(quantize.swing * 100)}%
                    </label>
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

                  <div style={{ marginBottom: 12 }}>
                    <button
                      onClick={() => setSnapEnabled(!snapEnabled)}
                      style={{
                        ...btnStyle(snapEnabled ? '#4ade80' : '#2a2a3a'),
                        fontSize: 12,
                        padding: '6px 12px',
                      }}
                    >
                      {snapEnabled ? '✅' : '⭕'} Snap à la gamme
                    </button>
                    {detectedKey && (
                      <span
                        style={{
                          marginLeft: 12,
                          fontSize: 12,
                          color: '#aaa',
                        }}
                      >
                        Détecté : {detectedKey.key} {detectedKey.mode} (
                        {(detectedKey.confidence * 100).toFixed(0)}%)
                      </span>
                    )}
                    {!detectedKey && (
                      <button
                        onClick={handleDetectKey}
                        style={{
                          ...btnStyle('#f59e0b'),
                          fontSize: 12,
                          padding: '6px 12px',
                          marginLeft: 12,
                        }}
                      >
                        🎼 Détecter la tonalité
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {stems && (
              <>
                <div className="glass" style={{ padding: 16 }}>
                  <h3
                    style={{
                      margin: '0 0 12px',
                      fontSize: 16,
                      color: '#e8e8f0',
                    }}
                  >
                    🎉 Stems séparés
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      gap: 16,
                      flexWrap: 'wrap',
                    }}
                  >
                    {stems.vocals && (
                      <a
                        href={stems.vocals}
                        download="vocals.wav"
                        style={stemLinkStyle()}
                      >
                        🎤 Télécharger vocals.wav
                      </a>
                    )}
                    {stems.noVocals && (
                      <a
                        href={stems.noVocals}
                        download="no_vocals.wav"
                        style={stemLinkStyle()}
                      >
                        🎸 Télécharger no_vocals.wav
                      </a>
                    )}
                  </div>
                </div>

                <StemPlayer
                  stems={[
                    {
                      id: 'vocals',
                      name: 'Voix',
                      url: stems.vocals,
                      color: '#ff5c9d',
                      icon: '🎤',
                    },
                    {
                      id: 'no_vocals',
                      name: 'Instrumental',
                      url: stems.noVocals,
                      color: '#4ade80',
                      icon: '🎸',
                    },
                  ].filter((s) => s.url)}
                />
              </>
            )}

            {drumNotes && drumNotes.length > 0 && (
              <div
                className="glass"
                style={{
                  padding: 16,
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 12px',
                    fontSize: 16,
                    color: '#10b981',
                  }}
                >
                  🥁 Batterie détectée (Basic Pitch)
                </h3>
                <div
                  style={{
                    display: 'flex',
                    gap: 24,
                    flexWrap: 'wrap',
                    fontSize: 13,
                    color: '#ccc',
                  }}
                >
                  <span>
                    🥁 Kick :{' '}
                    <strong>
                      {drumNotes.filter((n) => n.midi === 36).length}
                    </strong>
                  </span>
                  <span>
                    🥁 Snare :{' '}
                    <strong>
                      {drumNotes.filter((n) => n.midi === 38).length}
                    </strong>
                  </span>
                  <span>
                    🥁 Hihat :{' '}
                    <strong>
                      {drumNotes.filter((n) => n.midi === 42).length}
                    </strong>
                  </span>
                  <span>
                    Total : <strong>{drumNotes.length}</strong>
                  </span>
                </div>
              </div>
            )}

            {bassNotes && bassNotes.length > 0 && (
              <div
                className="glass"
                style={{
                  padding: 16,
                  borderColor: 'rgba(139, 92, 246, 0.4)',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 12px',
                    fontSize: 16,
                    color: '#8b5cf6',
                  }}
                >
                  🎸 Basse détectée
                </h3>
                <div
                  style={{
                    display: 'flex',
                    gap: 24,
                    flexWrap: 'wrap',
                    fontSize: 13,
                    color: '#ccc',
                  }}
                >
                  <span>
                    Total : <strong>{bassNotes.length}</strong> notes
                  </span>
                  <span>
                    Note la plus basse :{' '}
                    <strong>{Math.min(...bassNotes.map((n) => n.midi))}</strong>
                  </span>
                  <span>
                    Note la plus haute :{' '}
                    <strong>{Math.max(...bassNotes.map((n) => n.midi))}</strong>
                  </span>
                </div>
              </div>
            )}

            {chordNotes && chordNotes.length > 0 && (
              <div
                className="glass"
                style={{
                  padding: 16,
                  borderColor: 'rgba(236, 72, 153, 0.4)',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 12px',
                    fontSize: 16,
                    color: '#ec4899',
                  }}
                >
                  🎹 Accords détectés
                </h3>
                <div
                  style={{
                    display: 'flex',
                    gap: 24,
                    flexWrap: 'wrap',
                    fontSize: 13,
                    color: '#ccc',
                  }}
                >
                  <span>
                    Total : <strong>{chordNotes.length}</strong> notes
                  </span>
                  <span>
                    Note la plus basse :{' '}
                    <strong>{Math.min(...chordNotes.map((n) => n.midi))}</strong>
                  </span>
                  <span>
                    Note la plus haute :{' '}
                    <strong>{Math.max(...chordNotes.map((n) => n.midi))}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <footer
          style={{
            marginTop: 32,
            color: '#555',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          Prototype v0.8 — YIN · Tone.js · Demucs · Basic Pitch · Quantize · Key
        </footer>
      </div>
    </>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '10px 16px',
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
  };
}

function stemLinkStyle(): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '10px 16px',
    background: 'rgba(30, 30, 42, 0.8)',
    color: '#4ade80',
    borderRadius: 8,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 13,
    border: '1px solid rgba(74, 222, 128, 0.3)',
    transition: 'all 0.15s ease',
  };
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