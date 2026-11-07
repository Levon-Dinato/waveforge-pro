// src/pages/CDJPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Waveform } from '../components/Waveform';

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

const getBucketAndPath = (url: string) => {
  if (!url.includes('supabase.co')) return { bucket: 'audio', path: url };
  const publicPart = url.split('/storage/v1/object/public/');
  if (publicPart.length === 2) {
    const pathParts = publicPart[1].split('/');
    return { bucket: pathParts[0], path: pathParts.slice(1).join('/') };
  }
  const signPart = url.split('/storage/v1/object/sign/');
  if (signPart.length === 2) {
    const pathParts = signPart[1].split('/');
    return { bucket: pathParts[0], path: pathParts.slice(1).join('/').split('?')[0] };
  }
  return { bucket: 'audio', path: url };
};

export const CDJPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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

  // ✅ NOUVEAUX STATES POUR LE GLISSEMENT (SCRUBBING) ET LES CUE POINTS
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [wasPlayingBeforeScrub, setWasPlayingBeforeScrub] = useState(false);
  const [draggingCueId, setDraggingCueId] = useState<number | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);

  const analyzedTracks = useRef<Set<string>>(new Set());
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMoveGlobal = (e: React.MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });

  const colors = {
    bg: isDark ? '#050508' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    textDark: isDark ? '#444444' : '#999999',
    border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)',
    borderLight: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)',
    glassBg: isDark ? 'rgba(15, 15, 20, 0.7)' : 'rgba(255, 255, 255, 0.8)',
    sidebarBg: isDark ? 'rgba(10, 10, 15, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    cardBg: isDark ? 'rgba(20, 20, 25, 0.6)' : 'rgba(255, 255, 255, 0.8)',
    cardHover: isDark ? 'rgba(30, 30, 35, 0.8)' : 'rgba(245, 245, 247, 1)',
    inputBg: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.05)',
    waveformBg: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.05)',
    cuePadBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    cuePadHover: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    cuePadText: isDark ? '#555555' : '#999999',
    wheelBg: isDark ? 'rgba(10,10,10,0.6)' : 'rgba(0,0,0,0.05)',
    wheelBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    wheelCenterBg: isDark ? 'linear-gradient(145deg, rgba(20,20,20,0.9), rgba(0,0,0,1))' : 'linear-gradient(145deg, #ffffff, #e0e0e0)',
    trackBg: isDark ? '#111111' : '#e5e7eb',
    analyzeBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    analyzeBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    btnSecondaryBg: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
  };

  useEffect(() => {
    const fetchLibrary = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('tracks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) {
        const formatted = data.map((t: any) => {
          const cacheKey = `track_analysis_${t.id}`;
          const cachedData = localStorage.getItem(cacheKey);
          const cache = cachedData ? JSON.parse(cachedData) : null;

          return {
            id: t.id, 
            coverUrl: t.cover_url || null, 
            artist: t.artist || 'Artiste Inconnu',
            title: t.title, 
            key: t.key || t.song_key || '--', 
            bpm: cache?.bpm || t.bpm || 0, 
            energy: t.energy || 5, 
            genre: t.genre || 'Inconnu', 
            rating: t.likes_count || 0,
            audio_url: t.audio_url,
            waveform: cache?.waveform || undefined,
            cuePoints: cache?.cuePoints || undefined,
            duration: cache?.duration || undefined,
          };
        });
        setLibrary(formatted);
        if (formatted.length > 0) setActiveTrack(formatted[0]);
      }
      setLoading(false);
    };
    fetchLibrary();
  }, [user]);

  const detectSmartCuePoints = (peaks: number[], duration: number, bpm: number) => {
    const colors = ['#00d9ff', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#f43f5e', '#8b5cf6', '#eab308'];

    if (!bpm || bpm < 60) {
      return Array.from({ length: 8 }, (_, i) => ({
        id: i + 1, time: (i / 8) * duration,
        label: i === 0 ? 'Intro' : (i === 7 ? 'Outro' : `Cue ${i + 1}`),
        color: colors[i], energy: 5
      }));
    }

    const beatDuration = 60 / bpm;
    const barDuration = beatDuration * 4; 
    const phraseDuration = barDuration * 8; 
    const totalPhrases = Math.floor(duration / phraseDuration);

    const phraseEnergies = [];
    for (let i = 0; i < totalPhrases; i++) {
      const startTime = i * phraseDuration;
      const endTime = (i + 1) * phraseDuration;
      const startIndex = Math.floor((startTime / duration) * peaks.length);
      const endIndex = Math.floor((endTime / duration) * peaks.length);

      let sum = 0;
      for (let j = startIndex; j < endIndex; j++) sum += peaks[j];
      phraseEnergies.push(sum / (endIndex - startIndex || 1));
    }

    let drop1Phrase = 0, maxJump = 0;
    let breakdownPhrase = 0, maxDrop = 0;
    let drop2Phrase = 0, maxJump2 = 0;

    for (let i = 1; i < phraseEnergies.length; i++) {
      const jump = phraseEnergies[i] - phraseEnergies[i - 1];
      if (jump > maxJump) { maxJump = jump; drop1Phrase = i; }
    }

    for (let i = drop1Phrase + 1; i < phraseEnergies.length; i++) {
      const drop = phraseEnergies[i - 1] - phraseEnergies[i];
      if (drop > maxDrop) { maxDrop = drop; breakdownPhrase = i; }
    }

    if (breakdownPhrase > 0) {
      for (let i = breakdownPhrase + 1; i < phraseEnergies.length; i++) {
        const jump = phraseEnergies[i] - phraseEnergies[i - 1];
        if (jump > maxJump2) { maxJump2 = jump; drop2Phrase = i; }
      }
    }

    const snapToBar = (time: number) => Math.round(time / barDuration) * barDuration;

    const drop1Time = snapToBar(drop1Phrase * phraseDuration);
    const breakdownTime = snapToBar(breakdownPhrase * phraseDuration);
    const drop2Time = snapToBar(drop2Phrase * phraseDuration);
    const safeDrop2 = drop2Time > drop1Time + phraseDuration ? drop2Time : drop1Time + phraseDuration * 2;

    const rawPoints = [
      { time: 0, label: 'Intro', energy: 3 },
      { time: snapToBar(16 * barDuration), label: 'Mix-In', energy: 5 }, 
      { time: snapToBar(drop1Time - phraseDuration), label: 'Build', energy: 7 }, 
      { time: drop1Time, label: 'Drop 1', energy: 10 },
      { time: breakdownTime, label: 'Breakdown', energy: 2 },
      { time: safeDrop2, label: 'Drop 2', energy: 9 },
      { time: snapToBar(duration - (16 * barDuration)), label: 'Mix-Out', energy: 4 },
      { time: snapToBar(duration - (4 * barDuration)), label: 'Outro', energy: 1 }
    ];

    return rawPoints.map((p, i) => ({
      ...p,
      time: Math.max(0, Math.min(p.time, duration - 1)),
      id: i + 1,
      color: colors[i]
    }));
  };

  const analyzeTrack = async (track: LibraryTrack) => {
    if (!track.audio_url) return;
    setAnalyzingId(track.id);
    setActiveTrack(track);

    try {
      const { bucket, path } = getBucketAndPath(track.audio_url);
      const { data: signedData, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
      if (signedError || !signedData) throw new Error("Erreur URL signée");

      const secureAudioUrl = signedData.signedUrl;
      const response = await fetch(secureAudioUrl);
      if (!response.ok) throw new Error("Erreur téléchargement audio");
      
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = buffer.getChannelData(0);
      const numBars = 1000; 
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

      setLibrary(prev => prev.map(t => t.id === track.id ? { ...t, duration, waveform } : t));
      setActiveTrack(prev => prev ? { ...prev, duration, waveform } : null);

      let bpm = track.bpm || 128;
      let key = track.key || 'Inconnu';

      try {
        const { data, error } = await supabase.functions.invoke('analyze-audio', { body: { audioUrl: secureAudioUrl } });
        if (!error && data && data.bpm) { bpm = data.bpm; key = data.key || key; }
      } catch (e) { console.warn("Analyse API échouée."); }

      const smartCuePoints = detectSmartCuePoints(waveform, duration, bpm);
      const finalTrackData = { ...track, key, bpm, cuePoints: smartCuePoints, duration, waveform };

      setLibrary(prev => prev.map(t => t.id === track.id ? finalTrackData : t));
      setActiveTrack(prev => prev?.id === track.id ? finalTrackData : prev);

      const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith('track_analysis_'));
      if (cacheKeys.length > 20) cacheKeys.slice(0, 10).forEach(k => localStorage.removeItem(k));

      localStorage.setItem(`track_analysis_${track.id}`, JSON.stringify({
        waveform, cuePoints: smartCuePoints, duration, bpm
      }));

    } catch (err: any) {
      console.error("Erreur d'analyse :", err);
      const fakeWaveform = Array.from({ length: 1000 }, () => Math.random() * 0.5 + 0.1);
      setLibrary(prev => prev.map(t => t.id === track.id ? { ...t, waveform: fakeWaveform, duration: 200 } : t));
      setActiveTrack(prev => prev ? { ...prev, waveform: fakeWaveform, duration: 200 } : null);
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
      audioRef.current.crossOrigin = "anonymous"; 
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
    if (!isPlaying) { audioRef.current.play(); setIsPlaying(true); }
  };

  // ✅ GESTION DU GLISSEMENT (SCRUBBING) SUR LA WAVEFORM
  const handleScrubStart = () => {
    if (!activeTrack) return;
    setIsScrubbing(true);
    setWasPlayingBeforeScrub(isPlaying);
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleScrub = (newTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleScrubEnd = () => {
    setIsScrubbing(false);
    if (wasPlayingBeforeScrub && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // ✅ GESTION DU DÉPLACEMENT (DRAG & DROP) DES CUE POINTS
  const handleCueMouseDown = (e: React.MouseEvent, cueId: number) => {
    e.stopPropagation();
    setDraggingCueId(cueId);
  };

  useEffect(() => {
    if (draggingCueId === null || !activeTrack) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!waveformContainerRef.current || !activeTrack) return;
      const rect = waveformContainerRef.current.getBoundingClientRect();
      let ratio = (e.clientX - rect.left) / rect.width;
      ratio = Math.max(0, Math.min(1, ratio));
      const newTime = ratio * (activeTrack.duration || 1);

      setActiveTrack(prev => {
        if (!prev) return prev;
        const newCues = prev.cuePoints?.map(c => c.id === draggingCueId ? { ...c, time: newTime } : c);
        return { ...prev, cuePoints: newCues };
      });
    };

    const handleMouseUp = () => {
      // Sauvegarde dans le localStorage quand on relâche la souris
      if (activeTrack) {
        const cacheKey = `track_analysis_${activeTrack.id}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const cache = JSON.parse(cachedData);
          cache.cuePoints = activeTrack.cuePoints;
          localStorage.setItem(cacheKey, JSON.stringify(cache));
        }
        setLibrary(prev => prev.map(t => t.id === activeTrack.id ? { ...t, cuePoints: activeTrack.cuePoints } : t));
      }
      setDraggingCueId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingCueId, activeTrack]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const exportCuePoints = () => {
    if (!activeTrack || !activeTrack.cuePoints) return;
    let content = `====================================================\nFICHE DE PRÉPARATION - DROPZONE DJ\n====================================================\n\nTitre    : ${activeTrack.title}\nArtiste  : ${activeTrack.artist}\nGenre    : ${activeTrack.genre}\nBPM      : ${activeTrack.bpm}\nTonalité : ${activeTrack.key}\nDurée    : ${formatDuration(activeTrack.duration || 0)}\n\n----------------------------------------------------\nEMPLACEMENT DES CUE POINTS\n----------------------------------------------------\n\n`;
    activeTrack.cuePoints.forEach((cue: any) => {
      content += `Cue ${cue.id} (${cue.label})\n  Temps exact : ${formatDuration(cue.time)}\n  Millisecondes : ${Math.floor(cue.time * 1000)} ms\n\n`;
    });
    content += `----------------------------------------------------\nGénéré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}\nOutil : DJ PREP - DropZone Premium\n====================================================\n`;
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
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: colors.wheelBg, border: `1px solid ${colors.wheelBorder}`, position: 'relative', overflow: 'hidden', boxShadow: isDark ? 'inset 0 0 40px rgba(0,0,0,1), 0 10px 30px rgba(0,0,0,0.8)' : 'inset 0 0 20px rgba(0,0,0,0.05), 0 4px 10px rgba(0,0,0,0.05)' }}>
          {keys.map((key, i) => {
            const angle = (i / keys.length) * 360;
            const isAvailable = availableKeys.has(key);
            const isActive = activeKeyFilter === key;
            return (
              <div key={key} onClick={() => setActiveKeyFilter(isActive ? null : key)} style={{ position: 'absolute', width: 24, height: 24, top: '50%', left: '50%', marginTop: -12, marginLeft: -12, transform: `rotate(${angle}deg) translateY(-72px) rotate(-${angle}deg)`, background: isActive ? '#00d9ff' : (isAvailable ? colors.border : 'transparent'), border: `1px solid ${isActive ? '#00d9ff' : (isAvailable ? colors.borderLight : 'transparent')}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900, color: isActive ? '#000' : (isAvailable ? colors.textMain : colors.textDark), cursor: isAvailable ? 'pointer' : 'default', transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)', zIndex: 10, boxShadow: isActive ? '0 0 25px rgba(0, 217, 255, 1)' : 'none' }}>
                {key}
              </div>
            );
          })}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: colors.wheelCenterBg, border: `1px solid ${colors.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isDark ? '0 0 30px rgba(0, 217, 255, 0.2), inset 0 0 20px rgba(0,0,0,0.8)' : '0 0 20px rgba(0, 217, 255, 0.1), inset 0 0 10px rgba(255,255,255,0.8)' }}>
              <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '16px solid #00d9ff', marginLeft: 6, filter: 'drop-shadow(0 0 6px #00d9ff)' }} />
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

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: colors.bg, color: '#00d9ff', fontFamily: 'monospace', fontSize: '0.8rem', letterSpacing: '2px' }}>INITIALISATION DU MOTEUR AUDIO...</div>;

  return (
    <div 
      onMouseMove={handleMouseMoveGlobal}
      style={{ 
        display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', 
        background: colors.bg, color: colors.textMain, fontFamily: 'Inter, sans-serif', 
        overflow: 'hidden', position: 'fixed', top: 0, left: 0, zIndex: 9999,
        transition: 'background 0.3s ease, color 0.3s ease',
        ['--glass-bg' as any]: colors.glassBg,
        ['--border' as any]: colors.border,
        ['--text-main' as any]: colors.textMain,
        ['--text-muted' as any]: colors.textMuted,
        ['--card-bg' as any]: colors.cardBg,
        ['--card-hover' as any]: colors.cardHover,
        ['--cue-pad-bg' as any]: colors.cuePadBg,
        ['--cue-pad-hover' as any]: colors.cuePadHover,
        ['--cue-pad-text' as any]: colors.cuePadText,
        ['--border-light' as any]: colors.borderLight,
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '15%', left: '5%', width: '40vw', height: '40vw', background: isDark ? 'radial-gradient(circle, rgba(0, 217, 255, 0.08) 0%, transparent 60%)' : 'radial-gradient(circle, rgba(0, 217, 255, 0.1) 0%, transparent 60%)', transform: 'translate(-50%, -50%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '5%', width: '35vw', height: '35vw', background: isDark ? 'radial-gradient(circle, rgba(160, 138, 255, 0.08) 0%, transparent 60%)' : 'radial-gradient(circle, rgba(160, 138, 255, 0.1) 0%, transparent 60%)', transform: 'translate(50%, 50%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: mousePos.y, left: mousePos.x, width: 500, height: 500, background: isDark ? 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 60%)' : 'radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 60%)', transform: 'translate(-50%, -50%)', filter: 'blur(50px)', transition: 'top 0.1s ease-out, left 0.1s ease-out' }} />
      </div>

      <style>{`
        .glass-panel { background: var(--glass-bg); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); border-bottom: 1px solid var(--border); transition: background 0.3s ease; }
        .nav-link-premium { position: relative; color: var(--text-muted); text-decoration: none; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; transition: color 0.3s ease; cursor: pointer; background: transparent; border: none; padding: 0; }
        .nav-link-premium:hover { color: var(--text-main); }
        .sidebar-item { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-radius: 8px; cursor: pointer; color: var(--text-muted); font-weight: 600; font-size: 0.85rem; transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1); overflow: hidden; margin-bottom: 2px; }
        .sidebar-item:hover { background: var(--cue-pad-hover); color: var(--text-main); transform: translateX(6px); }
        .sidebar-item::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: 0; width: 4px; background: #00d9ff; border-radius: 0 4px 4px 0; transition: height 0.2s ease; box-shadow: 0 0 15px #00d9ff; }
        .sidebar-item:hover::before { height: 50%; }
        .sidebar-item.active { background: rgba(0, 217, 255, 0.08); color: var(--text-main); border: 1px solid rgba(0, 217, 255, 0.2); box-shadow: 0 4px 20px rgba(0, 217, 255, 0.05); }
        .sidebar-item.active::before { height: 50%; background: #00d9ff; box-shadow: 0 0 15px #00d9ff; }
        .holo-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        .holo-card:hover { background: var(--card-hover); border-color: rgba(0, 217, 255, 0.4); box-shadow: 0 10px 40px -10px rgba(0, 217, 255, 0.3), inset 0 0 20px rgba(0, 217, 255, 0.05); transform: translateY(-4px) scale(1.01); }
        .holo-card.active { background: rgba(0, 217, 255, 0.05); border-color: rgba(0, 217, 255, 0.6); box-shadow: 0 0 30px rgba(0, 217, 255, 0.2), inset 0 0 20px rgba(0, 217, 255, 0.1); }
        .cue-pad { background: linear-gradient(180deg, var(--cue-pad-bg) 0%, rgba(0,0,0,0.2) 100%); border: 1px solid var(--border); border-bottom: 3px solid rgba(0,0,0,0.4); border-radius: 10px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1rem; cursor: pointer; transition: all 0.1s; position: relative; overflow: hidden; color: var(--cue-pad-text); box-shadow: inset 0 2px 5px rgba(255,255,255,0.02), 0 4px 10px rgba(0,0,0,0.3); }
        .cue-pad:hover { background: var(--cue-pad-hover); border-color: var(--border-light); color: var(--text-main); transform: translateY(-1px); box-shadow: inset 0 2px 5px rgba(255,255,255,0.05), 0 6px 15px rgba(0,0,0,0.4); }
        .cue-pad:active { transform: translateY(2px); border-bottom-width: 1px; box-shadow: inset 0 4px 10px rgba(0,0,0,0.5); }
        .cue-pad.active { background: rgba(0, 217, 255, 0.1); border-color: rgba(0, 217, 255, 0.5); color: #fff; text-shadow: 0 0 10px rgba(0, 217, 255, 0.8); box-shadow: inset 0 0 20px rgba(0, 217, 255, 0.2), 0 0 15px rgba(0, 217, 255, 0.2); }
        .cue-pad .pad-color-indicator { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; opacity: 0.9; box-shadow: 0 0 15px currentColor; }
        @keyframes pulse { 0% { opacity: 0.5; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1.02); } 100% { opacity: 0.5; transform: scale(0.98); } }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {/* TOP BAR */}
      <div className="glass-panel" style={{ height: 72, display: 'flex', alignItems: 'center', padding: '0 32px', flexShrink: 0, justifyContent: 'space-between', zIndex: 100, boxShadow: '0 4px 30px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <button onClick={() => navigate('/')} className="nav-link-premium">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Retour
          </button>
          <div style={{ width: 1, height: 28, background: colors.borderLight }} />
          <h1 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, color: colors.textMain, display: 'flex', alignItems: 'center', gap: 12, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#00d9ff', filter: 'drop-shadow(0 0 8px rgba(0,217,255,0.5))' }}>🎧</span> DJ PREP <span style={{ fontSize: '0.65rem', background: 'linear-gradient(135deg, #00d9ff, #a855f7)', color: '#000', padding: '4px 10px', borderRadius: 6, fontWeight: 900, letterSpacing: '1px', boxShadow: '0 0 20px rgba(0,217,255,0.3)' }}>PREMIUM</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <button onClick={exportCuePoints} style={{ background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(168, 85, 247, 0.1))', border: '1px solid rgba(0, 217, 255, 0.3)', color: '#00d9ff', padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,217,255,0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(168, 85, 247, 0.2))'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,217,255,0.3)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(168, 85, 247, 0.1))'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,217,255,0.1)'; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Fiche Cue Points
          </button>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 14, top: 12, color: colors.textMuted }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Rechercher un son, un artiste..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: 320, background: colors.inputBg, border: `1px solid ${colors.borderLight}`, color: colors.textMain, padding: '12px 16px 12px 44px', borderRadius: 10, fontSize: '0.85rem', outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.2)' }} onFocus={(e) => { e.currentTarget.style.borderColor = '#00d9ff'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,217,255,0.2), inset 0 2px 5px rgba(0,0,0,0.2)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = colors.borderLight; e.currentTarget.style.boxShadow = 'inset 0 2px 5px rgba(0,0,0,0.2)'; }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* SIDEBAR */}
        <div style={{ width: 280, background: colors.sidebarBg, backdropFilter: 'blur(30px)', borderRight: `1px solid ${colors.border}`, padding: '32px 20px', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0, transition: 'background 0.3s ease' }}>
          <h2 style={{ fontSize: '0.7rem', fontWeight: 900, marginBottom: 24, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '3px', paddingLeft: 16 }}>Harmonic Filter</h2>
          {renderCamelotWheel()}
          {activeKeyFilter && (
             <button onClick={() => setActiveKeyFilter(null)} style={{ background: 'transparent', border: `1px solid ${colors.borderLight}`, color: '#00d9ff', padding: '8px', borderRadius: 8, fontSize: '0.75rem', margin: '0 16px 24px 16px', cursor: 'pointer', boxShadow: '0 0 15px rgba(0,217,255,0.1)', fontWeight: 800 }}>Effacer le filtre ({activeKeyFilter})</button>
          )}
          <h2 style={{ fontSize: '0.7rem', fontWeight: 900, marginBottom: 16, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '3px', paddingLeft: 16, marginTop: 12 }}>Genres</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div onClick={() => setActiveGenreFilter(null)} className={`sidebar-item ${!activeGenreFilter ? 'active' : ''}`}><span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> Tous les sons</span></div>
            {MUSIC_GENRES.map((genre) => {
              const isActive = activeGenreFilter === genre;
              return (
                <div key={genre} onClick={() => setActiveGenreFilter(isActive ? null : genre)} className={`sidebar-item ${isActive ? 'active' : ''}`}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path></svg> {genre}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* PLAYER SECTION */}
          <div style={{ padding: '32px', flexShrink: 0, position: 'relative', background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 32 }}>
              
              {/* Play Button & Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, width: 340, flexShrink: 0 }}>
                <div onClick={togglePlay} style={{ width: 64, height: 64, borderRadius: '50%', background: isPlaying ? '#00d9ff' : 'rgba(0, 217, 255, 0.1)', border: '2px solid #00d9ff', color: isPlaying ? '#000' : '#00d9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: isPlaying ? '0 0 40px rgba(0, 217, 255, 0.6)' : '0 0 20px rgba(0, 217, 255, 0.2)', transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
                  {isPlaying ? <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> : <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft: 4}}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: colors.textMain, letterSpacing: '-0.5px' }}>{activeTrack?.title || 'Aucun morceau sélectionné'}</h1>
                  <div style={{ fontSize: '0.9rem', color: '#00d9ff', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }}>{activeTrack?.artist}</div>
                </div>
              </div>

              {/* WAVEFORM (Interactive) */}
              <div 
                ref={waveformContainerRef} 
                style={{ flex: 1, height: 80, background: colors.waveformBg, borderRadius: 12, border: `1px solid ${colors.borderLight}`, position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 8px 30px rgba(0,0,0,0.4)' }}
              >
                {!activeTrack?.waveform && analyzingId === activeTrack?.id && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)', zIndex: 20, backdropFilter: 'blur(10px)' }}>
                    <span style={{ color: '#00d9ff', fontSize: '0.8rem', fontWeight: 900, animation: 'pulse 1.5s infinite', letterSpacing: '2px' }}>ANALYSE SPECTRALE EN COURS...</span>
                  </div>
                )}
                
                <Waveform
  key={activeTrack?.id}
  peaks={activeTrack?.waveform}
  currentTime={currentTime}
  duration={activeTrack?.duration || 1}
  onScrubStart={handleScrubStart}
  onScrub={handleScrub}
  onScrubEnd={handleScrubEnd}
  height={80}
  variant="compact"
  showGrid={false}
/>

                {/* Cue Points (Déplaçables) */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  {activeTrack?.cuePoints?.map((cue, i) => (
                    <div 
                      key={i} 
                      onMouseDown={(e) => handleCueMouseDown(e, cue.id)}
                      style={{ 
                        position: 'absolute', 
                        left: `${(cue.time / (activeTrack.duration || 1)) * 100}%`, 
                        top: 0, 
                        bottom: 0, 
                        width: 16, 
                        transform: 'translateX(-8px)', 
                        cursor: draggingCueId === cue.id ? 'grabbing' : 'ew-resize',
                        zIndex: 20, 
                        pointerEvents: 'auto', 
                        display: 'flex', 
                        justifyContent: 'center',
                        alignItems: 'center'
                      }} 
                      title={`${cue.label} - Glisser pour modifier`}
                    >
                      <div style={{ 
                        width: draggingCueId === cue.id ? 4 : 2, 
                        height: '100%', 
                        background: cue.color, 
                        boxShadow: `0 0 ${draggingCueId === cue.id ? 15 : 8}px ${cue.color}`,
                        transition: 'width 0.1s'
                      }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Time & BPM */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                <div style={{ fontSize: '1rem', color: colors.textMuted, fontFamily: 'monospace', fontWeight: 900, background: colors.inputBg, padding: '10px 16px', borderRadius: 8, border: `1px solid ${colors.border}`, letterSpacing: '1px', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.3)' }}>
                  <span style={{ color: '#00d9ff', textShadow: '0 0 10px rgba(0,217,255,0.4)' }}>{formatDuration(currentTime)}</span> <span style={{ color: colors.textDark, margin: '0 6px' }}>/</span> {formatDuration(activeTrack?.duration || 0)}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ background: 'rgba(244, 114, 182, 0.15)', color: '#f472b6', border: '1px solid rgba(244, 114, 182, 0.4)', padding: '10px 18px', borderRadius: 8, fontWeight: 900, fontSize: '0.9rem', boxShadow: '0 0 20px rgba(244,114,182,0.15)', fontFamily: 'monospace' }}>{activeTrack?.key}</div>
                  <div style={{ background: colors.border, color: colors.textMain, border: `1px solid ${colors.borderLight}`, padding: '10px 18px', borderRadius: 8, fontWeight: 900, fontSize: '0.9rem', fontFamily: 'monospace', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.2)' }}>{activeTrack?.bpm || '--'} BPM</div>
                </div>
              </div>
            </div>

            {/* CUE PADS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 12 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => {
                const cue = activeTrack?.cuePoints?.find((c: any) => c.id === id);
                return (
                  <div key={id} onClick={() => cue && jumpToCue(cue.time)} className={`cue-pad ${cue ? 'active' : ''}`}>
                    <span style={{ opacity: cue ? 1 : 0.3, zIndex: 2 }}>{id}</span>
                    {cue && <div className="pad-color-indicator" style={{ background: cue.color, color: cue.color }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* TRACK LIBRARY */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 40px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 16 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: colors.textMain, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 12 }}>
                Ma Bibliothèque 
                <span style={{ fontSize: '0.8rem', color: colors.textMain, background: colors.border, padding: '2px 10px', borderRadius: 20, fontWeight: 800 }}>{filteredLibrary.length}</span>
              </h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {filteredLibrary.map((track) => {
                const isCompatible = activeTrack && track.id !== activeTrack.id && compatibleKeys.includes(track.key);
                const isActive = activeTrack?.id === track.id;
                return (
                  <div key={track.id} onClick={() => setActiveTrack(track)} className={`holo-card ${isActive ? 'active' : ''}`} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, cursor: 'pointer', border: isCompatible ? '1px solid rgba(16, 185, 129, 0.6)' : undefined }}>
                    
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ width: 56, height: 56, background: colors.trackBg, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: `1px solid ${colors.borderLight}`, boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                        {track.coverUrl ? <img src={track.coverUrl} alt="c" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem', color: colors.textDark}}>🎵</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: isActive ? '#00d9ff' : colors.textMain, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{track.title}</div>
                        <div style={{ color: colors.textMuted, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{track.artist}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ background: 'rgba(0, 217, 255, 0.1)', color: '#00d9ff', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 900, fontFamily: 'monospace' }}>{track.key}</div>
                        <div style={{ color: colors.textMuted, fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', fontFamily: 'monospace' }}>{track.bpm} BPM</div>
                      </div>
                      
                      {analyzingId === track.id ? (
                        <span style={{ color: '#00d9ff', fontSize: '0.7rem', fontWeight: 900, animation: 'pulse 1.5s infinite', letterSpacing: '1px' }}>ANALYSE...</span>
                      ) : track.cuePoints ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {track.cuePoints.map((cue, i) => (
                            <div key={i} onClick={(e) => { e.stopPropagation(); jumpToCue(cue.time); }} style={{ width: 8, height: 8, borderRadius: '50%', background: cue.color, boxShadow: `0 0 8px ${cue.color}`, cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.3)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'} />
                          ))}
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); analyzeTrack(track); }} style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))', color: colors.textMain, border: `1px solid ${colors.borderLight}`, padding: '6px 14px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#00d9ff'; e.currentTarget.style.color = '#00d9ff'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,217,255,0.2)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.borderLight; e.currentTarget.style.color = colors.textMain; e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)'; }}>Analyser</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};