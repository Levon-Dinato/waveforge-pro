// src/pages/StudioPage.tsx
import { DropZone } from '../components/DropZone';
import { Waveform } from '../components/Waveform';
import { TrackSelector } from '../components/TrackSelector';
import { PianoRoll } from '../components/PianoRoll';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';

export const StudioPage: React.FC = () => {
  const engine = useAudioEngineContext();
  const { result, finalNotes, isAnalyzing, currentTime, fileName, fileSize, fileFormat } = engine;

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

  return (
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          🎹 <span style={{ color: 'var(--cyan)' }}>Studio</span>
        </h2>
        <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
          Analyse audio → MIDI, quantisation, export multipiste
        </p>
      </div>

      {/* DropZone */}
      <DropZone onFile={engine.loadFile} isAnalyzing={isAnalyzing} />

      {/* Infos fichier + Waveform */}
      {result && (
        <div className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cyan)' }}>
                🎵 {fileName || 'SANS TITRE'}
              </span>
              <span className="mono" style={{ fontSize: 10, color: '#888' }}>
                {formatTime(currentTime)} / {formatTime(result.duration)}
              </span>
            </div>
            <div className="label-uppercase" style={{ fontSize: 8, color: '#666', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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

          <Waveform
            audioBuffer={engine.audioBuffer}
            currentTime={currentTime}
            duration={result.duration}
            onSeek={engine.seek}
            height={100}
            variant="full"
          />
        </div>
      )}

      {/* Sections + TrackSelector + PianoRoll */}
      {result && (
        <>
          <TrackSelector
            tracks={[
              { id: 'melody', name: 'MELODY', color: '#7c5cff', icon: '🎼', enabled: true, count: finalNotes.length },
              { id: 'bass', name: 'BASS', color: '#00ff88', icon: '🎸', enabled: true, count: 0 },
              { id: 'harmony', name: 'CHORDS', color: '#ec4899', icon: '🎹', enabled: true, count: 0 },
              { id: 'drums', name: 'DRUMS', color: '#ffb800', icon: '🥁', enabled: true, count: 0 },
            ]}
            onToggle={() => {}}
          />

          <PianoRoll
            notes={finalNotes}
            duration={result.duration}
            currentTime={currentTime}
            bpm={result.bpm}
            grid={16}
            onSeek={engine.seek}
          />
        </>
      )}
    </div>
  );
};