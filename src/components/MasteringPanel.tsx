// src/components/MasteringPanel.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioAnalyzer, type AudioMetrics } from '../audio/audioAnalyzer';
import {
  MasteringChain,
  type MasteringPreset,
  DEFAULT_EQ_BANDS,
  type EQBand,
} from '../audio/masteringChain';
import { Knob } from './Knob';
import { EQPanel } from './EQPanel';
import { MonoMakerPanel } from './MonoMakerPanel';
import { ImagerPanel } from './ImagerPanel';
import { VectorScope } from './VectorScope';
import { CorrelationMeter } from './CorrelationMeter';
import { PresetManager } from './PresetManager';
import { exportMasteredWav, downloadBlob } from '../audio/masteringExporter';
import type { UserMasteringPreset } from '../utils/masteringPresets';

interface MasteringPanelProps {
  audioContext: AudioContext | null;
  sourceNode: AudioNode | null;
  sourceBuffer: AudioBuffer | null;
  onExport?: (preset: MasteringPreset) => void;
  onChainReady?: (chain: MasteringChain) => void;
}

export const MasteringPanel: React.FC<MasteringPanelProps> = ({
  audioContext,
  sourceNode,
  sourceBuffer,
  onExport,
  onChainReady,
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

  // Imager
  const [imagerEnabled, setImagerEnabled] = useState(false);
  const [imagerLow, setImagerLow] = useState(0);
  const [imagerMid, setImagerMid] = useState(0);
  const [imagerHigh, setImagerHigh] = useState(0);

  // Scope
  const [showScope, setShowScope] = useState(true);
  const [showCorrelation, setShowCorrelation] = useState(true);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const chainRef = useRef<MasteringChain | null>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

  // ============================================================
  // INITIALISATION
  // ============================================================
  useEffect(() => {
    if (!audioContext) {
      console.warn('⚠️ MasteringPanel : audioContext est null');
      return;
    }

    console.log('🎚️ Initialisation de la chaîne de mastering...');

    const chain = new MasteringChain(audioContext);
    if (sourceNode) {
      chain.connect(sourceNode);
      console.log('🔌 sourceNode connecté');
    } else {
      console.log('⏳ sourceNode null, connecté plus tard');
    }
    chainRef.current = chain;

    const analyzer = new AudioAnalyzer(audioContext);
    const outputNode = chain.getOutputNode();
    if (outputNode) {
      outputNode.connect(audioContext.destination);
      analyzer.connect(outputNode);
    }
    analyzerRef.current = analyzer;
    setAnalyserNode(analyzer.getAnalyserNode());

    if (onChainReady) onChainReady(chain);

    return () => {
      analyzer.destroy();
      chain.destroy();
      chainRef.current = null;
      analyzerRef.current = null;
      setAnalyserNode(null);
    };
  }, [audioContext]);

  // Reconnexion sourceNode
  useEffect(() => {
    if (!chainRef.current || !sourceNode) return;
    chainRef.current.connect(sourceNode);
  }, [sourceNode]);

  // Analyse
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

  // Paramètres
  useEffect(() => {
    const chain = chainRef.current;
    if (!chain) return;
    chain.setLoudness(loudness);
    chain.setPresence(presence);
    chain.setWidth(width);
    chain.setSaturation(saturation);
  }, [loudness, presence, width, saturation]);

  // Preset
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

    setMonoMakerEnabled(preset === 'warm' || preset === 'balanced');
    setMonoMakerFreq(120);
  }, [preset, audioContext]);

  // Bypass
  useEffect(() => {
    const chain = chainRef.current;
    if (!chain) return;
    chain.setBypass(isBypassed);
  }, [isBypassed]);

  // ============================================================
  // HANDLERS
  // ============================================================
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

  // Imager handlers
  const handleImagerToggle = useCallback(
    (enabled: boolean) => {
      setImagerEnabled(enabled);
      const chain = chainRef.current;
      if (chain) chain.setImager(enabled, imagerLow, imagerMid, imagerHigh);
    },
    [imagerLow, imagerMid, imagerHigh]
  );

  const handleImagerLowChange = useCallback(
    (v: number) => {
      setImagerLow(v);
      const chain = chainRef.current;
      if (chain) chain.setImager(imagerEnabled, v, imagerMid, imagerHigh);
    },
    [imagerEnabled, imagerMid, imagerHigh]
  );

  const handleImagerMidChange = useCallback(
    (v: number) => {
      setImagerMid(v);
      const chain = chainRef.current;
      if (chain) chain.setImager(imagerEnabled, imagerLow, v, imagerHigh);
    },
    [imagerEnabled, imagerLow, imagerHigh]
  );

  const handleImagerHighChange = useCallback(
    (v: number) => {
      setImagerHigh(v);
      const chain = chainRef.current;
      if (chain) chain.setImager(imagerEnabled, imagerLow, imagerMid, v);
    },
    [imagerEnabled, imagerLow, imagerMid]
  );

  // Charger un preset utilisateur
  const handleLoadUserPreset = useCallback((userPreset: UserMasteringPreset) => {
    console.log('📂 Chargement preset:', userPreset.name);

    setLoudness(userPreset.loudness);
    setPresence(userPreset.presence);
    setWidth(userPreset.width);
    setSaturation(userPreset.saturation);

    const newBands = DEFAULT_EQ_BANDS.map((band, i) => ({
      ...band,
      frequency: userPreset.eqBands[i]?.frequency ?? band.frequency,
      gain: userPreset.eqBands[i]?.gain ?? 0,
      q: userPreset.eqBands[i]?.q ?? band.q,
    }));
    setEqBands(newBands);

    setMonoMakerEnabled(userPreset.monoMakerEnabled);
    setMonoMakerFreq(userPreset.monoMakerFreq);

    const chain = chainRef.current;
    if (chain) {
      chain.setLoudness(userPreset.loudness);
      chain.setPresence(userPreset.presence);
      chain.setWidth(userPreset.width);
      chain.setSaturation(userPreset.saturation);
      newBands.forEach((band, i) => {
        chain.setEQBand(i, band.frequency, band.gain, band.q);
      });
      chain.setMonoMaker(userPreset.monoMakerEnabled, userPreset.monoMakerFreq);
    }
  }, []);

  // Export WAV
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

  // ============================================================
  // RENDUS INTERNES
  // ============================================================
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
      <div
        style={{
          fontSize: '10px',
          color: '#666',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '22px',
          fontWeight: 700,
          color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
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

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
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
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '1px' }}>
            WAVEFORGE <span style={{ color: '#00d9ff' }}>MASTERING</span>
          </h2>
          <div
            style={{
              fontSize: '10px',
              color: '#444',
              marginTop: '2px',
              letterSpacing: '2px',
            }}
          >
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

      {/* PRESETS OFFICIELS */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '10px',
            color: '#666',
            marginBottom: '8px',
            letterSpacing: '1px',
          }}
        >
          🎨 PRESET OFFICIEL
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {renderPresetButton('warm', 'Warm')}
          {renderPresetButton('balanced', 'Balanced')}
          {renderPresetButton('open', 'Open')}
          {renderPresetButton('master', 'Master')}
        </div>
      </div>

      {/* PRESETS UTILISATEUR */}
      <div style={{ marginBottom: '20px' }}>
        <PresetManager
          currentValues={{
            loudness,
            presence,
            width,
            saturation,
            eqBands: eqBands.map((b) => ({
              frequency: b.frequency,
              gain: b.gain,
              q: b.q,
            })),
            monoMakerEnabled,
            monoMakerFreq,
          }}
          onLoadPreset={handleLoadUserPreset}
        />
      </div>

      {/* EQ 5 BANDES */}
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

      {/* MONO-MAKER */}
      <div style={{ marginBottom: '20px' }}>
        <MonoMakerPanel
          enabled={monoMakerEnabled}
          frequency={monoMakerFreq}
          onToggle={handleMonoMakerToggle}
          onFrequencyChange={handleMonoMakerFreqChange}
        />
      </div>

      {/* IMAGER 3 BANDES */}
      <div style={{ marginBottom: '20px' }}>
        <ImagerPanel
          enabled={imagerEnabled}
          lowAmount={imagerLow}
          midAmount={imagerMid}
          highAmount={imagerHigh}
          onToggle={handleImagerToggle}
          onLowChange={handleImagerLowChange}
          onMidChange={handleImagerMidChange}
          onHighChange={handleImagerHighChange}
        />
      </div>

      {/* VECTOR SCOPE */}
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
            🌌 VECTOR SCOPE (STÉRÉO)
          </div>
          <button
            onClick={() => setShowScope(!showScope)}
            style={{
              background: 'transparent',
              border: '1px solid #2a2a2a',
              borderRadius: 4,
              color: showScope ? '#00d9ff' : '#666',
              fontSize: 10,
              cursor: 'pointer',
              padding: '2px 8px',
              fontWeight: 600,
            }}
          >
            {showScope ? '▼ MASQUER' : '▶ AFFICHER'}
          </button>
        </div>
        {showScope && (
          <div
            style={{
              padding: 16,
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid #1f1f1f',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <VectorScope
              analyser={analyserNode}
              isActive={isAnalyzing}
              size={220}
              color="#00d9ff"
            />
          </div>
        )}
      </div>

            {/* CORRELATION METER */}
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
            📊 CORRELATION METER
          </div>
          <button
            onClick={() => setShowCorrelation(!showCorrelation)}
            style={{
              background: 'transparent',
              border: '1px solid #2a2a2a',
              borderRadius: 4,
              color: showCorrelation ? '#00d9ff' : '#666',
              fontSize: 10,
              cursor: 'pointer',
              padding: '2px 8px',
              fontWeight: 600,
            }}
          >
            {showCorrelation ? '▼ MASQUER' : '▶ AFFICHER'}
          </button>
        </div>
        {showCorrelation && (
          <CorrelationMeter
            analyser={analyserNode}
            isActive={isAnalyzing}
            color="#00d9ff"
          />
        )}
      </div>

      {/* MÉTRIQUES */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '10px',
            color: '#666',
            marginBottom: '8px',
            letterSpacing: '1px',
          }}
        >
          📊 LIVE METRICS
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {renderMetric('LUFS', metrics.lufs, 'INTEGRATED', '#00d9ff')}
          {renderMetric('True Peak', metrics.truePeak, 'dBTP', '#ff6b6b')}
          {renderMetric('DR', metrics.dr, 'dB', '#51cf66')}
        </div>
      </div>

      {/* KNOBS */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '10px',
            color: '#666',
            marginBottom: '12px',
            letterSpacing: '1px',
          }}
        >
          🎚️ PARAMETERS
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          <Knob label="Loudness" value={loudness} min={-12} max={12} step={0.1} unit="dB" color="#00d9ff" onChange={setLoudness} />
          <Knob label="Presence" value={presence} min={-12} max={12} step={0.1} unit="dB" color="#00d9ff" onChange={setPresence} />
          <Knob label="Width" value={width} min={0} max={2} step={0.01} unit="x" color="#00d9ff" onChange={setWidth} />
          <Knob label="Saturation" value={saturation} min={0} max={1} step={0.01} unit="%" color="#00d9ff" onChange={setSaturation} formatValue={(v) => `${(v * 100).toFixed(0)}`} />
        </div>
      </div>

      {/* ACTIONS */}
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

      {/* EXPORT WAV */}
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
          ? "CHARGE UN AUDIO D'ABORD"
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

      <div
        style={{
          marginTop: '15px',
          fontSize: '9px',
          color: '#333',
          textAlign: 'center',
          letterSpacing: '1px',
        }}
      >
        WAVEFORGE PRO · MASTERING ENGINE v1.6 · EQ + MONO + IMAGER + SCOPE + PRESETS
      </div>
    </div>
  );
};