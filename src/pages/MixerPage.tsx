// src/pages/MixerPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { analyzeAudio } from '../utils/audioAnalyzer'; 
import type { WaveformData } from '../utils/audioAnalyzer';
import { SeratoWaveform } from '../components/SeratoWaveform';
import { useIsMobile } from '../hooks/useIsMobile';

// ============================================================
// TYPES & CONSTANTES
// ============================================================
interface Track {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string;
  bpm: number;
  song_key: string | null;
  genre: string;
  duration: number;
}

interface DeckState {
  track: Track | null;
  isPlaying: boolean;
  volume: number;
  eqHigh: number;
  eqMid: number;
  eqLow: number;
  gain: number;
  playbackRate: number;
  cuePoints: (number | null)[];
  initialCue: number;
  isLooping: boolean;
  loopSize: number;
  isSynced: boolean;
  filter: number; 
  pitchRange: number;
}

const initialDeckState: DeckState = {
  track: null, isPlaying: false, volume: 0.8, gain: 0.5,
  eqHigh: 0, eqMid: 0, eqLow: 0, playbackRate: 1,
  cuePoints: [null, null, null, null, null, null, null, null],
  initialCue: 0, isLooping: false, loopSize: 4, isSynced: false,
  filter: 50, pitchRange: 8,
};

// ============================================================
// COMPOSANTS RÉUTILISABLES
// ============================================================
const TimeDisplay = ({ getCurrentTime }: { getCurrentTime: () => number }) => {
  const timeRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let animId: number;
    const update = () => {
      const time = getCurrentTime();
      if (timeRef.current) {
        const min = Math.floor(time / 60).toString().padStart(2, '0');
        const sec = Math.floor(time % 60).toString().padStart(2, '0');
        timeRef.current.innerText = `${min}:${sec}`;
      }
      animId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animId);
  }, [getCurrentTime]);
  return <span ref={timeRef} style={{ fontFamily: 'monospace', fontWeight: 700 }}>00:00</span>;
};

