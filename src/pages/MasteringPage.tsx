// src/pages/MasteringPage.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { useTheme } from '../contexts/ThemeContext';
import { LUFSMeter, MasteringChain, type MasteringPreset, analyzeTrackWeakness, type TrackAnalysis } from '../audio/masteringChain';
import { Knob } from '../components/ui/Knob';
import { CurveVisualizer } from '../components/ui/CurveVisualizer';

const PRESETS = [
  { id: 'universal', name: 'Universel', desc: 'Équilibre parfait', color: '#a08aff', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> },
  { id: 'fire', name: 'Feu', desc: 'Chaleur & Distorsion', color: '#ef4444', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg> },
  { id: 'clarity', name: 'Clarté', desc: 'Aigus cristallins', color: '#00d9ff', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3L8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg> },
  { id: 'cassette', name: 'Cassette', desc: 'Vintage & Coloration', color: '#f59e0b', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><path d="M6 18h12"/></svg> },
  { id: 'natural', name: 'Naturel', desc: 'Transparence totale', color: '#10b981', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg> },
  { id: 'spatial', name: 'Spatial', desc: 'Stéréo large', color: '#00d9ff', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg> },
  { id: 'cinematic', name: 'Cinéma', desc: 'Impact & Profondeur', color: '#f59e0b', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg> },
  { id: 'punch', name: 'Punch', desc: 'Frappe percutante', color: '#ec4899', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
];

const LUFS_TARGETS = [
  { label: 'Spotify', target: -14, color: '#1db954' },
  { label: 'Apple', target: -16, color: '#fa2d48' },
  { label: 'YouTube', target: -14, color: '#ff0000' },
  { label: 'Club', target: -9, color: '#ffb800' },
];

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const getIntensityLabel = (v: number) => {
  if (v < 20) return { label: 'SUBTIL', color: '#10b981' };
  if (v < 45) return { label: 'LÉGER', color: '#00d9ff' };
  if (v < 60) return { label: 'NORMAL', color: '#a08aff' };
  if (v < 80) return { label: 'FORT', color: '#f59e0b' };
  return { label: 'EXTRÊME', color: '#ef4444' };
};

interface SavedPreset {
  id: string;
  name: string;
  presetId: string;
  intensity: number;
  gain: number;
  width: number;
  dyn: number;
  eq: { bass: number; lowMid: number; mid: number; highMid: number; high: number };
}

export const MasteringPage: React.FC = () => {
  const engine = useAudioEngineContext();
  const hasAudio = !!engine.audioBuffer;
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [presetIntensity, setPresetIntensity] = useState(50);
  const [activePreset, setActivePreset] = useState<string>('universal');
  const [abMode, setAbMode] = useState<'original' | 'mastered'>('mastered');
  const [isPlayingAB, setIsPlayingAB] = useState(false);
  const [abAnalyser, setAbAnalyser] = useState<AnalyserNode | null>(null);
  
  // ✅ BYPASS
  const [isBypassPressed, setIsBypassPressed] = useState(false);

  // ✅ SAUVEGARDE PRESETS
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem('dz_saved_presets') || '[]'); } catch { return []; }
  });
  
  const [lufs, setLufs] = useState({ m: -Infinity, s: -Infinity, i: -Infinity });
  const [analysis, setAnalysis] = useState<TrackAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisApplied, setAnalysisApplied] = useState(false);
  
  const [previewingPreset, setPreviewingPreset] = useState<string | null>(null);
  const previewTimerRef = useRef<number | null>(null);
  
  const [gainVal, setGainVal] = useState(50);
  const [widthVal, setWidthVal] = useState(50);
  const [dynVal, setDynVal] = useState(50);
  const [eq, setEq] = useState({ bass: 50, lowMid: 50, mid: 50, highMid: 50, high: 50 });

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const abGraphRef = useRef<{
    source: AudioBufferSourceNode; dryGain: GainNode; wetGain: GainNode;
    originalMatchGain: GainNode; dryAnalyser: AnalyserNode; wetAnalyser: AnalyserNode;
    analyser: AnalyserNode; masterOut: GainNode; startTime: number;
  } | null>(null);

  const chainRef = useRef<MasteringChain | null>(null);
  const lufsRef = useRef<LUFSMeter | null>(null);
  const lufsContextRef = useRef<AudioContext | null>(null);
  const presetTimerRef = useRef<number | null>(null);
  const isPreviewingRef = useRef(false);

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    panelBg: isDark ? '#0a0a0c' : '#ffffff',
    cardBg: isDark ? '#111114' : '#f9fafb',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    borderLight: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    textDark: isDark ? '#555555' : '#999999',
    sliderBg: isDark ? '#1a1a1f' : '#e5e7eb',
    waveBg: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.05)',
    presetCardBg: isDark ? '#111114' : '#f9fafb',
    presetCardHover: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
  };

  // ✅ BYPASS handlers
  const handleBypassDown = () => {
    setIsBypassPressed(true);
    if (chainRef.current) chainRef.current.setBypass(true);
  };
  const handleBypassUp = () => {
    setIsBypassPressed(false);
    if (chainRef.current) chainRef.current.setBypass(false);
  };

  // ✅ Sauvegarde de preset
  const saveCurrentPreset = () => {
    const name = window.prompt("Nom du preset (ex: Master Club Techno) :");
    if (!name || !name.trim()) return;
    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      name: name.trim(),
      presetId: activePreset,
      intensity: presetIntensity,
      gain: gainVal,
      width: widthVal,
      dyn: dynVal,
      eq: { ...eq },
    };
    const updated = [...savedPresets, newPreset];
    setSavedPresets(updated);
    localStorage.setItem('dz_saved_presets', JSON.stringify(updated));
  };

  const loadSavedPreset = (sp: SavedPreset) => {
    setActivePreset(sp.presetId);
    setPresetIntensity(sp.intensity);
    setGainVal(sp.gain);
    setWidthVal(sp.width);
    setDynVal(sp.dyn);
    setEq(sp.eq);
  };

  const deleteSavedPreset = (id: string) => {
    if (!window.confirm("Supprimer ce preset ?")) return;
    const updated = savedPresets.filter(p => p.id !== id);
    setSavedPresets(updated);
    localStorage.setItem('dz_saved_presets', JSON.stringify(updated));
  };

  const previewPreset = (presetId: string) => {
    if (!chainRef.current) return;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    isPreviewingRef.current = true;
    setPreviewingPreset(presetId);
    chainRef.current.applyPreset(presetId as MasteringPreset, 1.0);
    previewTimerRef.current = window.setTimeout(() => {
      isPreviewingRef.current = false;
      setPreviewingPreset(null);
      if (chainRef.current) chainRef.current.applyPreset(activePreset as MasteringPreset, presetIntensity / 100);
    }, 3000);
  };

  useEffect(() => {
    if (engine.audioBuffer && engine.audioContext) {
      setDuration(engine.audioBuffer.duration);
      setCurrentTime(0);
      if (!chainRef.current) chainRef.current = new MasteringChain(engine.audioContext);
      if (!lufsRef.current || lufsContextRef.current !== engine.audioContext) {
        lufsRef.current?.destroy();
        lufsRef.current = new LUFSMeter(engine.audioContext);
        lufsContextRef.current = engine.audioContext;
      }
      const runAnalysis = async () => {
        setIsAnalyzing(true); setAnalysisApplied(false);
        try {
          const result = await analyzeTrackWeakness(engine.audioBuffer!);
          setAnalysis(result);
        } catch (err) { console.warn("Analyse IA échouée", err); } finally { setIsAnalyzing(false); }
      };
      runAnalysis();
    }
  }, [engine.audioBuffer, engine.audioContext]);

  const applyRecommendation = () => {
    if (!analysis) return;
    setActivePreset(analysis.recommendedPreset);
    setPresetIntensity(analysis.recommendedIntensity);
    setAnalysisApplied(true);
    if (chainRef.current) chainRef.current.applyPreset(analysis.recommendedPreset, analysis.recommendedIntensity / 100);
  };

  const resetAllKnobs = () => {
    setGainVal(50); setWidthVal(50); setDynVal(50);
    setEq({ bass: 50, lowMid: 50, mid: 50, highMid: 50, high: 50 });
    setPresetIntensity(50);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (lufsRef.current) {
        const data = lufsRef.current.read();
        setLufs({ m: data.momentary, s: data.shortTerm, i: data.integrated });
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // ✅ A/B LOUDNESS MATCH : ajuste le gain du dry en continu
  useEffect(() => {
    if (!isPlayingAB) return;
    const interval = setInterval(() => {
      const g = abGraphRef.current;
      if (!g || !engine.audioContext) return;
      const dryBuf = new Float32Array(2048);
      const wetBuf = new Float32Array(2048);
      g.dryAnalyser.getFloatTimeDomainData(dryBuf);
      g.wetAnalyser.getFloatTimeDomainData(wetBuf);
      const rmsDry = Math.sqrt(dryBuf.reduce((s, v) => s + v*v, 0) / dryBuf.length);
      const rmsWet = Math.sqrt(wetBuf.reduce((s, v) => s + v*v, 0) / wetBuf.length);
      if (rmsDry > 0.001 && rmsWet > 0.001) {
        const targetRatio = Math.min(2.5, Math.max(0.3, rmsWet / rmsDry));
        const currentGain = g.originalMatchGain.gain.value;
        const newGain = currentGain * 0.85 + targetRatio * 0.15;
        g.originalMatchGain.gain.setTargetAtTime(newGain, engine.audioContext.currentTime, 0.15);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [isPlayingAB, engine.audioContext]);

  const activePresetData = useMemo(() => PRESETS.find(p => p.id === activePreset) || PRESETS[0], [activePreset]);

  const presetDisplayValues = useMemo(() => {
    const presetValues: Record<string, any> = {
      universal: { gain: 2.5, comp: 2.0, width: 100, eqBass: 4.0, eqHigh: 4.0, sat: 15 },
      fire: { gain: 4.5, comp: 3.0, width: 100, eqBass: 8.0, eqHigh: -2.0, sat: 50 },
      clarity: { gain: 2.5, comp: 1.8, width: 100, eqBass: -4.0, eqHigh: 8.0, sat: 10 },
      cassette: { gain: 2.0, comp: 2.5, width: 80, eqBass: 4.0, eqHigh: -8.0, sat: 60 },
      natural: { gain: 0.5, comp: 1.2, width: 100, eqBass: 0, eqHigh: 0, sat: 5 },
      spatial: { gain: 2.0, comp: 1.5, width: 150, eqBass: -3.0, eqHigh: 5.0, sat: 10 },
      cinematic: { gain: 4.0, comp: 2.5, width: 110, eqBass: 6.0, eqHigh: 3.0, sat: 35 },
      punch: { gain: 5.5, comp: 4.0, width: 100, eqBass: 7.0, eqHigh: 5.0, sat: 25 },
    };
    return presetValues[activePreset] || presetValues.universal;
  }, [activePreset]);

  const effectiveValues = useMemo(() => {
    const k = presetIntensity / 100;
    return {
      gain: (presetDisplayValues.gain * 0.5) + ((gainVal - 50) / 6),
      comp: 1 + ((presetDisplayValues.comp - 1) * k),
      width: presetDisplayValues.width + (widthVal - 50),
      eqBass: (presetDisplayValues.eqBass * k) + ((eq.bass - 50) / 50 * 10),
      eqHigh: (presetDisplayValues.eqHigh * k) + ((eq.high - 50) / 50 * 10),
      sat: presetDisplayValues.sat * k,
    };
  }, [presetDisplayValues, presetIntensity, gainVal, widthVal, eq]);

  const knobGainDb = ((gainVal - 50) / 6).toFixed(1);
  const knobWidth = (0.7 + (widthVal / 100) * 0.6).toFixed(2);
  const knobDynRatio = (1 + ((dynVal - 50) / 50) * 1.5).toFixed(1);
  const intensityLabel = getIntensityLabel(presetIntensity);

  const handleLocalFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true); setImportError(null); setLocalFileName(file.name);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const formData = new FormData(); formData.append('audio', file);
      const response = await fetch('https://mastering-server.onrender.com/master', { method: 'POST', body: formData, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Erreur de mastering.');
      const blob = await response.blob();
      const masteredFile = new File([blob], `mastered-${file.name.replace(/\.[^/.]+$/, "")}.wav`, { type: 'audio/wav' });
      await engine.loadFile(masteredFile);
    } catch (err: any) {
      try {
        await engine.loadFile(file);
        setImportError("⚠️ Serveur distant injoignable. Mode Mastering Local (Navigateur) activé.");
      } catch (localErr) { setImportError("Impossible de lire ce fichier audio."); setLocalFileName(null); }
    } finally { setIsImporting(false); }
  };

  useEffect(() => {
    if (!chainRef.current) return;
    chainRef.current.setInputGain((gainVal - 50) / 6);
    chainRef.current.setManualEQGain(0, ((eq.bass - 50) / 50) * 10);
    chainRef.current.setManualEQGain(1, ((eq.lowMid - 50) / 50) * 10);
    chainRef.current.setManualEQGain(2, ((eq.mid - 50) / 50) * 10);
    chainRef.current.setManualEQGain(3, ((eq.highMid - 50) / 50) * 10);
    chainRef.current.setManualEQGain(4, ((eq.high - 50) / 50) * 10);
    chainRef.current.setWidth(0.7 + (widthVal / 100) * 0.6);
    
    if (presetTimerRef.current) clearTimeout(presetTimerRef.current);
    presetTimerRef.current = window.setTimeout(() => {
      if (chainRef.current && !isPreviewingRef.current) {
        chainRef.current.applyPreset(activePreset as MasteringPreset, presetIntensity / 100);
      }
    }, 250);
    
    return () => { if (presetTimerRef.current) clearTimeout(presetTimerRef.current); };
  }, [gainVal, eq, widthVal, dynVal, activePreset, presetIntensity]);

  useEffect(() => {
    let animationFrame: number;
    const updateTime = () => {
      if (abGraphRef.current && engine.audioContext) {
        const elapsed = engine.audioContext.currentTime - abGraphRef.current.startTime;
        setCurrentTime(Math.min(elapsed, duration));
        animationFrame = requestAnimationFrame(updateTime);
      }
    };
    if (isPlayingAB) updateTime();
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlayingAB, duration, engine.audioContext]);

  const handlePauseAB = useCallback(() => {
    const g = abGraphRef.current;
    if (!g) return;
    try { g.source.stop(); } catch {}
    try { g.source.disconnect(); } catch {}
    try { g.dryGain.disconnect(); } catch {}
    try { g.wetGain.disconnect(); } catch {}
    try { g.originalMatchGain.disconnect(); } catch {}
    try { g.dryAnalyser.disconnect(); } catch {}
    try { g.wetAnalyser.disconnect(); } catch {}
    try { g.masterOut.disconnect(); } catch {}
    try { g.analyser.disconnect(); } catch {}
    abGraphRef.current = null;
    setIsPlayingAB(false); setAbAnalyser(null);
  }, []);

  const handleStopAB = useCallback(() => { handlePauseAB(); setCurrentTime(0); }, [handlePauseAB]);

  const handlePlayAB = useCallback(async (startTime = currentTime) => {
    if (abGraphRef.current) { handlePauseAB(); }
    let ctx = engine.audioContext;
    const buffer = engine.audioBuffer;
    if (!ctx || !buffer) return;
    if (!chainRef.current && ctx) chainRef.current = new MasteringChain(ctx);
    const chain = chainRef.current;
    if (!chain) return;

    try {
      if (ctx.state !== 'running') await ctx.resume();
      chain.applyPreset(activePreset as MasteringPreset, presetIntensity / 100);
      if (lufsRef.current) lufsRef.current.reset();
      
      const source = ctx.createBufferSource(); source.buffer = buffer;
      
      // ✅ ANALYSERS POUR LE A/B LOUDNESS MATCH
      const dryAnalyser = ctx.createAnalyser(); dryAnalyser.fftSize = 2048;
      const wetAnalyser = ctx.createAnalyser(); wetAnalyser.fftSize = 2048;
      
      const dryGain = ctx.createGain(); dryGain.gain.value = abMode === 'original' ? 1 : 0;
      const wetGain = ctx.createGain(); wetGain.gain.value = abMode === 'mastered' ? 1 : 0;
      const originalMatchGain = ctx.createGain(); originalMatchGain.gain.value = 0.85;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.92;
      const masterOut = ctx.createGain();
      
      // Dry path : source → dryAnalyser → dryGain → originalMatchGain → masterOut
      source.connect(dryAnalyser);
      dryAnalyser.connect(dryGain);
      dryGain.connect(originalMatchGain);
      originalMatchGain.connect(masterOut);
      
      // Wet path : source → chain → wetAnalyser → wetGain → masterOut
      source.connect(chain.getInputNode());
      chain.getOutputNode().connect(wetAnalyser);
      wetAnalyser.connect(wetGain);
      wetGain.connect(masterOut);
      
      masterOut.connect(analyser); analyser.connect(ctx.destination);
      if (lufsRef.current) { try { masterOut.connect(lufsRef.current.getInput()); } catch {} }
      
      source.start(0, startTime);
      abGraphRef.current = { source, dryGain, wetGain, originalMatchGain, dryAnalyser, wetAnalyser, analyser, masterOut, startTime: ctx.currentTime - startTime };
      setAbAnalyser(analyser); setIsPlayingAB(true);
      source.onended = () => { if (abGraphRef.current?.source === source) handleStopAB(); };
    } catch (err) { console.error("❌ Erreur de lecture :", err); }
  }, [engine, activePreset, presetIntensity, abMode, handlePauseAB, handleStopAB, currentTime]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !engine.audioBuffer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * duration;
    if (isPlayingAB) { handlePauseAB(); setCurrentTime(newTime); handlePlayAB(newTime); }
    else { setCurrentTime(newTime); }
  };

  useEffect(() => {
    const g = abGraphRef.current;
    if (!g || !engine.audioContext) return;
    const t = engine.audioContext.currentTime;
    g.dryGain.gain.setTargetAtTime(abMode === 'original' ? 1 : 0, t, 0.02);
    g.wetGain.gain.setTargetAtTime(abMode === 'mastered' ? 1 : 0, t, 0.02);
  }, [abMode, engine.audioContext]);

  const handleExport = useCallback(async () => {
    const buffer = engine.audioBuffer;
    if (!buffer) return alert("Aucun fichier audio à exporter.");
    try {
      const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
      const offlineChain = new MasteringChain(offlineCtx);
      offlineChain.applyPreset(activePreset as MasteringPreset, presetIntensity / 100);
      offlineChain.setInputGain((gainVal - 50) / 6);
      offlineChain.setManualEQGain(0, ((eq.bass - 50) / 50) * 10);
      offlineChain.setManualEQGain(1, ((eq.lowMid - 50) / 50) * 10);
      offlineChain.setManualEQGain(2, ((eq.mid - 50) / 50) * 10);
      offlineChain.setManualEQGain(3, ((eq.highMid - 50) / 50) * 10);
      offlineChain.setManualEQGain(4, ((eq.high - 50) / 50) * 10);
      offlineChain.setWidth(0.7 + (widthVal / 100) * 0.6);
      
      const source = offlineCtx.createBufferSource(); source.buffer = buffer;
      source.connect(offlineChain.getInputNode()); offlineChain.getOutputNode().connect(offlineCtx.destination);
      source.start();
      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = audioBufferToWav(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = localFileName ? `mastered-${localFileName.replace(/\.[^/.]+$/, "")}.wav` : 'mastered-audio.wav';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) { console.error("Erreur d'exportation :", err); alert("Impossible d'exporter le fichier masterisé."); }
  }, [engine.audioBuffer, localFileName, activePreset, presetIntensity, gainVal, eq, widthVal]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: colors.bg, color: colors.textMain, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <style>{`
        .btn-modern { position: relative; overflow: hidden; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); text-transform: uppercase; letter-spacing: 1px; }
        .btn-import { background: linear-gradient(135deg, #00d9ff, #0077ff); box-shadow: 0 4px 15px rgba(0,217,255,0.3); }
        .btn-import:hover { box-shadow: 0 6px 20px rgba(0,217,255,0.5); transform: translateY(-1px); }
        .btn-ai { background: linear-gradient(135deg, #a855f7, #ec4899); box-shadow: 0 4px 15px rgba(168,85,247,0.4); }
        .btn-ai:hover { box-shadow: 0 6px 25px rgba(168,85,247,0.6); transform: translateY(-1px); }
        .preset-card-grid { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 8px; padding: 12px 14px; background: ${colors.presetCardBg}; border: 1px solid ${colors.border}; border-radius: 12px; cursor: pointer; transition: all 0.2s; text-align: left; position: relative; overflow: hidden; }
        .preset-card-grid:hover { background: ${colors.presetCardHover}; border-color: ${colors.borderLight}; transform: translateY(-2px); }
        .preset-card-grid.active { border-color: currentColor; box-shadow: 0 0 20px -4px currentColor; background: ${colors.presetCardHover}; }
        .preset-card-grid.preview { animation: preview-pulse 1s infinite; }
        @keyframes preview-pulse { 0%, 100% { border-color: currentColor; box-shadow: 0 0 25px currentColor; } 50% { box-shadow: 0 0 35px currentColor, 0 0 60px currentColor; } }
        .preset-icon-wrapper { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.05); margin-bottom: 4px; }
        .preset-card-grid.active .preset-icon-wrapper { background: rgba(0,0,0,0.2); box-shadow: inset 0 0 10px currentColor; }
        .eq-slider { -webkit-appearance: none; width: 100%; height: 6px; background: ${colors.sliderBg}; border-radius: 3px; outline: none; box-shadow: inset 0 1px 3px rgba(0,0,0,0.5); }
        .eq-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #fff; cursor: pointer; box-shadow: 0 0 10px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.2); }
        .spectrum-grid { background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 20% 25%; }
        @keyframes pulse-ai { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        .ai-pulse { animation: pulse-ai 2s infinite; }
        .intensity-zone { height: 8px; border-radius: 4px; background: linear-gradient(90deg, #10b981 0%, #00d9ff 25%, #a08aff 50%, #f59e0b 75%, #ef4444 100%); position: relative; }
        .intensity-marker { position: absolute; top: -3px; width: 3px; height: 14px; background: #fff; border-radius: 2px; box-shadow: 0 0 8px #fff; transition: left 0.1s ease; }
        .bypass-btn { user-select: none; -webkit-user-select: none; }
        .bypass-btn:active { transform: scale(0.95); }
      `}</style>

      <div style={{ height: 64, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', background: colors.panelBg, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/tools" style={{ color: colors.textMuted, textDecoration: 'none', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            OUTILS
          </Link>
          <div style={{ width: 1, height: 20, background: colors.borderLight }} />
          <h1 style={{ fontSize: 16, fontWeight: 900, margin: 0, letterSpacing: '1px', color: colors.textMain }}>DROPZONE <span style={{ color: '#00d9ff' }}>MASTERING</span></h1>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={saveCurrentPreset} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '10px 16px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            💾 SAUVEGARDER
          </button>
          <button onClick={resetAllKnobs} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '10px 16px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            RÉINITIALISER
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="audio/*" onChange={handleLocalFileLoad} />
          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="btn-modern btn-import" style={{ color: '#000', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 900, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {isImporting ? 'CHARGEMENT...' : '+ IMPORTER'}
          </button>
        </div>
      </div>

      {importError && (
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderBottom: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', padding: '12px 24px', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {importError}</span>
          <button onClick={() => setImportError(null)} style={{ background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer', fontWeight: 900 }}>✕</button>
        </div>
      )}

      {isAnalyzing && (
        <div style={{ background: 'linear-gradient(90deg, rgba(168,85,247,0.15), rgba(236,72,153,0.15))', borderBottom: '1px solid rgba(168,85,247,0.3)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="ai-pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 15px #a855f7' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#a855f7' }}>🧠 IA analyse votre morceau en cours...</span>
        </div>
      )}

      {!isAnalyzing && analysis && (
        <div style={{ background: analysisApplied ? 'linear-gradient(90deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))' : 'linear-gradient(90deg, rgba(168,85,247,0.15), rgba(236,72,153,0.15))', borderBottom: `1px solid ${analysisApplied ? 'rgba(16,185,129,0.3)' : 'rgba(168,85,247,0.3)'}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 28 }}>{analysisApplied ? '✅' : '🧠'}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: analysisApplied ? '#10b981' : '#a855f7', marginBottom: 4, letterSpacing: '0.5px' }}>{analysisApplied ? 'RECOMMANDATION APPLIQUÉE' : 'RECOMMANDATION IA'}</div>
              <div style={{ fontSize: 12, color: colors.textMain, marginBottom: 4 }}>{analysis.weaknesses[0].message}</div>
              {!analysisApplied && (
                <div style={{ fontSize: 11, color: colors.textMuted }}>
                  Style conseillé : <strong style={{ color: PRESETS.find(p => p.id === analysis.recommendedPreset)?.color }}>{PRESETS.find(p => p.id === analysis.recommendedPreset)?.name}</strong> à {analysis.recommendedIntensity}% • Confiance : {analysis.confidence}%
                </div>
              )}
            </div>
          </div>
          {!analysisApplied && (
            <button onClick={applyRecommendation} className="btn-modern btn-ai" style={{ color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 900, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Appliquer la recommandation
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 300, background: colors.panelBg, borderRight: `1px solid ${colors.border}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ background: colors.cardBg, padding: 12, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 9, color: colors.textDark, fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>FICHIER SOURCE</div>
            <div style={{ fontSize: 11, color: colors.textMain, fontWeight: 600, wordBreak: 'break-all' }}>{localFileName || engine.fileName || 'Aucun fichier'}</div>
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 800, letterSpacing: '1px' }}>STYLE DE MASTERING</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PRESETS.map((p) => {
              const isRecommended = analysis?.recommendedPreset === p.id && !analysisApplied;
              const isPreviewing = previewingPreset === p.id;
              return (
                <div key={p.id} onClick={() => setActivePreset(p.id)} className={`preset-card-grid ${activePreset === p.id ? 'active' : ''} ${isPreviewing ? 'preview' : ''}`} style={{ color: p.color, position: 'relative' }}>
                  {isRecommended && (
                    <div style={{ position: 'absolute', top: -6, right: -6, background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: '#fff', fontSize: 8, fontWeight: 900, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.5px', boxShadow: '0 2px 8px rgba(168,85,247,0.5)' }}>IA ⚡</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                    <div className="preset-icon-wrapper">{p.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: colors.textMain }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: colors.textMuted, fontWeight: 600 }}>{p.desc}</div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); previewPreset(p.id); }}
                      title="Écouter ce preset à 100% pendant 3s"
                      style={{ width: 28, height: 28, borderRadius: '50%', background: isPreviewing ? p.color : `${p.color}20`, border: `1px solid ${p.color}`, color: isPreviewing ? '#000' : p.color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
                    >
                      {isPreviewing ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 1 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ✅ SECTION MES PRESETS */}
          {savedPresets.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 800, letterSpacing: '1px', marginTop: 8 }}>MES PRESETS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedPresets.map((sp) => {
                  const basePreset = PRESETS.find(p => p.id === sp.presetId);
                  return (
                    <div key={sp.id} style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: basePreset?.color || '#888', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: colors.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.name}</div>
                        <div style={{ fontSize: 9, color: colors.textMuted }}>{basePreset?.name} • {sp.intensity}%</div>
                      </div>
                      <button onClick={() => loadSavedPreset(sp)} style={{ background: `${basePreset?.color}20`, border: `1px solid ${basePreset?.color}`, color: basePreset?.color || '#888', padding: '4px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800, cursor: 'pointer' }}>CHARGER</button>
                      <button onClick={() => deleteSavedPreset(sp.id)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 14, padding: 2 }}>×</button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, background: colors.bg, gap: 24, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: hasAudio ? colors.textMain : colors.textDark }}>Prévisualisation</div>
              {hasAudio && (
                <div style={{ fontSize: 11, color: '#00d9ff', fontFamily: 'monospace', background: colors.waveBg, padding: '4px 10px', borderRadius: 6, border: `1px solid ${colors.border}` }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* ✅ BOUTON BYPASS */}
              <button
                className="bypass-btn"
                onMouseDown={handleBypassDown}
                onMouseUp={handleBypassUp}
                onMouseLeave={handleBypassUp}
                onTouchStart={handleBypassDown}
                onTouchEnd={handleBypassUp}
                title="Maintenir pour entendre le signal original (sans traitement)"
                style={{
                  padding: '10px 20px',
                  background: isBypassPressed ? '#ef4444' : 'transparent',
                  border: `2px solid ${isBypassPressed ? '#ef4444' : '#ef4444'}`,
                  color: isBypassPressed ? '#fff' : '#ef4444',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: 'pointer',
                  letterSpacing: '1px',
                  boxShadow: isBypassPressed ? '0 0 25px rgba(239,68,68,0.6)' : 'none',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                BYPASS
              </button>
              
              <div style={{ display: 'flex', gap: 4, background: colors.panelBg, padding: 4, borderRadius: 8, border: `1px solid ${colors.border}` }}>
                <button onClick={() => setAbMode('original')} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer', background: abMode === 'original' ? colors.borderLight : 'transparent', color: abMode === 'original' ? colors.textMain : colors.textMuted, border: 'none' }}>ORIGINAL</button>
                <button onClick={() => setAbMode('mastered')} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer', background: abMode === 'mastered' ? '#a08aff' : 'transparent', color: abMode === 'mastered' ? '#000' : colors.textMuted, border: 'none', boxShadow: abMode === 'mastered' ? '0 0 15px rgba(160,138,255,0.4)' : 'none' }}>MASTERISÉ</button>
              </div>
            </div>
          </div>

          <div style={{ minHeight: 280, background: colors.cardBg, borderRadius: 16, border: `1px solid ${colors.border}`, position: 'relative', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
            <div className="spectrum-grid" style={{ position: 'absolute', inset: '0 0 60px 0', pointerEvents: 'none', opacity: 0.5 }} />
            <div style={{ position: 'absolute', top: 16, left: 20, fontSize: 10, color: colors.textMuted, fontWeight: 900, letterSpacing: '2px', zIndex: 10 }}>TONAL BALANCE</div>
            <div style={{ position: 'absolute', top: 40, left: 20, right: 20, bottom: 80, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 5 }}>
              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', width: '100%', position: 'relative' }}><span style={{ position: 'absolute', right: 0, top: -8, fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>0 dB</span></div>
              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', width: '100%', position: 'relative' }}><span style={{ position: 'absolute', right: 0, top: -8, fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>-12 dB</span></div>
              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', width: '100%', position: 'relative' }}><span style={{ position: 'absolute', right: 0, top: -8, fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>-24 dB</span></div>
            </div>
            <div style={{ flex: 1, padding: '50px 30px 0 30px', minHeight: 150, zIndex: 6 }}>
              <CurveVisualizer analyser={abAnalyser} isActive={isPlayingAB} height={160} color="#00d9ff" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 40px 16px 40px', fontSize: 10, color: colors.textMuted, fontWeight: 800, fontFamily: 'monospace', zIndex: 10 }}>
              <span>20 Hz</span><span>200 Hz</span><span>2 kHz</span><span>20 kHz</span>
            </div>
            <div style={{ padding: '0 24px 24px 24px', display: 'flex', alignItems: 'center', gap: 20, zIndex: 10 }}>
              <button onClick={() => isPlayingAB ? handlePauseAB() : handlePlayAB(currentTime)} style={{ width: 50, height: 50, borderRadius: '50%', background: isPlayingAB ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg, #a08aff, #7c5cff)', border: isPlayingAB ? '2px solid #ef4444' : '2px solid transparent', color: isPlayingAB ? '#ef4444' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isPlayingAB ? '0 0 20px rgba(239,68,68,0.3)' : '0 0 25px rgba(160,138,255,0.5)', flexShrink: 0 }}>
                {isPlayingAB ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
              </button>
              <div onClick={handleSeek} style={{ flex: 1, height: 12, background: colors.sliderBg, borderRadius: 6, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
                <div style={{ height: '100%', width: `${(currentTime / (duration || 1)) * 100}%`, background: 'linear-gradient(90deg, #0088aa, #a08aff)', borderRadius: 6, boxShadow: '0 0 15px rgba(160,138,255,0.5)', position: 'relative' }}>
                  {hasAudio && <div style={{ position: 'absolute', right: -6, top: -3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 0 10px #a08aff' }} />}
                </div>
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted, fontFamily: 'monospace', fontWeight: 800, width: 45, textAlign: 'right' }}>{formatTime(duration)}</div>
            </div>
          </div>

          <div style={{ background: colors.cardBg, borderRadius: 16, border: `1px solid ${colors.border}`, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 900, letterSpacing: '1.5px' }}>LOUDNESS METER (LUFS)</div>
              <div style={{ fontSize: 10, color: colors.textMuted, fontWeight: 700 }}>Cible : -14 LUFS (streaming)</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'MOMENTARY', value: lufs.m, desc: 'Instantané' },
                { label: 'SHORT-TERM', value: lufs.s, desc: '3 secondes' },
                { label: 'INTEGRATED', value: lufs.i, desc: 'Moyenne' }
              ].map((item) => {
                const isGood = item.value > -16 && item.value < -8;
                const isTooLoud = item.value > -8;
                return (
                  <div key={item.label} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: colors.textDark, fontWeight: 800, letterSpacing: '1px', marginBottom: 6 }}>{item.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: isTooLoud ? '#ef4444' : isGood ? '#10b981' : colors.textMain, letterSpacing: '-1px' }}>
                      {item.value > -Infinity ? item.value.toFixed(1) : '-∞'}
                    </div>
                    <div style={{ fontSize: 9, color: colors.textMuted, marginTop: 4 }}>{item.desc}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {LUFS_TARGETS.map((t) => {
                const diff = lufs.i - t.target;
                const isAligned = Math.abs(diff) < 1.5;
                const isTooLoud = diff > 1.5;
                return (
                  <div key={t.label} style={{ background: colors.panelBg, border: `1px solid ${isAligned ? t.color : colors.border}`, borderRadius: 8, padding: '8px 10px', textAlign: 'center', boxShadow: isAligned ? `0 0 15px ${t.color}30` : 'none' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: t.color, marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontSize: 9, color: colors.textMuted, fontFamily: 'monospace' }}>{t.target} LUFS</div>
                    <div style={{ fontSize: 9, marginTop: 4, fontWeight: 800, color: isAligned ? '#10b981' : isTooLoud ? '#ef4444' : colors.textMuted }}>
                      {lufs.i > -Infinity ? (isAligned ? '✓ OK' : (diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)) + ' dB') : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: colors.cardBg, borderRadius: 16, border: `1px solid ${colors.border}`, padding: '24px 32px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 900, letterSpacing: '1.5px' }}>ÉGALISEUR PARAMÉTRIQUE</div>
              <button onClick={() => setEq({ bass: 50, lowMid: 50, mid: 50, highMid: 50, high: 50 })} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: '6px 12px', borderRadius: 6 }}>RÉINITIALISER</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24 }}>
              {[
                { key: 'bass', label: 'Basses', freq: '80Hz' },
                { key: 'lowMid', label: 'Low-Mid', freq: '250Hz' },
                { key: 'mid', label: 'Mid', freq: '1kHz' },
                { key: 'highMid', label: 'High-Mid', freq: '4kHz' },
                { key: 'high', label: 'Aigus', freq: '12kHz' }
              ].map((band) => (
                <div key={band.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 12 }}>
                    <span style={{ fontWeight: 800, color: colors.textMain }}>{band.label}</span>
                    <span style={{ color: '#00d9ff', fontFamily: 'monospace', fontWeight: 700 }}>{eq[band.key as keyof typeof eq] > 50 ? '+' : ''}{((eq[band.key as keyof typeof eq] - 50) / 50 * 10).toFixed(1)} dB</span>
                  </div>
                  <input type="range" min="0" max="100" step="1" value={eq[band.key as keyof typeof eq]} onChange={(e) => setEq({ ...eq, [band.key]: Number(e.target.value) })} className="eq-slider" />
                  <div style={{ fontSize: 10, color: colors.textDark, marginTop: 8, fontFamily: 'monospace', textAlign: 'center' }}>{band.freq}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ width: 280, background: colors.panelBg, borderLeft: `1px solid ${colors.border}`, padding: 24, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Knob value={gainVal} onChange={setGainVal} label="GAIN" color="#ff5cf0" size={80} />
              <div style={{ fontSize: 11, fontWeight: 800, fontFamily: 'monospace', marginTop: 4, color: parseFloat(knobGainDb) > 0 ? '#10b981' : parseFloat(knobGainDb) < 0 ? '#ef4444' : colors.textMuted }}>
                {parseFloat(knobGainDb) > 0 ? '+' : ''}{knobGainDb} dB
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <Knob value={presetIntensity} onChange={setPresetIntensity} label="INTENSITÉ" color={intensityLabel.color} size={110} />
              <div style={{ fontSize: 11, fontWeight: 900, fontFamily: 'monospace', marginTop: 4, color: intensityLabel.color, letterSpacing: '1px' }}>
                {intensityLabel.label} • {presetIntensity}%
              </div>
              <div style={{ width: '90%', marginTop: 8 }}>
                <div className="intensity-zone">
                  <div className="intensity-marker" style={{ left: `${presetIntensity}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: colors.textMuted, marginTop: 4, fontFamily: 'monospace', fontWeight: 700 }}>
                  <span>SUBTIL</span><span>NORMAL</span><span>EXTRÊME</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Knob value={widthVal} onChange={setWidthVal} label="LARGEUR" color="#00d9ff" size={65} />
                <div style={{ fontSize: 10, fontWeight: 800, fontFamily: 'monospace', marginTop: 4, color: colors.textMuted }}>{knobWidth}x</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Knob value={dynVal} onChange={setDynVal} label="DYNAMIQUE" color="#a08aff" size={65} />
                <div style={{ fontSize: 10, fontWeight: 800, fontFamily: 'monospace', marginTop: 4, color: colors.textMuted }}>{knobDynRatio}:1</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', background: colors.cardBg, border: `2px solid ${activePresetData.color}40`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: colors.textDark, fontWeight: 800, letterSpacing: '1.5px' }}>CHAÎNE ACTIVE</div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: activePresetData.color, boxShadow: `0 0 10px ${activePresetData.color}` }} />
            </div>
            <div style={{ background: `${activePresetData.color}15`, border: `1px solid ${activePresetData.color}40`, borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: colors.textMuted, fontWeight: 800, letterSpacing: '1px', marginBottom: 2 }}>STYLE ACTIF</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: activePresetData.color, letterSpacing: '-0.5px' }}>{activePresetData.name.toUpperCase()}</div>
              <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{activePresetData.desc}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: colors.textMuted, marginBottom: 4 }}>
                <span>Intensité</span>
                <span style={{ color: intensityLabel.color, fontWeight: 800 }}>{intensityLabel.label} • {presetIntensity}%</span>
              </div>
              <div style={{ height: 4, background: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${presetIntensity}%`, height: '100%', background: intensityLabel.color, boxShadow: `0 0 10px ${intensityLabel.color}`, transition: 'width 0.2s ease' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span style={{ color: colors.textMuted }}>Gain total</span>
                <span style={{ color: colors.textMain, fontWeight: 800, fontFamily: 'monospace' }}>{effectiveValues.gain > 0 ? '+' : ''}{effectiveValues.gain.toFixed(1)} dB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span style={{ color: colors.textMuted }}>Compression</span>
                <span style={{ color: colors.textMain, fontWeight: 800, fontFamily: 'monospace' }}>{effectiveValues.comp.toFixed(1)}:1</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span style={{ color: colors.textMuted }}>Stéréo</span>
                <span style={{ color: colors.textMain, fontWeight: 800, fontFamily: 'monospace' }}>{effectiveValues.width.toFixed(0)}%</span>
              </div>
            </div>
            <button onClick={handleExport} className="btn-modern" style={{ width: '100%', marginTop: 16, padding: '14px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              EXPORT WAV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  let result;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  return encodeWAV(result, sampleRate, numChannels, bitDepth);
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0; let inputIndex = 0;
  while (index < length) { result[index++] = inputL[inputIndex]; result[index++] = inputR[inputIndex]; inputIndex++; }
  return result;
}

function encodeWAV(samples: Float32Array, sampleRate: number, numChannels: number, bitDepth: number): Blob {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
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
  for (let i = 0; i < string.length; i++) { view.setUint8(offset + i, string.charCodeAt(i)); }
}