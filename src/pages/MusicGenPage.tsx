// src/pages/MusicGenPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkMusicGenHealth, generateMusic } from '../audio/musicgenClient';
import { transcribeToMidi, downloadMidi } from '../audio/musicgenToMidi';
import { musicgenHistory, type MusicGenHistoryEntry } from '../utils/musicgenHistory';
import { audioTransfer } from '../utils/audioTransfer';
import { isProduction, LOCAL_SERVER_MESSAGE } from '../utils/env';
import { AudioPlayer } from '../components/AudioPlayer';
import { useIsMobile } from '../hooks/useIsMobile';
import { useToast } from '../components/ui/Toast';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionTitle } from '../components/ui/SectionTitle';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { addVocalPadToBlob, type VocalVowel } from '../audio/vocalPad';

// ============================================================
// PRESETS (avec mode VOIX/INST)
// ============================================================
interface Preset {
  id: string;
  label: string;
  prompt: string;
  color: string;
  mode: 'instrumental' | 'vocal' | 'both';
}

const PRESETS: Preset[] = [
  { id: 'lofi',      label: 'Lo-Fi',      prompt: 'lofi hip hop beat, chill, jazzy, warm piano, vinyl crackle', color: '#ffd43b', mode: 'instrumental' },
  { id: 'trap',      label: 'Trap',       prompt: 'trap beat, dark, 808 bass, hi-hats, atmospheric',            color: '#ff3366', mode: 'instrumental' },
  { id: 'house',     label: 'House',      prompt: 'deep house, groovy, piano chords, four on the floor, club',   color: '#00d9ff', mode: 'instrumental' },
  { id: 'ambient',   label: 'Ambient',    prompt: 'ambient soundscape, calm, atmospheric, pad, cinematic',       color: '#7c5cff', mode: 'instrumental' },
  { id: 'edm',       label: 'EDM',        prompt: 'edm, festival, big room, energetic, synth lead, drop',        color: '#ff5cf0', mode: 'instrumental' },
  { id: 'jazz',      label: 'Jazz',       prompt: 'smooth jazz, saxophone, piano trio, lounge, relaxed',         color: '#00ff88', mode: 'instrumental' },
  { id: 'synthwave', label: 'Synthwave',  prompt: 'synthwave, retro 80s, neon, drum machine, analog synth',      color: '#ec4899', mode: 'instrumental' },
  { id: 'cinematic', label: 'Cinematic',  prompt: 'cinematic orchestral, epic, strings, brass, emotional',       color: '#f59e0b', mode: 'instrumental' },
  { id: 'techno',    label: 'Techno',     prompt: 'techno, dark, industrial, driving kick, hypnotic',            color: '#06b6d4', mode: 'instrumental' },
  { id: 'reggaeton', label: 'Reggaeton',  prompt: 'reggaeton, latin, dembow, catchy, dance',                     color: '#10b981', mode: 'instrumental' },
  { id: 'vocal-pop',  label: '🎤 Pop',   prompt: 'pop song with vocals, catchy chorus, emotional, radio hit',   color: '#ff1493', mode: 'vocal' },
  { id: 'vocal-rap',  label: '🎤 Rap',   prompt: 'hip hop rap with vocals, punchy delivery, deep beat',         color: '#ff4500', mode: 'vocal' },
  { id: 'vocal-soul', label: '🎤 Soul',  prompt: 'soulful R&B with vocals, warm chords, groove',               color: '#daa520', mode: 'vocal' },
];

type SortOption = 'recent' | 'old' | 'duration' | 'az';
const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: 'recent', label: 'Récents', icon: '🕐' },
  { value: 'old', label: 'Anciens', icon: '📅' },
  { value: 'duration', label: 'Durée', icon: '⏱️' },
  { value: 'az', label: 'A-Z', icon: '🔤' },
];

const DURATION_OPTIONS = [30, 60, 90, 120];

