import { useCallback, useState, useEffect } from 'react';
import { VideoBackground } from './components/VideoBackground';
import { Waveform } from './components/Waveform';
import { VUMeter } from './components/VUMeter';
import { AnimatedButton } from './components/AnimatedButton';
import { Tooltip } from './components/Tooltip';
import { ExportWav } from './components/ExportWav';
import { UploadProgress } from './components/UploadProgress';
import { TimelineMarkers } from './components/TimelineMarkers';
import { TrackSelector } from './components/TrackSelector';
import { DropZone } from './components/DropZone';
import { PianoRoll } from './components/PianoRoll';
import { StemPlayer } from './components/StemPlayer';
import { MelodyGenerator } from './components/MelodyGenerator';
import { MasteringPanel } from './components/MasteringPanel';
import { RemixPanel } from './components/RemixPanel';
import { useAudioEngine } from './hooks/useAudioEngine';
import { exportMidi, download } from './audio/midiExporter';
import {
  separateVocalsWithProgress,
  checkDemucsHealth,
} from './audio/demucsClient';
import { transcribeDrums } from './audio/drumDetector';
import { transcribeBass } from './audio/bassDetector';
import { transcribeChords } from './audio/chordDetector';
import { detectSections } from './audio/sectionDetector';
import type { Section } from './audio/sectionDetector';
import { quantizeNotes, detectKey, snapToKey } from './audio/quantizer';
import type { QuantizeOptions } from './audio/quantizer';
import { audioBufferToWav } from './audio/wavEncoder';
import './styles.css';

