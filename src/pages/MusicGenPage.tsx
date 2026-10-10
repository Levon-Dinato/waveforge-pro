// src/pages/MusicGenPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkMusicGenHealth, generateMusic } from '../audio/musicgenClient';
import { musicgenHistory, type MusicGenHistoryEntry } from '../utils/musicgenHistory';
import { audioTransfer } from '../utils/audioTransfer';
import { AudioPlayer } from '../components/AudioPlayer';
import { useIsMobile } from '../hooks/useIsMobile';

const PRESETS = [
  { id: 'lofi', label: 'Lo-Fi', prompt: 'lofi hip hop beat, chill, jazzy, warm piano, vinyl crackle', color: '#ffd43b' },
  { id: 'trap', label: 'Trap', prompt: 'trap beat, dark, 808 bass, hi-hats, atmospheric', color: '#ff3366' },
  { id: 'house', label: 'House', prompt: 'deep house, groovy, piano chords, four on the floor, club', color: '#00d9ff' },
  { id: 'ambient', label: 'Ambient', prompt: 'ambient soundscape, calm, atmospheric, pad, cinematic', color: '#7c5cff' },
  { id: 'edm', label: 'EDM', prompt: 'edm, festival, big room, energetic, synth lead, drop', color: '#ff5cf0' },
  { id: 'jazz', label: 'Jazz', prompt: 'smooth jazz, saxophone, piano trio, lounge, relaxed', color: '#00ff88' },
  { id: 'synthwave', label: 'Synthwave', prompt: 'synthwave, retro 80s, neon, drum machine, analog synth', color: '#ec4899' },
  { id: 'cinematic', label: 'Cinematic', prompt: 'cinematic orchestral, epic, strings, brass, emotional', color: '#f59e0b' },
  { id: 'techno', label: 'Techno', prompt: 'techno, dark, industrial, driving kick, hypnotic', color: '#06b6d4' },
  { id: 'reggaeton', label: 'Reggaeton', prompt: 'reggaeton, latin, dembow, catchy, dance', color: '#10b981' },
];

type SortOption = 'recent' | 'old' | 'duration' | 'az';
const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: 'recent', label: 'Récents', icon: '🕐' },
  { value: 'old', label: 'Anciens', icon: '📅' },
  { value: 'duration', label: 'Durée', icon: '⏱️' },
  { value: 'az', label: 'A-Z', icon: '🔤' },
];

