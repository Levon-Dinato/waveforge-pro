import { useCallback, useState } from 'react';
import { VideoBackground } from './components/VideoBackground';
import { DropZone } from './components/DropZone';
import { PianoRoll } from './components/PianoRoll';
import { StemPlayer } from './components/StemPlayer';
import { useAudioEngine } from './hooks/useAudioEngine';
import { exportMidi, download } from './audio/midiExporter';
import { separateVocals, checkDemucsHealth } from './audio/demucsClient';
import './styles.css';

export default function App() {
  const engine = useAudioEngine();
  const { result, finalNotes, isAnalyzing, isPlaying, currentTime } = engine;

  const [isSeparating, setIsSeparating] = useState(false);
  const [isAnalyzingVocals, setIsAnalyzingVocals] = useState(false);
  const [stems, setStems] = useState<{ vocals: string; noVocals: string } | null>(null);
  const [demucsOnline, setDemucsOnline] = useState<boolean | null>(null);

  useState(() => {
    checkDemucsHealth().then(setDemucsOnline);
  });

  const handleExport = useCallback(() => {
    if (!result) return;
    const blob = exportMidi(finalNotes, result.bpm);
    download(blob, 'waveforge.mid');
  }, [result, finalNotes]);

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
        {/* HEADER */}
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
                : '🔴 Serveur Demucs hors ligne'}
            </div>
          )}
        </header>

        {/* ZONE DE DROP */}
        <DropZone onFile={engine.loadFile} isAnalyzing={isAnalyzing} />

        {/* CONTENU PRINCIPAL */}
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
              notes={finalNotes}
              duration={result.duration}
              currentTime={currentTime}
              onSeek={engine.seek}
            />

            {/* BARRE DE BOUTONS */}
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
                  disabled={finalNotes.length === 0}
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
                      : '🎼 Analyser la voix isolée'}
                  </button>
                )}

                <div
                  style={{
                    marginLeft: 'auto',
                    color: '#aaa',
                    fontSize: 14,
                  }}
                >
                  {isAnalyzing
                    ? '⏳ Analyse…'
                    : `🎵 ${finalNotes.length} notes · ${result.duration.toFixed(2)}s`}
                </div>
              </div>
            </div>

            {/* STEMS SÉPARÉS */}
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
          </div>
        )}

        {/* FOOTER */}
        <footer
          style={{
            marginTop: 32,
            color: '#555',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          Prototype v0.3 — YIN · Tone.js · Demucs integration
        </footer>
      </div>
    </>
  );
}

/* ============================================================
   STYLES RÉUTILISABLES
   ============================================================ */

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

/* ============================================================
   UTILITAIRE — AudioBuffer → WAV
   ============================================================ */

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