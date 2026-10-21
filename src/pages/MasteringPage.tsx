// src/pages/MasteringPage.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { 
  MasteringChain, 
  getMasteringChainSingleton, 
  type MasteringPreset 
} from '../audio/masteringChain';

// ─── Utilitaires (Encode WAV) ──────────────────────────────────
function encodeWAV(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataLength = buffer.length * blockAlign;
  const headerLength = 44;
  const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(arrayBuffer);

  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + dataLength, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// ─── Styles réutilisables ──────────────────────────────────────
const PANEL_STYLE: React.CSSProperties = {
  background: '#1c1c1c',
  border: '1px solid #2a2a2a',
  borderRadius: 8,
  overflow: 'hidden',
};
const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10, color: '#999', letterSpacing: 1, textTransform: 'uppercase',
  fontWeight: 700, marginBottom: 8,
};
const BTN_BASE: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 4, border: '1px solid #2a2a2a',
  background: 'transparent', color: '#999', fontSize: 11, fontWeight: 600,
  cursor: 'pointer', transition: 'all 0.15s ease', display: 'flex',
  alignItems: 'center', justifyContent: 'center', gap: 6,
};

export const MasteringPage: React.FC = () => {
  const engine = useAudioEngineContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // États du MasteringChain
  const chainRef = useRef<MasteringChain | null>(null);
  const [chainState, setChainState] = useState<'waiting' | 'ready' | 'error'>('waiting');
  
  const [loudness, setLoudness] = useState(0);
  const [presence, setPresence] = useState(0);
  const [width, setWidth] = useState(1.0);
  const [saturation, setSaturation] = useState(0);
  const [isBypassed, setIsBypassed] = useState(false);
  const [preset, setPreset] = useState<MasteringPreset>('warm');
  
  const [monoMakerOn, setMonoMakerOn] = useState(false);
  const [monoMakerFreq, setMonoMakerFreq] = useState(120);
  const [imagerOn, setImagerOn] = useState(false);
  const [imagerLow, setImagerLow] = useState(0);
  const [imagerMid, setImagerMid] = useState(0);
  const [imagerHigh, setImagerHigh] = useState(0);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const hasAudio = !!engine.result;

  // ─── INITIALISATION DU CHAIN ──────────────────────────────────
  useEffect(() => {
    if (!engine.audioContext) return;
    const chain = getMasteringChainSingleton(engine.audioContext);
    chainRef.current = chain;
    setChainState('ready');
    
    // On connecte l'engine au chain si possible
    if (engine.audioBuffer) {
      // Logique de connexion (simulée ici)
    }
  }, [engine.audioContext, engine.audioBuffer]);

  // ─── APPLICATION DES PARAMÈTRES ────────────────────────────────
  useEffect(() => {
    if (chainState !== 'ready' || !chainRef.current) return;
    const chain = chainRef.current;
    try {
      chain.setLoudness(loudness);
      chain.setPresence(presence);
      chain.setWidth(width);
      chain.setSaturation(saturation);
      chain.setBypass(isBypassed);
      chain.setMonoMaker(monoMakerOn, monoMakerFreq);
      chain.setImager(imagerOn, imagerLow, imagerMid, imagerHigh);
    } catch (e) {
      console.warn(e);
    }
  }, [chainState, loudness, presence, width, saturation, isBypassed, monoMakerOn, monoMakerFreq, imagerOn, imagerLow, imagerMid, imagerHigh]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) engine.loadFile(file);
    e.target.value = '';
  };

  const applyPreset = useCallback((p: MasteringPreset) => {
    setPreset(p);
    if (chainRef.current) {
      chainRef.current.applyPreset(p);
      const v = chainRef.current.getPresetValues(p);
      setLoudness(v.loudness);
      setPresence(v.presence);
      setWidth(v.width);
      setSaturation(v.saturation);
    }
  }, []);

  const handleExportWAV = async () => {
    if (!engine.audioContext || !engine.audioBuffer) {
      alert("Aucun audio chargé");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const offlineCtx = new OfflineAudioContext(
        engine.audioBuffer.numberOfChannels,
        engine.audioBuffer.length,
        engine.audioBuffer.sampleRate
      );

      const offlineChain = new MasteringChain(offlineCtx);
      offlineChain.setLoudness(loudness);
      offlineChain.setPresence(presence);
      offlineChain.setWidth(width);
      offlineChain.setSaturation(saturation);
      offlineChain.setBypass(isBypassed);
      offlineChain.setMonoMaker(monoMakerOn, monoMakerFreq);
      offlineChain.setImager(imagerOn, imagerLow, imagerMid, imagerHigh);
      offlineChain.applyPreset(preset);

      const sourceNode = offlineCtx.createBufferSource();
      sourceNode.buffer = engine.audioBuffer;
      sourceNode.connect(offlineChain.getInputNode());
      offlineChain.getOutputNode().connect(offlineCtx.destination);

      sourceNode.start(0);
      setExportProgress(30);

      const renderedBuffer = await offlineCtx.startRendering();
      setExportProgress(80);

      const wavBlob = encodeWAV(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);
      const fileName = `mastered_${preset}_${new Date().getTime()}.wav`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();

      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setExportProgress(100);

      try { offlineChain.destroy(); } catch {}
    } catch (e: any) {
      console.error(e);
      alert("Erreur export : " + e.message);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 1500);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      
      {/* EN-TÊTE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🎛️</span> Mastering
            </h1>
            <span style={{ background: 'rgba(255, 51, 102, 0.15)', color: '#ff3366', border: '1px solid rgba(255, 51, 102, 0.3)', padding: '2px 8px', borderRadius: 12, fontSize: '0.65rem', fontWeight: 700 }}>PRO</span>
          </div>
          <p style={{ color: '#666', fontSize: '0.75rem', margin: 0 }}>
            Chaîne complète · EQ 5 bandes · Mono-Maker · Vector Scope · Limiteur · Export WAV
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: chainState === 'ready' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 212, 59, 0.1)', border: `1px solid ${chainState === 'ready' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 212, 59, 0.2)'}`, padding: '6px 12px', borderRadius: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: chainState === 'ready' ? '#00ff88' : '#ffd43b' }}></div>
          <span style={{ fontSize: 10, color: chainState === 'ready' ? '#00ff88' : '#ffd43b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            {chainState === 'ready' ? 'PRÊT À MASTERISER' : 'EN ATTENTE...'}
          </span>
        </div>
      </div>

      {!hasAudio ? (
        <div onClick={() => fileInputRef.current?.click()} style={{ ...PANEL_STYLE, borderStyle: 'dashed', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
          <div style={{ fontSize: 40, marginBottom: 16 }}>📂</div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0' }}>Importer un fichier source</h2>
          <p style={{ color: '#999', fontSize: '0.8rem', margin: 0 }}>Glisse ton fichier WAV / MP3 ici</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* A/B COMPARAISON */}
          <div style={{ ...PANEL_STYLE, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, marginRight: 40 }}>
              <div style={LABEL_STYLE}>⚖️ Comparaison A/B</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button style={{ ...BTN_BASE, flex: 1, background: 'rgba(124, 92, 255, 0.2)', borderColor: '#7c5cff', color: '#fff' }} onClick={() => setIsBypassed(true)}>▶ ORIGINAL</button>
                <button style={{ ...BTN_BASE, flex: 1, background: !isBypassed ? 'rgba(0, 255, 136, 0.1)' : 'transparent', borderColor: !isBypassed ? '#00ff88' : '#2a2a2a', color: !isBypassed ? '#00ff88' : '#999' }} onClick={() => setIsBypassed(false)}>◼ MASTERISÉ</button>
              </div>
              <button onClick={engine.stopAll} style={{ ...BTN_BASE, width: '100%', background: '#ff3366', borderColor: '#ff3366', color: '#fff', fontWeight: 700 }}>■ ARRÊTER</button>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <div style={LABEL_STYLE}>🔥 Intensité du preset</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{Math.round(loudness)}%</div>
              </div>
              <input type="range" min="0" max="100" value={loudness} onChange={(e) => setLoudness(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00d9ff' }} />
            </div>
          </div>

          {/* SPECTRE SONORE (Fake, pour le visuel) */}
          <div style={{ ...PANEL_STYLE, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={LABEL_STYLE}>📊 Spectre sonore</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88' }}></div>
                <span style={{ fontSize: 10, color: '#00ff88', fontWeight: 700 }}>LIVE</span>
              </div>
            </div>
            <div style={{ height: 120, background: '#121212', borderRadius: 6, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, padding: '10px 0', position: 'relative' }}>
              {Array.from({ length: 40 }).map((_, i) => {
                const height = Math.sin(i * 0.2) * 40 + 50 + Math.random() * 20;
                return (
                  <div key={i} style={{ width: '2%', height: `${height}%`, background: `linear-gradient(to top, #00ff88, #ffd43b, #ff3366)`, borderRadius: '2px 2px 0 0', opacity: 0.8 }} />
                );
              })}
              <button style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 32, height: 32, borderRadius: '50%', background: '#fff', border: 'none', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={engine.playAudioOriginal}>▶</button>
            </div>
          </div>

          {/* GRILLE DU BAS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
            
            {/* COLONNE GAUCHE (Source & Modules) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...PANEL_STYLE, padding: 16 }}>
                <div style={LABEL_STYLE}>🎵 Fichier source</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#121212', padding: 10, borderRadius: 6, border: '1px solid #2a2a2a' }}>
                  <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.05)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎵</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{engine.fileName}</div>
                    <div style={{ fontSize: 10, color: '#666' }}>{engine.fileFormat} · {engine.result?.duration.toFixed(1)}s · {engine.result?.bpm} BPM</div>
                  </div>
                </div>
              </div>

              <div style={{ ...PANEL_STYLE, padding: 16, flex: 1 }}>
                <div style={LABEL_STYLE}>⚙️ Chaîne de traitement</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['EQ 5 bandes', 'Compression', 'Saturation', 'Stéréo Widener', 'Mono-Maker', 'Limiteur brickwall'].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#ccc', padding: '6px 8px', background: '#121212', borderRadius: 4, border: '1px solid #2a2a2a' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: i < 3 ? '#00d9ff' : '#666' }}></div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COLONNE DROITE (Presets & Contrôles) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...PANEL_STYLE, padding: 20, flex: 1 }}>
                
                {/* Presets */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 2 }}>WAVEFORGE <span style={{ color: '#00d9ff' }}>MASTERING</span></div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {(['warm', 'balanced', 'open', 'master'] as MasteringPreset[]).map((p) => (
                      <button key={p} onClick={() => applyPreset(p)} style={{ ...BTN_BASE, flex: 1, background: preset === p ? 'rgba(0, 217, 255, 0.1)' : 'transparent', borderColor: preset === p ? '#00d9ff' : '#2a2a2a', color: preset === p ? '#00d9ff' : '#999' }}>
                        {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders de contrôle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SliderControl label="Loudness" value={loudness} min={-12} max={12} step={0.5} unit="dB" color="#7c5cff" onChange={setLoudness} />
                  <SliderControl label="Presence" value={presence} min={-12} max={12} step={0.5} unit="dB" color="#00ff88" onChange={setPresence} />
                  <SliderControl label="Width" value={width} min={0} max={2} step={0.05} unit="x" color="#00d9ff" onChange={setWidth} />
                  <SliderControl label="Saturation" value={saturation} min={0} max={1} step={0.02} unit="%" color="#ff5cf0" onChange={setSaturation} isPercent />
                </div>

                {/* Export WAV */}
                <div style={{ marginTop: 24, borderTop: '1px solid #2a2a2a', paddingTop: 16 }}>
                  <button onClick={handleExportWAV} disabled={isExporting} style={{ width: '100%', padding: '12px', background: isExporting ? '#666' : 'linear-gradient(135deg, #00ff88, #00d9ff)', color: '#000', border: 'none', borderRadius: 6, cursor: isExporting ? 'wait' : 'pointer', fontSize: 12, fontWeight: 800, boxShadow: !isExporting ? '0 4px 16px rgba(0, 255, 136, 0.3)' : 'none' }}>
                    {isExporting ? `💾 EXPORT... ${exportProgress}%` : '💾 TÉLÉCHARGER WAV MASTERISÉ'}
                  </button>
                </div>

              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

// Composant Knob/Slider réutilisable
const SliderControl = ({ label, value, min, max, step, unit, color, onChange, isPercent }: any) => {
  const displayValue = isPercent ? `${Math.round(value * 100)}%` : `${value.toFixed(step < 1 ? 2 : 0)} ${unit}`;
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#ccc', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{displayValue}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ width: '100%', accentColor: color, background: `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, rgba(255,255,255,0.1) ${percent}%, rgba(255,255,255,0.1) 100%)`, appearance: 'none', height: 4, borderRadius: 2, cursor: 'pointer' }} />
    </div>
  );
};