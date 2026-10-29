// src/pages/Edge Function.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface LibraryTrack {
  id: string;
  coverUrl: string | null;
  artist: string;
  title: string;
  key: string;
  bpm: number;
  energy: number;
  genre: string;
  rating: number;
  audio_url: string;
  cuePoints?: any[];
  duration?: number;
  waveform?: number[];
}

const MUSIC_GENRES = [
  'Afro House', 'Bass House / UK Garage', 'Big Room / Mainstage', 'Dance', 
  'Deep House', 'Disco / Nu Disco', 'Drum & Bass', 'Dubstep', 
  'Electro House', 'Funky House', 'Hardcore', 'House', 
  'Indie Dance', 'Latin / Afro House', 'Techno', 'Trance', 'Autre'
];

const HARMONIC_MAP: Record<string, string[]> = {
  '1A': ['1A', '2A', '12A', '1B'], '2A': ['2A', '3A', '1A', '2B'], '3A': ['3A', '4A', '2A', '3B'],
  '4A': ['4A', '5A', '3A', '4B'], '5A': ['5A', '6A', '4A', '5B'], '6A': ['6A', '7A', '5A', '6B'],
  '7A': ['7A', '8A', '6A', '7B'], '8A': ['8A', '9A', '7A', '8B'], '9A': ['9A', '10A', '8A', '9B'],
  '10A': ['10A', '11A', '9A', '10B'], '11A': ['11A', '12A', '10A', '11B'], '12A': ['12A', '1A', '11A', '12B'],
  '1B': ['1B', '2B', '12B', '1A'], '2B': ['2B', '3B', '1B', '2A'], '3B': ['3B', '4B', '2B', '3A'],
  '4B': ['4B', '5B', '3B', '4A'], '5B': ['5B', '6B', '4B', '5A'], '6B': ['6B', '7B', '5B', '6A'],
  '7B': ['7B', '8B', '6B', '7A'], '8B': ['8B', '9B', '7B', '8A'], '9B': ['9B', '10B', '8B', '9A'],
  '10B': ['10B', '11B', '9B', '10A'], '11B': ['11B', '12B', '10B', '11A'], '12B': ['12B', '1B', '11B', '12A'],
};

