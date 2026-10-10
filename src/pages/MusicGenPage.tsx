// src/pages/MusicGenPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { checkMusicGenHealth, generateMusic } from '../audio/musicgenClient';
import { musicgenHistory, type MusicGenHistoryEntry } from '../utils/musicgenHistory';
import { AudioPlayer } from '../components/AudioPlayer';

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

export const MusicGenPage: React.FC = () => {
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

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const failCountRef = useRef(0);

  // Health check
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

  // Chargement historique + favoris
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

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div
      className="fade-in"
      style={{
        padding: 20,
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 340px) 1fr',
        gap: 20,
        alignItems: 'start',
        minHeight: 'calc(100vh - 40px)',
      }}
    >
      {/* ============================================================ */}
      {/* COLONNE GAUCHE : CRÉATION */}
      {/* ============================================================ */}
      <div
        className="panel"
        style={{
          padding: 0,
          position: 'sticky',
          top: 20,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 40px)',
          overflow: 'hidden',
        }}
      >
        {/* Header du panneau */}
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
              style={{
                fontSize: 10,
                color: '#666',
                letterSpacing: '1px',
                marginBottom: 4,
              }}
            >
              CRÉATION
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
              🎵 Nouveau morceau
            </div>
          </div>

          {/* Badge statut */}
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

        {/* Contenu défilable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* OFFLINE */}
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

          {/* PRESETS */}
          <div style={{ marginBottom: 16 }}>
            <div
              className="label-uppercase"
              style={{
                fontSize: 9,
                color: '#666',
                letterSpacing: '1px',
                marginBottom: 8,
              }}
            >
              STYLE RAPIDE
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
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
                    background:
                      selectedPreset === p.id ? `${p.color}20` : 'var(--bg-1)',
                    border: `1px solid ${
                      selectedPreset === p.id ? p.color : 'var(--border)'
                    }`,
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

          {/* DESCRIPTION */}
          <div style={{ marginBottom: 16 }}>
            <div
              className="label-uppercase"
              style={{
                fontSize: 9,
                color: '#666',
                letterSpacing: '1px',
                marginBottom: 8,
              }}
            >
              DESCRIPTION
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              placeholder="Ex: lofi hip hop beat, chill, jazzy piano..."
              rows={4}
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

          {/* DURÉE */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <div
                className="label-uppercase"
                style={{ fontSize: 9, color: '#666', letterSpacing: '1px' }}
              >
                DURÉE
              </div>
              <span
                className="mono"
                style={{ fontSize: 11, color: '#00ff88', fontWeight: 700 }}
              >
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

          {/* CRÉATIVITÉ */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <div
                className="label-uppercase"
                style={{ fontSize: 9, color: '#666', letterSpacing: '1px' }}
              >
                CRÉATIVITÉ
              </div>
              <span
                className="mono"
                style={{ fontSize: 11, color: '#00d9ff', fontWeight: 700 }}
              >
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

          {/* PROGRESSION */}
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
                <span style={{ color: '#00ff88', fontWeight: 600 }}>
                  ⏳ {status}
                </span>
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

        {/* BOUTON GÉNÉRER (fixe en bas) */}
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
                cursor:
                  isGenerating || isOnline !== true ? 'not-allowed' : 'pointer',
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

      {/* ============================================================ */}
      {/* COLONNE DROITE : LISTE DES MORCEAUX */}
      {/* ============================================================ */}
      <div style={{ minWidth: 0 }}>
        {/* Header */}
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
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
              🎵 <span style={{ color: '#00ff88' }}>Génération IA</span>
            </h2>
            <p style={{ color: '#888', fontSize: 11, margin: '4px 0 0' }}>
              MusicGen (Meta) · 100% local · {history.length} morceau{history.length > 1 ? 'x' : ''}
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

        {/* État vide */}
        {history.length === 0 && !isGenerating && (
          <div
            className="panel"
            style={{
              padding: 48,
              textAlign: 'center',
              borderStyle: 'dashed',
              borderColor: 'rgba(0, 255, 136, 0.2)',
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎵</div>
            <div
              style={{
                fontSize: 15,
                color: '#fff',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
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
              Choisis un style dans le panneau de gauche, décris ce que tu
              veux, puis clique sur <strong style={{ color: '#00ff88' }}>GÉNÉRER</strong>.
            </div>
          </div>
        )}

        {/* Liste des morceaux */}
        <div style={{ display: 'grid', gap: 12 }}>
          {history.map((h, index) => {
            const isFav = favorites.has(h.id);
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
                  border: index === 0 && !isGenerating ? '1px solid rgba(0, 255, 136, 0.3)' : '1px solid var(--border)',
                  background: index === 0 && !isGenerating ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.03), transparent)' : undefined,
                  transition: 'all 0.2s',
                }}
              >
                {/* En-tête du morceau */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Numéro / Nouveau */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: index === 0 && !isGenerating
                        ? 'rgba(0, 255, 136, 0.15)'
                        : 'var(--bg-1)',
                      border: `1px solid ${index === 0 && !isGenerating ? 'rgba(0, 255, 136, 0.4)' : 'var(--border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                      color: index === 0 && !isGenerating ? '#00ff88' : '#888',
                      fontWeight: 700,
                    }}
                  >
                    {index === 0 && !isGenerating ? '★' : history.length - index}
                  </div>

                  {/* Titre + sous-titre */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#fff',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: 4,
                      }}
                    >
                      {h.prompt}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
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
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => toggleFavorite(h.id)}
                      style={{
                        width: 32,
                        height: 32,
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
                        width: 32,
                        height: 32,
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
                        width: 32,
                        height: 32,
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

                {/* Player LED */}
                <AudioPlayer
                  src={h.audioUrl}
                  color="#00ff88"
                  compact
                />
              </div>
            );
          })}
        </div>

        {/* Message pendant génération */}
        {isGenerating && (
          <div
            className="panel"
            style={{
              marginTop: 12,
              padding: 20,
              borderStyle: 'dashed',
              borderColor: 'rgba(0, 217, 255, 0.3)',
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.03), transparent)',
            }}
          >
            <div
              style={{
                fontSize: 24,
                marginBottom: 8,
                animation: 'pulse 1.5s infinite',
              }}
            >
              🎵
            </div>
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