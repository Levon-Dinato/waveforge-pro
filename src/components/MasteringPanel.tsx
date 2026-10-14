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

  const [monoMakerEnabled, setMonoMakerEnabled] = useState(false);
  const [monoMakerFreq, setMonoMakerFreq] = useState(120);

  const [imagerEnabled, setImagerEnabled] = useState(false);
  const [imagerLow, setImagerLow] = useState(0);
  const [imagerMid, setImagerMid] = useState(0);
  const [imagerHigh, setImagerHigh] = useState(0);

  const [showScope, setShowScope] = useState(true);
  const [showCorrelation, setShowCorrelation] = useState(true);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const chainRef = useRef<MasteringChain | null>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

  // ============================================================
  // INITIALISATION
  // ============================================================
  useEffect(() => {
    if (!audioContext) return;

    const chain = new MasteringChain(audioContext);
    if (sourceNode) chain.connect(sourceNode);
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

    setMonoMakerEnabled(preset === 'warm' || preset === 'balanced');
    setMonoMakerFreq(120);
  }, [preset, audioContext]);

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

  const handleLoadUserPreset = useCallback((userPreset: UserMasteringPreset) => {
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
  // SOUS-COMPOSANTS
  // ============================================================
  const MetricCard: React.FC<{
    label: string;
    value: number;
    unit: string;
    color: string;
  }> = ({ label, value, unit, color }) => (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        padding: '14px 10px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 12,
        border: `1px solid ${color}25`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '-0.5px',
        }}
      >
        {isFinite(value) ? value.toFixed(1) : '-∞'}
      </div>
      <div
        style={{
          fontSize: 8,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '1px',
          fontWeight: 600,
          marginTop: 2,
        }}
      >
        {unit}
      </div>
    </div>
  );

  const PresetButton: React.FC<{
    p: MasteringPreset;
    label: string;
    color: string;
    icon: string;
  }> = ({ p, label, color, icon }) => {
    const active = preset === p;
    return (
      <button
        onClick={() => setPreset(p)}
        style={{
          flex: 1,
          padding: '14px 10px',
          borderRadius: 12,
          border: active
            ? `1.5px solid ${color}`
            : '1px solid rgba(255,255,255,0.06)',
          background: active
            ? `linear-gradient(135deg, ${color}25, ${color}08)`
            : 'rgba(255,255,255,0.02)',
          color: active ? color : 'rgba(255,255,255,0.6)',
          cursor: 'pointer',
          fontWeight: active ? 800 : 600,
          fontSize: 11,
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          boxShadow: active ? `0 8px 24px ${color}30` : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span>{label}</span>
      </button>
    );
  };

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div
      className="wf-fade-in"
      style={{
        position: 'relative',
        background: 'rgba(20, 20, 30, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: '#fff',
        padding: 24,
        borderRadius: 20,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        maxWidth: 700,
        margin: '0 auto',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow:
          '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04) inset',
        overflow: 'hidden',
      }}
    >
      {/* AURA DÉCORATIVE */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(124, 92, 255, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(0, 217, 255, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }}
      />

      {/* HEADER V3 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          position: 'relative',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '-0.5px',
            }}
          >
            WAVEFORGE{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #7c5cff, #00d9ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              MASTERING
            </span>
            <span
              style={{
                fontSize: 9,
                color: '#7c5cff',
                marginLeft: 10,
                padding: '3px 8px',
                background: 'rgba(124, 92, 255, 0.15)',
                border: '1px solid rgba(124, 92, 255, 0.4)',
                borderRadius: 10,
                verticalAlign: 'middle',
                fontWeight: 700,
                letterSpacing: '1px',
              }}
            >
              PRO
            </span>
          </h2>
          <div
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.35)',
              marginTop: 4,
              letterSpacing: '2px',
              fontWeight: 600,
            }}
          >
            PROFESSIONAL AUDIO PROCESSING
          </div>
        </div>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: isAnalyzing ? '#00ff88' : 'rgba(255,255,255,0.15)',
            boxShadow: isAnalyzing
              ? '0 0 16px #00ff88, 0 0 32px #00ff8880'
              : 'none',
            transition: 'all 0.3s',
          }}
        />
      </div>

      {/* PRESETS OFFICIELS V3 */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.4)',
            marginBottom: 10,
            letterSpacing: '1.5px',
            fontWeight: 700,
          }}
        >
          🎨 PRESETS OFFICIELS
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <PresetButton p="warm" label="Warm" color="#ffb800" icon="🔥" />
          <PresetButton p="balanced" label="Balanced" color="#00d9ff" icon="⚖️" />
          <PresetButton p="open" label="Open" color="#00ff88" icon="🌊" />
          <PresetButton p="master" label="Master" color="#888" icon="🎯" />
        </div>
      </div>

      {/* PRESETS UTILISATEUR */}
      <div style={{ marginBottom: 24 }}>
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
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '1.5px',
              fontWeight: 700,
            }}
          >
            🎛️ ÉGALISEUR 5 BANDES
          </div>
          <button
            onClick={() => setShowEQ(!showEQ)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: showEQ ? '#00d9ff' : 'rgba(255,255,255,0.5)',
              fontSize: 10,
              cursor: 'pointer',
              padding: '4px 10px',
              fontWeight: 700,
              letterSpacing: '0.5px',
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
      <div style={{ marginBottom: 24 }}>
        <MonoMakerPanel
          enabled={monoMakerEnabled}
          frequency={monoMakerFreq}
          onToggle={handleMonoMakerToggle}
          onFrequencyChange={handleMonoMakerFreqChange}
        />
      </div>

      {/* IMAGER 3 BANDES */}
      <div style={{ marginBottom: 24 }}>
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
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '1.5px',
              fontWeight: 700,
            }}
          >
            🌌 VECTOR SCOPE
          </div>
          <button
            onClick={() => setShowScope(!showScope)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: showScope ? '#00d9ff' : 'rgba(255,255,255,0.5)',
              fontSize: 10,
              cursor: 'pointer',
              padding: '4px 10px',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            {showScope ? '▼ MASQUER' : '▶ AFFICHER'}
          </button>
        </div>
        {showScope && (
          <div
            style={{
              padding: 20,
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
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
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '1.5px',
              fontWeight: 700,
            }}
          >
            📊 CORRELATION METER
          </div>
          <button
            onClick={() => setShowCorrelation(!showCorrelation)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: showCorrelation ? '#00d9ff' : 'rgba(255,255,255,0.5)',
              fontSize: 10,
              cursor: 'pointer',
              padding: '4px 10px',
              fontWeight: 700,
              letterSpacing: '0.5px',
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

      {/* MÉTRIQUES V3 */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.4)',
            marginBottom: 10,
            letterSpacing: '1.5px',
            fontWeight: 700,
          }}
        >
          📊 LIVE METRICS
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <MetricCard label="LUFS" value={metrics.lufs} unit="INTEGRATED" color="#00d9ff" />
          <MetricCard label="True Peak" value={metrics.truePeak} unit="dBTP" color="#ff6b6b" />
          <MetricCard label="DR" value={metrics.dr} unit="dB" color="#51cf66" />
        </div>
      </div>

      {/* KNOBS V3 */}
      <div
        style={{
          marginBottom: 24,
          padding: 20,
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.4)',
            marginBottom: 16,
            letterSpacing: '1.5px',
            fontWeight: 700,
            textAlign: 'center',
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

      {/* ACTIONS V3 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setIsBypassed(!isBypassed)}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: 12,
            border: isBypassed
              ? '1px solid #ff6b6b'
              : '1px solid rgba(255,255,255,0.08)',
            background: isBypassed
              ? 'linear-gradient(135deg, #ff6b6b, #cc1144)'
              : 'rgba(255, 255, 255, 0.03)',
            color: isBypassed ? '#fff' : 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: '1px',
            transition: 'all 0.2s',
            boxShadow: isBypassed ? '0 6px 24px rgba(255, 107, 107, 0.4)' : 'none',
          }}
        >
          {isBypassed ? '● BYPASS ACTIF' : 'A/B BYPASS'}
        </button>
        <button
          onClick={() => setIsAnalyzing(!isAnalyzing)}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: 12,
            border: isAnalyzing
              ? '1px solid #00d9ff'
              : '1px solid rgba(255,255,255,0.08)',
            background: isAnalyzing
              ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 217, 255, 0.05))'
              : 'rgba(255, 255, 255, 0.03)',
            color: isAnalyzing ? '#00d9ff' : 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: '1px',
            transition: 'all 0.2s',
            boxShadow: isAnalyzing ? '0 6px 24px rgba(0, 217, 255, 0.3)' : 'none',
          }}
        >
          {isAnalyzing ? '■ STOP ANALYSE' : '▶ ANALYSER'}
        </button>
      </div>

      {/* EXPORT V3 */}
      <button
        onClick={handleExport}
        disabled={isExporting || !sourceBuffer}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 12,
          border: 'none',
          background: isExporting
            ? 'linear-gradient(135deg, #333 0%, #222 100%)'
            : !sourceBuffer
            ? 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)'
            : 'linear-gradient(135deg, #7c5cff 0%, #00d9ff 100%)',
          color: isExporting || !sourceBuffer ? 'rgba(255,255,255,0.4)' : '#000',
          cursor: isExporting ? 'wait' : !sourceBuffer ? 'not-allowed' : 'pointer',
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          boxShadow: !sourceBuffer
            ? 'none'
            : '0 8px 32px rgba(124, 92, 255, 0.4)',
          transition: 'all 0.2s',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!isExporting && sourceBuffer) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow =
              '0 12px 40px rgba(124, 92, 255, 0.5)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = !sourceBuffer
            ? 'none'
            : '0 8px 32px rgba(124, 92, 255, 0.4)';
        }}
      >
        {isExporting
          ? `EXPORT EN COURS... ${(exportProgress * 100).toFixed(0)}%`
          : !sourceBuffer
          ? "CHARGE UN AUDIO D'ABORD"
          : '⬇️ EXPORT WAV MASTERISÉ'}
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
              boxShadow: '0 0 12px #00d9ff',
            }}
          />
        )}
      </button>

      {/* FOOTER */}
      <div
        style={{
          marginTop: 20,
          fontSize: 9,
          color: 'rgba(255,255,255,0.2)',
          textAlign: 'center',
          letterSpacing: '1.5px',
          fontWeight: 600,
        }}
      >
        WAVEFORGE PRO · MASTERING ENGINE v1.8 · EQ + MONO + IMAGER + SCOPE + CORRELATION
      </div>
    </div>
  );
};