// ✅ VU-mètre style Serato (Segments LED distincts)
const StereoMeter = ({ isPlaying }: { isPlaying: boolean }) => {
  const segments = 15; // Nombre de LEDs par canal
  const activeSegments = isPlaying ? 10 + Math.floor(Math.random() * 5) : 0;

  return (
    <div style={{ display: 'flex', gap: 2, height: 110, background: '#050505', padding: 2, borderRadius: 2, border: '1px solid #222' }}>
      {[0, 1].map(ch => (
        <div key={ch} style={{ width: 6, display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between' }}>
          {Array.from({ length: segments }).map((_, i) => {
             const isLit = i < activeSegments;
             let color = '#00ff9d'; // Vert
             if (i > 11) color = '#ff2a2a'; // Rouge
             else if (i > 8) color = '#ffcc00'; // Jaune
             
             return (
               <div key={i} style={{
                 width: '100%', height: '5px',
                 background: color,
                 opacity: isLit ? 1 : 0.15,
                 borderRadius: 1,
                 boxShadow: isLit ? `0 0 4px ${color}` : 'none',
                 transition: 'opacity 0.05s'
               }} />
             )
          })}
        </div>
      ))}
    </div>
  );
};

// ✅ Potard sans point disgracieux
const Knob: React.FC<{ label?: string; value: number; onChange: (v: number) => void; color: string; min?: number; max?: number; size?: number }> = ({ label, value, onChange, color, min = -12, max = 12, size = 22 }) => {
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = startY.current - clientY;
      const range = max - min;
      onChange(Math.max(min, Math.min(max, startValue.current + deltaY * (range / 100))));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => { 
      window.removeEventListener('mousemove', onMove); 
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, onChange, min, max]);

  const rotation = -135 + (((value - min) / (max - min)) * 270);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Plus de petit point, juste le label propre */}
      <div style={{ fontSize: 9, fontWeight: 700, color: '#888', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#111', border: '1px solid #000', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.8)' }} />
        <div
          onMouseDown={(e) => { e.preventDefault(); setDragging(true); startY.current = (e as React.MouseEvent).clientY; startValue.current = value; }}
          onTouchStart={(e) => { setDragging(true); startY.current = e.touches[0].clientY; startValue.current = value; }}
          style={{ width: size * 0.8, height: size * 0.8, borderRadius: '50%', background: 'linear-gradient(145deg, #333, #0a0a0a)', border: '1px solid #000', cursor: 'ns-resize', position: 'relative', zIndex: 2, transform: `rotate(${rotation}deg)`, touchAction: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          {/* Trait lumineux */}
          <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', width: 2, height: size * 0.3, background: color, borderRadius: 1, boxShadow: `0 0 3px ${color}` }} />
        </div>
      </div>
    </div>
  );
};

const JogWheel = ({ 
  size = 140, coverUrl, isPlaying, color, getCurrentTime, duration, 
  onScrub, onScrubEnd 
}: { 
  size?: number, coverUrl: string | null, isPlaying: boolean, color: string, 
  getCurrentTime: () => number, duration: number,
  onScrub: (time: number) => void, onScrubEnd: () => void 
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const startAngle = useRef(0);
  const startTime = useRef(0);
  const currentRotation = useRef(0);

  useEffect(() => {
    if (isPlaying && !isDragging) {
      let animId: number;
      const animate = () => {
        currentRotation.current += 0.6;
        if (innerRef.current) innerRef.current.style.transform = `rotate(${currentRotation.current}deg)`;
        animId = requestAnimationFrame(animate);
      };
      animate();
      return () => cancelAnimationFrame(animId);
    }
  }, [isPlaying, isDragging]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!wheelRef.current) return;
    setIsDragging(true);
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startAngle.current = Math.atan2(clientY - centerY, clientX - centerX);
    startTime.current = getCurrentTime();
    onScrub(startTime.current);

    const handleMouseMove = (ev: MouseEvent | TouchEvent) => {
      const moveX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
      const moveY = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
      const newAngle = Math.atan2(moveY - centerY, moveX - centerX);
      let deltaAngle = newAngle - startAngle.current;
      if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
      const timeDelta = (deltaAngle / (2 * Math.PI)) * 4; 
      let newTime = startTime.current + timeDelta;
      newTime = Math.max(0, Math.min(duration, newTime));
      if (innerRef.current) {
        currentRotation.current += deltaAngle * (180 / Math.PI);
        innerRef.current.style.transform = `rotate(${currentRotation.current}deg)`;
      }
      onScrub(newTime);
      startAngle.current = newAngle;
      startTime.current = newTime;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      onScrubEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
  };

  return (
    <div
      ref={wheelRef} onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: `radial-gradient(circle at 50% 50%, #050505 0%, #111 50%, #000 100%)`,
        border: `2px solid ${isDragging ? color : (isHovered ? '#444' : '#222')}`,
        boxShadow: isDragging ? `0 0 15px ${color}60, inset 0 0 20px rgba(0,0,0,0.9)` : 'inset 0 0 20px rgba(0,0,0,0.9)',
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none'
      }}
    >
      <div ref={innerRef} style={{ width: '90%', height: '90%', borderRadius: '50%', background: '#0a0a0a', border: '1px solid #111', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ width: size * 0.5, height: size * 0.5, borderRadius: '50%', overflow: 'hidden', border: '2px solid #000', background: '#111' }}>
          {coverUrl ? <img src={coverUrl} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: size * 0.1, fontWeight: 900 }}>DZ</div>}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: size * 0.06, height: size * 0.06, borderRadius: '50%', background: '#000', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2)' }} />
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export const MixerPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [deckA, setDeckA] = useState<DeckState>(initialDeckState);
  const [deckB, setDeckB] = useState<DeckState>(initialDeckState);
  const [crossfader, setCrossfader] = useState(0.5);
  const [masterVol, setMasterVol] = useState(0.8);
  const [searchQuery, setSearchQuery] = useState('');

  const [waveA, setWaveA] = useState<WaveformData | null>(null);
  const [waveB, setWaveB] = useState<WaveformData | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const deckANodes = useRef<any>({ source: null, gain: null, vol: null, eqH: null, eqM: null, eqL: null, filter: null, buffer: null, startTime: 0, pauseTime: 0, scratchSource: null });
  const deckBNodes = useRef<any>({ source: null, gain: null, vol: null, eqH: null, eqM: null, eqL: null, filter: null, buffer: null, startTime: 0, pauseTime: 0, scratchSource: null });
  
  const masterGainRef = useRef<GainNode | null>(null);
  const isPlayingARef = useRef(false);
  const isPlayingBRef = useRef(false);
  useEffect(() => { isPlayingARef.current = deckA.isPlaying; }, [deckA.isPlaying]);
  useEffect(() => { isPlayingBRef.current = deckB.isPlaying; }, [deckB.isPlaying]);

  const seekingRef = useRef<{ A: boolean; B: boolean }>({ A: false, B: false });
  const wasPlayingBeforeSeekRef = useRef<{ A: boolean; B: boolean }>({ A: false, B: false });

  const getTimeA = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !deckANodes.current.buffer) return 0;
    return isPlayingARef.current ? (ctx.currentTime - deckANodes.current.startTime + deckANodes.current.pauseTime) : deckANodes.current.pauseTime;
  }, []);

  const getTimeB = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !deckBNodes.current.buffer) return 0;
    return isPlayingBRef.current ? (ctx.currentTime - deckBNodes.current.startTime + deckBNodes.current.pauseTime) : deckBNodes.current.pauseTime;
  }, []);

  useEffect(() => {
    const fetchTracks = async () => {
      const { data } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
      if (data) setTracks(data);
    };
    fetchTracks();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtxRef.current = new AudioCtx();
    masterGainRef.current = audioCtxRef.current.createGain();
    masterGainRef.current.connect(audioCtxRef.current.destination);
    return () => { if (audioCtxRef.current) audioCtxRef.current.close(); };
  }, []);

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.setTargetAtTime(masterVol, audioCtxRef.current!.currentTime, 0.05);
  }, [masterVol]);

  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (deckANodes.current.gain) deckANodes.current.gain.gain.setTargetAtTime(1 - crossfader, t, 0.05);
    if (deckANodes.current.vol) deckANodes.current.vol.gain.setTargetAtTime(deckA.volume, t, 0.05);
    if (deckANodes.current.eqH) deckANodes.current.eqH.gain.setTargetAtTime(deckA.eqHigh, t, 0.05);
    if (deckANodes.current.eqM) deckANodes.current.eqM.gain.setTargetAtTime(deckA.eqMid, t, 0.05);
    if (deckANodes.current.eqL) deckANodes.current.eqL.gain.setTargetAtTime(deckA.eqLow, t, 0.05);
    if (deckANodes.current.filter) deckANodes.current.filter.frequency.setTargetAtTime(20000 * Math.pow(deckA.filter / 50, 3), t, 0.05);
    
    if (deckBNodes.current.gain) deckBNodes.current.gain.gain.setTargetAtTime(crossfader, t, 0.05);
    if (deckBNodes.current.vol) deckBNodes.current.vol.gain.setTargetAtTime(deckB.volume, t, 0.05);
    if (deckBNodes.current.eqH) deckBNodes.current.eqH.gain.setTargetAtTime(deckB.eqHigh, t, 0.05);
    if (deckBNodes.current.eqM) deckBNodes.current.eqM.gain.setTargetAtTime(deckB.eqMid, t, 0.05);
    if (deckBNodes.current.eqL) deckBNodes.current.eqL.gain.setTargetAtTime(deckB.eqLow, t, 0.05);
    if (deckBNodes.current.filter) deckBNodes.current.filter.frequency.setTargetAtTime(20000 * Math.pow(deckB.filter / 50, 3), t, 0.05);

    if (deckA.isPlaying && deckANodes.current.source && deckA.track?.bpm) {
      if (deckA.isLooping) {
        const loopDur = (60 / deckA.track.bpm) * deckA.loopSize;
        deckANodes.current.source.loop = true;
        deckANodes.current.source.loopEnd = deckANodes.current.source.loopStart + loopDur;
      } else {
        deckANodes.current.source.loop = false;
      }
    }
    if (deckB.isPlaying && deckBNodes.current.source && deckB.track?.bpm) {
      if (deckB.isLooping) {
        const loopDur = (60 / deckB.track.bpm) * deckB.loopSize;
        deckBNodes.current.source.loop = true;
        deckBNodes.current.source.loopEnd = deckBNodes.current.source.loopStart + loopDur;
      } else {
        deckBNodes.current.source.loop = false;
      }
    }
  }, [crossfader, deckA, deckB]);

  const loadTrack = async (track: Track, deck: 'A' | 'B') => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const res = await fetch(track.audio_url);
      const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
      const analysis = await analyzeAudio(buffer);
      if (deck === 'A') setWaveA(analysis); else setWaveB(analysis);

      const nodes = deck === 'A' ? deckANodes : deckBNodes;
      if (nodes.current.source) { try { nodes.current.source.stop(); } catch {} }
      if (nodes.current.scratchSource) { try { nodes.current.scratchSource.stop(); } catch {} }

      const eqL = ctx.createBiquadFilter(); eqL.type = 'lowshelf'; eqL.frequency.value = 250;
      const eqM = ctx.createBiquadFilter(); eqM.type = 'peaking'; eqM.frequency.value = 1000;
      const eqH = ctx.createBiquadFilter(); eqH.type = 'highshelf'; eqH.frequency.value = 4000;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 20000;
      const vol = ctx.createGain(); vol.gain.value = 0.8;
      const gain = ctx.createGain(); gain.gain.value = deck === 'A' ? 1 - crossfader : crossfader;
      
      eqL.connect(eqM); eqM.connect(eqH); eqH.connect(filter);
      filter.connect(vol); vol.connect(gain); gain.connect(masterGainRef.current!);
      nodes.current = { ...nodes.current, eqH, eqM, eqL, filter, vol, gain, buffer, startTime: 0, pauseTime: 0 };
      
      if (deck === 'A') setDeckA({ ...initialDeckState, track, isPlaying: false });
      else setDeckB({ ...initialDeckState, track, isPlaying: false });
    } catch (err) { alert("Erreur de chargement du morceau"); }
  };

  const playDeck = (deck: 'A' | 'B', startTime?: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const nodes = deck === 'A' ? deckANodes.current : deckBNodes.current;
    const state = deck === 'A' ? deckA : deckB;
    if (!nodes.buffer) return;
    try { nodes.source?.stop(); } catch {}
    const src = ctx.createBufferSource();
    src.buffer = nodes.buffer;
    src.playbackRate.value = state.playbackRate;
    src.connect(nodes.eqL);
    const offset = startTime !== undefined ? startTime : nodes.pauseTime;
    
    if (state.isLooping && state.track?.bpm) {
      const loopDur = (60 / state.track.bpm) * state.loopSize;
      src.loop = true;
      src.loopStart = offset;
      src.loopEnd = offset + loopDur;
    }

    src.start(0, offset % nodes.buffer.duration);
    nodes.source = src;
    nodes.startTime = ctx.currentTime;
    nodes.pauseTime = offset;
    if (deck === 'A') { isPlayingARef.current = true; setDeckA(p => ({ ...p, isPlaying: true, initialCue: offset })); }
    else { isPlayingBRef.current = true; setDeckB(p => ({ ...p, isPlaying: true, initialCue: offset })); }
  };

  const pauseDeck = (deck: 'A' | 'B') => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const nodes = deck === 'A' ? deckANodes.current : deckBNodes.current;
    try { nodes.source?.stop(); } catch {}
    try { nodes.scratchSource?.stop(); } catch {}
    nodes.scratchSource = null;
    nodes.pauseTime += ctx.currentTime - nodes.startTime;
    if (deck === 'A') { isPlayingARef.current = false; setDeckA(p => ({ ...p, isPlaying: false })); }
    else { isPlayingBRef.current = false; setDeckB(p => ({ ...p, isPlaying: false })); }
  };

  const handleScratch = (newTime: number, deck: 'A' | 'B') => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const nodes = deck === 'A' ? deckANodes.current : deckBNodes.current;
    if (!nodes.buffer) return;
    if (ctx.state === 'suspended') ctx.resume();

    if (!seekingRef.current[deck]) {
      seekingRef.current[deck] = true;
      wasPlayingBeforeSeekRef.current[deck] = deck === 'A' ? isPlayingARef.current : isPlayingBRef.current;
      if (deck === 'A') { isPlayingARef.current = false; setDeckA(p => ({ ...p, isPlaying: false })); }
      else { isPlayingBRef.current = false; setDeckB(p => ({ ...p, isPlaying: false })); }
      try { nodes.source?.stop(); } catch {}
      nodes.source = null;
    }
    try { nodes.scratchSource?.stop(); } catch {}
    const src = ctx.createBufferSource();
    src.buffer = nodes.buffer;
    src.playbackRate.value = 1;
    src.connect(nodes.eqL);
    const offset = Math.max(0, Math.min(nodes.buffer.duration - 0.01, newTime));
    src.start(0, offset);
    nodes.scratchSource = src;
    nodes.pauseTime = offset;
    nodes.startTime = ctx.currentTime;
  };

  const handleSeekEnd = (deck: 'A' | 'B') => {
    if (!seekingRef.current[deck]) return;
    seekingRef.current[deck] = false;
    const nodes = deck === 'A' ? deckANodes.current : deckBNodes.current;
    try { nodes.scratchSource?.stop(); } catch {}
    nodes.scratchSource = null;
    if (wasPlayingBeforeSeekRef.current[deck]) playDeck(deck);
  };

  const handleCueButton = (deck: 'A' | 'B') => {
    const state = deck === 'A' ? deckA : deckB;
    if (state.isPlaying) {
      pauseDeck(deck);
      const nodes = deck === 'A' ? deckANodes.current : deckBNodes.current;
      nodes.pauseTime = state.initialCue;
    } else { playDeck(deck, state.initialCue); }
  };

  const handleHotCue = (deck: 'A' | 'B', index: number, isShift: boolean, isRightClick: boolean) => {
    if (isRightClick) return; 
    const state = deck === 'A' ? deckA : deckB;
    const nodes = deck === 'A' ? deckANodes.current : deckBNodes.current;
    if (!nodes.buffer) return;
    const currentElapsed = state.isPlaying ? (audioCtxRef.current!.currentTime - nodes.startTime + nodes.pauseTime) : nodes.pauseTime;
    const existingCue = state.cuePoints[index];
    if (existingCue !== null && isShift) {
      const newCues = [...state.cuePoints]; newCues[index] = currentElapsed;
      if (deck === 'A') setDeckA(p => ({ ...p, cuePoints: newCues })); else setDeckB(p => ({ ...p, cuePoints: newCues }));
    } else if (existingCue !== null) { playDeck(deck, existingCue); } 
    else {
      const newCues = [...state.cuePoints]; newCues[index] = currentElapsed;
      if (deck === 'A') setDeckA(p => ({ ...p, cuePoints: newCues })); else setDeckB(p => ({ ...p, cuePoints: newCues }));
    }
  };

  const handleSync = (deckToSync: 'A' | 'B') => {
    const master = deckToSync === 'A' ? deckB : deckA;
    if (!master.track?.bpm) return;
    const target = deckToSync === 'A' ? deckA : deckB;
    if (!target.track?.bpm) return;
    const newRate = master.track.bpm / target.track.bpm;
    const nodes = deckToSync === 'A' ? deckANodes.current : deckBNodes.current;
    if (nodes.source) nodes.source.playbackRate.value = newRate;
    if (deckToSync === 'A') setDeckA(p => ({ ...p, playbackRate: newRate, isSynced: true }));
    else setDeckB(p => ({ ...p, playbackRate: newRate, isSynced: true }));
  };

  const adjustPitch = (deck: 'A' | 'B', delta: number) => {
    const state = deck === 'A' ? deckA : deckB;
    const nodes = deck === 'A' ? deckANodes.current : deckBNodes.current;
    const maxRange = state.pitchRange / 100;
    const newRate = Math.max(1 - maxRange, Math.min(1 + maxRange, state.playbackRate + delta));
    
    if (nodes.source) nodes.source.playbackRate.setTargetAtTime(newRate, audioCtxRef.current!.currentTime, 0.05);
    if (deck === 'A') setDeckA(p => ({ ...p, playbackRate: newRate }));
    else setDeckB(p => ({ ...p, playbackRate: newRate }));
  };

  const toggleLoop = (deck: 'A' | 'B') => {
    if (deck === 'A') setDeckA(p => ({ ...p, isLooping: !p.isLooping }));
    else setDeckB(p => ({ ...p, isLooping: !p.isLooping }));
  };

  const setLoopSize = (deck: 'A' | 'B', size: number) => {
    if (deck === 'A') setDeckA(p => ({ ...p, loopSize: size, isLooping: true }));
    else setDeckB(p => ({ ...p, loopSize: size, isLooping: true }));
  };

  const filteredTracks = tracks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.artist.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderDeck = (deck: 'A' | 'B') => {
    const isA = deck === 'A';
    const state = isA ? deckA : deckB;
    const waveColor = isA ? '#00d9ff' : '#ff2a2a'; 
    const activeColor = '#00ff9d'; 

    if (isMobile) {
      return <div style={{ display: 'flex', flexDirection: 'column', background: '#121212', padding: 10, gap: 10 }}>{/* Code mobile */}</div>;
    }

    // Layout type Serato
    return (
      <div style={{ display: 'flex', height: '100%', background: '#0a0a0a', flexDirection: isA ? 'row' : 'row-reverse' }}>
        
        {/* 1. GAUCHE : Pitch, Cues, Loops */}
        <div style={{ width: 90, display: 'flex', flexDirection: 'column', padding: '8px 4px', borderRight: isA ? '1px solid #111' : 'none', borderLeft: !isA ? '1px solid #111' : 'none', background: '#0d0d0d' }}>
           
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: activeColor, fontFamily: 'monospace' }}>{state.track?.bpm ? state.track.bpm.toFixed(1) : '---.-'}</div>
              <div style={{ fontSize: 9, color: '#888', fontFamily: 'monospace' }}>{((state.playbackRate - 1) * 100).toFixed(1)}%</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                 <button onClick={() => adjustPitch(deck, 0.001)} style={{ width: 20, height: 16, background: '#1a1a1a', border: '1px solid #333', color: '#aaa', borderRadius: 2, fontSize: 10, cursor: 'pointer' }}>+</button>
                 <button onClick={() => adjustPitch(deck, -0.001)} style={{ width: 20, height: 16, background: '#1a1a1a', border: '1px solid #333', color: '#aaa', borderRadius: 2, fontSize: 10, cursor: 'pointer' }}>-</button>
              </div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 8 }}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                <button key={i} onClick={(e) => handleHotCue(deck, i, e.shiftKey, false)} style={{ width: '100%', height: 24, background: state.cuePoints[i] !== null ? waveColor : '#1a1a1a', border: '1px solid #333', borderRadius: 2, color: state.cuePoints[i] !== null ? '#000' : '#555', fontWeight: 800, fontSize: 9, cursor: 'pointer' }}>{i + 1}</button>
              ))}
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, marginBottom: 6 }}>
              {[0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32].map(size => (
                <button key={size} onClick={() => setLoopSize(deck, size)} style={{ padding: '2px 0', background: state.loopSize === size && state.isLooping ? activeColor : '#1a1a1a', color: state.loopSize === size && state.isLooping ? '#000' : '#888', border: '1px solid #333', fontSize: 8, fontWeight: 800, cursor: 'pointer', borderRadius: 2 }}>
                  {size < 1 ? `1/${Math.round(1/size)}` : size}
                </button>
              ))}
           </div>
           <button onClick={() => toggleLoop(deck)} style={{ width: '100%', padding: '4px 0', background: state.isLooping ? activeColor : '#1a1a1a', color: state.isLooping ? '#000' : '#888', border: '1px solid #333', fontSize: 9, fontWeight: 800, cursor: 'pointer', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
             LOOP
           </button>

           <div style={{ flex: 1, display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <div style={{ width: 6, background: '#050505', borderRadius: 3, position: 'relative', border: '1px solid #000' }}>
                  <input type="range" min={1 - (state.pitchRange / 100)} max={1 + (state.pitchRange / 100)} step="0.001" value={state.playbackRate} onChange={(e) => { const val = parseFloat(e.target.value); if (isA) setDeckA(p => ({ ...p, playbackRate: val })); else setDeckB(p => ({ ...p, playbackRate: val })); }} style={{ WebkitAppearance: 'slider-vertical', width: '100%', height: '100%', opacity: 0, cursor: 'pointer', position: 'absolute', zIndex: 10 }} />
                  <div style={{ position: 'absolute', bottom: `calc(${((state.playbackRate - (1 - state.pitchRange/100)) / (state.pitchRange * 2 / 100)) * 100}% - 5px)`, left: '50%', transform: 'translate(-50%, 0)', width: 20, height: 10, background: '#333', borderRadius: 2, border: '1px solid #555', pointerEvents: 'none' }}>
                    <div style={{ width: '80%', height: 1, background: '#999', margin: '4px auto' }} />
                  </div>
              </div>
           </div>

        </div>

        {/* 2. CENTRE : Jog Wheel + Play/Cue */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
           <JogWheel size={140} coverUrl={state.track?.cover_url || null} isPlaying={state.isPlaying} color={waveColor} getCurrentTime={isA ? getTimeA : getTimeB} duration={state.track?.duration || 1} onScrub={(time) => handleScratch(time, deck)} onScrubEnd={() => handleSeekEnd(deck)} />
           <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => handleCueButton(deck)} style={{ width: 50, height: 28, background: '#111', border: '1px solid #222', color: '#fff', borderRadius: 4, fontWeight: 800, fontSize: 10, cursor: 'pointer' }}>Cue</button>
              <button onClick={() => state.isPlaying ? pauseDeck(deck) : playDeck(deck)} style={{ width: 60, height: 28, background: state.isPlaying ? activeColor : '#111', border: `1px solid ${state.isPlaying ? activeColor : '#222'}`, color: state.isPlaying ? '#000' : '#fff', borderRadius: 4, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{state.isPlaying ? '⏸' : '▶'}</button>
           </div>
        </div>

        {/* 3. DROITE : EQ, Volume, VU-mètre (EXACTEMENT COMME SERATO) */}
        <div style={{ width: 130, display: 'flex', padding: '8px 4px', borderLeft: isA ? '1px solid #111' : 'none', borderRight: !isA ? '1px solid #111' : 'none', alignItems: 'center', justifyContent: 'space-between' }}>
           
           {/* EQ Knobs (Gain, High, Mid, Low, Filter) */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
             <Knob label="Gain" value={state.gain} onChange={v => isA ? setDeckA(p=>({...p,gain:v})) : setDeckB(p=>({...p,gain:v}))} color="#fff" size={20} />
             <Knob label="High" value={state.eqHigh} onChange={v => isA ? setDeckA(p=>({...p,eqHigh:v})) : setDeckB(p=>({...p,eqHigh:v}))} color={waveColor} size={20} />
             <Knob label="Mid" value={state.eqMid} onChange={v => isA ? setDeckA(p=>({...p,eqMid:v})) : setDeckB(p=>({...p,eqMid:v}))} color={waveColor} size={20} />
             <Knob label="Low" value={state.eqLow} onChange={v => isA ? setDeckA(p=>({...p,eqLow:v})) : setDeckB(p=>({...p,eqLow:v}))} color={waveColor} size={20} />
             <Knob label="Filter" value={state.filter} onChange={v => isA ? setDeckA(p=>({...p,filter:v})) : setDeckB(p=>({...p,filter:v}))} color="#fff" size={20} min={0} max={50} />
           </div>

           {/* Volume Fader (Curseur argenté type Serato) */}
           <div style={{ width: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10, marginLeft: 10 }}>
              <div style={{ width: 12, height: 110, background: '#000', borderRadius: 2, border: '1px solid #222', position: 'relative', display: 'flex', justifyContent: 'center', boxShadow: 'inset 0 0 5px rgba(0,0,0,0.8)' }}>
                <div style={{ position: 'absolute', top: 6, bottom: 6, width: 2, background: '#111' }} />
                <input type="range" min="0" max="1" step="0.01" value={state.volume} onChange={(e) => isA ? setDeckA(p=>({...p,volume:parseFloat(e.target.value)})) : setDeckB(p=>({...p,volume:parseFloat(e.target.value)}))} style={{ WebkitAppearance: 'slider-vertical', width: '100%', height: '100%', opacity: 0, cursor: 'pointer', position: 'absolute', zIndex: 10 }} />
                
                {/* Curseur Fader Argenté */}
                <div style={{ position: 'absolute', bottom: `calc(${state.volume * 100}% - 15px)`, width: 24, height: 30, background: 'linear-gradient(180deg, #ccc 0%, #777 50%, #333 100%)', borderRadius: 3, border: '1px solid #444', pointerEvents: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.6)' }}>
                  <div style={{ width: '100%', height: 2, background: '#000', marginTop: 14 }} />
                </div>
              </div>
           </div>

           {/* VU-mètre */}
           <div style={{ marginLeft: 10, display: 'flex', alignItems: 'flex-end' }}>
              <StereoMeter isPlaying={state.isPlaying} />
           </div>

        </div>
      </div>
    );
  };

  return (
    <div style={{ background: '#000', height: isMobile ? 'auto' : '100vh', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: "'Open Sans', sans-serif", overflow: 'hidden' }}>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 14px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1e1e1e; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 0px; border: 2px solid #1e1e1e; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #666; }
      `}</style>

      <div style={{ height: 32, background: '#0a0a0a', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0 }}>
         <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>←</span> Retour au site
         </button>
      </div>

      {/* --- BARRE DU HAUT : INFOS PISTES --- */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: 50, flexShrink: 0, background: '#050505', borderBottom: '1px solid #222' }}>
         {/* Deck A Info */}
         <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 10px', borderRight: '1px solid #111' }}>
            <div style={{ width: 32, height: 32, background: deckA.track?.cover_url ? `url(${deckA.track.cover_url}) center/cover` : '#111', borderRadius: 2, marginRight: 10 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
               <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deckA.track?.title || 'Load Track...'}</div>
               <div style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deckA.track?.artist || '---'} • {deckA.track?.genre || '---'}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
               <div style={{ fontSize: 12, color: '#00ff9d', fontFamily: 'monospace', fontWeight: 700 }}>{deckA.track?.bpm ? deckA.track.bpm.toFixed(1) : '---'}</div>
               <div style={{ fontSize: 12, color: '#00ff9d', fontFamily: 'monospace', fontWeight: 700 }}>{deckA.track?.song_key || '--'}</div>
               <div style={{ fontSize: 12, color: '#fff', background: '#111', padding: '2px 6px', borderRadius: 2, fontFamily: 'monospace' }}><TimeDisplay getCurrentTime={getTimeA} /></div>
            </div>
         </div>
         {/* Deck B Info */}
         <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 10px', flexDirection: 'row-reverse' }}>
            <div style={{ width: 32, height: 32, background: deckB.track?.cover_url ? `url(${deckB.track.cover_url}) center/cover` : '#111', borderRadius: 2, marginLeft: 10 }} />
            <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
               <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deckB.track?.title || 'Load Track...'}</div>
               <div style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deckB.track?.artist || '---'} • {deckB.track?.genre || '---'}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexDirection: 'row-reverse' }}>
               <div style={{ fontSize: 12, color: '#ff2a2a', fontFamily: 'monospace', fontWeight: 700 }}>{deckB.track?.bpm ? deckB.track.bpm.toFixed(1) : '---'}</div>
               <div style={{ fontSize: 12, color: '#ff2a2a', fontFamily: 'monospace', fontWeight: 700 }}>{deckB.track?.song_key || '--'}</div>
               <div style={{ fontSize: 12, color: '#fff', background: '#111', padding: '2px 6px', borderRadius: 2, fontFamily: 'monospace' }}><TimeDisplay getCurrentTime={getTimeB} /></div>
            </div>
         </div>
      </div>

      {/* --- WAVEFORMS --- */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: 80, flexShrink: 0, background: '#000', borderBottom: '1px solid #222' }}>
         <div style={{ flex: 1, borderRight: '1px solid #111' }}>
            <SeratoWaveform data={waveA} duration={deckA.track?.duration || 1} getCurrentTime={getTimeA} height={80} mode="zoom" onSeek={(newTime) => handleScratch(newTime, 'A')} onSeekEnd={() => handleSeekEnd('A')} cuePoints={deckA.cuePoints} cueColor="#00d9ff" />
         </div>
         <div style={{ flex: 1 }}>
            <SeratoWaveform data={waveB} duration={deckB.track?.duration || 1} getCurrentTime={getTimeB} height={80} mode="zoom" onSeek={(newTime) => handleScratch(newTime, 'B')} onSeekEnd={() => handleSeekEnd('B')} cuePoints={deckB.cuePoints} cueColor="#ff2a2a" />
         </div>
      </div>

      {/* --- PLATINES --- */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : 280, flexShrink: 0, borderBottom: '2px solid #111' }}>
        
        {/* DECK A */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid #222' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>{renderDeck('A')}</div>
        </div>

        {/* CENTRE (Sync + Crossfader) */}
        <div style={{ width: isMobile ? '100%' : 80, background: '#0a0a0a', borderLeft: '1px solid #222', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: 10, flexShrink: 0 }}>
            <button onClick={() => handleSync('A')} style={{ width: 56, padding: '4px 0', background: deckA.isSynced ? '#00ff9d' : '#111', border: '1px solid #222', color: deckA.isSynced ? '#000' : '#888', borderRadius: 2, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>Sync A</button>
            <button onClick={() => handleSync('B')} style={{ width: 56, padding: '4px 0', background: deckB.isSynced ? '#00ff9d' : '#111', border: '1px solid #222', color: deckB.isSynced ? '#000' : '#888', borderRadius: 2, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>Sync B</button>
            
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative', minHeight: 50, width: '100%', marginTop: 10 }}>
                <div style={{ width: 60, height: 6, background: '#0a0a0a', borderRadius: 3, border: '1px solid #333', position: 'absolute', top: '50%', transform: 'translateY(-50%)', boxShadow: 'inset 0 0 5px #000' }}>
                  <input type="range" min="0" max="1" step="0.01" value={crossfader} onChange={e => setCrossfader(parseFloat(e.target.value))} style={{ width: '100%', opacity: 0, cursor: 'pointer', position: 'absolute', top: -10, left: 0, zIndex: 10, height: 30 }} />
                  
                  <div style={{ position: 'absolute', left: `calc(${crossfader * 100}% - 10px)`, width: 20, height: 16, background: 'linear-gradient(180deg, #555, #222)', border: '1px solid #777', borderRadius: 3, pointerEvents: 'none', top: -6, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    <div style={{ width: '80%', height: 1, background: '#ddd', margin: '7px auto' }} />
                  </div>
                </div>
            </div>
            <Knob value={masterVol} onChange={setMasterVol} color="#fff" size={26} min={0} max={1} />
        </div>

        {/* DECK B */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>{renderDeck('B')}</div>
        </div>

      </div>

      {/* BIBLIOTHÈQUE */}
      <div style={{ flex: 1, display: 'flex', background: '#1e1e1e', overflow: 'hidden', minHeight: 0, flexDirection: isMobile ? 'column' : 'row' }}>
        {!isMobile && (
          <div style={{ width: 180, background: '#141414', borderRight: '1px solid #333', padding: '10px 0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '8px 16px', fontSize: 11, color: '#fff', fontWeight: 700, background: '#2a2a2a', borderLeft: '2px solid #00d9ff', cursor: 'pointer' }}>Discover</div>
            <div style={{ padding: '8px 16px', fontSize: 11, color: '#888', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#222'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Genres</div>
            <div style={{ padding: '8px 16px', fontSize: 11, color: '#888', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#222'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>My Beatport</div>
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'auto' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #333', flexShrink: 0, background: '#242424' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                 <button style={{ padding: '4px 12px', background: '#fff', color: '#000', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>Electronic</button>
                 <button style={{ padding: '4px 12px', background: '#333', color: '#aaa', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>Open Format</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="text" placeholder="Start digging..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ background: '#111', border: '1px solid #444', padding: '4px 12px', borderRadius: 20, color: '#fff', fontSize: 11, outline: 'none', width: isMobile ? 150 : 250 }} />
              </div>
           </div>

           <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: isMobile ? 300 : 'auto' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#2a2a2a', borderBottom: '1px solid #444', textAlign: 'left', color: '#888', zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '6px 10px', width: 30 }}></th>
                    <th style={{ padding: '6px 10px', width: 30 }}>#</th>
                    <th style={{ padding: '6px 10px' }}>Titre</th>
                    {!isMobile && <th style={{ padding: '6px 10px' }}>Artiste</th>}
                    {!isMobile && <th style={{ padding: '6px 10px', textAlign: 'right' }}>BPM</th>}
                    {!isMobile && <th style={{ padding: '6px 10px', textAlign: 'right' }}>Key</th>}
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTracks.map((track, i) => (
                    <tr 
                      key={track.id} 
                      style={{ 
                        borderBottom: '1px solid #333', 
                        background: i % 2 === 0 ? '#1e1e1e' : '#232323',
                        transition: 'background 0.1s'
                      }} 
                      onMouseEnter={e => e.currentTarget.style.background = '#333'} 
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#1e1e1e' : '#232323'}
                    >
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        <button onClick={() => loadTrack(track, 'A')} style={{ background: 'transparent', border: 'none', color: '#00d9ff', cursor: 'pointer', fontSize: 12 }}>▶</button>
                      </td>
                      <td style={{ padding: '6px 10px', color: '#777', fontFamily: 'monospace' }}>{i + 1}</td>
                      <td style={{ padding: '6px 10px', color: '#eee', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 20, height: 20, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#333', borderRadius: 2 }} />
                          {track.title}
                        </div>
                      </td>
                      {!isMobile && <td style={{ padding: '6px 10px', color: '#aaa' }}>{track.artist}</td>}
                      {!isMobile && <td style={{ padding: '6px 10px', textAlign: 'right', color: '#fff', fontFamily: 'monospace' }}>{track.bpm}</td>}
                      {!isMobile && <td style={{ padding: '6px 10px', textAlign: 'right', color: '#00ff9d', fontFamily: 'monospace' }}>{track.song_key || '--'}</td>}
                      <td style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => loadTrack(track, 'A')} style={{ background: 'transparent', border: '1px solid #555', color: '#aaa', padding: '2px 6px', borderRadius: 2, marginRight: 4, fontSize: 9, cursor: 'pointer' }}>→ A</button>
                        <button onClick={() => loadTrack(track, 'B')} style={{ background: 'transparent', border: '1px solid #555', color: '#aaa', padding: '2px 6px', borderRadius: 2, fontSize: 9, cursor: 'pointer' }}>→ B</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
};