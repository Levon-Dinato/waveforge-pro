// src/pages/MusicGenPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { checkMusicGenHealth, generateMusic } from '../audio/musicgenClient';
import { musicgenHistory, type MusicGenHistoryEntry } from '../utils/musicgenHistory';

const PRESETS = [
  { id: 'lofi', label: 'Lo-Fi Chill', prompt: 'lofi hip hop beat, chill, jazzy, warm piano, vinyl crackle', color: '#ffd43b' },
  { id: 'trap', label: 'Trap 808', prompt: 'trap beat, dark, 808 bass, hi-hats, atmospheric', color: '#ff3366' },
  { id: 'house', label: 'Deep House', prompt: 'deep house, groovy, piano chords, four on the floor, club', color: '#00d9ff' },
  { id: 'ambient', label: 'Ambient', prompt: 'ambient soundscape, calm, atmospheric, pad, cinematic', color: '#7c5cff' },
  { id: 'edm', label: 'EDM Festival', prompt: 'edm, festival, big room, energetic, synth lead, drop', color: '#ff5cf0' },
  { id: 'jazz', label: 'Jazz Lounge', prompt: 'smooth jazz, saxophone, piano trio, lounge, relaxed', color: '#00ff88' },
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
  const [result, setResult] = useState<{ audioUrl: string; generationTime: number; prompt: string } | null>(null);
  const [history, setHistory] = useState<(MusicGenHistoryEntry & { audioUrl: string })[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const failCountRef = useRef(0);

  // ============================================================
  // HEALTH CHECK (désactivé pendant la génération)
  // ============================================================
  useEffect(() => {
    // ✅ Ne pas faire de health check pendant une génération
    // (sinon le serveur est trop occupé pour répondre et on voit OFFLINE à tort)
    if (isGenerating) return;

    const checkHealth = async () => {
      const s = await checkMusicGenHealth();
      if (s.status === 'online') {
        failCountRef.current = 0;
        setIsOnline(true);
      } else {
        failCountRef.current++;
        // ✅ Ne passer OFFLINE qu'après 3 échecs consécutifs (30 sec)
        if (failCountRef.current >= 3) {
          setIsOnline(false);
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // ============================================================
  // CHARGEMENT DE L'HISTORIQUE
  // ============================================================
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const entries = await musicgenHistory.getAll();
    const withUrls = entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map((e) => ({
        ...e,
        audioUrl: URL.createObjectURL(e.audioBlob),
      }));
    setHistory(withUrls);
  };

  // ============================================================
  // ESTIMATION DU TEMPS
  // ============================================================
  const estimatedTime = duration * 8;

  // ============================================================
  // GÉNÉRATION
  // ============================================================
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Écris une description du morceau que tu veux générer.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setStatus('Initialisation...');
    setProgress(0);
    setElapsed(0);
    setResult(null);

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
      const newResult = { ...res, prompt: prompt.trim() };
      setResult(newResult);

      // Sauvegarde dans l'historique
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
      if (e.name === 'AbortError') {
        console.log('Génération annulée');
      } else {
        console.error(e);
        alert(`Erreur : ${e.message}\n\nVérifie que le serveur MusicGen est lancé.`);
      }
    } finally {
      setIsGenerating(false);
      setStatus('');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      abortRef.current = null;
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setIsGenerating(false);
    setStatus('');
    setProgress(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Supprimer ce morceau de l'historique ?")) return;
    await musicgenHistory.delete(id);
    await loadHistory();
  };

  const handleClearHistory = async () => {
    if (!confirm("Effacer TOUT l'historique ? Action irréversible.")) return;
    await musicgenHistory.clear();
    await loadHistory();
  };

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 20 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
            🎵 <span style={{ color: '#00ff88' }}>Génération IA</span>
            <span style={{ fontSize: 10, color: '#00ff88', marginLeft: 10, padding: '2px 8px', background: 'rgba(0, 255, 136, 0.15)', border: '1px solid rgba(0, 255, 136, 0.4)', borderRadius: 10, verticalAlign: 'middle', fontWeight: 700 }}>LOCAL</span>
          </h2>
          <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
            Génère des instrumentaux avec MusicGen (Meta) · 100% local · gratuit
          </p>
        </div>

        {/* BADGE DE STATUT */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: isGenerating
              ? 'rgba(0, 217, 255, 0.06)'
              : isOnline
              ? 'rgba(0, 255, 136, 0.06)'
              : 'rgba(255, 51, 102, 0.06)',
            border: `1px solid ${
              isGenerating
                ? 'rgba(0, 217, 255, 0.3)'
                : isOnline
                ? 'rgba(0, 255, 136, 0.3)'
                : 'rgba(255, 51, 102, 0.3)'
            }`,
            borderRadius: 8,
            fontSize: 10,
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
              animation: isGenerating ? 'pulse 1s infinite' : 'none',
            }}
          />
          {isGenerating
            ? 'MUSICGEN · CALCUL'
            : isOnline === null
            ? 'MUSICGEN ...'
            : isOnline
            ? 'MUSICGEN ONLINE'
            : 'MUSICGEN OFFLINE'}
        </div>
      </div>

      {/* OFFLINE (seulement si vraiment offline ET pas en génération) */}
      {isOnline === false && !isGenerating && (
        <div className="panel" style={{ padding: 20, borderColor: 'rgba(255, 51, 102, 0.3)', background: 'linear-gradient(135deg, rgba(255, 51, 102, 0.03), transparent)' }}>
          <div style={{ fontSize: 13, color: '#ff3366', fontWeight: 600, marginBottom: 8 }}>⚠️ Serveur MusicGen hors ligne</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Lance le serveur Python :</div>
          <div style={{ padding: 12, background: 'var(--bg-1)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#ccc', lineHeight: 1.8 }}>
            <div style={{ color: '#666' }}># Dans un terminal PowerShell :</div>
            <div>cd C:\Users\NATO\Projets\musicgen-server</div>
            <div>.\venv\Scripts\Activate.ps1</div>
            <div>python server.py</div>
          </div>
        </div>
      )}

      {/* PRESETS + FORMULAIRE */}
      <div className="panel" style={{ padding: 20 }}>
        <div className="label-uppercase" style={{ fontSize: 10, color: '#666', marginBottom: 12, letterSpacing: '1px' }}>🎨 PRESETS RAPIDES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 20 }}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPrompt(p.prompt)}
              disabled={isGenerating}
              className="btn-action"
              style={{
                borderColor: prompt === p.prompt ? p.color : 'var(--border)',
                color: prompt === p.prompt ? p.color : '#ccc',
                background: prompt === p.prompt ? `${p.color}15` : 'var(--bg-1)',
                fontSize: 11,
                justifyContent: 'center',
                opacity: isGenerating ? 0.5 : 1,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="label-uppercase" style={{ fontSize: 10, color: '#666', marginBottom: 8, letterSpacing: '1px' }}>📝 DESCRIPTION</div>
        <textarea
          id="musicgen-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
          placeholder="Ex: lofi hip hop beat, chill, jazzy piano, vinyl crackle..."
          rows={3}
          style={{
            width: '100%',
            padding: 12,
            background: 'var(--bg-1)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: '#fff',
            fontSize: 12,
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
            opacity: isGenerating ? 0.5 : 1,
          }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 6 }}>DURÉE : {duration}s</div>
            <input type="range" min={4} max={30} step={1} value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} disabled={isGenerating} style={{ width: '100%', accentColor: '#00ff88' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#666', marginTop: 2 }}><span>4s</span><span>30s</span></div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 6 }}>CRÉATIVITÉ : {temperature.toFixed(1)}</div>
            <input type="range" min={0.3} max={1.5} step={0.1} value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} disabled={isGenerating} style={{ width: '100%', accentColor: '#00ff88' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#666', marginTop: 2 }}><span>Sage</span><span>Créatif</span></div>
          </div>
        </div>

        {/* BARRE DE PROGRESSION */}
        {isGenerating && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 10 }}>
              <span style={{ color: '#00ff88', fontWeight: 600 }}>⏳ {status}</span>
              <span className="mono" style={{ color: '#666' }}>
                {elapsed}s / ~{estimatedTime}s
              </span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'var(--bg-1)', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #00ff88, #00b866)',
                  transition: 'width 0.2s linear',
                  borderRadius: 3,
                }}
              />
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 10,
                color: '#666',
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              💡 Le serveur est en calcul intense. Le badge reste vert car c'est normal.
            </div>
          </div>
        )}

        {/* BOUTONS */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isOnline !== true}
            className="btn-action primary"
            style={{
              flex: 1,
              padding: 14,
              background:
                isGenerating || isOnline !== true
                  ? 'var(--bg-2)'
                  : 'linear-gradient(135deg, #00ff88, #00b866)',
              color: isGenerating || isOnline !== true ? '#666' : '#000',
              borderColor: 'transparent',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '1px',
              justifyContent: 'center',
            }}
          >
            {isGenerating
              ? `⏳ GÉNÉRATION... ${Math.floor(progress)}%`
              : isOnline === false
              ? '❌ SERVEUR HORS LIGNE'
              : '🎵 GÉNÉRER LE MORCEAU'}
          </button>

          {isGenerating && (
            <button
              onClick={handleCancel}
              className="btn-action"
              style={{
                padding: '14px 20px',
                background: '#ff3366',
                color: '#fff',
                borderColor: 'transparent',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              ⏹ ANNULER
            </button>
          )}
        </div>
      </div>

      {/* RÉSULTAT */}
      {result && !isGenerating && (
        <div className="panel fade-in" style={{ padding: 20, borderColor: 'rgba(0, 255, 136, 0.3)', background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.04), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#00ff88' }}>✅ Génération réussie</div>
            <div className="mono" style={{ fontSize: 10, color: '#666' }}>⚡ {result.generationTime}s de calcul</div>
          </div>

          <div style={{ fontSize: 10, color: '#888', marginBottom: 10, fontStyle: 'italic' }}>"{result.prompt}"</div>

          <audio src={result.audioUrl} controls style={{ width: '100%', marginBottom: 12 }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            <button onClick={() => handleDownload(result.audioUrl, `musicgen-${Date.now()}.wav`)} className="btn-action" style={{ color: '#00ff88', borderColor: 'rgba(0, 255, 136, 0.3)', justifyContent: 'center', fontSize: 11 }}>💾 TÉLÉCHARGER</button>
            <button onClick={handleGenerate} className="btn-action" style={{ color: '#ffd43b', borderColor: 'rgba(255, 212, 59, 0.3)', justifyContent: 'center', fontSize: 11 }}>🔄 RÉGÉNÉRER</button>
            <Link to="/mastering" className="btn-action" style={{ color: '#7c5cff', borderColor: 'rgba(124, 92, 255, 0.3)', justifyContent: 'center', fontSize: 11, textDecoration: 'none' }}>🎚️ MASTERING</Link>
            <Link to="/studio" className="btn-action" style={{ color: '#00d9ff', borderColor: 'rgba(0, 217, 255, 0.3)', justifyContent: 'center', fontSize: 11, textDecoration: 'none' }}>🎹 STUDIO</Link>
          </div>
        </div>
      )}

      {/* HISTORIQUE */}
      {history.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="label-uppercase" style={{ fontSize: 10, color: '#666', letterSpacing: '1px' }}>📦 HISTORIQUE · {history.length}</div>
            <button onClick={handleClearHistory} className="btn-action" style={{ padding: '4px 10px', fontSize: 10, color: '#ff3366' }}>🗑️ TOUT EFFACER</button>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {history.map((h) => (
              <div key={h.id} className="panel" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.prompt}</div>
                    <div className="mono" style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
                      {new Date(h.timestamp).toLocaleTimeString('fr-FR')} · {h.duration}s · ⚡ {h.generationTime}s
                    </div>
                  </div>
                  <button onClick={() => setResult({ audioUrl: h.audioUrl, generationTime: h.generationTime, prompt: h.prompt })} className="btn-action" style={{ fontSize: 10, padding: '4px 10px' }} title="Réécouter">▶</button>
                  <button onClick={() => handleDownload(h.audioUrl, `musicgen-${h.id}.wav`)} className="btn-action" style={{ fontSize: 10, padding: '4px 10px' }} title="Télécharger">💾</button>
                  <button onClick={() => handleDeleteEntry(h.id)} className="btn-action" style={{ fontSize: 10, padding: '4px 10px', color: '#ff3366', borderColor: 'rgba(255, 51, 102, 0.3)' }} title="Supprimer">✕</button>
                </div>
                <audio src={h.audioUrl} controls style={{ width: '100%', height: 28 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};