export const CDJPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTrack, setActiveTrack] = useState<LibraryTrack | null>(null);
  const [library, setLibrary] = useState<LibraryTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [activeKeyFilter, setActiveKeyFilter] = useState<string | null>(null);
  const [activeGenreFilter, setActiveGenreFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const analyzedTracks = useRef<Set<string>>(new Set());

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const fetchLibrary = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('tracks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) {
        const formatted = data.map((t: any) => ({
          id: t.id, coverUrl: t.cover_url || null, artist: t.artist || 'Artiste Inconnu',
          title: t.title, key: t.key || t.song_key || '--', bpm: t.bpm || 0,
          energy: t.energy || 5, genre: t.genre || 'Inconnu', rating: t.likes_count || 0,
          audio_url: t.audio_url
        }));
        setLibrary(formatted);
        if (formatted.length > 0) setActiveTrack(formatted[0]);
      }
      setLoading(false);
    };
    fetchLibrary();
  }, [user]);

  const detectSmartCuePoints = (peaks: number[], duration: number, bpm: number) => {
    const cuePoints = [];
    const colors = ['#00d9ff', '#a08aff', '#f59e0b', '#ef4444', '#10b981', '#f43f5e', '#8b5cf6', '#eab308'];
    
    if (!bpm || bpm < 60) {
      return Array.from({ length: 8 }, (_, i) => ({
        id: i + 1, time: (i / 8) * duration,
        label: i === 0 ? 'Intro' : (i === 7 ? 'Outro' : `Cue ${i + 1}`),
        color: colors[i], energy: 5
      }));
    }

    const beatDuration = 60 / bpm;
    const totalBeats = Math.floor(duration / beatDuration);
    
    const energyPerBeat: { time: number, energy: number }[] = [];
    for (let i = 0; i < totalBeats; i++) {
      const time = i * beatDuration;
      const waveIndex = Math.floor((time / duration) * peaks.length);
      const energy = peaks[waveIndex] || 0;
      energyPerBeat.push({ time, energy });
    }

    const sortedByEnergy = [...energyPerBeat].sort((a, b) => b.energy - a.energy);
    const selectedPoints: number[] = [0];
    
    for (const beat of sortedByEnergy) {
      if (selectedPoints.length >= 8) break;
      if (selectedPoints.every(p => Math.abs(p - beat.time) > 15)) {
        selectedPoints.push(beat.time);
      }
    }

    while (selectedPoints.length < 8) {
      selectedPoints.push((selectedPoints.length / 8) * duration);
    }

    return selectedPoints.sort((a, b) => a - b).map((time, i) => ({
      id: i + 1, time,
      label: time === 0 ? 'Intro' : (i === 7 ? 'Outro' : `Cue ${i + 1}`),
      color: colors[i], energy: 5
    }));
  };

  const analyzeTrack = async (track: LibraryTrack) => {
    if (!track.audio_url) return;
    setAnalyzingId(track.id);
    setActiveTrack(track);

    try {
      const response = await fetch(track.audio_url);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = buffer.getChannelData(0);
      const numBars = 200;
      const blockSize = Math.floor(channelData.length / numBars);
      const peaks = [];
      for (let i = 0; i < numBars; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) sum += Math.abs(channelData[i * blockSize + j]);
        peaks.push(sum / blockSize);
      }
      const maxPeak = Math.max(...peaks) || 1;
      const waveform = peaks.map(v => v / maxPeak);
      const duration = buffer.duration;

      const { data, error } = await supabase.functions.invoke('analyze-audio', {
        body: { audioUrl: track.audio_url }
      });

      if (error) throw error;
      if (!data || !data.bpm) throw new Error("Réponse invalide de la fonction");

      const smartCuePoints = detectSmartCuePoints(waveform, duration, data.bpm);

      setLibrary(prev => prev.map(t => t.id === track.id ? { 
        ...t, key: data.key, bpm: data.bpm, cuePoints: smartCuePoints, duration: duration, waveform: waveform
      } : t));
      
      setActiveTrack(prev => prev ? { 
        ...prev, key: data.key, bpm: data.bpm, cuePoints: smartCuePoints, duration: duration, waveform: waveform
      } : null);

    } catch (err: any) {
      console.error("Erreur d'analyse :", err);
      alert("L'analyse a échoué : " + (err.message || "Vérifiez la console"));
    } finally {
      setAnalyzingId(null);
    }
  };

  useEffect(() => {
    if (activeTrack && (!activeTrack.waveform || activeTrack.key === '--') && !analyzingId) {
      if (!analyzedTracks.current.has(activeTrack.id)) {
        analyzedTracks.current.add(activeTrack.id);
        analyzeTrack(activeTrack);
      }
    }
  }, [activeTrack, analyzingId]);

  const togglePlay = () => {
    if (!activeTrack) return;
    if (!audioRef.current || audioRef.current.src !== activeTrack.audio_url) {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(activeTrack.audio_url);
      audioRef.current.addEventListener('timeupdate', () => setCurrentTime(audioRef.current!.currentTime));
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const jumpToCue = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const exportCuePoints = () => {
    if (!activeTrack || !activeTrack.cuePoints) return;
    
    let content = `====================================================\n`;
    content += `FICHE DE PRÉPARATION - DROPZONE DJ\n`;
    content += `====================================================\n\n`;
    content += `Titre    : ${activeTrack.title}\n`;
    content += `Artiste  : ${activeTrack.artist}\n`;
    content += `Genre    : ${activeTrack.genre}\n`;
    content += `BPM      : ${activeTrack.bpm}\n`;
    content += `Tonalité : ${activeTrack.key}\n`;
    content += `Durée    : ${formatDuration(activeTrack.duration || 0)}\n\n`;
    content += `----------------------------------------------------\n`;
    content += `EMPLACEMENT DES CUE POINTS\n`;
    content += `----------------------------------------------------\n\n`;

    activeTrack.cuePoints.forEach((cue: any) => {
      content += `Cue ${cue.id} (${cue.label})\n`;
      content += `  Temps exact : ${formatDuration(cue.time)}\n`;
      content += `  Millisecondes : ${Math.floor(cue.time * 1000)} ms\n\n`;
    });

    content += `----------------------------------------------------\n`;
    content += `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}\n`;
    content += `Outil : DJ PREP - DropZone Premium\n`;
    content += `====================================================\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTrack.artist} - ${activeTrack.title} - Fiche CuePoints.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderCamelotWheel = () => {
    const keys = ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A', '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B'];
    const availableKeys = new Set(library.map(t => t.key));
    return (
      <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto 32px auto' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 30px rgba(0,0,0,1), 0 10px 20px rgba(0,0,0,0.8)' }}>
          {keys.map((key, i) => {
            const angle = (i / keys.length) * 360;
            const isAvailable = availableKeys.has(key);
            const isActive = activeKeyFilter === key;
            return (
              <div key={key} onClick={() => setActiveKeyFilter(isActive ? null : key)} style={{ position: 'absolute', width: 22, height: 22, top: '50%', left: '50%', marginTop: -11, marginLeft: -11, transform: `rotate(${angle}deg) translateY(-70px) rotate(-${angle}deg)`, background: isActive ? '#00d9ff' : (isAvailable ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)'), border: `1px solid ${isActive ? '#00d9ff' : (isAvailable ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)')}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, color: isActive ? '#000' : (isAvailable ? '#fff' : '#333'), cursor: isAvailable ? 'pointer' : 'default', transition: 'all 0.2s', zIndex: 10, boxShadow: isActive ? '0 0 20px rgba(0, 217, 255, 0.8)' : 'none' }}>
                {key}
              </div>
            );
          })}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(145deg, rgba(20,20,20,0.8), rgba(0,0,0,0.9))', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(0, 217, 255, 0.2), inset 0 0 20px rgba(0,0,0,0.8)' }}>
              <div style={{ width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '14px solid #00d9ff', marginLeft: 6, filter: 'drop-shadow(0 0 5px #00d9ff)' }} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const compatibleKeys = activeTrack && HARMONIC_MAP[activeTrack.key] ? HARMONIC_MAP[activeTrack.key] : [];
  
  const filteredLibrary = library.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKey = !activeKeyFilter || t.key === activeKeyFilter;
    const matchesGenre = !activeGenreFilter || t.genre === activeGenreFilter;
    return matchesSearch && matchesKey && matchesGenre;
  });

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#020205', color: '#00d9ff', fontFamily: 'Inter, sans-serif' }}>Initialisation du système...</div>;

  return (
    <div 
      onMouseMove={handleMouseMove}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#020205', color: '#fff', fontFamily: 'Inter, sans-serif', overflow: 'hidden', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(0, 217, 255, 0.05) 0%, transparent 70%)', transform: 'translate(-50%, -50%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(160, 138, 255, 0.05) 0%, transparent 70%)', transform: 'translate(50%, 50%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', top: mousePos.y, left: mousePos.x, width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)', transform: 'translate(-50%, -50%)', filter: 'blur(40px)', transition: 'top 0.1s ease-out, left 0.1s ease-out' }} />
      </div>

      <style>{`
        .glass-panel { background: rgba(10, 10, 15, 0.4); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .nav-link-premium { position: relative; color: #888; text-decoration: none; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 700; transition: color 0.3s ease; cursor: pointer; background: transparent; border: none; padding: 0; }
        .nav-link-premium::after { content: ''; position: absolute; width: 0; height: 2px; bottom: -4px; left: 0; background-color: #00d9ff; transition: width 0.3s ease; box-shadow: 0 0 10px #00d9ff; }
        .nav-link-premium:hover { color: #fff; }
        .nav-link-premium:hover::after { width: calc(100% - 26px); }
        .sidebar-item { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-radius: 8px; cursor: pointer; color: #888; font-weight: 600; transition: all 0.2s; overflow: hidden; margin-bottom: 2px; }
        .sidebar-item:hover { background: rgba(255,255,255,0.03); color: #fff; transform: translateX(4px); }
        .sidebar-item::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: 0; width: 3px; background: #00d9ff; border-radius: 0 4px 4px 0; transition: height 0.2s ease; box-shadow: 0 0 10px #00d9ff; }
        .sidebar-item:hover::before { height: 60%; }
        .sidebar-item.active { background: rgba(0, 217, 255, 0.08); color: #fff; border: 1px solid rgba(0, 217, 255, 0.2); box-shadow: 0 4px 15px rgba(0, 217, 255, 0.05); }
        .sidebar-item.active::before { height: 60%; background: #00d9ff; box-shadow: 0 0 10px #00d9ff; }
        .sidebar-item.active .sidebar-count { color: #00d9ff; background: rgba(0,217,255,0.1); }
        .holo-card { background: rgba(10, 10, 15, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); position: relative; overflow: hidden; }
        .holo-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0, 217, 255, 0.5), transparent); opacity: 0; transition: opacity 0.3s; }
        .holo-card:hover { background: rgba(15, 15, 20, 0.6); border-color: rgba(0, 217, 255, 0.3); box-shadow: 0 10px 30px -10px rgba(0, 217, 255, 0.2), inset 0 0 20px rgba(0, 217, 255, 0.05); transform: translateY(-2px); }
        .holo-card:hover::before { opacity: 1; }
        .holo-card.active { background: rgba(0, 217, 255, 0.05); border-color: rgba(0, 217, 255, 0.5); box-shadow: 0 0 25px rgba(0, 217, 255, 0.2), inset 0 0 15px rgba(0, 217, 255, 0.1); }
        .cue-pad { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; height: 44px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1rem; cursor: pointer; transition: all 0.1s; position: relative; overflow: hidden; color: #555; }
        .cue-pad:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: #aaa; }
        .cue-pad:active { transform: scale(0.96); }
        .cue-pad.active { background: rgba(0, 217, 255, 0.05); border-color: rgba(0, 217, 255, 0.3); color: #fff; box-shadow: inset 0 0 15px rgba(0, 217, 255, 0.1); }
        .cue-pad .pad-color-indicator { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; opacity: 0.7; box-shadow: 0 0 10px currentColor; }
      `}</style>

      {/* TOP BAR */}
      <div className="glass-panel" style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 32px', flexShrink: 0, justifyContent: 'space-between', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <button onClick={() => navigate('/')} className="nav-link-premium">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Retour au site
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#00d9ff' }}>🎧</span> DJ PREP <span style={{ fontSize: '0.65rem', background: 'rgba(0, 217, 255, 0.1)', color: '#00d9ff', padding: '4px 8px', borderRadius: 4, fontWeight: 800, border: '1px solid rgba(0, 217, 255, 0.3)', boxShadow: '0 0 15px rgba(0,217,255,0.2)' }}>PREMIUM ENGINE</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={exportCuePoints} style={{ background: 'rgba(0, 217, 255, 0.1)', border: '1px solid #00d9ff', color: '#00d9ff', padding: '8px 16px', borderRadius: 8, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#00d9ff'; e.currentTarget.style.color = '#000'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)'; e.currentTarget.style.color = '#00d9ff'; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Fiche Cue Points
          </button>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 12, top: 10, color: '#666' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: 300, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 16px 10px 40px', borderRadius: 8, fontSize: '0.85rem', outline: 'none', transition: 'all 0.2s' }} onFocus={(e) => { e.currentTarget.style.borderColor = '#00d9ff'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,217,255,0.2)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* SIDEBAR */}
        <div style={{ width: 260, background: 'rgba(5, 5, 10, 0.6)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '24px 16px', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: 24, color: '#555', textTransform: 'uppercase', letterSpacing: '2px', paddingLeft: 16 }}>Harmonic Filter</h2>
          {renderCamelotWheel()}
          {activeKeyFilter && (
             <button onClick={() => setActiveKeyFilter(null)} style={{ background: 'transparent', border: '1px solid #333', color: '#00d9ff', padding: '6px', borderRadius: 6, fontSize: '0.75rem', margin: '0 16px 16px 16px', cursor: 'pointer', boxShadow: '0 0 10px rgba(0,217,255,0.1)' }}>Effacer ({activeKeyFilter})</button>
          )}
          <h2 style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '2px', paddingLeft: 16, marginTop: 8 }}>Genres</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div onClick={() => setActiveGenreFilter(null)} className={`sidebar-item ${!activeGenreFilter ? 'active' : ''}`}><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> Tous les sons</span></div>
            {MUSIC_GENRES.map((genre) => {
              const isActive = activeGenreFilter === genre;
              return (
                <div key={genre} onClick={() => setActiveGenreFilter(isActive ? null : genre)} className={`sidebar-item ${isActive ? 'active' : ''}`}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path></svg> {genre}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '24px 32px', flexShrink: 0, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: 300, flexShrink: 0 }}>
                <div onClick={togglePlay} style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(0, 217, 255, 0.1)', border: '1px solid #00d9ff', color: '#00d9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 0 20px rgba(0, 217, 255, 0.2)', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#00d9ff'; e.currentTarget.style.color = '#000'; e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 217, 255, 0.6)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)'; e.currentTarget.style.color = '#00d9ff'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 217, 255, 0.2)'; }}>
                  {isPlaying ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft: 3}}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>{activeTrack?.title || 'Sélectionnez un morceau'}</h1>
                  <div style={{ fontSize: '0.8rem', color: '#00d9ff', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{activeTrack?.artist}</div>
                </div>
              </div>

              <div style={{ flex: 1, height: 64, background: 'rgba(0,0,0,0.6)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 1, boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)' }}>
                {!activeTrack?.waveform && analyzingId === activeTrack?.id && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 20 }}>
                    <span style={{ color: '#00d9ff', fontSize: '0.75rem', fontWeight: 900, animation: 'pulse 1.5s infinite', letterSpacing: '1px' }}>ANALYSE PREMIUM...</span>
                  </div>
                )}
                {activeTrack?.waveform ? activeTrack.waveform.map((val, i) => {
                  const isPlayed = (i / 200) * (activeTrack.duration || 1) <= currentTime;
                  return (
                    <div key={i} style={{ flex: 1, height: `${Math.max(val * 100, 2)}%`, background: isPlayed ? '#00d9ff' : 'rgba(255, 255, 255, 0.1)', borderRadius: 1, transition: 'background 0.1s', boxShadow: isPlayed ? '0 0 10px rgba(0, 217, 255, 0.8)' : 'none' }} />
                  );
                }) : (
                  Array.from({ length: 200 }).map((_, i) => (<div key={i} style={{ flex: 1, height: '10%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }} />))
                )}
                <div style={{ position: 'absolute', left: `calc(12px + ${(currentTime / (activeTrack?.duration || 1)) * 100}% - ${(currentTime / (activeTrack?.duration || 1)) * 24}px)`, top: 0, bottom: 0, width: 2, background: '#fff', boxShadow: '0 0 15px #fff', zIndex: 15 }} />
                {activeTrack?.cuePoints?.map((cue, i) => (
                  <div key={i} onClick={(e) => { e.stopPropagation(); jumpToCue(cue.time); }} style={{ position: 'absolute', left: `calc(12px + ${(cue.time / (activeTrack.duration || 1)) * 100}% - ${(cue.time / (activeTrack.duration || 1)) * 24}px)`, top: 0, bottom: 0, width: 8, transform: 'translateX(-4px)', cursor: 'pointer', zIndex: 20 }}>
                    <div style={{ width: 2, height: '100%', background: cue.color, boxShadow: `0 0 8px ${cue.color}` }} />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <div style={{ fontSize: '0.85rem', color: '#888', fontFamily: 'monospace', fontWeight: 700, background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#00d9ff' }}>{formatDuration(currentTime)}</span> <span style={{ color: '#555' }}>/</span> {formatDuration(activeTrack?.duration || 0)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ background: 'rgba(244, 114, 182, 0.15)', color: '#f472b6', border: '1px solid rgba(244, 114, 182, 0.3)', padding: '6px 14px', borderRadius: 6, fontWeight: 900, fontSize: '0.8rem', boxShadow: '0 0 15px rgba(244,114,182,0.1)' }}>{activeTrack?.key}</div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: 6, fontWeight: 900, fontSize: '0.8rem' }}>{activeTrack?.bpm || '--'} BPM</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => {
                const cue = activeTrack?.cuePoints?.find((c: any) => c.id === id);
                return (
                  <div key={id} onClick={() => cue && jumpToCue(cue.time)} className={`cue-pad ${cue ? 'active' : ''}`}>
                    {id}
                    {cue && <div className="pad-color-indicator" style={{ background: cue.color, color: cue.color }} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 10 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#fff', letterSpacing: '-0.5px' }}>Ma Bibliothèque <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 500, marginLeft: 8 }}>({filteredLibrary.length})</span></h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filteredLibrary.map((track) => {
                const isCompatible = activeTrack && track.id !== activeTrack.id && compatibleKeys.includes(track.key);
                const isActive = activeTrack?.id === track.id;
                return (
                  <div key={track.id} onClick={() => setActiveTrack(track)} className={`holo-card ${isActive ? 'active' : ''}`} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer', border: isCompatible ? '1px solid rgba(16, 185, 129, 0.4)' : undefined }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, background: '#111', borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
                        {track.coverUrl ? <img src={track.coverUrl} alt="c" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>🎵</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: isActive ? '#00d9ff' : '#fff', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                        <div style={{ color: '#888', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ background: 'rgba(0, 217, 255, 0.1)', color: '#00d9ff', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 800 }}>{track.key}</div>
                        <div style={{ color: '#888', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center' }}>{track.bpm} BPM</div>
                      </div>
                      {analyzingId === track.id ? (
                        <span style={{ color: '#00d9ff', fontSize: '0.7rem', fontWeight: 800, animation: 'pulse 1.5s infinite' }}>Analyse...</span>
                      ) : track.cuePoints ? (
                        <div style={{ display: 'flex', gap: 3 }}>
                          {track.cuePoints.map((cue, i) => (
                            <div key={i} onClick={(e) => { e.stopPropagation(); jumpToCue(cue.time); }} style={{ width: 6, height: 6, borderRadius: '50%', background: cue.color, boxShadow: `0 0 5px ${cue.color}`, cursor: 'pointer' }} />
                          ))}
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); analyzeTrack(track); }} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00d9ff'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>Analyser</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }`}</style>
    </div>
  );
};