export default function App() {
  const engine = useAudioEngine();
  const {
    result,
    finalNotes,
    isAnalyzing,
    isPlaying,
    currentTime,
    fileName,
    fileSize,
    fileFormat,
  } = engine;

  const [isSeparating, setIsSeparating] = useState(false);
  const [isAnalyzingVocals, setIsAnalyzingVocals] = useState(false);
  const [isAnalyzingDrums, setIsAnalyzingDrums] = useState(false);
  const [isAnalyzingBass, setIsAnalyzingBass] = useState(false);
  const [isAnalyzingChords, setIsAnalyzingChords] = useState(false);
  const [stems, setStems] = useState<{ vocals: string; noVocals: string } | null>(null);
  const [drumNotes, setDrumNotes] = useState<any[] | null>(null);
  const [bassNotes, setBassNotes] = useState<any[] | null>(null);
  const [chordNotes, setChordNotes] = useState<any[] | null>(null);
  const [chordSegments, setChordSegments] = useState<{ name: string; count: number }[]>([]);
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
  const [showMastering, setShowMastering] = useState(false);
  const [showRemix, setShowRemix] = useState(false);

  const [trackEnabled, setTrackEnabled] = useState({
    melody: true,
    bass: true,
    harmony: true,
    drums: true,
  });

  const [uploadProgress, setUploadProgress] = useState({
    visible: false,
    percent: 0,
    loaded: 0,
    total: 0,
    stage: 'upload' as 'upload' | 'processing',
  });

  const [sections, setSections] = useState<Section[]>([]);
  const [isDetectingSections, setIsDetectingSections] = useState(false);

  useEffect(() => {
    checkDemucsHealth().then(setDemucsOnline);
  }, []);

  const audioContext = engine.audioContext;

  const handleExport = useCallback(() => {
    if (!result) return;

    let allNotes = [
      ...(trackEnabled.melody ? finalNotes : []),
      ...(trackEnabled.drums ? drumNotes || [] : []),
      ...(trackEnabled.bass ? bassNotes || [] : []),
      ...(trackEnabled.harmony ? chordNotes || [] : []),
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
    trackEnabled,
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
    if (!stems?.vocals) throw new Error("Sépare les stems d'abord");
    setIsAnalyzingVocals(true);
    try {
      const ctx = new AudioContext();
      const buffer = await fetch(stems.vocals)
        .then((r) => r.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf));

      const { analyzeMonophonic } = await import('./audio/basicPitchEngine');
      const vocalNotes = await analyzeMonophonic(buffer);

      engine.loadNotesFromBuffer(vocalNotes);
      console.log(`✅ ${vocalNotes.length} notes détectées sur vocals.wav`);
    } catch (e) {
      console.error('Erreur analyse voix :', e);
      throw e;
    } finally {
      setIsAnalyzingVocals(false);
    }
  }, [stems, engine]);

  const handleAnalyzeDrums = useCallback(async () => {
    if (!stems?.noVocals) throw new Error("Sépare les stems d'abord");
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
      throw e;
    } finally {
      setIsAnalyzingDrums(false);
    }
  }, [stems]);

  const handleAnalyzeBass = useCallback(async () => {
    if (!stems?.noVocals) throw new Error("Sépare les stems d'abord");
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
      throw e;
    } finally {
      setIsAnalyzingBass(false);
    }
  }, [stems]);

  const handleAnalyzeChords = useCallback(async () => {
    if (!stems?.noVocals) throw new Error("Sépare les stems d'abord");
    setIsAnalyzingChords(true);
    try {
      const ctx = new AudioContext();
      const buffer = await fetch(stems.noVocals)
        .then((r) => r.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf));

      const chords = await transcribeChords(buffer);
      setChordNotes(chords);
      console.log(`✅ ${chords.length} notes d'accords détectées`);

      const { detectChordsFromNotes, summarizeChords } = await import(
        './audio/chordRecognition'
      );

      const noteData = chords.map((n) => ({
        midi: n.midi,
        start: n.start,
        duration: n.duration,
      }));

      const segments = detectChordsFromNotes(noteData, 0.5);
      const summary = summarizeChords(segments);

      setChordSegments(summary);
      console.log(`🎼 ${segments.length} accords détectés`);
    } catch (e) {
      console.error('Erreur analyse accords :', e);
      throw e;
    } finally {
      setIsAnalyzingChords(false);
    }
  }, [stems]);

  const handleSeparate = useCallback(async () => {
    if (!engine.audioBuffer) throw new Error("Charge un audio d'abord");
    setIsSeparating(true);

    setUploadProgress({
      visible: true,
      percent: 0,
      loaded: 0,
      total: 0,
      stage: 'upload',
    });

    try {
      const wav = audioBufferToWav(engine.audioBuffer);
      const file = new File([wav], 'input.wav', { type: 'audio/wav' });

      const res = await separateVocalsWithProgress(
        file,
        (percent, loaded, total) => {
          setUploadProgress({
            visible: true,
            percent,
            loaded,
            total,
            stage: percent >= 100 ? 'processing' : 'upload',
          });
        }
      );

      setStems({ vocals: res.vocalsUrl, noVocals: res.noVocalsUrl });
      console.log('✅ Stems séparés :', res);

      setTimeout(() => {
        setUploadProgress((p) => ({ ...p, visible: false }));
      }, 800);
    } catch (e) {
      console.error('Erreur séparation :', e);
      setUploadProgress((p) => ({ ...p, visible: false }));
      throw e;
    } finally {
      setIsSeparating(false);
    }
  }, [engine.audioBuffer]);

  const handleDetectSections = useCallback(async () => {
    if (!engine.audioBuffer) return;
    setIsDetectingSections(true);
    try {
      const detected = await detectSections(engine.audioBuffer);
      setSections(detected);
      console.log(`✅ ${detected.length} sections détectées`);
    } catch (e) {
      console.error('Erreur détection sections :', e);
    } finally {
      setIsDetectingSections(false);
    }
  }, [engine.audioBuffer]);

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

  return (     <>
      <VideoBackground />
      <div className="studio-grid" style={{ minHeight: '100vh', padding: 20, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <header className="fade-in" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: 'linear-gradient(135deg, #00d9ff, #0088ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 0 20px rgba(0, 217, 255, 0.4)' }}>🎹</div>
              <div>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '0.02em', color: '#fff' }}>
                  WAVEFORGE <span style={{ color: 'var(--cyan)', fontWeight: 300 }}>PRO</span>
                </h1>
                <p className="label-uppercase" style={{ margin: 0, fontSize: 9, color: '#666' }}>Audio → MIDI Studio</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <VUMeter audioBuffer={engine.audioBuffer} isPlaying={isPlaying} currentTime={currentTime} />
              {demucsOnline !== null && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: demucsOnline ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 51, 102, 0.08)', border: `1px solid ${demucsOnline ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 51, 102, 0.3)'}`, borderRadius: 4, fontSize: 10, fontFamily: 'var(--font-mono)', color: demucsOnline ? '#00ff88' : '#ff3366', letterSpacing: '0.05em' }}>
                  <div className={`led ${demucsOnline ? 'active' : ''}`} style={{ background: demucsOnline ? '#00ff88' : '#ff3366' }} />
                  DEMUCS {demucsOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
              )}
            </div>
          </header>

          {result && (
            <div className="panel fade-in" style={{ marginBottom: 20, borderColor: 'rgba(0, 217, 255, 0.15)', overflow: 'hidden' }}>
              <div className="panel-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '8px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cyan)', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎵 {fileName || 'SANS TITRE'}</span>
                  <span className="mono" style={{ fontSize: 10, color: '#888' }}>{formatTime(currentTime)} / {formatTime(result.duration)}</span>
                </div>
                <div className="label-uppercase" style={{ fontSize: 8, color: '#666', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {fileFormat && <span>{fileFormat}</span>}<span>·</span>
                  <span>{result.sampleRate} Hz</span><span>·</span>
                  <span>STÉRÉO</span><span>·</span>
                  <span>{formatTime(result.duration)}</span><span>·</span>
                  <span>{formatSize(fileSize)}</span><span>·</span>
                  <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{result.bpm} BPM</span>
                </div>
              </div>
              {sections.length > 0 && (
                <TimelineMarkers sections={sections} duration={result.duration} currentTime={currentTime} bpm={result.bpm} onSeek={engine.seek} />
              )}
              <div style={{ padding: 0 }}>
                <Waveform audioBuffer={engine.audioBuffer} currentTime={currentTime} duration={result.duration} onSeek={engine.seek} height={100} variant="full" />
              </div>
            </div>
          )}

          <DropZone onFile={engine.loadFile} isAnalyzing={isAnalyzing} />

          {result && (
            <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
              <TrackSelector
                tracks={[
                  { id: 'melody', name: 'MELODY', color: '#7c5cff', icon: '🎼', enabled: trackEnabled.melody, count: finalNotes.length },
                  { id: 'bass', name: 'BASS', color: '#00ff88', icon: '🎸', enabled: trackEnabled.bass, count: bassNotes?.length ?? 0 },
                  { id: 'harmony', name: 'CHORDS', color: '#ec4899', icon: '🎹', enabled: trackEnabled.harmony, count: chordNotes?.length ?? 0 },
                  { id: 'drums', name: 'DRUMS', color: '#ffb800', icon: '🥁', enabled: trackEnabled.drums, count: drumNotes?.length ?? 0 },
                ]}
                onToggle={(id) => setTrackEnabled((prev) => ({ ...prev, [id]: !prev[id as keyof typeof prev] }))}
              />

              <PianoRoll
                notes={[
                  ...(trackEnabled.melody ? finalNotes : []),
                  ...(trackEnabled.drums ? drumNotes || [] : []),
                  ...(trackEnabled.bass ? bassNotes || [] : []),
                  ...(trackEnabled.harmony ? chordNotes || [] : []),
                ]}
                duration={result.duration} currentTime={currentTime} bpm={result.bpm} grid={quantize.grid} onSeek={engine.seek}
              />

              <UploadProgress percent={uploadProgress.percent} loaded={uploadProgress.loaded} total={uploadProgress.total} visible={uploadProgress.visible} stage={uploadProgress.stage} />

              <div className="panel slide-in" style={{ overflow: 'visible' }}>
                <div className="panel-header">
                  <span>⚡ TRANSPORT & ANALYSE</span>
                  <span className="mono" style={{ fontSize: 10, color: '#888' }}>
                    {isAnalyzing ? '⏳ ANALYSE...' : `🎵 ${finalNotes.length}${drumNotes ? ` + 🥁 ${drumNotes.length}` : ''}${bassNotes ? ` + 🎸 ${bassNotes.length}` : ''}${chordNotes ? ` + 🎹 ${chordNotes.length}` : ''} · ${result.duration.toFixed(2)}s`}
                  </span>
                </div>
                <div className="panel-body">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tooltip text="Joue l'audio original importé (mp3/wav)"><button className="btn-action" onClick={engine.playAudioOriginal}>▶ AUDIO</button></Tooltip>
                    <Tooltip text="Joue les notes MIDI détectées avec un synthé"><button className="btn-action primary" onClick={engine.playMidi} disabled={finalNotes.length === 0}>▶ MIDI</button></Tooltip>
                    <Tooltip text="Arrête toutes les lectures en cours"><button className="btn-action" onClick={engine.stopAll} disabled={!isPlaying}>⏹ STOP</button></Tooltip>
                    <Tooltip text="Exporte un MIDI multipiste (4 pistes) compatible Ableton"><button className="btn-action primary" onClick={handleExport} disabled={finalNotes.length === 0 && !drumNotes && !bassNotes && !chordNotes}>💾 EXPORT MIDI</button></Tooltip>
                    <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
                    <Tooltip text="Sépare en voix + instru (Demucs IA, 1-5 min)"><AnimatedButton onClick={handleSeparate} disabled={isSeparating || demucsOnline === false}>🎤 SÉPARER STEMS</AnimatedButton></Tooltip>
                    {stems && (
                      <>
                        <Tooltip text="Analyse la voix isolée avec YIN"><AnimatedButton onClick={handleAnalyzeVocals} disabled={isAnalyzingVocals} style={{ borderColor: 'rgba(255, 184, 0, 0.3)' }}>🎼 VOIX</AnimatedButton></Tooltip>
                        <Tooltip text="Détecte kick / snare / hihat (Basic Pitch)"><AnimatedButton onClick={handleAnalyzeDrums} disabled={isAnalyzingDrums} style={{ borderColor: 'rgba(0, 255, 136, 0.3)' }}>🥁 BATTERIE</AnimatedButton></Tooltip>
                        <Tooltip text="Détecte la ligne de basse (Basic Pitch)"><AnimatedButton onClick={handleAnalyzeBass} disabled={isAnalyzingBass} style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}>🎸 BASSE</AnimatedButton></Tooltip>
                        <Tooltip text="Détecte les accords / harmonies (Basic Pitch)"><AnimatedButton onClick={handleAnalyzeChords} disabled={isAnalyzingChords} style={{ borderColor: 'rgba(236, 72, 153, 0.3)' }}>🎹 ACCORDS</AnimatedButton></Tooltip>
                      </>
                    )}
                    <div style={{ flex: 1 }} />
                    <Tooltip text="Détecte Intro/Verse/Chorus/Bridge/Outro" position="bottom">
                      <button className="btn-action" onClick={handleDetectSections} disabled={isDetectingSections} style={{ background: sections.length > 0 ? 'var(--cyan-dim)' : 'var(--bg-2)', color: sections.length > 0 ? 'var(--cyan)' : 'var(--text)', borderColor: sections.length > 0 ? 'var(--cyan)' : 'var(--border)' }}>
                        {isDetectingSections ? '⏳ SECTIONS...' : `🎬 SECTIONS${sections.length > 0 ? ` (${sections.length})` : ''}`}
                      </button>
                    </Tooltip>
                    <Tooltip text="Mastering IA : LUFS, presets Warm/Balanced/Open/Master, export WAV" position="bottom">
                      <button className="btn-action" onClick={() => setShowMastering(!showMastering)} style={{ background: showMastering ? 'linear-gradient(135deg, #00d9ff, #0088ff)' : 'var(--bg-2)', color: showMastering ? '#000' : 'var(--text)', borderColor: showMastering ? 'var(--cyan)' : 'var(--border)', fontWeight: showMastering ? 700 : 400 }}>
                        {showMastering ? '✕' : '🎚️'} MASTERING
                      </button>
                    </Tooltip>
                    <Tooltip text="Remix IA : transforme l'audio dans le style de ton choix" position="bottom">
                      <button className="btn-action" onClick={() => setShowRemix(!showRemix)} style={{ background: showRemix ? 'linear-gradient(135deg, #ff5cf0, #a020a0)' : 'var(--bg-2)', color: showRemix ? '#000' : 'var(--text)', borderColor: showRemix ? '#ff5cf0' : 'var(--border)', fontWeight: showRemix ? 700 : 400 }}>
                        {showRemix ? '✕' : '🎛️'} REMIX AI
                      </button>
                    </Tooltip>
                    <Tooltip text="Options d'export : quantize, swing, snap gamme" position="bottom"><button className="btn-action" onClick={() => setShowSettings(!showSettings)}>{showSettings ? '✕' : '⚙️'} OPTIONS</button></Tooltip>
                    <Tooltip text="Génère des mélodies (Pop, Trap, Lo-Fi, Drill, House)" position="bottom"><button className="btn-action" onClick={() => setShowGenerator(!showGenerator)} style={{ background: showGenerator ? 'var(--cyan)' : 'var(--bg-2)', color: showGenerator ? 'var(--bg-0)' : 'var(--text)', borderColor: showGenerator ? 'var(--cyan)' : 'var(--border)' }}>{showGenerator ? '✕' : '🎼'} GÉNÉRATEUR</button></Tooltip>
                  </div>

                  {showSettings && (
                    <div className="fade-in" style={{ marginTop: 12, padding: 12, background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6 }}>
                      <div className="label-uppercase" style={{ marginBottom: 12, color: 'var(--cyan)' }}>⚙️ OPTIONS D'EXPORT MIDI</div>
                      <div style={{ marginBottom: 12 }}>
                        <div className="label-uppercase" style={{ marginBottom: 6 }}>Quantisation</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[{ v: 0, l: 'OFF' }, { v: 4, l: '1/4' }, { v: 8, l: '1/8' }, { v: 16, l: '1/16' }, { v: 32, l: '1/32' }].map((opt) => (
                            <button key={opt.v} onClick={() => setQuantize({ ...quantize, grid: opt.v as any })} className="btn-action" style={{ padding: '5px 10px', fontSize: 10, background: quantize.grid === opt.v ? 'var(--cyan)' : 'var(--bg-2)', color: quantize.grid === opt.v ? 'var(--bg-0)' : 'var(--text)', borderColor: quantize.grid === opt.v ? 'var(--cyan)' : 'var(--border)' }}>{opt.l}</button>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div className="label-uppercase" style={{ marginBottom: 6 }}>Force : {Math.round(quantize.strength * 100)}%</div>
                        <input type="range" min={0} max={1} step={0.01} value={quantize.strength} onChange={(e) => setQuantize({ ...quantize, strength: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div className="label-uppercase" style={{ marginBottom: 6 }}>Swing : {Math.round(quantize.swing * 100)}%</div>
                        <input type="range" min={0} max={1} step={0.01} value={quantize.swing} onChange={(e) => setQuantize({ ...quantize, swing: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="btn-action" onClick={() => setSnapEnabled(!snapEnabled)} style={{ background: snapEnabled ? 'var(--green)' : 'var(--bg-2)', color: snapEnabled ? 'var(--bg-0)' : 'var(--text)', borderColor: snapEnabled ? 'var(--green)' : 'var(--border)' }}>{snapEnabled ? '✅' : '⭕'} SNAP GAMME</button>
                        {detectedKey ? (
                          <span className="mono" style={{ fontSize: 10, color: 'var(--cyan)' }}>{detectedKey.key} {detectedKey.mode} ({(detectedKey.confidence * 100).toFixed(0)}%)</span>
                        ) : (
                          <button className="btn-action" onClick={handleDetectKey} style={{ background: 'var(--yellow)', color: 'var(--bg-0)', borderColor: 'var(--yellow)' }}>🎼 DÉTECTER TONALITÉ</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {showMastering && (
                <div className="slide-in">
                  <MasteringPanel audioContext={audioContext} sourceNode={null} sourceBuffer={engine.audioBuffer} />
                </div>
              )}

              {showRemix && (
                <div className="slide-in">
                  <RemixPanel sourceAudioFile={engine.sourceFile} sourceBPM={result.bpm} />
                </div>
              )}

              {showGenerator && (
                <div className="slide-in"><MelodyGenerator bpm={result.bpm} /></div>
              )}

              {stems && (
                <>
                  <div className="panel slide-in delay-1">
                    <div className="panel-header"><span>🎉 STEMS SÉPARÉS</span></div>
                    <div className="panel-body">
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {stems.vocals && <a href={stems.vocals} download="vocals.wav" className="btn-action" style={{ textDecoration: 'none', color: 'var(--cyan)', borderColor: 'rgba(0, 217, 255, 0.3)', display: 'inline-block' }}>🎤 VOCALS.WAV</a>}
                        {stems.noVocals && <a href={stems.noVocals} download="no_vocals.wav" className="btn-action" style={{ textDecoration: 'none', color: 'var(--cyan)', borderColor: 'rgba(0, 217, 255, 0.3)', display: 'inline-block' }}>🎸 NO_VOCALS.WAV</a>}
                      </div>
                    </div>
                  </div>
                  <div className="slide-in delay-2">
                    <StemPlayer audioBuffer={engine.audioBuffer} stems={[{ id: 'vocals', name: 'VOIX', url: stems.vocals, color: '#ff3366', icon: '🎤' }, { id: 'no_vocals', name: 'INSTRUMENTAL', url: stems.noVocals, color: '#00ff88', icon: '🎸' }].filter((s) => s.url)} />
                  </div>
                  <ExportWav stems={stems} duration={result.duration} />
                </>
              )}

              {drumNotes && drumNotes.length > 0 && (
                <div className="panel slide-in delay-3" style={{ borderColor: 'rgba(0, 255, 136, 0.2)' }}>
                  <div className="panel-header" style={{ color: 'var(--green)' }}>
                    <span>🥁 BATTERIE DÉTECTÉE (BASIC PITCH)</span>
                    <span className="mono" style={{ fontSize: 10 }}>{drumNotes.length} HITS</span>
                  </div>
                  <div className="panel-body">
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11 }}>
                      <span><span className="label-uppercase">KICK :</span> <strong className="mono" style={{ color: 'var(--green)' }}>{drumNotes.filter((n) => n.midi === 36).length}</strong></span>
                      <span><span className="label-uppercase">SNARE :</span> <strong className="mono" style={{ color: 'var(--green)' }}>{drumNotes.filter((n) => n.midi === 38).length}</strong></span>
                      <span><span className="label-uppercase">HIHAT :</span> <strong className="mono" style={{ color: 'var(--green)' }}>{drumNotes.filter((n) => n.midi === 42).length}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {bassNotes && bassNotes.length > 0 && (
                <div className="panel slide-in delay-3" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                  <div className="panel-header" style={{ color: 'var(--purple)' }}>
                    <span>🎸 BASSE DÉTECTÉE</span>
                    <span className="mono" style={{ fontSize: 10 }}>{bassNotes.length} NOTES</span>
                  </div>
                  <div className="panel-body">
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11 }}>
                      <span><span className="label-uppercase">MIN :</span> <strong className="mono" style={{ color: 'var(--purple)' }}>{Math.min(...bassNotes.map((n) => n.midi))}</strong></span>
                      <span><span className="label-uppercase">MAX :</span> <strong className="mono" style={{ color: 'var(--purple)' }}>{Math.max(...bassNotes.map((n) => n.midi))}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {chordNotes && chordNotes.length > 0 && (
                <div className="panel slide-in delay-3" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                                    <div className="panel-header" style={{ color: '#ec4899' }}>
                    <span>🎹 ACCORDS DÉTECTÉS</span>
                    <span className="mono" style={{ fontSize: 10 }}>
                      {chordSegments.length > 0
                        ? `${chordSegments.reduce((sum, s) => sum + s.count, 0)} ACCORDS · ${chordNotes.length} NOTES`
                        : `${chordNotes.length} NOTES`}
                    </span>
                  </div>
                  <div className="panel-body">
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11, marginBottom: chordSegments.length > 0 ? 16 : 0 }}>
                      <span><span className="label-uppercase">MIN :</span> <strong className="mono" style={{ color: '#ec4899' }}>{Math.min(...chordNotes.map((n) => n.midi))}</strong></span>
                      <span><span className="label-uppercase">MAX :</span> <strong className="mono" style={{ color: '#ec4899' }}>{Math.max(...chordNotes.map((n) => n.midi))}</strong></span>
                    </div>
                    {chordSegments.length > 0 && (
                      <>
                        <div className="label-uppercase" style={{ marginBottom: 8, color: '#ec4899', fontSize: 9 }}>ACCORDS PRINCIPAUX</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                          {chordSegments.slice(0, 20).map((chord, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: 6, fontSize: 12 }}>
                              <span className="mono" style={{ color: '#ec4899', fontWeight: 700, fontSize: 14 }}>{chord.name}</span>
                              <span className="mono" style={{ color: '#888', fontSize: 10 }}>×{chord.count}</span>
                            </div>
                          ))}
                        </div>
                        <div className="label-uppercase" style={{ marginBottom: 6, color: '#ec4899', fontSize: 9 }}>PROGRESSION</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                          {chordSegments.slice(0, 16).map((chord, i) => (
                            <span key={i}>
                              <span style={{ color: '#ec4899' }}>{chord.name}</span>
                              {i < Math.min(chordSegments.length, 16) - 1 && (<span style={{ color: '#444' }}> → </span>)}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <footer style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 10, color: '#555', letterSpacing: '0.05em' }}>
            WAVEFORGE PRO · YIN · TONE.JS · DEMUCS · BASIC PITCH · v1.0
          </footer>
        </div>
      </div>
    </>
  );
}