export const MusicGenPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(8);
  const [temperature, setTemperature] = useState(1.0);
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
    if (showFavoritesOnly) {
      result = result.filter((h) => favorites.has(h.id));
    }
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

  const estimatedTime = duration * 8;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Écris une description du morceau.');
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
        { prompt: prompt.trim(), duration, temperature },
        setStatus
      );
      setProgress(100);
      const blob = await fetch(res.audioUrl).then((r) => r.blob());
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
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        alert(`Erreur : ${e.message}`);
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

  // ✅ NOUVEAU : Envoyer vers Studio ou Mastering
  const handleTransfer = async (entry: MusicGenHistoryEntry, target: 'studio' | 'mastering') => {
    const filename = `${(entry.title || entry.prompt).replace(/[^a-z0-9]/gi, '-').slice(0, 40)}.wav`;
    await audioTransfer.save(entry.audioBlob, filename, target);
    navigate(target === 'studio' ? '/studio' : '/mastering');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce morceau ?')) return;
    await musicgenHistory.delete(id);
    await loadHistory();
  };

  const handleClearHistory = async () => {
    if (!confirm("Effacer TOUT l'historique ?")) return;
    await musicgenHistory.clear();
    await loadHistory();
  };

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const saveTitle = async (id: string) => {
    const newTitle = editingTitle.trim();
    if (newTitle) {
      await musicgenHistory.update(id, { title: newTitle });
    }
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
      className="fade-in"
      style={{
        padding: isMobile ? 12 : 20,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 340px) 1fr',
        gap: isMobile ? 16 : 20,
        alignItems: 'start',
        minHeight: isMobile ? 'auto' : 'calc(100vh - 40px)',
      }}
    >
      {/* COLONNE GAUCHE : CRÉATION */}
      <div
        className="panel"
        style={{
          padding: 0,
          position: isMobile ? 'relative' : 'sticky',
          top: isMobile ? 'auto' : 20,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: isMobile ? 'none' : 'calc(100vh - 40px)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              className="label-uppercase"
              style={{ fontSize: 10, color: '#666', letterSpacing: '1px', marginBottom: 4 }}
            >
              CRÉATION
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
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
              borderRadius: 6,
              fontSize: 9,
              fontWeight: 700,
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
                boxShadow: isGenerating ? '0 0 8px #00d9ff' : isOnline ? '0 0 8px #00ff88' : 'none',
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
                background: 'rgba(255, 51, 102, 0.06)',
                border: '1px solid rgba(255, 51, 102, 0.3)',
                borderRadius: 8,
                fontSize: 10,
                color: '#ff3366',
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              ⚠️ Serveur MusicGen hors ligne.
              <div style={{ color: '#888', marginTop: 6 }}>
                Lance le serveur avec <strong>start-all.bat</strong>.
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div
              className="label-uppercase"
              style={{ fontSize: 9, color: '#666', letterSpacing: '1px', marginBottom: 8 }}
            >
              STYLE RAPIDE
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPrompt(p.prompt);
                    setSelectedPreset(p.id);
                  }}
                  disabled={isGenerating}
                  style={{
                    padding: '5px 10px',
                    background: selectedPreset === p.id ? `${p.color}20` : 'var(--bg-1)',
                    border: `1px solid ${selectedPreset === p.id ? p.color : 'var(--border)'}`,
                    borderRadius: 12,
                    color: selectedPreset === p.id ? p.color : '#ccc',
                    fontSize: 10,
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    fontWeight: selectedPreset === p.id ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div
              className="label-uppercase"
              style={{ fontSize: 9, color: '#666', letterSpacing: '1px', marginBottom: 8 }}
            >
              DESCRIPTION
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              placeholder="Ex: lofi hip hop beat, chill, jazzy piano..."
              rows={isMobile ? 3 : 4}
              style={{
                width: '100%',
                padding: 10,
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: '#fff',
                fontSize: 11,
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
                opacity: isGenerating ? 0.5 : 1,
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <div className="label-uppercase" style={{ fontSize: 9, color: '#666', letterSpacing: '1px' }}>
                DURÉE
              </div>
              <span className="mono" style={{ fontSize: 11, color: '#00ff88', fontWeight: 700 }}>
                {duration}s
              </span>
            </div>
            <input
              type="range"
              min={4}
              max={30}
              step={1}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              disabled={isGenerating}
              style={{ width: '100%', accentColor: '#00ff88' }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 8,
                color: '#666',
                marginTop: 2,
              }}
            >
              <span>4s</span>
              <span>30s</span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <div className="label-uppercase" style={{ fontSize: 9, color: '#666', letterSpacing: '1px' }}>
                CRÉATIVITÉ
              </div>
              <span className="mono" style={{ fontSize: 11, color: '#00d9ff', fontWeight: 700 }}>
                {temperature.toFixed(1)}
              </span>
            </div>
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
                fontSize: 8,
                color: '#666',
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
                borderRadius: 8,
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
                <span style={{ color: '#00ff88', fontWeight: 600 }}>⏳ {status}</span>
                <span className="mono" style={{ color: '#666' }}>
                  {elapsed}s / ~{estimatedTime}s
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: 'var(--bg-1)',
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
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: 16,
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-0)',
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
                borderRadius: 10,
                background:
                  isGenerating || isOnline !== true
                    ? 'var(--bg-2)'
                    : 'linear-gradient(135deg, #00ff88, #00b866)',
                color: isGenerating || isOnline !== true ? '#666' : '#000',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '1px',
                cursor: isGenerating || isOnline !== true ? 'not-allowed' : 'pointer',
                boxShadow:
                  isGenerating || isOnline !== true
                    ? 'none'
                    : '0 4px 20px rgba(0, 255, 136, 0.4)',
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
                  borderRadius: 10,
                  background: '#ff3366',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⏹
              </button>
            )}
          </div>
        </div>
      </div>

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
            <h2 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, margin: 0 }}>
              🎵 <span style={{ color: '#00ff88' }}>Génération IA</span>
            </h2>
            <p style={{ color: '#888', fontSize: 11, margin: '4px 0 0' }}>
              MusicGen (Meta) · 100% local · {history.length} morceau{history.length > 1 ? 'x' : ''}
              {filteredHistory.length !== history.length &&
                ` · ${filteredHistory.length} affiché${filteredHistory.length > 1 ? 's' : ''}`}
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid rgba(255, 51, 102, 0.3)',
                borderRadius: 6,
                color: '#ff3366',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.5px',
              }}
            >
              🗑️ TOUT EFFACER
            </button>
          )}
        </div>

        {history.length > 0 && (
          <div
            className="panel"
            style={{
              padding: 10,
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
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 11,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
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
                    color: '#666',
                    fontSize: 14,
                    cursor: 'pointer',
                    padding: 2,
                  }}
                  title="Effacer"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              style={{
                padding: '8px 12px',
                background: showFavoritesOnly ? 'rgba(255, 51, 102, 0.15)' : 'var(--bg-1)',
                border: `1px solid ${showFavoritesOnly ? '#ff3366' : 'var(--border)'}`,
                borderRadius: 6,
                color: showFavoritesOnly ? '#ff3366' : '#ccc',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Afficher uniquement les favoris"
            >
              {showFavoritesOnly ? '❤️' : '🤍'} Favoris
            </button>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: '#ccc',
                  fontSize: 11,
                  fontWeight: 600,
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
                      background: '#0d0d14',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      minWidth: 140,
                      overflow: 'hidden',
                      zIndex: 51,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
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
                          color: sortBy === opt.value ? '#00ff88' : '#ccc',
                          fontSize: 11,
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontWeight: sortBy === opt.value ? 600 : 400,
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
          </div>
        )}

        {history.length === 0 && !isGenerating && (
          <div
            className="panel"
            style={{
              padding: isMobile ? 32 : 48,
              textAlign: 'center',
              borderStyle: 'dashed',
              borderColor: 'rgba(0, 255, 136, 0.2)',
            }}
          >
            <div style={{ fontSize: isMobile ? 48 : 64, marginBottom: 16 }}>🎵</div>
            <div style={{ fontSize: 15, color: '#fff', fontWeight: 600, marginBottom: 8 }}>
              Aucun morceau pour le moment
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#888',
                maxWidth: 400,
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              Choisis un style dans le panneau, décris ce que tu veux, puis clique sur{' '}
              <strong style={{ color: '#00ff88' }}>GÉNÉRER</strong>.
            </div>
          </div>
        )}

        {history.length > 0 && filteredHistory.length === 0 && (
          <div
            className="panel"
            style={{
              padding: 32,
              textAlign: 'center',
              borderStyle: 'dashed',
              borderColor: 'rgba(255, 212, 59, 0.3)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 13, color: '#ffd43b', fontWeight: 600, marginBottom: 6 }}>
              Aucun résultat
            </div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>
              {showFavoritesOnly
                ? 'Aucun favori ne correspond à ta recherche.'
                : 'Aucun morceau ne correspond à ta recherche.'}
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setShowFavoritesOnly(false);
              }}
              className="btn-action"
              style={{ fontSize: 11 }}
            >
              🔄 Réinitialiser les filtres
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {filteredHistory.map((h, index) => {
            const isFav = favorites.has(h.id);
            const isEditing = editingId === h.id;
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
              <div
                key={h.id}
                className="panel"
                style={{
                  padding: 14,
                  border:
                    isNewest && !isGenerating
                      ? '1px solid rgba(0, 255, 136, 0.3)'
                      : '1px solid var(--border)',
                  background:
                    isNewest && !isGenerating
                      ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.03), transparent)'
                      : undefined,
                  transition: 'all 0.2s',
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
                      borderRadius: 8,
                      background:
                        isNewest && !isGenerating ? 'rgba(0, 255, 136, 0.15)' : 'var(--bg-1)',
                      border: `1px solid ${
                        isNewest && !isGenerating ? 'rgba(0, 255, 136, 0.4)' : 'var(--border)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                      color: isNewest && !isGenerating ? '#00ff88' : '#888',
                      fontWeight: 700,
                    }}
                  >
                    {isNewest && !isGenerating ? '★' : index + 1}
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
                            background: 'var(--bg-1)',
                            border: '1px solid #00ff88',
                            borderRadius: 4,
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
                            borderRadius: 4,
                            color: '#000',
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title="Enregistrer"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEditing}
                          style={{
                            padding: '4px 8px',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            color: '#888',
                            fontSize: 10,
                            cursor: 'pointer',
                          }}
                          title="Annuler"
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
                        title="Clique pour renommer"
                      >
                        <div
                          style={{
                            fontSize: isMobile ? 11 : 12,
                            color: '#fff',
                            fontWeight: 600,
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
                            color: '#666',
                            opacity: 0.6,
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
                          color: '#666',
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
                        color: '#666',
                        fontFamily: 'var(--font-mono)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>📅 {dateStr}</span>
                      <span>⏱️ {h.duration}s</span>
                      <span>⚡ {h.generationTime}s</span>
                    </div>
                  </div>

                  {/* Boutons actions */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexShrink: 0,
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <button
                      onClick={() => handleTransfer(h, 'studio')}
                      style={{
                        width: isMobile ? 28 : 32,
                        height: isMobile ? 28 : 32,
                        borderRadius: 6,
                        border: '1px solid rgba(0, 217, 255, 0.3)',
                        background: 'rgba(0, 217, 255, 0.05)',
                        color: '#00d9ff',
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Envoyer au Studio (analyse MIDI)"
                    >
                      🎹
                    </button>
                    <button
                      onClick={() => handleTransfer(h, 'mastering')}
                      style={{
                        width: isMobile ? 28 : 32,
                        height: isMobile ? 28 : 32,
                        borderRadius: 6,
                        border: '1px solid rgba(124, 92, 255, 0.3)',
                        background: 'rgba(124, 92, 255, 0.05)',
                        color: '#7c5cff',
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Envoyer au Mastering"
                    >
                      🎚️
                    </button>
                    <button
                      onClick={() => toggleFavorite(h.id)}
                      style={{
                        width: isMobile ? 28 : 32,
                        height: isMobile ? 28 : 32,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: isFav ? 'rgba(255, 51, 102, 0.1)' : 'transparent',
                        color: isFav ? '#ff3366' : '#666',
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      {isFav ? '❤️' : '🤍'}
                    </button>
                    <button
                      onClick={() => handleDownload(h.audioUrl, `musicgen-${h.id}.wav`)}
                      style={{
                        width: isMobile ? 28 : 32,
                        height: isMobile ? 28 : 32,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: '#00ff88',
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Télécharger"
                    >
                      💾
                    </button>
                    <button
                      onClick={() => handleDelete(h.id)}
                      style={{
                        width: isMobile ? 28 : 32,
                        height: isMobile ? 28 : 32,
                        borderRadius: 6,
                        border: '1px solid rgba(255, 51, 102, 0.3)',
                        background: 'transparent',
                        color: '#ff3366',
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <AudioPlayer src={h.audioUrl} color="#00ff88" compact />
              </div>
            );
          })}
        </div>

        {isGenerating && (
          <div
            className="panel"
            style={{
              marginTop: 12,
              padding: isMobile ? 16 : 20,
              borderStyle: 'dashed',
              borderColor: 'rgba(0, 217, 255, 0.3)',
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.03), transparent)',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>🎵</div>
            <div style={{ fontSize: 12, color: '#00d9ff', fontWeight: 600 }}>
              Génération en cours... {Math.floor(progress)}%
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#666',
                marginTop: 4,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {elapsed}s / ~{estimatedTime}s
            </div>
          </div>
        )}
      </div>
    </div>
  );
};