export const MusicGenPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const engine = useAudioEngineContext();

  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(30);
  const [temperature, setTemperature] = useState(1.0);
  const [withVocals, setWithVocals] = useState(false);
  const [vocalKey, setVocalKey] = useState('Am');
  const [vocalVowel, setVocalVowel] = useState<VocalVowel>('ah');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [history, setHistory] = useState<(MusicGenHistoryEntry & { audioUrl: string })[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [transcribingId, setTranscribingId] = useState<string | null>(null);
  const [transcribeStatus, setTranscribeStatus] = useState('');
  const [midiSuccess, setMidiSuccess] = useState<{ id: string; count: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const failCountRef = useRef(0);

  useEffect(() => {
    if (isGenerating) return;
    const check = async () => {
      const s = await checkMusicGenHealth();
      if (s.status === 'online') {
        failCountRef.current = 0;
        setIsOnline(true);
      } else {
        failCountRef.current++;
        if (failCountRef.current >= 3) setIsOnline(false);
      }
    };
    check();
    const int = setInterval(check, 10000);
    return () => clearInterval(int);
  }, [isGenerating]);

  useEffect(() => {
    loadHistory();
    try {
      const favs = localStorage.getItem('waveforge-musicgen-favs');
      if (favs) setFavorites(new Set(JSON.parse(favs)));
    } catch {}
  }, []);

  const loadHistory = async () => {
    const entries = await musicgenHistory.getAll();
    const withUrls = entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((e) => ({ ...e, audioUrl: URL.createObjectURL(e.audioBlob) }));
    setHistory(withUrls);
  };

  const filteredHistory = useMemo(() => {
    let result = [...history];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((h) => {
        const title = (h.title || '').toLowerCase();
        const prmpt = h.prompt.toLowerCase();
        return title.includes(q) || prmpt.includes(q);
      });
    }
    if (showFavoritesOnly) result = result.filter((h) => favorites.has(h.id));
    switch (sortBy) {
      case 'recent': result.sort((a, b) => b.timestamp - a.timestamp); break;
      case 'old': result.sort((a, b) => a.timestamp - b.timestamp); break;
      case 'duration': result.sort((a, b) => b.duration - a.duration); break;
      case 'az':
        result.sort((a, b) => {
          const aTitle = (a.title || a.prompt).toLowerCase();
          const bTitle = (b.title || b.prompt).toLowerCase();
          return aTitle.localeCompare(bTitle);
        });
        break;
    }
    return result;
  }, [history, searchQuery, showFavoritesOnly, favorites, sortBy]);

  const estimatedTime = useMemo(() => {
    const base = duration * 8;
    const vocalCost = withVocals ? duration * 4 : 0;
    return Math.round(base + vocalCost);
  }, [duration, withVocals]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast('Écris une description du morceau.', 'warning');
      return;
    }
    if (isProduction()) {
      showToast('La génération MusicGen nécessite le serveur Python local.', 'warning');
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    setStatus('Initialisation...');
    setProgress(0);
    setElapsed(0);

    const startTime = Date.now();
    timerRef.current = window.setInterval(() => {
      const sec = (Date.now() - startTime) / 1000;
      setElapsed(Math.floor(sec));
      setProgress(Math.min(95, (sec / estimatedTime) * 100));
    }, 200);

    try {
      const res = await generateMusic(
        {
          prompt: prompt.trim(),
          duration,
          temperature,
          withVocals,
        },
        setStatus
      );
      setProgress(100);

      let blob = await fetch(res.audioUrl).then((r) => r.blob());

      if (withVocals) {
        if (!engine.audioContext) {
          showToast('Audio non initialisé — voix ignorée', 'warning');
        } else {
          setStatus('Ajout du chœur vocal...');
          try {
            blob = await addVocalPadToBlob(engine.audioContext, blob, {
              key: vocalKey,
              vowel: vocalVowel,
              level: 0.35,
            });
          } catch (err) {
            console.error('Erreur pad vocal:', err);
            showToast("Erreur lors de l'ajout de la voix", 'error');
          }
        }
      }

      const entry: MusicGenHistoryEntry = {
        id: `mg-${Date.now()}`,
        prompt: prompt.trim(),
        duration,
        temperature,
        generationTime: res.generationTime,
        timestamp: Date.now(),
        audioBlob: blob,
      };
      await musicgenHistory.add(entry);
      await loadHistory();
      showToast('✅ Morceau généré avec succès', 'success');
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        showToast(`Erreur : ${e.message}`, 'error');
      }
    } finally {
      setIsGenerating(false);
      setStatus('');
      if (timerRef.current) clearInterval(timerRef.current);
      abortRef.current = null;
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setStatus('');
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    showToast('Génération annulée', 'info');
  };

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleFavorite = (id: string) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(id)) newFavs.delete(id);
    else newFavs.add(id);
    setFavorites(newFavs);
    localStorage.setItem('waveforge-musicgen-favs', JSON.stringify([...newFavs]));
  };

  const handleTransfer = async (entry: MusicGenHistoryEntry, target: 'studio' | 'mastering') => {
    const filename = `${(entry.title || entry.prompt).replace(/[^a-z0-9]/gi, '-').slice(0, 40)}.wav`;
    await audioTransfer.save(entry.audioBlob, filename, target);
    showToast(`Envoyé vers ${target === 'studio' ? 'Studio' : 'Mastering'}`, 'success');
    navigate(target === 'studio' ? '/studio' : '/mastering');
  };

  const handleExtractMidi = async (entry: MusicGenHistoryEntry) => {
    if (transcribingId) return;
    setTranscribingId(entry.id);
    setTranscribeStatus('Préparation...');
    setMidiSuccess(null);
    try {
      const bpm = 120;
      const result = await transcribeToMidi(entry.audioBlob, bpm, setTranscribeStatus);
      downloadMidi(result.midiBlob, result.fileName);
      setMidiSuccess({ id: entry.id, count: result.noteCount });
      showToast(`🎼 ${result.noteCount} notes extraites en MIDI`, 'success');
      setTimeout(() => setMidiSuccess(null), 4000);
    } catch (e: any) {
      console.error('Erreur transcription MIDI:', e);
      showToast(`Erreur MIDI : ${e.message}`, 'error');
    } finally {
      setTranscribingId(null);
      setTranscribeStatus('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce morceau ?')) return;
    await musicgenHistory.delete(id);
    await loadHistory();
    showToast('Morceau supprimé', 'info');
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Effacer TOUT l'historique ?")) return;
    await musicgenHistory.clear();
    await loadHistory();
    showToast('Historique effacé', 'info');
  };

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const saveTitle = async (id: string) => {
    const newTitle = editingTitle.trim();
    if (newTitle) await musicgenHistory.update(id, { title: newTitle });
    setEditingId(null);
    setEditingTitle('');
    await loadHistory();
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  return (
    <div
      className="wf-fade-in"
      style={{
        padding: isMobile ? 12 : 20,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(300px, 360px) 1fr',
        gap: isMobile ? 16 : 20,
        alignItems: 'start',
        minHeight: isMobile ? 'auto' : 'calc(100vh - 40px)',
      }}
    >
      {/* COLONNE GAUCHE : CRÉATION */}
      <GlassCard
        padding={0}
        glow="#00ff88"
        style={{
          position: isMobile ? 'relative' : 'sticky',
          top: isMobile ? 'auto' : 20,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: isMobile ? 'none' : 'calc(100vh - 40px)',
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '1.5px',
                marginBottom: 4,
                fontWeight: 800,
              }}
            >
              CRÉATION
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                background: 'linear-gradient(135deg, #00ff88, #00b866)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              🎵 Nouveau morceau
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: isGenerating
                ? 'rgba(0, 217, 255, 0.08)'
                : isOnline
                ? 'rgba(0, 255, 136, 0.08)'
                : 'rgba(255, 51, 102, 0.08)',
              border: `1px solid ${
                isGenerating
                  ? 'rgba(0, 217, 255, 0.3)'
                  : isOnline
                  ? 'rgba(0, 255, 136, 0.3)'
                  : 'rgba(255, 51, 102, 0.3)'
              }`,
              borderRadius: 8,
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.5px',
              color: isGenerating ? '#00d9ff' : isOnline ? '#00ff88' : '#ff3366',
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isGenerating ? '#00d9ff' : isOnline ? '#00ff88' : '#ff3366',
                boxShadow: isGenerating
                  ? '0 0 8px #00d9ff'
                  : isOnline
                  ? '0 0 8px #00ff88'
                  : 'none',
              }}
            />
            {isGenerating ? 'CALCUL' : isOnline === null ? '...' : isOnline ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', padding: 16 }}>
          {isOnline === false && !isGenerating && (
            <div
              style={{
                padding: 12,
                background: isProduction()
                  ? 'rgba(255, 212, 59, 0.06)'
                  : 'rgba(255, 51, 102, 0.06)',
                border: `1px solid ${
                  isProduction()
                    ? 'rgba(255, 212, 59, 0.3)'
                    : 'rgba(255, 51, 102, 0.3)'
                }`,
                borderRadius: 10,
                fontSize: 10,
                color: isProduction() ? '#ffd43b' : '#ff3366',
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              {isProduction() ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                    ⚠️ Serveur local requis
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)' }}>{LOCAL_SERVER_MESSAGE}</div>
                </>
              ) : (
                <>
                  ⚠️ Serveur MusicGen hors ligne.
                  <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                    Lance le serveur avec <strong>start-all.bat</strong>.
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <SectionTitle icon="🎨" title="STYLE RAPIDE" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPrompt(p.prompt);
                    setSelectedPreset(p.id);
                    setWithVocals(p.mode === 'vocal');
                  }}
                  disabled={isGenerating}
                  style={{
                    padding: '6px 10px',
                    background:
                      selectedPreset === p.id ? `${p.color}20` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${
                      selectedPreset === p.id ? p.color : 'rgba(255,255,255,0.08)'
                    }`,
                    borderRadius: 12,
                    color: selectedPreset === p.id ? p.color : 'rgba(255,255,255,0.7)',
                    fontSize: 10,
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    fontWeight: selectedPreset === p.id ? 700 : 500,
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <SectionTitle icon="✍️" title="DESCRIPTION" />
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              placeholder="Ex: lofi hip hop beat, chill, jazzy piano..."
              rows={isMobile ? 3 : 4}
              style={{
                width: '100%',
                padding: 10,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                color: '#fff',
                fontSize: 11,
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
                opacity: isGenerating ? 0.5 : 1,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <SectionTitle
              icon="⏱️"
              title="DURÉE"
              action={
                <span
                  style={{
                    fontSize: 12,
                    color: '#00ff88',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                  }}
                >
                  {duration}s
                </span>
              }
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  disabled={isGenerating}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    background:
                      duration === d
                        ? 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,184,102,0.05))'
                        : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${
                      duration === d ? '#00ff88' : 'rgba(255,255,255,0.08)'
                    }`,
                    borderRadius: 8,
                    color: duration === d ? '#00ff88' : 'rgba(255,255,255,0.6)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {d}s
                </button>
              ))}
            </div>
            {duration > 30 && (
              <div
                style={{
                  fontSize: 9,
                  color: 'rgba(255,212,59,0.7)',
                  marginTop: 6,
                  fontStyle: 'italic',
                }}
              >
                ⚠️ Durées &gt; 30s = génération en plusieurs passes (sliding window)
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <SectionTitle icon="🎤" title="VOIX" />
            <button
              onClick={() => setWithVocals(!withVocals)}
              disabled={isGenerating}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: withVocals
                  ? 'linear-gradient(135deg, rgba(255,20,147,0.15), rgba(255,69,0,0.05))'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${
                  withVocals ? '#ff1493' : 'rgba(255,255,255,0.08)'
                }`,
                borderRadius: 10,
                color: withVocals ? '#ff1493' : 'rgba(255,255,255,0.6)',
                fontSize: 11,
                fontWeight: 700,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s',
              }}
            >
              <span>{withVocals ? '🎤 AVEC VOIX' : '🎹 INSTRUMENTAL'}</span>
              <span style={{ fontSize: 9, opacity: 0.7 }}>
                {withVocals ? 'ON' : 'OFF'}
              </span>
            </button>

            {withVocals && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 9,
                      color: 'rgba(255,255,255,0.4)',
                      letterSpacing: '1px',
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    TONALITÉ
                  </div>
                  <select
                    value={vocalKey}
                    onChange={(e) => setVocalKey(e.target.value)}
                    disabled={isGenerating}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255, 20, 147, 0.3)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <optgroup label="Minor">
                      <option value="Am">A minor</option>
                      <option value="Bm">B minor</option>
                      <option value="Cm">C minor</option>
                      <option value="Dm">D minor</option>
                      <option value="Em">E minor</option>
                      <option value="Fm">F minor</option>
                      <option value="Gm">G minor</option>
                    </optgroup>
                    <optgroup label="Major">
                      <option value="C">C major</option>
                      <option value="D">D major</option>
                      <option value="E">E major</option>
                      <option value="F">F major</option>
                      <option value="G">G major</option>
                      <option value="A">A major</option>
                      <option value="B">B major</option>
                    </optgroup>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 9,
                      color: 'rgba(255,255,255,0.4)',
                      letterSpacing: '1px',
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    VOYELLE
                  </div>
                  <select
                    value={vocalVowel}
                    onChange={(e) => setVocalVowel(e.target.value as VocalVowel)}
                    disabled={isGenerating}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255, 20, 147, 0.3)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="ah">Ah (ouvert)</option>
                    <option value="oh">Oh (rond)</option>
                    <option value="ooh">Ooh (doux)</option>
                    <option value="ee">Ee (clair)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <SectionTitle
              icon="🎲"
              title="CRÉATIVITÉ"
              action={
                <span
                  style={{
                    fontSize: 12,
                    color: '#00d9ff',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                  }}
                >
                  {temperature.toFixed(1)}
                </span>
              }
            />
            <input
              type="range"
              min={0.3}
              max={1.5}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              disabled={isGenerating}
              style={{ width: '100%', accentColor: '#00d9ff' }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 9,
                color: 'rgba(255,255,255,0.4)',
                marginTop: 2,
              }}
            >
              <span>Sage</span>
              <span>Créatif</span>
            </div>
          </div>

          {isGenerating && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: 'rgba(0, 255, 136, 0.05)',
                border: '1px solid rgba(0, 255, 136, 0.2)',
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  marginBottom: 8,
                }}
              >
                <span style={{ color: '#00ff88', fontWeight: 700 }}>⏳ {status}</span>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: 'monospace',
                  }}
                >
                  {elapsed}s / ~{estimatedTime}s
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #00ff88, #00b866)',
                    transition: 'width 0.2s linear',
                    boxShadow: '0 0 10px #00ff88',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: 16,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || isOnline !== true}
              style={{
                flex: 1,
                padding: '14px 20px',
                border: 'none',
                borderRadius: 12,
                background:
                  isGenerating || isOnline !== true
                    ? 'rgba(255,255,255,0.05)'
                    : 'linear-gradient(135deg, #00ff88, #00b866)',
                color: isGenerating || isOnline !== true ? 'rgba(255,255,255,0.4)' : '#000',
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: '1px',
                cursor: isGenerating || isOnline !== true ? 'not-allowed' : 'pointer',
                boxShadow:
                  isGenerating || isOnline !== true
                    ? 'none'
                    : '0 6px 24px rgba(0, 255, 136, 0.4)',
                transition: 'all 0.2s',
              }}
            >
              {isGenerating
                ? `⏳ ${Math.floor(progress)}%`
                : isOnline === false
                ? '❌ HORS LIGNE'
                : '🎵 GÉNÉRER'}
            </button>
            {isGenerating && (
              <button
                onClick={handleCancel}
                style={{
                  padding: '14px 16px',
                  border: 'none',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #ff3366, #cc1144)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(255, 51, 102, 0.4)',
                }}
              >
                ⏹
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* COLONNE DROITE : LISTE */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: isMobile ? 18 : 22,
                fontWeight: 800,
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              🎵{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #00ff88, #00b866)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                GÉNÉRATION IA
              </span>
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 10,
                margin: '6px 0 0',
                letterSpacing: '1px',
                fontWeight: 600,
              }}
            >
              MUSICGEN · 100% LOCAL · {history.length} MORCEAU{history.length > 1 ? 'X' : ''}
              {filteredHistory.length !== history.length &&
                ` · ${filteredHistory.length} AFFICHÉ${filteredHistory.length > 1 ? 'S' : ''}`}
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              style={{
                padding: '6px 12px',
                background: 'rgba(255, 51, 102, 0.08)',
                border: '1px solid rgba(255, 51, 102, 0.3)',
                borderRadius: 8,
                color: '#ff3366',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.5px',
              }}
            >
              🗑️ TOUT EFFACER
            </button>
          )}
        </div>

        {history.length > 0 && (
          <GlassCard
            padding={10}
            style={{
              marginBottom: 12,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: 1, minWidth: isMobile ? '100%' : 200, position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Rechercher un morceau..."
                style={{
                  width: '100%',
                  padding: '8px 30px 8px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 11,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 14,
                    cursor: 'pointer',
                    padding: 2,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              style={{
                padding: '8px 12px',
                background: showFavoritesOnly ? 'rgba(255, 51, 102, 0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${showFavoritesOnly ? '#ff3366' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8,
                color: showFavoritesOnly ? '#ff3366' : 'rgba(255,255,255,0.7)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {showFavoritesOnly ? '❤️' : '🤍'} Favoris
            </button>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {SORT_OPTIONS.find((s) => s.value === sortBy)?.icon}{' '}
                {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
                <span style={{ fontSize: 8 }}>▼</span>
              </button>

              {showSortMenu && (
                <>
                  <div
                    onClick={() => setShowSortMenu(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      right: 0,
                      background: 'rgba(20,20,30,0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      minWidth: 140,
                      overflow: 'hidden',
                      zIndex: 51,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                    }}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSortBy(opt.value);
                          setShowSortMenu(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          padding: '8px 12px',
                          background:
                            sortBy === opt.value ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
                          border: 'none',
                          color: sortBy === opt.value ? '#00ff88' : 'rgba(255,255,255,0.7)',
                          fontSize: 11,
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontWeight: sortBy === opt.value ? 700 : 500,
                        }}
                      >
                        {opt.icon} {opt.label}
                        {sortBy === opt.value && <span style={{ marginLeft: 'auto' }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </GlassCard>
        )}

        {history.length === 0 && !isGenerating && (
          <GlassCard
            padding={isMobile ? 32 : 48}
            style={{
              textAlign: 'center',
              borderStyle: 'dashed',
            }}
          >
            <div style={{ fontSize: isMobile ? 48 : 64, marginBottom: 16 }}>🎵</div>
            <div style={{ fontSize: 15, color: '#fff', fontWeight: 700, marginBottom: 8 }}>
              Aucun morceau pour le moment
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                maxWidth: 400,
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              Choisis un style dans le panneau, décris ce que tu veux, puis clique sur{' '}
              <strong style={{ color: '#00ff88' }}>GÉNÉRER</strong>.
            </div>
          </GlassCard>
        )}

        {history.length > 0 && filteredHistory.length === 0 && (
          <GlassCard padding={32} style={{ textAlign: 'center', borderStyle: 'dashed' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 13, color: '#ffd43b', fontWeight: 700, marginBottom: 6 }}>
              Aucun résultat
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
              {showFavoritesOnly
                ? 'Aucun favori ne correspond à ta recherche.'
                : 'Aucun morceau ne correspond à ta recherche.'}
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setShowFavoritesOnly(false);
              }}
              style={{
                padding: '8px 16px',
                background: 'rgba(0, 217, 255, 0.1)',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                borderRadius: 8,
                color: '#00d9ff',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔄 Réinitialiser les filtres
            </button>
          </GlassCard>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {filteredHistory.map((h, index) => {
            const isFav = favorites.has(h.id);
            const isEditing = editingId === h.id;
            const isTranscribing = transcribingId === h.id;
            const isMidiJustExtracted = midiSuccess?.id === h.id;
            const isNewest =
              index === 0 && sortBy === 'recent' && !searchQuery && !showFavoritesOnly;
            const date = new Date(h.timestamp);
            const dateStr = date.toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <GlassCard
                key={h.id}
                padding={14}
                glow={isMidiJustExtracted ? '#7c5cff' : isNewest ? '#00ff88' : undefined}
                style={{
                  borderColor: isMidiJustExtracted
                    ? 'rgba(124, 92, 255, 0.5)'
                    : isNewest && !isGenerating
                    ? 'rgba(0, 255, 136, 0.3)'
                    : undefined,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      width: isMobile ? 32 : 36,
                      height: isMobile ? 32 : 36,
                      borderRadius: 10,
                      background: isMidiJustExtracted
                        ? 'rgba(124, 92, 255, 0.15)'
                        : isNewest && !isGenerating
                        ? 'rgba(0, 255, 136, 0.15)'
                        : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${
                        isMidiJustExtracted
                          ? 'rgba(124, 92, 255, 0.5)'
                          : isNewest && !isGenerating
                          ? 'rgba(0, 255, 136, 0.4)'
                          : 'rgba(255,255,255,0.08)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                      color: isMidiJustExtracted
                        ? '#7c5cff'
                        : isNewest && !isGenerating
                        ? '#00ff88'
                        : 'rgba(255,255,255,0.4)',
                      fontWeight: 800,
                    }}
                  >
                    {isMidiJustExtracted ? '🎼' : isNewest && !isGenerating ? '★' : index + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveTitle(h.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          autoFocus
                          placeholder="Titre du morceau..."
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid #00ff88',
                            borderRadius: 6,
                            color: '#fff',
                            fontSize: isMobile ? 11 : 12,
                            fontFamily: 'inherit',
                            outline: 'none',
                            minWidth: 0,
                          }}
                        />
                        <button
                          onClick={() => saveTitle(h.id)}
                          style={{
                            padding: '4px 8px',
                            background: '#00ff88',
                            border: 'none',
                            borderRadius: 6,
                            color: '#000',
                            fontSize: 10,
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEditing}
                          style={{
                            padding: '4px 8px',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6,
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: 10,
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => startEditing(h.id, h.title || h.prompt)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            fontSize: isMobile ? 11 : 12,
                            color: '#fff',
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {h.title || h.prompt}
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: 'rgba(255,255,255,0.3)',
                            flexShrink: 0,
                          }}
                        >
                          ✏️
                        </span>
                      </div>
                    )}

                    {h.title && h.title !== h.prompt && !isEditing && (
                      <div
                        style={{
                          fontSize: 9,
                          color: 'rgba(255,255,255,0.4)',
                          fontStyle: 'italic',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: 4,
                        }}
                      >
                        {h.prompt}
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        fontSize: 9,
                        color: 'rgba(255,255,255,0.4)',
                        fontFamily: 'monospace',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>📅 {dateStr}</span>
                      <span>⏱️ {h.duration}s</span>
                      <span>⚡ {h.generationTime}s</span>
                    </div>

                    {isTranscribing && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 10,
                          color: '#7c5cff',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            border: '2px solid rgba(124, 92, 255, 0.3)',
                            borderTop: '2px solid #7c5cff',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                          }}
                        />
                        {transcribeStatus || 'Transcription...'}
                      </div>
                    )}

                    {isMidiJustExtracted && midiSuccess && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 10,
                          color: '#7c5cff',
                          fontWeight: 700,
                        }}
                      >
                        ✅ {midiSuccess.count} notes extraites · MIDI téléchargé
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexShrink: 0,
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {[
                      {
                        onClick: () => handleExtractMidi(h),
                        icon: isTranscribing ? '⏳' : '🎼',
                        color: '#7c5cff',
                        title: 'Extraire MIDI (Basic Pitch)',
                        disabled: isTranscribing || !!transcribingId,
                      },
                      {
                        onClick: () => handleTransfer(h, 'studio'),
                        icon: '🎹',
                        color: '#00d9ff',
                        title: 'Envoyer au Studio',
                        disabled: isTranscribing,
                      },
                      {
                        onClick: () => handleTransfer(h, 'mastering'),
                        icon: '🎚️',
                        color: '#7c5cff',
                        title: 'Envoyer au Mastering',
                        disabled: isTranscribing,
                      },
                      {
                        onClick: () => toggleFavorite(h.id),
                        icon: isFav ? '❤️' : '🤍',
                        color: isFav ? '#ff3366' : 'rgba(255,255,255,0.5)',
                        title: isFav ? 'Retirer favori' : 'Ajouter favori',
                        disabled: isTranscribing,
                      },
                      {
                        onClick: () => handleDownload(h.audioUrl, `musicgen-${h.id}.wav`),
                        icon: '💾',
                        color: '#00ff88',
                        title: 'Télécharger WAV',
                        disabled: isTranscribing,
                      },
                      {
                        onClick: () => handleDelete(h.id),
                        icon: '✕',
                        color: '#ff3366',
                        title: 'Supprimer',
                        disabled: isTranscribing,
                      },
                    ].map((btn, i) => (
                      <button
                        key={i}
                        onClick={btn.onClick}
                        disabled={btn.disabled}
                        style={{
                          width: isMobile ? 28 : 32,
                          height: isMobile ? 28 : 32,
                          borderRadius: 8,
                          border: `1px solid ${btn.color}33`,
                          background: `${btn.color}10`,
                          color: btn.color,
                          fontSize: 14,
                          cursor: btn.disabled ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: btn.disabled ? 0.4 : 1,
                          transition: 'all 0.15s',
                        }}
                        title={btn.title}
                      >
                        {btn.icon}
                      </button>
                    ))}
                  </div>
                </div>

                <AudioPlayer src={h.audioUrl} color="#00ff88" compact />
              </GlassCard>
            );
          })}
        </div>

        {isGenerating && (
          <GlassCard
            padding={isMobile ? 16 : 20}
            glow="#00d9ff"
            style={{
              marginTop: 12,
              textAlign: 'center',
              borderStyle: 'dashed',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>🎵</div>
            <div style={{ fontSize: 12, color: '#00d9ff', fontWeight: 700 }}>
              Génération en cours... {Math.floor(progress)}%
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                marginTop: 4,
                fontFamily: 'monospace',
              }}
            >
              {elapsed}s / ~{estimatedTime}s
            </div>
          </GlassCard>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};