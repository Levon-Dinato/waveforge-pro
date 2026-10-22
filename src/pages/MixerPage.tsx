// src/pages/MixerPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// ============================================================
// TYPES
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
}

const initialDeckState: DeckState = {
  track: null, isPlaying: false, volume: 0.8, gain: 0.5,
  eqHigh: 0, eqMid: 0, eqLow: 0, playbackRate: 1,
  cuePoints: [null, null, null, null, null, null, null, null],
  initialCue: 0, isLooping: false, loopSize: 4, isSynced: false,
  filter: 50,
};

// ============================================================
// COMPOSANTS UI (KNOBS)
// ============================================================
const Knob: React.FC<{ label?: string; value: number; onChange: (v: number) => void; color: string; min?: number; max?: number; size?: number }> = ({ label, value, onChange, color, min = -12, max = 12, size = 28 }) => {
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const deltaY = startY.current - e.clientY;
      const range = max - min;
      onChange(Math.max(min, Math.min(max, startValue.current + deltaY * (range / 100))));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, onChange, min, max]);

  const rotation = -135 + (((value - min) / (max - min)) * 270);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {label && <div style={{ fontSize: 8, fontWeight: 700, color: '#888', letterSpacing: 0.5 }}>{label}</div>}
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#111', border: '1px solid #000', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)' }} />
        <div
          onMouseDown={(e) => { e.preventDefault(); setDragging(true); startY.current = e.clientY; startValue.current = value; }}
          style={{ width: size * 0.75, height: size * 0.75, borderRadius: '50%', background: 'linear-gradient(145deg, #2a2a2a, #0a0a0a)', border: '1px solid #000', cursor: 'ns-resize', position: 'relative', zIndex: 2, transform: `rotate(${rotation}deg)`, transition: dragging ? 'none' : 'transform 0.1s ease-out', boxShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          <div style={{ position: 'absolute', top: 1, left: '50%', transform: 'translateX(-50%)', width: 1, height: size * 0.25, background: color, borderRadius: 1 }} />
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
  const [tracks, setTracks] = useState<Track[]>([]);
  const [deckA, setDeckA] = useState<DeckState>(initialDeckState);
  const [deckB, setDeckB] = useState<DeckState>(initialDeckState);
  const [crossfader, setCrossfader] = useState(0.5);
  const [masterVol, setMasterVol] = useState(0.8);
  const [searchQuery, setSearchQuery] = useState('');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const deckANodes = useRef<any>({ source: null, gain: null, vol: null, eqH: null, eqM: null, eqL: null, filter: null, analyser: null, buffer: null, peaks: [], startTime: 0, pauseTime: 0 });
  const deckBNodes = useRef<any>({ source: null, gain: null, vol: null, eqH: null, eqM: null, eqL: null, filter: null, analyser: null, buffer: null, peaks: [], startTime: 0, pauseTime: 0 });
  
  const masterGainRef = useRef<GainNode | null>(null);
  const vuALedsRef = useRef<(HTMLDivElement | null)[]>([]);
  const vuBLedsRef = useRef<(HTMLDivElement | null)[]>([]);
  const vuMasterLedsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const timeTextARef = useRef<HTMLSpanElement>(null);
  const timeTextBRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<number>(0);

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

    return () => {
      if (audioCtxRef.current) audioCtxRef.current.close();
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.setTargetAtTime(masterVol, audioCtxRef.current!.currentTime, 0.05);
  }, [masterVol]);

  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;

    // DECK A
    if (deckANodes.current.gain) deckANodes.current.gain.gain.setTargetAtTime(1 - crossfader, t, 0.05);
    if (deckANodes.current.vol) deckANodes.current.vol.gain.setTargetAtTime(deckA.volume, t, 0.05);
    if (deckANodes.current.eqH) deckANodes.current.eqH.gain.setTargetAtTime(deckA.eqHigh, t, 0.05);
    if (deckANodes.current.eqM) deckANodes.current.eqM.gain.setTargetAtTime(deckA.eqMid, t, 0.05);
    if (deckANodes.current.eqL) deckANodes.current.eqL.gain.setTargetAtTime(deckA.eqLow, t, 0.05);
    if (deckANodes.current.filter) deckANodes.current.filter.frequency.setTargetAtTime(20000 * Math.pow(deckA.filter / 50, 3), t, 0.05);

    // DECK B
    if (deckBNodes.current.gain) deckBNodes.current.gain.gain.setTargetAtTime(crossfader, t, 0.05);
    if (deckBNodes.current.vol) deckBNodes.current.vol.gain.setTargetAtTime(deckB.volume, t, 0.05);
    if (deckBNodes.current.eqH) deckBNodes.current.eqH.gain.setTargetAtTime(deckB.eqHigh, t, 0.05);
    if (deckBNodes.current.eqM) deckBNodes.current.eqM.gain.setTargetAtTime(deckB.eqMid, t, 0.05);
    if (deckBNodes.current.eqL) deckBNodes.current.eqL.gain.setTargetAtTime(deckB.eqLow, t, 0.05);
    if (deckBNodes.current.filter) deckBNodes.current.filter.frequency.setTargetAtTime(20000 * Math.pow(deckB.filter / 50, 3), t, 0.05);
  }, [crossfader, deckA, deckB]);

  const drawAndUpdate = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const updateVU = (analyser: AnalyserNode | null, ledsRef: React.MutableRefObject<(HTMLDivElement | null)[]>) => {
      if (!analyser) return;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
      const level = Math.floor((avg / 255) * 12);
      ledsRef.current.forEach((led, i) => {
        if (led) led.style.opacity = i < level ? '1' : '0.1';
      });
    };

    updateVU(deckANodes.current.analyser, vuALedsRef);
    updateVU(deckBNodes.current.analyser, vuBLedsRef);
    updateVU(null, vuMasterLedsRef); // Master VU simplifié pour l'instant

    const drawDeck = (nodes: any, canvas: HTMLCanvasElement | null, timeRef: HTMLSpanElement | null, isPlaying: boolean, colorTop: string, colorBottom: string) => {
      if (!canvas || !nodes.buffer) return;
      
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      
      const c = canvas.getContext('2d');
      if (!c) return;
      
      c.save();
      c.scale(dpr, dpr);
      const width = rect.width;
      const height = rect.height;

      const elapsed = isPlaying ? (ctx.currentTime - nodes.startTime + nodes.pauseTime) : nodes.pauseTime;
      if (timeRef) timeRef.innerText = `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${Math.floor(elapsed % 60).toString().padStart(2, '0')}.${Math.floor((elapsed % 1) * 10)}`;
      
      c.clearRect(0, 0, width, height);
      c.fillStyle = '#0a0a0a'; c.fillRect(0, 0, width, height);

      const peaks = nodes.peaks;
      const stepX = width / peaks.length;
      
      // Dessin des grilles de battement (Beatgrid)
      c.strokeStyle = '#222'; c.lineWidth = 1;
      const beatSpacing = width / 100; // Approximation visuelle
      for (let i = 0; i < width; i += beatSpacing) {
        c.beginPath(); c.moveTo(i, 0); c.lineTo(i, height); c.stroke();
      }

      // Waveform double couleur (Vert en haut, Cyan en bas)
      for (let i = 0; i < peaks.length; i++) {
        const h = peaks[i] * height * 0.4; 
        
        // Haut (Vert)
        c.fillStyle = colorTop;
        c.fillRect(i * stepX, height / 2 - h, stepX + 0.5, h);
        
        // Bas (Cyan)
        c.fillStyle = colorBottom;
        c.fillRect(i * stepX, height / 2, stepX + 0.5, h);
      }
      
      // Ligne centrale
      c.fillStyle = '#444'; c.fillRect(0, height / 2, width, 1);
      
      // Playhead
      const progress = elapsed / nodes.buffer.duration;
      c.fillStyle = '#fff'; c.fillRect(progress * width, 0, 2, height);
      // Ligne de progression plus fine
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(progress * width - 1, 0, 4, height);
      
      c.restore();
    };
    
    drawDeck(deckANodes.current, canvasARef.current, timeTextARef.current, deckA.isPlaying, '#00ff9d', '#00d9ff');
    drawDeck(deckBNodes.current, canvasBRef.current, timeTextBRef.current, deckB.isPlaying, '#00ff9d', '#00d9ff');
    
    animRef.current = requestAnimationFrame(drawAndUpdate);
  }, [deckA.isPlaying, deckB.isPlaying]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawAndUpdate);
    return () => cancelAnimationFrame(animRef.current);
  }, [drawAndUpdate]);

  const loadTrack = async (track: Track, deck: 'A' | 'B') => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const res = await fetch(track.audio_url);
      const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
      const nodes = deck === 'A' ? deckANodes : deckBNodes;
      if (nodes.current.source) { try { nodes.current.source.stop(); } catch {} }

      const numPeaks = 2000; 
      const channelData = buffer.getChannelData(0);
      const step = Math.ceil(channelData.length / numPeaks);
      const peaks = [];
      for (let i = 0; i < numPeaks; i++) {
        let min = 1.0, max = -1.0;
        for (let j = 0; j < step; j++) {
          const datum = channelData[(i * step) + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
        peaks.push(max - min);
      }

      const eqL = ctx.createBiquadFilter(); eqL.type = 'lowshelf'; eqL.frequency.value = 250;
      const eqM = ctx.createBiquadFilter(); eqM.type = 'peaking'; eqM.frequency.value = 1000;
      const eqH = ctx.createBiquadFilter(); eqH.type = 'highshelf'; eqH.frequency.value = 4000;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 20000;
      const vol = ctx.createGain(); vol.gain.value = 0.8;
      const gain = ctx.createGain(); gain.gain.value = deck === 'A' ? 1 - crossfader : crossfader;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 32;

      eqL.connect(eqM); eqM.connect(eqH); eqH.connect(filter);
      filter.connect(vol);
      vol.connect(gain); gain.connect(analyser); analyser.connect(masterGainRef.current!);

      nodes.current = { source: null, eqH, eqM, eqL, filter, vol, gain, analyser, buffer, peaks, startTime: 0, pauseTime: 0 };
      
      const newState = { ...initialDeckState, track, isPlaying: false };
      if (deck === 'A') setDeckA(newState); else setDeckB(newState);
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
    if (state.isLooping) {
      const beatDur = 60 / (state.track?.bpm || 128);
      src.loop = true;
      src.loopStart = startTime !== undefined ? startTime : nodes.pauseTime;
      src.loopEnd = src.loopStart + (beatDur * state.loopSize);
    }
    const offset = startTime !== undefined ? startTime : nodes.pauseTime;
    src.start(0, offset % nodes.buffer.duration);
    nodes.source = src;
    nodes.startTime = ctx.currentTime;
    nodes.pauseTime = offset;
    if (deck === 'A') setDeckA(p => ({ ...p, isPlaying: true, initialCue: offset }));
    else setDeckB(p => ({ ...p, isPlaying: true, initialCue: offset }));
  };

  const pauseDeck = (deck: 'A' | 'B') => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const nodes = deck === 'A' ? deckANodes.current : deckBNodes.current;
    try { nodes.source?.stop(); } catch {}
    nodes.pauseTime += ctx.currentTime - nodes.startTime;
    if (deck === 'A') setDeckA(p => ({ ...p, isPlaying: false }));
    else setDeckB(p => ({ ...p, isPlaying: false }));
  };

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>, deck: 'A' | 'B') => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const nodes = deck === 'A' ? deckANodes.current : deckBNodes.current;
    const state = deck === 'A' ? deckA : deckB;
    if (!nodes.buffer) return;
    const newTime = ratio * nodes.buffer.duration;
    const wasPlaying = state.isPlaying;
    if (wasPlaying) { try { nodes.source?.stop(); } catch {} }
    nodes.pauseTime = newTime;
    if (wasPlaying) playDeck(deck, newTime);
  };

  const handleCueButton = (deck: 'A' | 'B') => {
    const state = deck === 'A' ? deckA : deckB;
    if (state.isPlaying) {
      pauseDeck(deck);
      const nodes = deck === 'A' ? deckANodes.current : deckBNodes.current;
      nodes.pauseTime = state.initialCue;
    } else {
      playDeck(deck, state.initialCue);
    }
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
    } else if (existingCue !== null) {
      playDeck(deck, existingCue);
    } else {
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

  const filteredTracks = tracks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.artist.toLowerCase().includes(searchQuery.toLowerCase()));

  // ============================================================
  // RENDU DES DECKS (Layout Beatport)
  // ============================================================
  const renderDeck = (deck: 'A' | 'B') => {
    const isA = deck === 'A';
    const state = isA ? deckA : deckB;
    const color = isA ? '#00d9ff' : '#00d9ff'; // Beatport utilise souvent le même cyan pour les deux ou vert/cyan

    return (
      <div style={{ display: 'flex', height: '100%', background: '#121212' }}>
        
        {/* COLONNE GAUCHE : CUES & BPM */}
        <div style={{ width: 90, display: 'flex', flexDirection: 'column', padding: '10px 4px', borderRight: '1px solid #000', background: '#0a0a0a' }}>
           
           <div style={{ display: 'flex', gap: 4, width: '100%', justifyContent: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>{state.track?.bpm ? state.track.bpm.toFixed(1) : '---.-'}</div>
              <div style={{ fontSize: 9, color: '#666', alignSelf: 'flex-end', marginBottom: 2 }}>{((state.playbackRate - 1) * 100).toFixed(1)}%</div>
           </div>

           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <button style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 10 }}>◀</button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                 <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={(e) => handleHotCue(deck, 0, e.shiftKey, false)} style={{ width: 22, height: 22, background: state.cuePoints[0] !== null ? color : '#1a1a1a', border: '1px solid #333', borderRadius: 2, color: state.cuePoints[0] !== null ? '#000' : '#555', fontWeight: 800, fontSize: 9, cursor: 'pointer' }}>1</button>
                    <button onClick={(e) => handleHotCue(deck, 4, e.shiftKey, false)} style={{ width: 22, height: 22, background: state.cuePoints[4] !== null ? color : '#1a1a1a', border: '1px solid #333', borderRadius: 2, color: state.cuePoints[4] !== null ? '#000' : '#555', fontWeight: 800, fontSize: 9, cursor: 'pointer' }}>5</button>
                 </div>
                 <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={(e) => handleHotCue(deck, 1, e.shiftKey, false)} style={{ width: 22, height: 22, background: state.cuePoints[1] !== null ? color : '#1a1a1a', border: '1px solid #333', borderRadius: 2, color: state.cuePoints[1] !== null ? '#000' : '#555', fontWeight: 800, fontSize: 9, cursor: 'pointer' }}>2</button>
                    <button onClick={(e) => handleHotCue(deck, 5, e.shiftKey, false)} style={{ width: 22, height: 22, background: state.cuePoints[5] !== null ? color : '#1a1a1a', border: '1px solid #333', borderRadius: 2, color: state.cuePoints[5] !== null ? '#000' : '#555', fontWeight: 800, fontSize: 9, cursor: 'pointer' }}>6</button>
                 </div>
                 <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={(e) => handleHotCue(deck, 2, e.shiftKey, false)} style={{ width: 22, height: 22, background: state.cuePoints[2] !== null ? color : '#1a1a1a', border: '1px solid #333', borderRadius: 2, color: state.cuePoints[2] !== null ? '#000' : '#555', fontWeight: 800, fontSize: 9, cursor: 'pointer' }}>3</button>
                    <button onClick={(e) => handleHotCue(deck, 6, e.shiftKey, false)} style={{ width: 22, height: 22, background: state.cuePoints[6] !== null ? color : '#1a1a1a', border: '1px solid #333', borderRadius: 2, color: state.cuePoints[6] !== null ? '#000' : '#555', fontWeight: 800, fontSize: 9, cursor: 'pointer' }}>7</button>
                 </div>
                 <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={(e) => handleHotCue(deck, 3, e.shiftKey, false)} style={{ width: 22, height: 22, background: state.cuePoints[3] !== null ? color : '#1a1a1a', border: '1px solid #333', borderRadius: 2, color: state.cuePoints[3] !== null ? '#000' : '#555', fontWeight: 800, fontSize: 9, cursor: 'pointer' }}>4</button>
                    <button onClick={(e) => handleHotCue(deck, 7, e.shiftKey, false)} style={{ width: 22, height: 22, background: state.cuePoints[7] !== null ? color : '#1a1a1a', border: '1px solid #333', borderRadius: 2, color: state.cuePoints[7] !== null ? '#000' : '#555', fontWeight: 800, fontSize: 9, cursor: 'pointer' }}>8</button>
                 </div>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 10 }}>▶</button>
           </div>
           
           <button style={{ width: '100%', padding: '4px 0', background: '#1a1a1a', border: '1px solid #333', color: '#888', borderRadius: 2, fontSize: 9, fontWeight: 800, marginTop: 'auto' }}>FX</button>
        </div>

        {/* CENTRE : JOG WHEEL & TRANSPORT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0', position: 'relative' }}>
           
           {/* Jog Wheel avec la pochette au centre */}
           <div style={{ width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, #1a1a1a 30%, #050505 80%, #000 100%)', border: '2px solid #222', boxShadow: 'inset 0 0 20px #000, 0 0 15px rgba(0,0,0,0.8)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
             <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '1px solid #333' }} />
             
             {/* Indicateur de rotation */}
             <div style={{ position: 'absolute', top: 0, width: '100%', height: '100%', animation: state.isPlaying ? 'spin 2s linear infinite' : 'none', borderRadius: '50%' }}>
               <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
               <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', width: 4, height: 10, background: color, borderRadius: 2 }} />
             </div>
             
             {/* Pochette de l'album au centre du Jog Wheel */}
             <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', border: '2px solid #000', background: '#222' }}>
                {state.track?.cover_url ? (
                  <img src={state.track.cover_url} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 16, fontWeight: 900 }}>DZ</div>
                )}
             </div>
           </div>

           {/* Boutons Loop et FX (au-dessus des boutons Play) */}
           <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              <button style={{ background: '#1a1a1a', border: '1px solid #333', color: '#888', padding: '2px 6px', borderRadius: 2, fontSize: 9 }}>↺ 4</button>
              <button style={{ background: '#1a1a1a', border: '1px solid #333', color: '#888', padding: '2px 6px', borderRadius: 2, fontSize: 9 }}>↻</button>
           </div>

           {/* Gros boutons CUE / PLAY / SYNC */}
           <div style={{ display: 'flex', gap: 4, width: '100%', justifyContent: 'center' }}>
              <button onClick={() => handleCueButton(deck)} style={{ width: 44, height: 32, background: '#1a1a1a', border: '1px solid #333', color: '#fff', borderRadius: 4, fontWeight: 800, fontSize: 10, cursor: 'pointer' }}>Cue</button>
              <button onClick={() => state.isPlaying ? pauseDeck(deck) : playDeck(deck)} style={{ width: 54, height: 32, background: state.isPlaying ? '#00d9ff' : '#1a1a1a', border: `1px solid ${state.isPlaying ? '#00d9ff' : '#333'}`, color: state.isPlaying ? '#000' : '#00d9ff', borderRadius: 4, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {state.isPlaying ? '⏸' : '▶'}
              </button>
              <button onClick={() => handleSync(deck)} style={{ width: 44, height: 32, background: state.isSynced ? '#00ff9d' : '#1a1a1a', border: '1px solid #333', color: state.isSynced ? '#000' : '#888', borderRadius: 4, fontWeight: 800, fontSize: 10, cursor: 'pointer' }}>Sync</button>
           </div>
           
           {/* Time */}
           <div style={{ position: 'absolute', bottom: 10, right: 20, fontSize: 11, color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>
              <span ref={isA ? timeTextARef : timeTextBRef}>00:00.0</span>
           </div>
        </div>

        {/* COLONNE DROITE : GAIN, EQ & FADER */}
        <div style={{ width: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', borderLeft: '1px solid #000', background: '#0a0a0a', gap: 6 }}>
           <Knob label="Gain" value={state.gain} onChange={v => isA ? setDeckA(p=>({...p,gain:v})) : setDeckB(p=>({...p,gain:v}))} color="#fff" size={24} />
           <Knob label="High" value={state.eqHigh} onChange={v => isA ? setDeckA(p=>({...p,eqHigh:v})) : setDeckB(p=>({...p,eqHigh:v}))} color={color} size={24} />
           <Knob label="Mid" value={state.eqMid} onChange={v => isA ? setDeckA(p=>({...p,eqMid:v})) : setDeckB(p=>({...p,eqMid:v}))} color={color} size={24} />
           <Knob label="Low" value={state.eqLow} onChange={v => isA ? setDeckA(p=>({...p,eqLow:v})) : setDeckB(p=>({...p,eqLow:v}))} color={color} size={24} />
           <Knob label="Filter" value={state.filter} onChange={v => isA ? setDeckA(p=>({...p,filter:v})) : setDeckB(p=>({...p,filter:v}))} color="#fff" size={24} min={0} max={50} />
           
           {/* Fader de volume vertical */}
           <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 16, height: 80, background: '#050505', borderRadius: 2, border: '1px solid #111', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: 4, bottom: 4, width: 1, background: '#222' }} />
                <input type="range" min="0" max="1" step="0.01" value={state.volume} onChange={(e) => isA ? setDeckA(p=>({...p,volume:parseFloat(e.target.value)})) : setDeckB(p=>({...p,volume:parseFloat(e.target.value)}))} style={{ WebkitAppearance: 'slider-vertical', width: '100%', height: '100%', opacity: 0, cursor: 'pointer', position: 'absolute', zIndex: 10 }} />
                <div style={{ position: 'absolute', bottom: `calc(${state.volume * 100}% - 6px)`, width: 22, height: 12, background: 'linear-gradient(180deg, #444, #111)', borderRadius: 2, border: '1px solid #000', pointerEvents: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                  <div style={{ width: '80%', height: 1, background: '#666', margin: '5px auto' }} />
                </div>
              </div>
           </div>
        </div>

      </div>
    );
  };

  return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: "'Open Sans', sans-serif", overflow: 'hidden' }}>
      
      {/* TOP SECTION : HEADER + WAVEFORM + CONTROLS */}
      <div style={{ height: 380, flexShrink: 0, display: 'flex', borderBottom: '2px solid #111' }}>
        
        {/* DECK A */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          
          {/* Header Beatport (Titre, Artiste, Label, BPM, Key) */}
          <div style={{ height: 40, background: '#0a0a0a', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', padding: '0 10px', justifyContent: 'space-between', flexShrink: 0 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <div style={{ width: 28, height: 28, background: deckA.track?.cover_url ? `url(${deckA.track.cover_url}) center/cover` : '#222', borderRadius: 2 }} />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deckA.track?.title || 'Load Track...'}</div>
                  <div style={{ fontSize: 9, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deckA.track?.artist || '---'}</div>
                </div>
             </div>
             <div style={{ display: 'flex', gap: 10, fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>
                <span style={{ color: '#fff' }}>{deckA.track?.bpm ? deckA.track.bpm.toFixed(1) : '---'}</span>
                <span style={{ color: '#00ff9d' }}>{deckA.track?.song_key || '--'}</span>
             </div>
          </div>
          
          {/* Waveform Deck A - double couleur avec beatgrid */}
          <div style={{ height: 100, background: '#050505', position: 'relative', flexShrink: 0, borderBottom: '1px solid #222', margin: '0 10px' }}>
             <canvas ref={canvasARef} onClick={(e) => handleSeek(e, 'A')} style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }} />
          </div>
          
          {/* Contrôles Deck A */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {renderDeck('A')}
          </div>
        </div>

        {/* CENTRE (BPM Master & Crossfader) */}
        <div style={{ width: 100, background: '#0a0a0a', borderLeft: '1px solid #222', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: 10, flexShrink: 0 }}>
           <div style={{ fontSize: 10, color: '#666', fontWeight: 800 }}>SYNC</div>
           <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>134.0</div>
           
           <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative', minHeight: 80, width: '100%' }}>
              <div style={{ width: 100, height: 6, background: '#000', borderRadius: 3, position: 'absolute', top: '50%', transform: 'translateY(-50%)' }}>
                 <input type="range" min="0" max="1" step="0.01" value={crossfader} onChange={e => setCrossfader(parseFloat(e.target.value))} style={{ width: '100%', opacity: 0, cursor: 'pointer', position: 'absolute', top: -5, left: 0, zIndex: 10 }} />
                 <div style={{ position: 'absolute', left: `calc(${crossfader * 100}% - 10px)`, width: 20, height: 16, background: '#333', border: '1px solid #000', borderRadius: 2, pointerEvents: 'none', top: -5 }} />
              </div>
           </div>
           
           <Knob value={masterVol} onChange={setMasterVol} color="#fff" size={30} min={0} max={1} />
        </div>

        {/* DECK B */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ height: 40, background: '#0a0a0a', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', padding: '0 10px', justifyContent: 'space-between', flexShrink: 0 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <div style={{ width: 28, height: 28, background: deckB.track?.cover_url ? `url(${deckB.track.cover_url}) center/cover` : '#222', borderRadius: 2 }} />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deckB.track?.title || 'Load Track...'}</div>
                  <div style={{ fontSize: 9, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deckB.track?.artist || '---'}</div>
                </div>
             </div>
             <div style={{ display: 'flex', gap: 10, fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>
                <span style={{ color: '#fff' }}>{deckB.track?.bpm ? deckB.track.bpm.toFixed(1) : '---'}</span>
                <span style={{ color: '#00ff9d' }}>{deckB.track?.song_key || '--'}</span>
             </div>
          </div>
          
          <div style={{ height: 100, background: '#050505', position: 'relative', flexShrink: 0, borderBottom: '1px solid #222', margin: '0 10px' }}>
             <canvas ref={canvasBRef} onClick={(e) => handleSeek(e, 'B')} style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }} />
          </div>
          
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {renderDeck('B')}
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION (Library) - Identique à précédemment */}
      <div style={{ flex: 1, display: 'flex', background: '#050505', overflow: 'hidden' }}>
        <div style={{ width: 180, background: '#0a0a0a', borderRight: '1px solid #222', padding: '10px 0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
           <div style={{ padding: '8px 16px', fontSize: 11, color: '#fff', fontWeight: 700, background: '#111', borderLeft: '2px solid #00d9ff', cursor: 'pointer' }}>Discover</div>
           <div style={{ padding: '8px 16px', fontSize: 11, color: '#555', cursor: 'pointer' }}>Genres</div>
           <div style={{ padding: '8px 16px', fontSize: 11, color: '#555', cursor: 'pointer' }}>My Beatport</div>
           <div style={{ padding: '8px 16px', fontSize: 11, color: '#555', cursor: 'pointer' }}>Collection</div>
           <div style={{ padding: '8px 16px', fontSize: 11, color: '#555', cursor: 'pointer' }}>Cart</div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #222', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                 <button style={{ padding: '6px 16px', background: '#fff', color: '#000', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>Electronic</button>
                 <button style={{ padding: '6px 16px', background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Open Format</button>
              </div>
              <input type="text" placeholder="Search tracks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ background: '#111', border: '1px solid #222', padding: '6px 12px', borderRadius: 20, color: '#fff', fontSize: 11, outline: 'none', width: 250 }} />
           </div>

           <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#050505', borderBottom: '1px solid #222', textAlign: 'left', color: '#444', zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '8px 10px', width: 30 }}></th>
                    <th style={{ padding: '8px 10px', width: 40 }}>#</th>
                    <th style={{ padding: '8px 10px' }}>Titre</th>
                    <th style={{ padding: '8px 10px' }}>Artiste</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>BPM</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Key</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTracks.map((track, i) => (
                    <tr key={track.id} style={{ borderBottom: '1px solid #111' }} onMouseEnter={e => e.currentTarget.style.background = '#111'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <button onClick={() => playDeck('A')} style={{ background: 'transparent', border: 'none', color: '#00d9ff', cursor: 'pointer' }}>▶</button>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#555', fontFamily: 'monospace' }}>{i + 1}</td>
                      <td style={{ padding: '8px 10px', color: '#eee', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', borderRadius: 2 }} />
                          {track.title}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#888' }}>{track.artist}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontFamily: 'monospace' }}>{track.bpm}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#00ff9d', fontFamily: 'monospace' }}>{track.song_key || '--'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <button onClick={() => loadTrack(track, 'A')} style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '2px 6px', borderRadius: 2, marginRight: 4, fontSize: 9, cursor: 'pointer' }}>→ A</button>
                        <button onClick={() => loadTrack(track, 'B')} style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '2px 6px', borderRadius: 2, fontSize: 9, cursor: 'pointer' }}>→ B</button>
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