import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useIsMobile } from '../hooks/useIsMobile';
import { DialogOverlay } from '../components/DialogOverlay';
import type { DialogOptions } from '../components/DialogOverlay';
import { ShortcutsOverlay } from '../components/ShortcutsOverlay';
import '../styles/transitions.css';

// ============================================================
// HOOK POUR LES RACCOURCIS CLAVIER
// ============================================================
interface ShortcutHandlers {
  onPlayAll: () => void;
  onPauseAll: () => void;
  onSetCue: (deck: 'A' | 'B', index: number) => void;
  onClearCue: (deck: 'A' | 'B', index: number) => void;
  onPitchUp: (deck: 'A' | 'B') => void;
  onPitchDown: (deck: 'A' | 'B') => void;
  onNudgeLeft: (deck: 'A' | 'B') => void;
  onNudgeRight: (deck: 'A' | 'B') => void;
  onToggleLoop: (deck: 'A' | 'B', size: number) => void;
}

const useMixerShortcuts = (handlers: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const key = e.key;
      const lowerKey = key.toLowerCase();

      if (key === ' ') {
        e.preventDefault();
        if (e.shiftKey) handlers.onPauseAll();
        else handlers.onPlayAll();
        return;
      }

      if (/^[1-8]$/.test(key)) {
        e.preventDefault();
        const index = parseInt(key) - 1;
        if (e.shiftKey) handlers.onClearCue(e.altKey ? 'B' : 'A', index);
        else handlers.onSetCue(e.altKey ? 'B' : 'A', index);
        return;
      }

      if (lowerKey === 'a') { e.preventDefault(); handlers.onPitchDown(e.altKey ? 'B' : 'A'); return; }
      if (lowerKey === 's') { e.preventDefault(); handlers.onPitchUp(e.altKey ? 'B' : 'A'); return; }
      if (lowerKey === 'q') { e.preventDefault(); handlers.onNudgeLeft(e.altKey ? 'B' : 'A'); return; }
      if (lowerKey === 'w') { e.preventDefault(); handlers.onNudgeRight(e.altKey ? 'B' : 'A'); return; }
      if (lowerKey === 'r') { e.preventDefault(); handlers.onToggleLoop(e.altKey ? 'B' : 'A', 4); return; }
      if (lowerKey === 't') { e.preventDefault(); handlers.onToggleLoop(e.altKey ? 'B' : 'A', 8); return; }
      if (lowerKey === 'y') { e.preventDefault(); handlers.onToggleLoop(e.altKey ? 'B' : 'A', 16); return; }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};

// ============================================================
// INTERFACES
// ============================================================
interface Track {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string;
  bpm: number;
  song_key: string | null;
  camelot: string | null;
  genre: string;
  duration: number;
}

interface DeckState {
  track: Track | null;
  isPlaying: boolean;
  playbackRate: number;
  currentTime: number;
  duration: number;
  eqBass: number;
  eqMid: number;
  eqHigh: number;
  volume: number;
  peaks: { bass: number[], mid: number[], high: number[] } | null;
  buffer: AudioBuffer | null;
  loopStart: number | null;
  loopEnd: number | null;
}

const initialDeckState: DeckState = {
  track: null, isPlaying: false, playbackRate: 1, currentTime: 0, duration: 0,
  eqBass: 0, eqMid: 0, eqHigh: 0, volume: 0.8, peaks: null, buffer: null,
  loopStart: null, loopEnd: null,
};

