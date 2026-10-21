// src/components/MasteringPanel.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getMasteringChainSingleton,
  renderMasteredOffline,
  DEFAULT_EQ_BANDS,
  type MasteringChain,
  type MasteringPreset,
} from '../audio/masteringChain';
import { audioBufferToWav, downloadBlob } from '../utils/wavEncoder';

export interface MasteringExportPayload {
  id: string; timestamp: number; preset: string; intensity: number;
  fileName: string; duration: number; blob: Blob;
}

interface MasteringPanelProps {
  audioContext: AudioContext | null;
  sourceNode: AudioNode | null;
  sourceBuffer: AudioBuffer | null;
  preset: MasteringPreset;
  intensity: number;
  onChainReady: (chain: MasteringChain | null) => void;
  onExport?: (payload: MasteringExportPayload) => void;
}

export const MasteringPanel: React.FC<MasteringPanelProps> = ({
  audioContext, sourceBuffer, preset, intensity, onChainReady, onExport,
}) => {
  const chainRef = useRef<MasteringChain | null>(null);
  const [eqGains, setEqGains] = useState<number[]>(DEFAULT_EQ_BANDS.map(b => b.gain));
  const [monoEnabled, setMonoEnabled] = useState(false);
  const [monoFreq, setMonoFreq] = useState(120);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  useEffect(() => {
    if (!audioContext) { onChainReady(null); return; }
    const chain = getMasteringChainSingleton(audioContext);
    chainRef.current = chain;
    onChainReady(chain);
  }, [audioContext, onChainReady]);

  useEffect(() => {
    chainRef.current?.applyPreset(preset, intensity / 100);
  }, [preset, intensity]);

  const handleEqGain = useCallback((index: number, gain: number) => {
    setEqGains(prev => {
      const next = [...prev]; next[index] = gain; return next;
    });
    const band = DEFAULT_EQ_BANDS[index];
    chainRef.current?.setEQBand(index, band.frequency, gain, band.q);
  }, []);

  const handleMonoToggle = useCallback(() => {
    setMonoEnabled(prev => {
      chainRef.current?.setMonoMaker(!prev, monoFreq);
      return !prev;
    });
  }, [monoFreq]);

  const handleMonoFreq = useCallback((freq: number) => {
    setMonoFreq(freq);
    if (monoEnabled) chainRef.current?.setMonoMaker(true, freq);
  }, [monoEnabled]);

  const handleExport = useCallback(async () => {
    if (!sourceBuffer || exporting) return;
    setExporting(true); setExportProgress(10);
    try {
      const rendered = await renderMasteredOffline(sourceBuffer, preset, intensity / 100);
      setExportProgress(80);
      const blob = audioBufferToWav(rendered);
      const fileName = `mastered_${preset}_${intensity}pct.wav`;
      onExport?.({ id: crypto.randomUUID(), timestamp: Date.now(), preset, intensity, fileName, duration: rendered.duration, blob });
      downloadBlob(blob, fileName);
      setExportProgress(100);
    } catch (e) {
      alert('Erreur export');
    } finally {
      setTimeout(() => { setExporting(false); setExportProgress(0); }, 600);
    }
  }, [sourceBuffer, preset, intensity, onExport, exporting]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="wf-glass" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="wf-label">🎛️ Chaîne de mastering</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
            Preset : <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{preset.toUpperCase()}</span> · {intensity}%
          </div>
        </div>
        <button onClick={handleExport} disabled={!sourceBuffer || exporting} className="wf-btn wf-btn-primary" style={{ background: exporting ? 'var(--bg-3)' : 'linear-gradient(135deg, #00ff88, #00cc6a)', color: '#000' }}>
          {exporting ? `⏳ RENDU ${exportProgress}%` : '💾 EXPORT WAV'}
        </button>
      </div>

      <div className="wf-glass" style={{ padding: 16 }}>
        <div className="wf-label" style={{ marginBottom: 16 }}>Égaliseur 5 Bandes</div>
        <div style={{ display: 'grid', gap: 4 }}>
          {DEFAULT_EQ_BANDS.map((band, i) => (
            <div key={band.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', borderBottom: i < DEFAULT_EQ_BANDS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div style={{ width: 90 }}>
                <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{band.label}</div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{band.frequency >= 1000 ? `${band.frequency / 1000}kHz` : `${band.frequency}Hz`}</div>
              </div>
              <input type="range" min={-12} max={12} step={0.5} value={eqGains[i]} onChange={(e) => handleEqGain(i, parseFloat(e.target.value))} style={{ flex: 1, accentColor: band.color }} />
              <div className="mono" style={{ width: 60, textAlign: 'right', fontSize: 12, fontWeight: 600, color: eqGains[i] !== 0 ? band.color : 'var(--text-tertiary)' }}>
                {eqGains[i] > 0 ? '+' : ''}{eqGains[i].toFixed(1)} dB
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wf-glass" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="wf-label">Mono-Maker (Basses)</div>
          <button onClick={handleMonoToggle} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', fontWeight: 700, fontSize: 10, background: monoEnabled ? 'var(--accent-success)' : 'var(--bg-3)', color: monoEnabled ? '#000' : 'var(--text-secondary)', cursor: 'pointer' }}>
            {monoEnabled ? 'ACTIF' : 'INACTIF'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <input type="range" min={60} max={300} step={5} value={monoFreq} onChange={(e) => handleMonoFreq(parseInt(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent-secondary)' }} disabled={!monoEnabled} />
          <div className="mono" style={{ width: 60, textAlign: 'right', fontSize: 12, color: 'var(--accent-secondary)' }}>{monoFreq} Hz</div>
        </div>
      </div>
    </div>
  );
};