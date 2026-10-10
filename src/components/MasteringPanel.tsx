// src/components/MasteringPanel.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioAnalyzer, type AudioMetrics } from '../audio/audioAnalyzer';
import { MasteringChain, type MasteringPreset, DEFAULT_EQ_BANDS, type EQBand } from '../audio/masteringChain';
import { Knob } from './Knob';
import { EQPanel } from './EQPanel';
import { MonoMakerPanel } from './MonoMakerPanel';
import { exportMasteredWav, downloadBlob } from '../audio/masteringExporter';

interface MasteringPanelProps {
  audioContext: AudioContext | null;
  sourceNode: AudioNode | null;
  sourceBuffer: AudioBuffer | null;
  onExport?: (preset: MasteringPreset) => void;
}

export const MasteringPanel: React.FC<MasteringPanelProps> = ({
  audioContext,
  sourceNode,
  sourceBuffer,
  onExport,
}) => {
  const [preset, setPreset] = useState<MasteringPreset>('balanced');
  const [isBypassed, setIsBypassed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [metrics, setMetrics] = useState<AudioMetrics>({
    lufs: -Infinity,
    truePeak: -Infinity,
    dr: 0,
  });

  const [loudness, setLoudness] = useState(0);
  const [presence, setPresence] = useState(0);
  const [width, setWidth] = useState(0);
  const [saturation, setSaturation] = useState(0);

  const [eqBands, setEqBands] = useState<EQBand[]>(DEFAULT_EQ_BANDS);
  const [showEQ, setShowEQ] = useState(true);

  // Mono-Maker
  const [monoMakerEnabled, setMonoMakerEnabled] = useState(false);
  const [monoMakerFreq, setMonoMakerFreq] = useState(120);

  const chainRef = useRef<MasteringChain | null>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

  // Init chaîne
  useEffect(() => {
    if (!audioContext) return;

    const chain = new MasteringChain(audioContext);
    if (sourceNode) chain.connect(sourceNode);
    chainRef.current = chain;

    const analyzer = new AudioAnalyzer(audioContext);
    const outputNode = chain.getOutputNode();
    if (outputNode) analyzer.connect(outputNode);
    analyzerRef.current = analyzer;

    return () => {
      analyzer.destroy();
      chain.destroy();
      chainRef.current = null;
      analyzerRef.current = null;
    };
  }, [audioContext]);

  useEffect(() => {
    if (!chainRef.current || !sourceNode) return;
    chainRef.current.connect(sourceNode);
  }, [sourceNode]);

  useEffect(() => {
    if (!analyzerRef.current) return;
    if (isAnalyzing) {
      analyzerRef.current.start((newMetrics) => setMetrics(newMetrics));
    } else {
      analyzerRef.current.stop();
    }
    return () => {
      if (analyzerRef.current) analyzerRef.current.stop();
    };
  }, [isAnalyzing]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain) return;
    chain.setLoudness(loudness);
    chain.setPresence(presence);
    chain.setWidth(width);
    chain.setSaturation(saturation);
  }, [loudness, presence, width, saturation]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain) {
      const fallback: Record<MasteringPreset, any> = {
        warm: { loudness: -1, presence: -1, width: 1.1, saturation: 0.15 },
        balanced: { loudness: -2, presence: 0, width: 1.0, saturation: 0.08 },
        open: { loudness: -3, presence: 2.5, width: 1.3, saturation: 0.05 },
        master: { loudness: 0, presence: 0, width: 1.0, saturation: 0 },
      };
      const v = fallback[preset];
      setLoudness(v.loudness);
      setPresence(v.presence);
      setWidth(v.width);
      setSaturation(v.saturation);
      return;
    }

    chain.applyPreset(preset);
    const presetValues = chain.getPresetValues(preset);
    setLoudness(presetValues.loudness);
    setPresence(presetValues.presence);
    setWidth(presetValues.width);
    setSaturation(presetValues.saturation);

    const eqPreset = chain.getEQPreset(preset);
    const newBands = DEFAULT_EQ_BANDS.map((band, i) => ({
      ...band,
      frequency: eqPreset[i].frequency,
      gain: eqPreset[i].gain,
      q: eqPreset[i].q,
    }));
    setEqBands(newBands);

    // Sync Mono-Maker state depuis le chain
    setMonoMakerEnabled(preset === 'warm' || preset === 'balanced');
    setMonoMakerFreq(120);
  }, [preset, audioContext]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain) return;
    chain.setBypass(isBypassed);
  }, [isBypassed]);

  const handleEQChange = useCallback(
    (index: number, frequency: number, gain: number, q: number) => {
      const newBands = [...eqBands];
      newBands[index] = { ...newBands[index], frequency, gain, q };
      setEqBands(newBands);
      const chain = chainRef.current;
      if (chain) chain.setEQBand(index, frequency, gain, q);
    },
    [eqBands]
  );

  const handleEQReset = useCallback(() => {
    const resetBands = DEFAULT_EQ_BANDS.map((band) => ({ ...band, gain: 0 }));
    setEqBands(resetBands);
    const chain = chainRef.current;
    if (chain) {
      resetBands.forEach((band, i) => chain.setEQBand(i, band.frequency, 0, band.q));
    }
  }, []);

  const handleMonoMakerToggle = useCallback(
    (enabled: boolean) => {
      setMonoMakerEnabled(enabled);
      const chain = chainRef.current;
      if (chain) chain.setMonoMaker(enabled, monoMakerFreq);
    },
    [monoMakerFreq]
  );

  const handleMonoMakerFreqChange = useCallback(
    (freq: number) => {
      setMonoMakerFreq(freq);
      const chain = chainRef.current;
      if (chain) chain.setMonoMaker(monoMakerEnabled, freq);
    },
    [monoMakerEnabled]
  );

  const handleExport = useCallback(async () => {
    if (!sourceBuffer) {
      alert("Veuillez d'abord charger un fichier audio.");
      return;
    }
    try {
      setIsExporting(true);
      setExportProgress(0);
      const blob = await exportMasteredWav({
        buffer: sourceBuffer,
        preset,
        loudness,
        presence,
        width,
        saturation,
        onProgress: (p) => setExportProgress(p),
      });
      const filename = `waveforge-master-${preset}-${Date.now()}.wav`;
      downloadBlob(blob, filename);
      if (onExport) onExport(preset);
    } catch (error) {
      console.error("Erreur lors de l'export :", error);
      alert("Erreur lors de l'export. Vérifie la console.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [sourceBuffer, preset, loudness, presence, width, saturation, onExport]);

  const renderMetric = (label: string, value: number, unit: string, color: string) => (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        padding: '8px',
        backgroundColor: '#1a1a1a',
        borderRadius: '6px',
        border: '1px solid #2a2a2a',
      }}
    >
      <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {isFinite(value) ? value.toFixed(1) : '-∞'}
      </div>
      <div style={{ fontSize: '9px', color: '#444' }}>{unit}</div>
    </div>
  );

  const renderPresetButton = (p: MasteringPreset, label: string) => (
    <button
      key={p}
      onClick={() => setPreset(p)}
      style={{
        flex: 1,
        padding: '10px 8px',
        borderRadius: '6px',
        border: preset === p ? '1px solid #00d9ff' : '1px solid #2a2a2a',
        backgroundColor: preset === p ? 'rgba(0, 217, 255, 0.15)' : '#1a1a1a',
        color: preset === p ? '#00d9ff' : '#888',
        cursor: 'pointer',
        fontWeight: preset === p ? 600 : 400,
        fontSize: '12px',
        transition: 'all 0.2s ease',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        backgroundColor: '#0d0d0d',
        color: '#fff',
        padding: '20px',
        borderRadius: '12px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        maxWidth: '620px',
        margin: '0 auto',
        border: '1px solid #1f1f1f',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '1px' }}>
            WAVEFORGE <span style={{ color: '#00d9ff' }}>MASTERING</span>
          </h2>
          <div style={{ fontSize: '10px', color: '#444', marginTop: '2px', letterSpacing: '2px' }}>
            PROFESSIONAL AUDIO PROCESSING
          </div>
        </div>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isAnalyzing ? '#00ff88' : '#333',
            boxShadow: isAnalyzing ? '0 0 8px #00ff88' : 'none',
            transition: 'all 0.3s',
          }}
        />
      </div>

      {/* Presets */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px', letterSpacing: '1px' }}>
          PRESET
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {renderPresetButton('warm', 'Warm')}
          {renderPresetButton('balanced', 'Balanced')}
          {renderPresetButton('open', 'Open')}
          {renderPresetButton('master', 'Master')}
        </div>
      </div>

      {/* EQ 5 bandes */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <div style={{ fontSize: '10px', color: '#666', letterSpacing: '1px' }}>
            🎛️ ÉGALISEUR 5 BANDES
          </div>
          <button
            onClick={() => setShowEQ(!showEQ)}
            style={{
              background: 'transparent',
              border: '1px solid #2a2a2a',
              borderRadius: 4,
              color: showEQ ? '#00d9ff' : '#666',
              fontSize: 10,
              cursor: 'pointer',
              padding: '2px 8px',
              fontWeight: 600,
            }}
          >
            {showEQ ? '▼ MASQUER' : '▶ AFFICHER'}
          </button>
        </div>
        {showEQ && (
          <EQPanel
            bands={eqBands}
            onChange={handleEQChange}
            onReset={handleEQReset}
            height={160}
          />
        )}
      </div>

      {/* Mono-Maker */}
      <div style={{ marginBottom: '20px' }}>
        <MonoMakerPanel
          enabled={monoMakerEnabled}
          frequency={monoMakerFreq}
          onToggle={handleMonoMakerToggle}
          onFrequencyChange={handleMonoMakerFreqChange}
        />
      </div>

      {/* Métriques */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px', letterSpacing: '1px' }}>
          LIVE METRICS
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {renderMetric('LUFS', metrics.lufs, 'INTEGRATED', '#00d9ff')}
          {renderMetric('True Peak', metrics.truePeak, 'dBTP', '#ff6b6b')}
          {renderMetric('DR', metrics.dr, 'dB', '#51cf66')}
        </div>
      </div>

      {/* Knobs */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', color: '#666', marginBottom: '12px', letterSpacing: '1px' }}>
          PARAMETERS
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <Knob label="Loudness" value={loudness} min={-12} max={12} step={0.1} unit="dB" color="#00d9ff" onChange={setLoudness} />
          <Knob label="Presence" value={presence} min={-12} max={12} step={0.1} unit="dB" color="#00d9ff" onChange={setPresence} />
          <Knob label="Width" value={width} min={0} max={2} step={0.01} unit="x" color="#00d9ff" onChange={setWidth} />
          <Knob label="Saturation" value={saturation} min={0} max={1} step={0.01} unit="%" color="#00d9ff" onChange={setSaturation} formatValue={(v) => `${(v * 100).toFixed(0)}`} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          onClick={() => setIsBypassed(!isBypassed)}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #2a2a2a',
            backgroundColor: isBypassed ? '#ff6b6b' : '#1a1a1a',
            color: isBypassed ? '#fff' : '#888',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '11px',
            letterSpacing: '1px',
            transition: 'all 0.2s',
          }}
        >
          {isBypassed ? '● BYPASS ACTIF' : 'A/B BYPASS'}
        </button>
        <button
          onClick={() => setIsAnalyzing(!isAnalyzing)}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #2a2a2a',
            backgroundColor: isAnalyzing ? 'rgba(0, 217, 255, 0.15)' : '#1a1a1a',
            color: isAnalyzing ? '#00d9ff' : '#888',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '11px',
            letterSpacing: '1px',
            transition: 'all 0.2s',
          }}
        >
          {isAnalyzing ? '■ STOP ANALYSE' : '▶ ANALYSER'}
        </button>
      </div>

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={isExporting || !sourceBuffer}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '6px',
          border: 'none',
          background: isExporting
            ? 'linear-gradient(135deg, #666 0%, #444 100%)'
            : !sourceBuffer
            ? 'linear-gradient(135deg, #333 0%, #222 100%)'
            : 'linear-gradient(135deg, #00d9ff 0%, #0088ff 100%)',
          color: isExporting || !sourceBuffer ? '#888' : '#000',
          cursor: isExporting ? 'wait' : !sourceBuffer ? 'not-allowed' : 'pointer',
          fontWeight: 700,
          fontSize: '12px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          boxShadow: !sourceBuffer ? 'none' : '0 4px 16px rgba(0, 217, 255, 0.3)',
          transition: 'all 0.2s',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isExporting
          ? `EXPORT EN COURS... ${(exportProgress * 100).toFixed(0)}%`
          : !sourceBuffer
          ? 'CHARGE UN AUDIO D\'ABORD'
          : 'EXPORT WAV MASTERISÉ'}
        {isExporting && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: '3px',
              width: `${exportProgress * 100}%`,
              backgroundColor: '#00d9ff',
              transition: 'width 0.1s linear',
            }}
          />
        )}
      </button>

      <div style={{ marginTop: '15px', fontSize: '9px', color: '#333', textAlign: 'center', letterSpacing: '1px' }}>
        WAVEFORGE PRO · MASTERING ENGINE v1.2 · EQ + MONO-MAKER
      </div>
    </div>
  );
};