// ============================================================
// COMPOSANT KNOB
// ============================================================
const Knob: React.FC<{ 
  label: string; 
  value: number; 
  onChange: (v: number) => void; 
  color: string; 
  min?: number; 
  max?: number; 
}> = ({ label, value, onChange, color, min = 0, max = 1 }) => {
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const deltaY = startY.current - e.clientY;
      const sensitivity = (max - min) / 50;
      const v = Math.max(min, Math.min(max, startValue.current + deltaY * sensitivity));
      onChange(v);
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { 
      window.removeEventListener('mousemove', onMove); 
      window.removeEventListener('mouseup', onUp); 
    };
  }, [dragging, min, max, onChange]);

  const percent = (value - min) / (max - min);
  const rotation = -135 + (percent * 270);

  return (
    <div className="mixer-knob">
      <div className="mixer-knob-label">{label}</div>
      <div 
        className="mixer-knob-dial" 
        style={{ 
          borderColor: dragging ? color : '#444', 
          boxShadow: dragging ? `0 0 12px ${color}` : undefined, 
          transform: `rotate(${rotation}deg)`,
          transition: dragging ? 'none' : 'transform 0.1s ease-out',
          color 
        }} 
        onMouseDown={(e) => { 
          e.preventDefault(); 
          setDragging(true); 
          startY.current = e.clientY; 
          startValue.current = value; 
        }}
      >
        <div className="mixer-knob-marker" />
      </div>
      <div className="mixer-knob-value" style={{ color }}>
        {min === -12 ? `${value > 0 ? '+' : ''}${value.toFixed(0)}` : `${(value * 100).toFixed(0)}%`}
      </div>
    </div>
  );
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export const MixerPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const navigate = useNavigate();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [deckA, setDeckA] = useState<DeckState>(initialDeckState);
  const [deckB, setDeckB] = useState<DeckState>(initialDeckState);
  const [crossfader, setCrossfader] = useState(0.5);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const [cuePointsA, setCuePointsA] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [cuePointsB, setCuePointsB] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [loopSizeA, setLoopSizeA] = useState<number | null>(null);
  const [loopSizeB, setLoopSizeB] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogOptions, setDialogOptions] = useState<DialogOptions>({});

  const showDialog = (opts: DialogOptions) => { setDialogOptions(opts); setDialogVisible(true); };

  const audioCtxRef = useRef<AudioContext | null>(null);
  const deckANodes = useRef<any>({ source: null, gain: null, volumeGain: null, startTime: 0, pauseTime: 0, bassFilter: null, midFilter: null, highFilter: null });
  const deckBNodes = useRef<any>({ source: null, gain: null, volumeGain: null, startTime: 0, pauseTime: 0, bassFilter: null, midFilter: null, highFilter: null });
  
  const isDraggingRef = useRef(false);
  const animationRef = useRef<number>(0);

  // ✅ NOUVEAU : On utilise une ref pour stocker le dernier temps affiché
  // et éviter trop de re-rendus (ce qui cause le clignotement)
  const lastTimeA = useRef(0);
  const lastTimeB = useRef(0);

  useEffect(() => {
    const fetchTracks = async () => {
      const { data } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
      if (data) setTracks(data);
    };
    fetchTracks();

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtxRef.current = new AudioCtx();

    return () => { if (audioCtxRef.current) audioCtxRef.current.close(); };
  }, []);

  // ============================================================
  // ✅ BOUCLE D'ANIMATION CORRIGÉE (pour éviter le clignotement)
  // ============================================================
  useEffect(() => {
    let lastUpdate = performance.now();

    const updateTime = (now: number) => {
      // On ne met à jour que toutes les ~33ms (30 FPS), ce qui est suffisant
      // et empêche le canvas de clignoter
      if (now - lastUpdate < 33) {
        animationRef.current = requestAnimationFrame(updateTime);
        return;
      }
      lastUpdate = now;

      if (audioCtxRef.current) {
        const ctxTime = audioCtxRef.current.currentTime;

        // === DECK A ===
        if (deckA.isPlaying) {
          const ref = deckANodes.current;
          let elapsed = ctxTime - ref.startTime + ref.pauseTime;

          if (deckA.loopStart !== null && deckA.loopEnd !== null) {
            if (elapsed >= deckA.loopEnd) {
              const loopDuration = deckA.loopEnd - deckA.loopStart;
              elapsed = deckA.loopStart + ((elapsed - deckA.loopStart) % loopDuration);
              ref.pauseTime = elapsed;
              ref.startTime = ctxTime;
            }
          }

          // On ne met à jour que si le changement est visible à l'écran
          const diff = Math.abs(elapsed - lastTimeA.current);
          if (diff > 0.05) {
            lastTimeA.current = elapsed;
            setDeckA((prev) => ({ ...prev, currentTime: Math.min(elapsed, prev.duration) }));
          }
        }

        // === DECK B ===
        if (deckB.isPlaying) {
          const ref = deckBNodes.current;
          let elapsed = ctxTime - ref.startTime + ref.pauseTime;

          if (deckB.loopStart !== null && deckB.loopEnd !== null) {
            if (elapsed >= deckB.loopEnd) {
              const loopDuration = deckB.loopEnd - deckB.loopStart;
              elapsed = deckB.loopStart + ((elapsed - deckB.loopStart) % loopDuration);
              ref.pauseTime = elapsed;
              ref.startTime = ctxTime;
            }
          }

          const diff = Math.abs(elapsed - lastTimeB.current);
          if (diff > 0.05) {
            lastTimeB.current = elapsed;
            setDeckB((prev) => ({ ...prev, currentTime: Math.min(elapsed, prev.duration) }));
          }
        }
      }

      animationRef.current = requestAnimationFrame(updateTime);
    };

    animationRef.current = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animationRef.current);
  }, [deckA.isPlaying, deckB.isPlaying, deckA.loopStart, deckA.loopEnd, deckB.loopStart, deckB.loopEnd]);

  // ============================================================
  // MISE À JOUR DES VOLUMES, EQ, PLAYBACKRATE
  // ============================================================
  useEffect(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    if (deckANodes.current.gain) deckANodes.current.gain.gain.setTargetAtTime(1 - crossfader, now, 0.05);
    if (deckANodes.current.volumeGain) deckANodes.current.volumeGain.gain.setTargetAtTime(deckA.volume, now, 0.05);
    if (deckANodes.current.bassFilter) deckANodes.current.bassFilter.gain.setTargetAtTime(deckA.eqBass, now, 0.05);
    if (deckANodes.current.midFilter) deckANodes.current.midFilter.gain.setTargetAtTime(deckA.eqMid, now, 0.05);
    if (deckANodes.current.highFilter) deckANodes.current.highFilter.gain.setTargetAtTime(deckA.eqHigh, now, 0.05);
    if (deckANodes.current.source) deckANodes.current.source.playbackRate.setTargetAtTime(deckA.playbackRate, now, 0.05);

    if (deckBNodes.current.gain) deckBNodes.current.gain.gain.setTargetAtTime(crossfader, now, 0.05);
    if (deckBNodes.current.volumeGain) deckBNodes.current.volumeGain.gain.setTargetAtTime(deckB.volume, now, 0.05);
    if (deckBNodes.current.bassFilter) deckBNodes.current.bassFilter.gain.setTargetAtTime(deckB.eqBass, now, 0.05);
    if (deckBNodes.current.midFilter) deckBNodes.current.midFilter.gain.setTargetAtTime(deckB.eqMid, now, 0.05);
    if (deckBNodes.current.highFilter) deckBNodes.current.highFilter.gain.setTargetAtTime(deckB.eqHigh, now, 0.05);
    if (deckBNodes.current.source) deckBNodes.current.source.playbackRate.setTargetAtTime(deckB.playbackRate, now, 0.05);
  }, [crossfader, deckA, deckB]);

  // ============================================================
  // CHARGEMENT D'UN MORCEAU
  // ============================================================
  const loadTrack = async (track: Track, deck: 'A' | 'B') => {
    if (!audioCtxRef.current) return;
    try {
      const response = await fetch(track.audio_url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
      const ref = deck === 'A' ? deckANodes : deckBNodes;

      if (ref.current.source) { try { ref.current.source.stop(); } catch {} }

      const channelData = audioBuffer.getChannelData(0);
      const numBars = 300;
      const step = Math.floor(channelData.length / numBars);
      
      const bassPeaks: number[] = [];
      const midPeaks: number[] = [];
      const highPeaks: number[] = [];

      for (let i = 0; i < numBars; i++) {
        let bassMax = 0, midMax = 0, highMax = 0;
        for (let j = 0; j < step; j += 10) { 
          const val = Math.abs(channelData[i * step + j]);
          if (val > bassMax) bassMax = val;
          if (val > midMax) midMax = val;
          if (val > highMax) highMax = val;
        }
        bassPeaks.push(bassMax * 100);
        midPeaks.push(midMax * 100);
        highPeaks.push(highMax * 100);
      }

      const bassFilter = audioCtxRef.current.createBiquadFilter();
      bassFilter.type = 'lowshelf'; bassFilter.frequency.value = 200;
      const midFilter = audioCtxRef.current.createBiquadFilter();
      midFilter.type = 'peaking'; midFilter.frequency.value = 1000; midFilter.Q.value = 1;
      const highFilter = audioCtxRef.current.createBiquadFilter();
      highFilter.type = 'highshelf'; highFilter.frequency.value = 4000;

      const source = audioCtxRef.current.createBufferSource();
      source.buffer = audioBuffer;
      const volumeGain = audioCtxRef.current.createGain();
      volumeGain.gain.value = 0.8;
      const gain = audioCtxRef.current.createGain();
      gain.gain.value = deck === 'A' ? 1 - crossfader : crossfader;

      source.connect(bassFilter); bassFilter.connect(midFilter); midFilter.connect(highFilter); highFilter.connect(volumeGain); volumeGain.connect(gain); gain.connect(audioCtxRef.current.destination);

      ref.current = { source, gain, volumeGain, startTime: 0, pauseTime: 0, bassFilter, midFilter, highFilter };

      const update = { 
        ...initialDeckState, 
        track, 
        duration: audioBuffer.duration, 
        peaks: { bass: bassPeaks, mid: midPeaks, high: highPeaks }, 
        buffer: audioBuffer 
      };
      
      if (deck === 'A') { setDeckA(update); setCuePointsA(Array(8).fill(0)); setLoopSizeA(null); }
      else { setDeckB(update); setCuePointsB(Array(8).fill(0)); setLoopSizeB(null); }
    } catch (err) {
      console.error(err);
      showDialog({ title: 'Erreur', body: 'Impossible de charger le morceau.' });
    }
  };

  // ============================================================
  // PLAY / PAUSE
  // ============================================================
  const togglePlay = (deck: 'A' | 'B') => {
    if (!audioCtxRef.current) return;
    const ref = deck === 'A' ? deckANodes : deckBNodes;
    const state = deck === 'A' ? deckA : deckB;
    if (!state.buffer) return;

    if (state.isPlaying) {
      try { ref.current.source?.stop(); } catch {}
      ref.current.pauseTime += audioCtxRef.current.currentTime - ref.current.startTime;
      if (deck === 'A') setDeckA((prev) => ({ ...prev, isPlaying: false }));
      else setDeckB((prev) => ({ ...prev, isPlaying: false }));
    } else {
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = state.buffer;
      source.playbackRate.value = state.playbackRate;

      const loopSize = deck === 'A' ? loopSizeA : loopSizeB;
      if (loopSize && state.track?.bpm && state.track.bpm > 0) {
        const loopDuration = (60 / state.track.bpm) * loopSize;
        source.loop = true;
        source.loopStart = ref.current.pauseTime;
        source.loopEnd = Math.min(ref.current.pauseTime + loopDuration, state.duration);
      }

      if (ref.current.bassFilter) source.connect(ref.current.bassFilter);
      source.start(0, ref.current.pauseTime % state.duration);
      ref.current.source = source;
      ref.current.startTime = audioCtxRef.current.currentTime;

      if (deck === 'A') setDeckA((prev) => ({ ...prev, isPlaying: true }));
      else setDeckB((prev) => ({ ...prev, isPlaying: true }));
    }
  };

  // ============================================================
  // SYNC
  // ============================================================
  const handleSync = () => {
    if (!deckA.track || !deckB.track) return;
    if (!deckA.track.bpm || !deckB.track.bpm) return;
    const targetRate = deckA.track.bpm / deckB.track.bpm;
    setDeckB((prev) => ({ ...prev, playbackRate: targetRate }));
    if (deckB.isPlaying && audioCtxRef.current && deckB.buffer) {
      const ref = deckBNodes.current;
      const elapsed = audioCtxRef.current.currentTime - ref.startTime + ref.pauseTime;
      try { ref.source?.stop(); } catch {}
      const src = audioCtxRef.current.createBufferSource();
      src.buffer = deckB.buffer;
      src.playbackRate.value = targetRate;
      if (ref.bassFilter) src.connect(ref.bassFilter);
      src.start(0, elapsed % deckB.duration);
      ref.source = src;
      ref.startTime = audioCtxRef.current.currentTime;
      ref.pauseTime = elapsed;
    }
  };

  // ============================================================
  // RESTART SOURCE (CUE / BOUCLE)
  // ============================================================
  const restartSource = (deck: 'A' | 'B', newTime: number, loopRange: {start: number, end: number} | null = null) => {
    const ref = deck === 'A' ? deckANodes : deckBNodes;
    const state = deck === 'A' ? deckA : deckB;
    if (!state.buffer || !audioCtxRef.current) return;

    try { ref.current.source?.stop(); } catch {}

    const src = audioCtxRef.current.createBufferSource();
    src.buffer = state.buffer;
    src.playbackRate.value = state.playbackRate;

    if (loopRange) {
      src.loop = true;
      src.loopStart = loopRange.start;
      src.loopEnd = loopRange.end;
    }

    if (ref.current.bassFilter) src.connect(ref.current.bassFilter);
    src.start(0, newTime);
    
    ref.current.source = src;
    ref.current.startTime = audioCtxRef.current.currentTime;
    ref.current.pauseTime = newTime;

    if (deck === 'A') {
      setDeckA(prev => ({ ...prev, currentTime: newTime, isPlaying: true, loopStart: loopRange ? loopRange.start : null, loopEnd: loopRange ? loopRange.end : null }));
    } else {
      setDeckB(prev => ({ ...prev, currentTime: newTime, isPlaying: true, loopStart: loopRange ? loopRange.start : null, loopEnd: loopRange ? loopRange.end : null }));
    }
  };

  // ============================================================
  // CUE : Sauter au point
  // ============================================================
  const jumpToCue = (deck: 'A' | 'B', index: number) => {
    const cue = deck === 'A' ? cuePointsA[index] : cuePointsB[index];
    if (cue <= 0) return;
    const loopSize = deck === 'A' ? loopSizeA : loopSizeB;
    const state = deck === 'A' ? deckA : deckB;
    
    let loopRange = null;
    if (loopSize && state.track?.bpm && state.track.bpm > 0) {
      const loopDuration = (60 / state.track.bpm) * loopSize;
      loopRange = { start: cue, end: Math.min(cue + loopDuration, state.duration) };
    }
    restartSource(deck, cue, loopRange);
  };

  // ============================================================
  // CUE : Définir un point
  // ============================================================
  const setCuePoint = (deck: 'A' | 'B', index: number) => {
    const t = deck === 'A' ? deckA.currentTime : deckB.currentTime;
    if (deck === 'A') setCuePointsA((p) => { const n = [...p]; n[index] = t; return n; });
    else setCuePointsB((p) => { const n = [...p]; n[index] = t; return n; });
  };

  // ============================================================
  // BOUCLE : Activer / Désactiver
  // ============================================================
  const toggleLoop = (deck: 'A' | 'B', size: number) => {
    const current = deck === 'A' ? loopSizeA : loopSizeB;
    const newSize = current === size ? null : size;
    if (deck === 'A') setLoopSizeA(newSize);
    else setLoopSizeB(newSize);

    const state = deck === 'A' ? deckA : deckB;
    if (!state.isPlaying) return;
    
    const currentTime = state.currentTime;
    if (newSize && state.track?.bpm && state.track.bpm > 0) {
      const loopDuration = (60 / state.track.bpm) * newSize;
      restartSource(deck, currentTime, { start: currentTime, end: Math.min(currentTime + loopDuration, state.duration) });
    } else {
      restartSource(deck, currentTime, null);
    }
  };

  // ============================================================
  // NUDGE
  // ============================================================
  const nudge = (deck: 'A' | 'B', amount: number) => {
    const ref = deck === 'A' ? deckANodes : deckBNodes;
    const state = deck === 'A' ? deckA : deckB;
    if (!audioCtxRef.current || !ref.current.source || !state.isPlaying) return;
    
    const currentRate = state.playbackRate;
    ref.current.source.playbackRate.setTargetAtTime(
      currentRate + amount * 0.04, 
      audioCtxRef.current.currentTime, 
      0.05
    );
    
    setTimeout(() => {
      if (ref.current.source) {
        ref.current.source.playbackRate.setTargetAtTime(
          currentRate, 
          audioCtxRef.current?.currentTime || 0, 
          0.05
        );
      }
    }, 200);
  };

  // ============================================================
  // RACCOURCIS CLAVIER
  // ============================================================
  useMixerShortcuts({
    onPlayAll: () => {
      if (!deckA.isPlaying && deckA.buffer) togglePlay('A');
      if (!deckB.isPlaying && deckB.buffer) togglePlay('B');
    },
    onPauseAll: () => {
      if (deckA.isPlaying) togglePlay('A');
      if (deckB.isPlaying) togglePlay('B');
    },
    onSetCue: (deck, index) => setCuePoint(deck, index),
    onClearCue: (deck, index) => {
      if (deck === 'A') setCuePointsA(p => { const n = [...p]; n[index] = 0; return n; });
      else setCuePointsB(p => { const n = [...p]; n[index] = 0; return n; });
    },
    onPitchUp: (deck) => {
      const current = deck === 'A' ? deckA.playbackRate : deckB.playbackRate;
      const newRate = Math.min(1.5, current + 0.01);
      if (deck === 'A') setDeckA(p => ({ ...p, playbackRate: newRate }));
      else setDeckB(p => ({ ...p, playbackRate: newRate }));
    },
    onPitchDown: (deck) => {
      const current = deck === 'A' ? deckA.playbackRate : deckB.playbackRate;
      const newRate = Math.max(0.5, current - 0.01);
      if (deck === 'A') setDeckA(p => ({ ...p, playbackRate: newRate }));
      else setDeckB(p => ({ ...p, playbackRate: newRate }));
    },
    onNudgeLeft: (deck) => nudge(deck, -1),
    onNudgeRight: (deck) => nudge(deck, 1),
    onToggleLoop: (deck, size) => toggleLoop(deck, size),
  });

  // ============================================================
  // UTILS
  // ============================================================
  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const filteredTracks = tracks.filter((t) => {
    const g = !selectedGenre || t.genre === selectedGenre;
    const q = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.artist.toLowerCase().includes(searchQuery.toLowerCase());
    return g && q;
  });

  const genres = Array.from(new Set(tracks.map((t) => t.genre).filter(Boolean))).sort();

  // ============================================================
  // SEEK TO POSITION
  // ============================================================
  const seekToPosition = (deck: 'A' | 'B', percent: number) => {
    const state = deck === 'A' ? deckA : deckB;
    if (!state.buffer) return;
    const newTime = state.duration * percent;
    const loopSize = deck === 'A' ? loopSizeA : loopSizeB;
    
    if (state.isPlaying) {
      let loopRange = null;
      if (loopSize && state.track?.bpm && state.track.bpm > 0) {
        const loopDuration = (60 / state.track.bpm) * loopSize;
        loopRange = { start: newTime, end: Math.min(newTime + loopDuration, state.duration) };
      }
      restartSource(deck, newTime, loopRange);
    } else {
      const ref = deck === 'A' ? deckANodes : deckBNodes;
      ref.current.pauseTime = newTime;
      if (deck === 'A') setDeckA((prev) => ({ ...prev, currentTime: newTime }));
      else setDeckB((prev) => ({ ...prev, currentTime: newTime }));
    }
  };

  const handleWaveformInteraction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    if ('touches' in e) clientX = e.touches[0].clientX;
    else clientX = (e as React.MouseEvent).clientX;
    
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    
    let clientY = 0;
    if ('touches' in e) clientY = e.touches[0].clientY;
    else clientY = (e as React.MouseEvent).clientY;
    const y = clientY - rect.top;
    
    if (y < rect.height / 2) {
      if (deckA.buffer) seekToPosition('A', percent);
    } else {
      if (deckB.buffer) seekToPosition('B', percent);
    }
  };

  // ============================================================
  // WAVEFORM COMPONENT (sans scintillement)
  // ============================================================
  const UnifiedWaveform = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const progressA = deckA.duration > 0 ? deckA.currentTime / deckA.duration : 0;
    const progressB = deckB.duration > 0 ? deckB.currentTime / deckB.duration : 0;

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.fillStyle = '#030406';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, height / 2 - 1, width, 2);
      
      // === DECK A ===
      if (deckA.peaks) {
        const bw = width / deckA.peaks.bass.length;
        
        deckA.peaks.bass.forEach((val, i) => {
          const x = i * bw;
          const h = (val / 100) * (height / 2 - 5);
          ctx.fillStyle = x < progressA * width ? '#ff3333' : 'rgba(255, 51, 51, 0.3)';
          ctx.fillRect(x, height / 2 - h, Math.max(1, bw - 0.5), h);
        });
        
        deckA.peaks.mid.forEach((val, i) => {
          const x = i * bw;
          const h = (val / 100) * (height / 2 - 5) * 0.7;
          ctx.fillStyle = x < progressA * width ? '#00ff44' : 'rgba(0, 255, 68, 0.3)';
          ctx.fillRect(x, height / 2 - h, Math.max(1, bw - 0.5), h);
        });

        deckA.peaks.high.forEach((val, i) => {
          const x = i * bw;
          const h = (val / 100) * (height / 2 - 5) * 0.4;
          ctx.fillStyle = x < progressA * width ? '#00aaff' : 'rgba(0, 170, 255, 0.3)';
          ctx.fillRect(x, height / 2 - h, Math.max(1, bw - 0.5), h);
        });

        if (deckA.loopStart !== null && deckA.loopEnd !== null) {
          const xStart = (deckA.loopStart / deckA.duration) * width;
          const xEnd = (deckA.loopEnd / deckA.duration) * width;
          ctx.fillStyle = 'rgba(0, 255, 100, 0.2)';
          ctx.fillRect(xStart, 0, xEnd - xStart, height / 2);
          ctx.strokeStyle = '#00ff64';
          ctx.lineWidth = 2;
          ctx.strokeRect(xStart, 0, xEnd - xStart, height / 2);
        }

        cuePointsA.forEach((t) => {
          if (t > 0) {
            const x = (t / deckA.duration) * width;
            ctx.fillStyle = '#fff';
            ctx.fillRect(x - 1, 0, 2, height / 2);
          }
        });
      }
      
      // === DECK B ===
      if (deckB.peaks) {
        const bw = width / deckB.peaks.bass.length;
        
        deckB.peaks.bass.forEach((val, i) => {
          const x = i * bw;
          const h = (val / 100) * (height / 2 - 5);
          ctx.fillStyle = x < progressB * width ? '#ff33cc' : 'rgba(255, 51, 204, 0.3)';
          ctx.fillRect(x, height / 2, Math.max(1, bw - 0.5), h);
        });
        
        deckB.peaks.mid.forEach((val, i) => {
          const x = i * bw;
          const h = (val / 100) * (height / 2 - 5) * 0.7;
          ctx.fillStyle = x < progressB * width ? '#00ffcc' : 'rgba(0, 255, 204, 0.3)';
          ctx.fillRect(x, height / 2, Math.max(1, bw - 0.5), h);
        });

        deckB.peaks.high.forEach((val, i) => {
          const x = i * bw;
          const h = (val / 100) * (height / 2 - 5) * 0.4;
          ctx.fillStyle = x < progressB * width ? '#ffaa00' : 'rgba(255, 170, 0, 0.3)';
          ctx.fillRect(x, height / 2, Math.max(1, bw - 0.5), h);
        });

        if (deckB.loopStart !== null && deckB.loopEnd !== null) {
          const xStart = (deckB.loopStart / deckB.duration) * width;
          const xEnd = (deckB.loopEnd / deckB.duration) * width;
          ctx.fillStyle = 'rgba(255, 0, 150, 0.2)';
          ctx.fillRect(xStart, height / 2, xEnd - xStart, height / 2);
          ctx.strokeStyle = '#ff00aa';
          ctx.lineWidth = 2;
          ctx.strokeRect(xStart, height / 2, xEnd - xStart, height / 2);
        }

        cuePointsB.forEach((t) => {
          if (t > 0) {
            const x = (t / deckB.duration) * width;
            ctx.fillStyle = '#fff';
            ctx.fillRect(x - 1, height / 2, 2, height / 2);
          }
        });
      }
      
      if (deckA.duration > 0) {
        ctx.fillStyle = '#fff';
        const playX = Math.floor(progressA * width);
        ctx.fillRect(playX - 1, 0, 2, height);
      }
    }, [deckA.peaks, deckB.peaks, progressA, progressB, cuePointsA, cuePointsB, deckA.loopStart, deckB.loopStart]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      isDraggingRef.current = true;
      handleWaveformInteraction(e);
    };
    
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDraggingRef.current) handleWaveformInteraction(e);
    };

    const handleMouseUp = () => { isDraggingRef.current = false; };

    return (
      <canvas 
        ref={canvasRef} 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleWaveformInteraction}
        onTouchMove={handleWaveformInteraction}
        width={800} 
        height={110} 
        style={{ 
          width: '100%', 
          height: 110, 
          borderRadius: 4, 
          background: '#030406',
          cursor: 'crosshair', 
          touchAction: 'none',
          willChange: 'contents'
        }} 
      />
    );
  };

  // ============================================================
  // RENDER DECK
  // ============================================================
  const renderDeck = (deck: 'A' | 'B') => {
    const state = deck === 'A' ? deckA : deckB;
    const color = deck === 'A' ? 'var(--tn-deck-a)' : 'var(--tn-deck-b)';
    const cuePoints = deck === 'A' ? cuePointsA : cuePointsB;
    const loopSize = deck === 'A' ? loopSizeA : loopSizeB;

    return (
      <div className="mixer-deck-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="mixer-deck-title" style={{ color }}>DECK {deck}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--tn-text-dim)' }}>{state.track?.bpm || 0} BPM</span>
        </div>
        <div className="mixer-track-info">
          <div className="mixer-track-cover" style={{ backgroundImage: state.track?.cover_url ? `url(${state.track.cover_url})` : undefined }} />
          <div className="mixer-track-meta">
            <div className="mixer-track-title">{state.track?.title || 'Aucun morceau'}</div>
            <div className="mixer-track-artist">{state.track?.artist || ''}</div>
          </div>
          <button className="tn-btn" style={{ height: 32, lineHeight: '30px', padding: '0 14px', background: state.isPlaying ? '#333' : color, color: state.isPlaying ? '#fff' : '#000' }} onClick={() => togglePlay(deck)}>
            {state.isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          
          {/* CUE */}
          <div>
            <div className="mixer-knob-label" style={{ marginBottom: 4 }}>CUE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const isSet = cuePoints[i] > 0;
                return (
                  <button 
                    key={i} 
                    className={`mixer-cue-btn ${isSet ? 'set' : ''}`} 
                    style={{ 
                      background: isSet ? color : '#2a2a2a',
                      color: isSet ? '#000' : '#888',
                      border: isSet ? `2px solid #fff` : '1px solid #444',
                      fontWeight: 800,
                      padding: '6px 0'
                    }} 
                    onClick={() => (isSet ? jumpToCue(deck, i) : setCuePoint(deck, i))}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* BOUCLE */}
          <div>
            <div className="mixer-knob-label" style={{ marginBottom: 4 }}>BOUCLE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {[1, 2, 4, 8].map((size) => {
                const active = loopSize === size;
                return (
                  <button 
                    key={size} 
                    className={`mixer-loop-btn ${active ? 'active' : ''}`} 
                    style={{ 
                      background: active ? '#00ff64' : '#2a2a2a',
                      color: active ? '#000' : '#888',
                      border: active ? '2px solid #fff' : '1px solid #444',
                      fontWeight: 800,
                      padding: '5px 0'
                    }} 
                    onClick={() => toggleLoop(deck, size)}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* KNOBS (HIGH / MID / LOW / VOL) */}
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 4 }}>
            <Knob label="HIGH" value={state.eqHigh} onChange={(v) => (deck === 'A' ? setDeckA((p) => ({ ...p, eqHigh: v })) : setDeckB((p) => ({ ...p, eqHigh: v })))} color={color} min={-12} max={12} />
            <Knob label="MID" value={state.eqMid} onChange={(v) => (deck === 'A' ? setDeckA((p) => ({ ...p, eqMid: v })) : setDeckB((p) => ({ ...p, eqMid: v })))} color={color} min={-12} max={12} />
            <Knob label="LOW" value={state.eqBass} onChange={(v) => (deck === 'A' ? setDeckA((p) => ({ ...p, eqBass: v })) : setDeckB((p) => ({ ...p, eqBass: v })))} color={color} min={-12} max={12} />
            <Knob label="VOL" value={state.volume} onChange={(v) => (deck === 'A' ? setDeckA((p) => ({ ...p, volume: v })) : setDeckB((p) => ({ ...p, volume: v })))} color={color} min={0} max={1} />
          </div>

        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="mixer-root">
      <header className="tn-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#666', marginLeft: 15, marginRight: 5, display: 'flex', alignItems: 'center' }} title="Retour au site">←</button>
          <div className="tn-title">WAVEFORGE</div>
        </div>
        <nav className="tn-menu">
          <a href="#" onClick={(e) => e.preventDefault()}>WAVES</a>
          <a href="#" onClick={(e) => e.preventDefault()}>STEMS</a>
          <a href="#" onClick={(e) => e.preventDefault()}>SCOPE</a>
          <a href="#" onClick={(e) => e.preventDefault()}>TIMELINE</a>
          <a href="#" onClick={(e) => e.preventDefault()}>FX</a>
          <button onClick={() => setShortcutsOpen(true)}>SHORTCUTS</button>
        </nav>
      </header>

      <div className="mixer-timeline-panel">
        <div style={{ position: 'relative', height: 14, marginBottom: 4 }}>
          {[{ label: 'Intro', pos: 0 }, { label: 'Verse', pos: 25 }, { label: 'Chorus', pos: 50 }, { label: 'Verse', pos: 75 }, { label: 'Outro', pos: 95 }].map((m, i) => (
            <span key={i} style={{ position: 'absolute', left: `${m.pos}%`, transform: 'translateX(-50%)', fontSize: '0.6rem', color: 'var(--tn-text-faint)', fontWeight: 700 }}>{m.label}</span>
          ))}
        </div>
        <UnifiedWaveform />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--tn-text-faint)', fontWeight: 700 }}>ZOOM</span>
          <input type="range" min="1" max="8" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontSize: '0.6rem', color: 'var(--tn-text-dim)', minWidth: 30, textAlign: 'right' }}>{zoom.toFixed(1)}x</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.7rem', color: 'var(--tn-text-dim)' }}>
          <span>Deck A: {formatTime(deckA.currentTime)} / {formatTime(deckA.duration)}</span>
          <span>Deck B: {formatTime(deckB.currentTime)} / {formatTime(deckB.duration)}</span>
        </div>
      </div>

      <div className="mixer-decks-row">
        {renderDeck('A')}
        {renderDeck('B')}
      </div>

      <div className="mixer-crossfader-panel">
        <span style={{ color: 'var(--tn-deck-a)', fontWeight: 800 }}>A</span>
        <input type="range" min="0" max="1" step="0.01" value={crossfader} onChange={(e) => setCrossfader(parseFloat(e.target.value))} style={{ width: 300 }} />
        <span style={{ color: 'var(--tn-deck-b)', fontWeight: 800 }}>B</span>
        <button className="tn-btn tn-btn-accent" onClick={handleSync} style={{ marginLeft: 20, height: 32, lineHeight: '30px' }}>SYNC</button>
      </div>

      <div className="mixer-library">
        <div className="mixer-library-filters">
          <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: '1 1 240px' }} />
          <select value={selectedGenre || ''} onChange={(e) => setSelectedGenre(e.target.value || null)} style={{ flex: '0 1 200px' }}>
            <option value="">Tous les genres</option>
            {genres.map((g) => (<option key={g} value={g}>{g}</option>))}
          </select>
        </div>
        <table className="mixer-library-table">
          <thead>
            <tr>
              <th style={{ padding: '10px' }}>#</th>
              <th style={{ padding: '10px' }}>TITRE</th>
              <th style={{ padding: '10px' }}>ARTISTE</th>
              <th style={{ padding: '10px' }}>BPM</th>
              <th style={{ padding: '10px' }}>TONALITÉ</th>
              <th style={{ padding: '10px' }}>GENRE</th>
              <th style={{ padding: '10px' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredTracks.map((track, i) => (
              <tr key={track.id}>
                <td style={{ color: '#666' }}>{i + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 3, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--tn-text-dim)' }}>{track.artist}</td>
                <td>{track.bpm}</td>
                <td>{track.camelot || track.song_key || '-'}</td>
                <td style={{ color: 'var(--tn-text-dim)' }}>{track.genre}</td>
                <td>
                  <button className="mixer-load-a" onClick={() => loadTrack(track, 'A')}>→ A</button>
                  <button className="mixer-load-b" onClick={() => loadTrack(track, 'B')}>→ B</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DialogOverlay visible={dialogVisible} options={dialogOptions} onClose={() => setDialogVisible(false)} />
      <ShortcutsOverlay visible={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
};