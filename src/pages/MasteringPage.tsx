// src/pages/MasteringPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MasteringPanel } from '../components/MasteringPanel';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { LUFSMeter, MasteringChain, type MasteringPreset } from '../audio/masteringChain';

import { Knob } from '../components/ui/Knob';
import { CurveVisualizer } from '../components/ui/CurveVisualizer';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';

const PRESETS = [
  { id: 'universal', name: 'Universel', color: '#a08aff', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> },
  { id: 'fire', name: 'Feu', color: '#ef4444', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg> },
  { id: 'clarity', name: 'Clarté', color: '#00d9ff', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3L8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg> },
  { id: 'cassette', name: 'Cassette', color: '#f59e0b', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><path d="M6 18h12"/></svg> },
  { id: 'natural', name: 'Naturel', color: '#10b981', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg> },
  { id: 'spatial', name: 'Spatial', color: '#00d9ff', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg> },
  { id: 'cinematic', name: 'Cinématique', color: '#f59e0b', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg> },
  { id: 'punch', name: 'Punch', color: '#ec4899', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
];

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const MasteringPage: React.FC = () => {
  const engine = useAudioEngineContext();
  const hasAudio = !!engine.audioBuffer;

  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [presetIntensity, setPresetIntensity] = useState(50);
  const [activePreset, setActivePreset] = useState<string>('universal');
  const [abMode, setAbMode] = useState<'original' | 'mastered'>('mastered');
  const [isPlayingAB, setIsPlayingAB] = useState(false);
  const [abAnalyser, setAbAnalyser] = useState<AnalyserNode | null>(null);
  const [lufs, setLufs] = useState({ m: -Infinity, s: -Infinity, i: -Infinity });
  
  const [gainVal, setGainVal] = useState(50);
  const [widthVal, setWidthVal] = useState(50);
  const [dynVal, setDynVal] = useState(50);
  const [eq, setEq] = useState({ bass: 50, lowMid: 50, mid: 50, highMid: 50, high: 50 });

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const abGraphRef = useRef<{
    source: AudioBufferSourceNode; dryGain: GainNode; wetGain: GainNode;
    analyser: AnalyserNode; masterOut: GainNode; startTime: number;
  } | null>(null);

  const chainRef = useRef<MasteringChain | null>(null);
  const lufsRef = useRef<LUFSMeter | null>(null);
  const lufsContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (engine.audioBuffer) {
      setDuration(engine.audioBuffer.duration);
      setCurrentTime(0);
    }
  }, [engine.audioBuffer]);

  const handleLocalFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setLocalFileName(file.name);
    try {
      const formData = new FormData();
      formData.append('audio', file);
      const response = await fetch('https://mastering-server.onrender.com/master', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Erreur de mastering.');
      const blob = await response.blob();
      const masteredFile = new File([blob], `mastered-${file.name.replace(/\.[^/.]+$/, "")}.wav`, { type: 'audio/wav' });
      await engine.loadFile(masteredFile);
    } catch (err) {
      console.error("Erreur d'importation :", err);
      alert("Impossible de charger ou masteriser ce fichier audio.");
      setLocalFileName(null);
    } finally {
      setIsImporting(false);
    }
  };

  const handleChainReady = useCallback((chain: MasteringChain | null) => {
    chainRef.current = chain;
    if (chain && engine.audioContext) {
      if (!lufsRef.current || lufsContextRef.current !== engine.audioContext) {
        lufsRef.current?.destroy();
        lufsRef.current = new LUFSMeter(engine.audioContext);
        lufsContextRef.current = engine.audioContext;
      }
    }
  }, [engine.audioContext]);

  useEffect(() => {
    if (chainRef.current) {
      const curvedIntensity = Math.pow(presetIntensity / 100, 2.5);
      chainRef.current.applyPreset(activePreset as MasteringPreset, curvedIntensity);
    }
  }, [activePreset, presetIntensity]);

  useEffect(() => {
    if (!chainRef.current) return;
    const gainDb = (gainVal - 50) / 4.16; 
    chainRef.current.setInputGain(gainDb);
  }, [gainVal]);

  useEffect(() => {
    if (!chainRef.current) return;
    chainRef.current.setEQGain(0, ((eq.bass - 50) / 50) * 6);
    chainRef.current.setEQGain(1, ((eq.lowMid - 50) / 50) * 6);
    chainRef.current.setEQGain(2, ((eq.mid - 50) / 50) * 6);
    chainRef.current.setEQGain(3, ((eq.highMid - 50) / 50) * 6);
    chainRef.current.setEQGain(4, ((eq.high - 50) / 50) * 6);
  }, [eq]);

  useEffect(() => {
    if (!chainRef.current) return;
    const widthFactor = 0.5 + (widthVal / 100) * 0.7; 
    chainRef.current.setWidth(widthFactor);
  }, [widthVal]);

  useEffect(() => {
    if (!chainRef.current) return;
    const ratio = 1 + ((dynVal - 50) / 50) * 2; 
    chainRef.current.setCompressor(-12, Math.max(1, ratio), 0.02, 0.25);
  }, [dynVal]);

  useEffect(() => {
    const id = setInterval(() => {
      if (lufsRef.current) {
        const data = lufsRef.current.read();
        setLufs({ m: data.momentary, s: data.shortTerm, i: data.integrated });
      }
    }, 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let animationFrame: number;
    const updateTime = () => {
      if (abGraphRef.current && engine.audioContext) {
        const elapsed = engine.audioContext.currentTime - abGraphRef.current.startTime;
        setCurrentTime(Math.min(elapsed, duration));
        animationFrame = requestAnimationFrame(updateTime);
      }
    };
    if (isPlayingAB) {
      updateTime();
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlayingAB, duration, engine.audioContext]);

  const handleStopAB = useCallback(() => {
    const g = abGraphRef.current;
    if (!g) return;
    try { g.source.stop(); } catch {}
    try { g.source.disconnect(); } catch {}
    try { g.dryGain.disconnect(); } catch {}
    try { g.wetGain.disconnect(); } catch {}
    try { g.masterOut.disconnect(); } catch {}
    try { g.analyser.disconnect(); } catch {}
    abGraphRef.current = null;
    setIsPlayingAB(false);
    setAbAnalyser(null);
    setCurrentTime(0);
  }, []);

  const handlePlayAB = useCallback(async () => {
    if (abGraphRef.current) { handleStopAB(); return; }
    
    let ctx = engine.audioContext;
    const buffer = engine.audioBuffer;
    
    if (!chainRef.current && ctx) {
      chainRef.current = new MasteringChain(ctx);
    }

    const chain = chainRef.current;
    
    if (!ctx || !chain || !buffer) {
      console.warn("⛔ Contexte audio, chaîne ou buffer manquant.");
      return;
    }

    try {
      if (ctx.state !== 'running') {
        await ctx.resume();
      }

      const curvedIntensity = Math.pow(presetIntensity / 100, 2.5);
      chain.applyPreset(activePreset as MasteringPreset, curvedIntensity);
      
      const source = ctx.createBufferSource(); 
      source.buffer = buffer;
      
      const dryGain = ctx.createGain(); dryGain.gain.value = abMode === 'original' ? 1 : 0;
      const wetGain = ctx.createGain(); wetGain.gain.value = abMode === 'mastered' ? 1 : 0;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.92;
      const masterOut = ctx.createGain();
      
      source.connect(dryGain); 
      source.connect(chain.getInputNode()); 
      chain.getOutputNode().connect(wetGain);
      
      dryGain.connect(masterOut); 
      wetGain.connect(masterOut);
      
      masterOut.connect(analyser); 
      analyser.connect(ctx.destination);
      
      if (lufsRef.current) { 
        try { masterOut.connect(lufsRef.current.getInput()); } catch {} 
      }
      
      source.start(0, currentTime);
      
      abGraphRef.current = { source, dryGain, wetGain, analyser, masterOut, startTime: ctx.currentTime - currentTime };
      setAbAnalyser(analyser); 
      setIsPlayingAB(true);
      
      source.onended = () => { 
        if (abGraphRef.current?.source === source) handleStopAB(); 
      };
      
    } catch (err) {
      console.error("❌ Erreur lors de la lecture :", err);
    }
  }, [engine, activePreset, presetIntensity, abMode, handleStopAB, currentTime]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !engine.audioBuffer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percent * duration;
    setCurrentTime(newTime);
    
    if (isPlayingAB) {
      handleStopAB();
    }
  };

  useEffect(() => {
    const g = abGraphRef.current;
    if (!g || !engine.audioContext) return;
    const t = engine.audioContext.currentTime;
    g.dryGain.gain.setTargetAtTime(abMode === 'original' ? 1 : 0, t, 0.01);
    g.wetGain.gain.setTargetAtTime(abMode === 'mastered' ? 1 : 0, t, 0.01);
  }, [abMode, engine.audioContext]);

  const handleExport = useCallback(() => {
    const buffer = engine.audioBuffer;
    if (!buffer) {
      alert("Aucun fichier audio à exporter.");
      return;
    }
    const wavBlob = audioBufferToWav(buffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = localFileName ? `mastered-${localFileName.replace(/\.[^/.]+$/, "")}.wav` : 'mastered-audio.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [engine.audioBuffer, localFileName]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#050505', color: '#fff', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      
      <style>{`
        .btn-modern { position: relative; overflow: hidden; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); text-transform: uppercase; letter-spacing: 1px; }
        .btn-modern::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: all 0.5s; }
        .btn-modern:hover::before { left: 100%; }
        .btn-import { background: linear-gradient(135deg, #00d9ff, #0077ff); box-shadow: 0 4px 15px rgba(0,217,255,0.3); }
        .btn-import:hover { box-shadow: 0 6px 20px rgba(0,217,255,0.5); transform: translateY(-1px); }
        
        .preset-card-grid { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 12px 6px; background: #0a0a0c; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; cursor: pointer; transition: all 0.2s; text-align: center; }
        .preset-card-grid:hover { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.1); }
        .preset-card-grid.active { border-color: currentColor; box-shadow: 0 0 15px -2px currentColor; background: rgba(255,255,255,0.02); }
        
        .eq-slider { -webkit-appearance: none; width: 100%; height: 4px; background: #222; border-radius: 2px; outline: none; }
        .eq-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #fff; cursor: pointer; box-shadow: 0 0 10px rgba(255,255,255,0.5); transition: transform 0.1s; }
        .eq-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
        .eq-slider::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #fff; cursor: pointer; box-shadow: 0 0 10px rgba(255,255,255,0.5); border: none; }
      `}</style>

      <div style={{ height: 64, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', background: '#0a0a0c', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/tools" style={{ color: '#888', textDecoration: 'none', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            OUTILS
          </Link>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <h1 style={{ fontSize: 16, fontWeight: 900, margin: 0, letterSpacing: '1px' }}>DROPZONE <span style={{ color: '#00d9ff' }}>MASTERING</span></h1>
        </div>
        <div>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="audio/*" onChange={handleLocalFileLoad} />
          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="btn-modern btn-import" style={{ color: '#000', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 900, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {isImporting ? 'CHARGEMENT...' : '+ IMPORTER'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        <div style={{ width: 320, background: '#08080a', borderRight: '1px solid rgba(255,255,255,0.05)', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flexShrink: 0 }}>
          
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 9, color: '#555', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>FICHIER SOURCE</div>
            <div style={{ fontSize: 11, color: '#fff', fontWeight: 600, wordBreak: 'break-all' }}>{localFileName || engine.fileName || 'Aucun fichier'}</div>
          </div>

          <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '1px' }}>CHOISIR UN STYLE</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PRESETS.map((p) => (
              <div key={p.id} onClick={() => setActivePreset(p.id)} className={`preset-card-grid ${activePreset === p.id ? 'active' : ''}`} style={{ color: p.color }}>
                <div style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}>{p.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: activePreset === p.id ? '#fff' : '#666' }}>{p.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, background: '#050505', gap: 20, overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: hasAudio ? '#fff' : '#555' }}>Prévisualisation</div>
              {hasAudio && (
                <div style={{ fontSize: 11, color: '#00d9ff', fontFamily: 'monospace', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: 4 }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <ToggleSwitch isActive={abMode === 'original'} onClick={() => setAbMode('original')} label="ORIGINAL" color="#888" />
              <ToggleSwitch isActive={abMode === 'mastered'} onClick={() => setAbMode('mastered')} label="MASTERISÉ" color="#a08aff" />
            </div>
          </div>

          <div style={{ minHeight: 250, background: '#0a0a0c', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', position: 'relative', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 9, color: '#555', fontWeight: 800, letterSpacing: '1.5px' }}>TONAL BALANCE</div>
            <div style={{ flex: 1, padding: '30px 20px 0 20px', minHeight: 100 }}>
              <CurveVisualizer analyser={abAnalyser} isActive={isPlayingAB} height={140} color="#00d9ff" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 40px 10px 40px', fontSize: 9, color: '#444', fontWeight: 800 }}>
              <span>LOW</span><span>LOW-MID</span><span>HIGH-MID</span><span>HIGH</span>
            </div>
            
            <div style={{ padding: '0 20px 20px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <button 
                onClick={handlePlayAB} 
                style={{ 
                  width: 44, height: 44, borderRadius: '50%', 
                  background: isPlayingAB ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg, #a08aff, #7c5cff)', 
                  border: isPlayingAB ? '2px solid #ef4444' : '2px solid transparent', 
                  color: isPlayingAB ? '#ef4444' : '#fff', 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  boxShadow: isPlayingAB ? '0 0 20px rgba(239,68,68,0.3)' : '0 0 20px rgba(160,138,255,0.4)',
                  transition: 'all 0.2s', flexShrink: 0
                }}
              >
                {isPlayingAB ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                )}
              </button>
              
              <div onClick={handleSeek} style={{ flex: 1, height: 10, background: '#151515', borderRadius: 5, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <div style={{ height: '100%', width: `${(currentTime / (duration || 1)) * 100}%`, background: 'linear-gradient(90deg, #0088aa, #a08aff)', borderRadius: 5, boxShadow: '0 0 15px rgba(160,138,255,0.4)', position: 'relative' }}>
                  {hasAudio && (
                    <div style={{ position: 'absolute', right: -5, top: -3, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 0 10px #a08aff' }} />
                  )}
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#666', fontFamily: 'monospace', fontWeight: 700, width: 45, textAlign: 'right' }}>
                {formatTime(duration)}
              </div>
            </div>
          </div>

          <div style={{ background: '#0a0a0c', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: '#555', fontWeight: 800, letterSpacing: '1.5px' }}>ÉGALISEUR 5 BANDES</div>
              <button onClick={() => setEq({ bass: 50, lowMid: 50, mid: 50, highMid: 50, high: 50 })} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}>Réinitialiser</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20 }}>
              {[
                { key: 'bass', label: 'Basses', freq: '80Hz' },
                { key: 'lowMid', label: 'Low-Mid', freq: '250Hz' },
                { key: 'mid', label: 'Mid', freq: '1kHz' },
                { key: 'highMid', label: 'High-Mid', freq: '4kHz' },
                { key: 'high', label: 'Aigus', freq: '12kHz' }
              ].map((band) => (
                <div key={band.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, color: '#fff' }}>{band.label}</span>
                    <span>{eq[band.key as keyof typeof eq] > 50 ? '+' : ''}{((eq[band.key as keyof typeof eq] - 50) / 50 * 6).toFixed(1)} dB</span>
                  </div>
                  <input type="range" min="0" max="100" step="1" value={eq[band.key as keyof typeof eq]} onChange={(e) => setEq({ ...eq, [band.key]: Number(e.target.value) })} className="eq-slider" />
                  <div style={{ fontSize: 9, color: '#444', marginTop: 4 }}>{band.freq}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div style={{ width: 260, background: '#08080a', borderLeft: '1px solid rgba(255,255,255,0.05)', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            
            <Knob value={gainVal} onChange={setGainVal} label="GAIN" color="#ff5cf0" size={70} />

            <Knob value={presetIntensity} onChange={setPresetIntensity} label="INTENSITÉ" color="#ffb800" size={100} />
            
            <div style={{ display: 'flex', gap: 12 }}>
              <Knob value={widthVal} onChange={setWidthVal} label="WIDTH" color="#00d9ff" size={60} />
              <Knob value={dynVal} onChange={setDynVal} label="DYNAMIQUE" color="#a08aff" size={60} />
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <MasteringPanel audioContext={engine.audioContext} sourceNode={null} sourceBuffer={engine.audioBuffer} preset={activePreset as MasteringPreset} intensity={presetIntensity} onChainReady={handleChainReady} onExport={handleExport} />
          </div>
        </div>

      </div>
    </div>
  );
};

// ✅ FONCTIONS DE CONVERSION WAV AJOUTÉES ICI POUR CORRIGER L'ERREUR
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function encodeWAV(samples: Float32Array, format: number, sampleRate: number, numChannels: number, bitDepth: number): Blob {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);

  floatTo16BitPCM(view, 44, samples);
  return new Blob([view], { type: 'audio/wav' });
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}