// src/components/MasteringPanel.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MasteringChain,
  getMasteringChainSingleton,
  type MasteringPreset,
} from '../audio/masteringChain';
import { ShareButton } from './ShareButton';

// ============================================================
// UTILITAIRE : Encode un AudioBuffer en WAV (PCM 16-bit)
// ============================================================
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
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

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

interface MasteringPanelProps {
  audioContext: AudioContext | null;
  sourceNode?: AudioNode | null;
  sourceBuffer?: AudioBuffer | null;
  onChainReady?: (chain: MasteringChain | null) => void;
}

type ChainReadyState = 'waiting' | 'ready' | 'error';

export const MasteringPanel: React.FC<MasteringPanelProps> = ({
  audioContext,
  sourceNode = null,
  sourceBuffer = null,
  onChainReady,
}) => {
  const chainRef = useRef<MasteringChain | null>(null);
  const [chainState, setChainState] = useState<ChainReadyState>('waiting');

  const onChainReadyRef = useRef(onChainReady);
  useEffect(() => {
    onChainReadyRef.current = onChainReady;
  }, [onChainReady]);

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

  // ============================================================
  // CRÉATION via SINGLETON
  // ============================================================
  useEffect(() => {
    if (!audioContext) {
      setChainState('waiting');
      return;
    }

    const chain = getMasteringChainSingleton(audioContext);
    chainRef.current = chain;

    if (sourceNode) {
      try {
        chain.connect(sourceNode);
      } catch (e) {
        console.warn('⚠️ Impossible de connecter la source:', e);
      }
    }

    if (onChainReadyRef.current) {
      onChainReadyRef.current(chain);
    }

    setChainState('ready');
  }, [audioContext, sourceNode]);

  useEffect(() => {
    if (chainState !== 'ready') return;
    const chain = chainRef.current;
    if (!chain) return;
    try {
      chain.setLoudness(loudness);
      chain.setPresence(presence);
      chain.setWidth(width);
      chain.setSaturation(saturation);
      chain.setBypass(isBypassed);
    } catch (e) {
      console.error('❌ Erreur application paramètres:', e);
    }
  }, [chainState, loudness, presence, width, saturation, isBypassed]);

  useEffect(() => {
    if (chainState !== 'ready') return;
    const chain = chainRef.current;
    if (!chain) return;
    try { chain.setMonoMaker(monoMakerOn, monoMakerFreq); } catch (e) { console.warn(e); }
  }, [chainState, monoMakerOn, monoMakerFreq]);

  useEffect(() => {
    if (chainState !== 'ready') return;
    const chain = chainRef.current;
    if (!chain) return;
    try { chain.setImager(imagerOn, imagerLow, imagerMid, imagerHigh); } catch (e) { console.warn(e); }
  }, [chainState, imagerOn, imagerLow, imagerMid, imagerHigh]);

  const applyPreset = useCallback((p: MasteringPreset) => {
    setPreset(p);
    const chain = chainRef.current;
    if (!chain || chainState !== 'ready') return;
    try {
      chain.applyPreset(p);
      const v = chain.getPresetValues(p);
      setLoudness(v.loudness);
      setPresence(v.presence);
      setWidth(v.width);
      setSaturation(v.saturation);
    } catch (e) {
      console.error('❌ Erreur applyPreset:', e);
    }
  }, [chainState]);

  const resetAll = useCallback(() => {
    setLoudness(0);
    setPresence(0);
    setWidth(1.0);
    setSaturation(0);
    setIsBypassed(false);
    setMonoMakerOn(false);
    setImagerOn(false);
    setImagerLow(0);
    setImagerMid(0);
    setImagerHigh(0);
  }, []);

  // ============================================================
  // EXPORT WAV
  // ============================================================
  const handleExportWAV = useCallback(async () => {
    if (!audioContext || !sourceBuffer) {
      alert('Aucun audio chargé');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      console.log('💾 Export WAV : démarrage...');

      const offlineCtx = new OfflineAudioContext(
        sourceBuffer.numberOfChannels,
        sourceBuffer.length,
        sourceBuffer.sampleRate
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
      sourceNode.buffer = sourceBuffer;
      sourceNode.connect(offlineChain.getInputNode());

      offlineChain.getOutputNode().connect(offlineCtx.destination);

      sourceNode.start(0);
      setExportProgress(30);

      const renderedBuffer = await offlineCtx.startRendering();
      setExportProgress(80);

      console.log('💾 Export WAV : rendu terminé', renderedBuffer.duration.toFixed(1) + 's');

      const wavBlob = encodeWAV(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);

      const safeName = (preset || 'mastered').replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const fileName = `mastered_${safeName}_${timestamp}.wav`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 5000);

      setExportProgress(100);
      console.log('💾 Export WAV : téléchargé →', fileName);

      try { offlineChain.destroy(); } catch {}

    } catch (e: any) {
      console.error('❌ Erreur export WAV:', e);
      alert('Erreur export : ' + (e.message || e));
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 1500);
    }
  }, [
    audioContext, sourceBuffer, preset,
    loudness, presence, width, saturation, isBypassed,
    monoMakerOn, monoMakerFreq,
    imagerOn, imagerLow, imagerMid, imagerHigh,
  ]);

  return (
    <div
      className="panel"
      style={{
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: 'rgba(124, 92, 255, 0.02)',
        border: '1px solid rgba(124, 92, 255, 0.15)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c5cff', letterSpacing: '1px' }}>
            🎛️ CONTRÔLES DE MASTERING
          </div>
          <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
            État :{' '}
            <span style={{ color: chainState === 'ready' ? '#00ff88' : '#ffd43b', fontWeight: 700 }}>
              {chainState === 'ready' ? '● PRÊTE' : '○ ATTENTE'}
            </span>
          </div>
        </div>
        <button
          onClick={resetAll}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 10,
            fontFamily: 'monospace',
          }}
        >
          ♻️ RESET
        </button>
      </div>

      <div>
        <div style={{ fontSize: 10, color: '#666', letterSpacing: '1px', marginBottom: 8 }}>PRESETS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {(['warm', 'balanced', 'open', 'master'] as MasteringPreset[]).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              style={{
                padding: '8px 4px',
                background: preset === p ? 'linear-gradient(135deg, #7c5cff, #5b3fd9)' : 'rgba(255,255,255,0.03)',
                border: preset === p ? '1px solid #7c5cff' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: preset === p ? '#fff' : '#aaa',
                cursor: 'pointer',
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <Knob label="Loudness" value={loudness} min={-12} max={+12} step={0.5} unit="dB" color="#7c5cff" onChange={setLoudness} />
      <Knob label="Presence" value={presence} min={-12} max={+12} step={0.5} unit="dB" color="#00ff88" onChange={setPresence} />
      <Knob label="Width" value={width} min={0} max={2} step={0.05} unit="x" color="#00d9ff" onChange={setWidth} />
      <Knob label="Saturation" value={saturation} min={0} max={1} step={0.02} unit="%" color="#ff5cf0" isPercent onChange={setSaturation} />

      <button
        onClick={() => setIsBypassed(!isBypassed)}
        style={{
          padding: '8px 12px',
          background: isBypassed ? 'rgba(255, 51, 102, 0.15)' : 'rgba(0, 255, 136, 0.08)',
          border: isBypassed ? '1px solid #ff3366' : '1px solid #00ff88',
          color: isBypassed ? '#ff3366' : '#00ff88',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 10,
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '1px',
        }}
      >
        {isBypassed ? '🚫 BYPASS ACTIF' : '✅ TRAITEMENT ACTIF'}
      </button>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: '#666', letterSpacing: '1px' }}>MONO-MAKER</span>
          <button
            onClick={() => setMonoMakerOn(!monoMakerOn)}
            style={{
              padding: '3px 10px',
              background: monoMakerOn ? '#00d9ff' : 'transparent',
              border: '1px solid #00d9ff',
              color: monoMakerOn ? '#000' : '#00d9ff',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            {monoMakerOn ? 'ON' : 'OFF'}
          </button>
        </div>
        <Knob label="Fréquence" value={monoMakerFreq} min={40} max={300} step={1} unit="Hz" color="#00d9ff" onChange={setMonoMakerFreq} />
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: '#666', letterSpacing: '1px' }}>IMAGER 3 BANDES</span>
          <button
            onClick={() => setImagerOn(!imagerOn)}
            style={{
              padding: '3px 10px',
              background: imagerOn ? '#ffd43b' : 'transparent',
              border: '1px solid #ffd43b',
              color: imagerOn ? '#000' : '#ffd43b',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            {imagerOn ? 'ON' : 'OFF'}
          </button>
        </div>
        <Knob label="Low" value={imagerLow} min={0} max={1} step={0.05} unit="%" color="#00d9ff" isPercent onChange={setImagerLow} />
        <Knob label="Mid" value={imagerMid} min={0} max={1} step={0.05} unit="%" color="#00ff88" isPercent onChange={setImagerMid} />
        <Knob label="High" value={imagerHigh} min={0} max={1} step={0.05} unit="%" color="#ffd43b" isPercent onChange={setImagerHigh} />
      </div>

      {/* ✅ BOUTON PARTAGE */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <ShareButton
          url={typeof window !== 'undefined' ? window.location.href : ''}
          title={`Mastering ${preset.toUpperCase()} — WaveForge PRO`}
          text={`Écoute mon master "${preset}" sur WaveForge PRO !`}
          variant="button"
          size="medium"
          label="Partager ce master"
          position="top"
        />
      </div>

      {/* ✅ BOUTON EXPORT WAV */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <button
          onClick={handleExportWAV}
          disabled={isExporting || !sourceBuffer}
          style={{
            width: '100%',
            padding: '12px',
            background: isExporting
              ? '#666'
              : !sourceBuffer
              ? '#333'
              : 'linear-gradient(135deg, #00ff88, #00d9ff)',
            color: '#000',
            border: 'none',
            borderRadius: 6,
            cursor: isExporting ? 'wait' : !sourceBuffer ? 'not-allowed' : 'pointer',
            fontSize: 12,
            fontWeight: 800,
            fontFamily: 'monospace',
            letterSpacing: '0.5px',
            boxShadow: sourceBuffer && !isExporting ? '0 4px 16px rgba(0, 255, 136, 0.3)' : 'none',
          }}
        >
          {isExporting
            ? `💾 EXPORT... ${exportProgress}%`
            : '💾 TÉLÉCHARGER WAV MASTERISÉ'}
        </button>
        <div
          style={{
            fontSize: 9,
            color: '#666',
            marginTop: 6,
            textAlign: 'center',
            fontFamily: 'monospace',
          }}
        >
          Applique tous les réglages + preset actuel
        </div>
      </div>
    </div>
  );
};

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  isPercent?: boolean;
  onChange: (v: number) => void;
}

const Knob: React.FC<KnobProps> = ({ label, value, min, max, step, unit, color, isPercent, onChange }) => {
  const displayValue = isPercent ? `${Math.round(value * 100)}%` : `${value.toFixed(step < 1 ? 2 : 0)} ${unit}`;
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>{label}</span>
        <span style={{ fontSize: 11, color, fontWeight: 700, fontFamily: 'monospace' }}>{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: color,
          height: 4,
          background: `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, rgba(255,255,255,0.1) ${percent}%, rgba(255,255,255,0.1) 100%)`,
          borderRadius: 2,
          appearance: 'none',
          cursor: 'pointer',
        }}
      />
    </div>
  );
};