// src/pages/MusicGenPage.tsx
import React, { useState, useEffect } from 'react';
import { checkMusicGenHealth, generateMusic } from '../audio/musicgenClient';

const PRESETS = [
  { id: 'lofi', label: 'Lo-Fi Chill', prompt: 'lofi hip hop beat, chill, jazzy, warm piano, vinyl crackle', color: '#ffd43b' },
  { id: 'trap', label: 'Trap 808', prompt: 'trap beat, dark, 808 bass, hi-hats, atmospheric', color: '#ff3366' },
  { id: 'house', label: 'Deep House', prompt: 'deep house, groovy, piano chords, four on the floor, club', color: '#00d9ff' },
  { id: 'ambient', label: 'Ambient', prompt: 'ambient soundscape, calm, atmospheric, pad, cinematic', color: '#7c5cff' },
  { id: 'edm', label: 'EDM Festival', prompt: 'edm, festival, big room, energetic, synth lead, drop', color: '#ff5cf0' },
  { id: 'jazz', label: 'Jazz Lounge', prompt: 'smooth jazz, saxophone, piano trio, lounge, relaxed', color: '#00ff88' },
];

export const MusicGenPage: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(8);
  const [temperature, setTemperature] = useState(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<{ audioUrl: string; generationTime: number; prompt: string } | null>(null);
  const [history, setHistory] = useState<{ audioUrl: string; prompt: string; timestamp: number }[]>([]);

  useEffect(() => {
    checkMusicGenHealth().then((s) => setIsOnline(s.status === 'online'));
    const interval = setInterval(() => {
      checkMusicGenHealth().then((s) => setIsOnline(s.status === 'online'));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Écris une description du morceau que tu veux générer.');
      return;
    }
    setIsGenerating(true);
    setStatus('Initialisation...');
    setResult(null);

    try {
      const res = await generateMusic(
        { prompt: prompt.trim(), duration, temperature },
        setStatus
      );
      setResult({ ...res, prompt: prompt.trim() });
      setHistory((prev) => [
        { audioUrl: res.audioUrl, prompt: prompt.trim(), timestamp: Date.now() },
        ...prev.slice(0, 4),
      ]);
    } catch (e: any) {
      console.error(e);
      alert(`Erreur : ${e.message}\n\nVérifie que le serveur MusicGen est lancé.`);
    } finally {
      setIsGenerating(false);
      setStatus('');
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

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: isOnline ? 'rgba(0, 255, 136, 0.06)' : 'rgba(255, 51, 102, 0.06)', border: `1px solid ${isOnline ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 51, 102, 0.3)'}`, borderRadius: 8, fontSize: 10, color: isOnline ? '#00ff88' : '#ff3366' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: isOnline ? '#00ff88' : '#ff3366', boxShadow: isOnline ? '0 0 8px #00ff88' : 'none' }} />
          MUSICGEN {isOnline === null ? '...' : isOnline ? 'ONLINE' : 'OFFLINE'}
        </div>
      </div>

      {/* ÉTAT OFFLINE */}
      {isOnline === false && (
        <div className="panel" style={{ padding: 20, borderColor: 'rgba(255, 51, 102, 0.3)', background: 'linear-gradient(135deg, rgba(255, 51, 102, 0.03), transparent)' }}>
          <div style={{ fontSize: 13, color: '#ff3366', fontWeight: 600, marginBottom: 8 }}>⚠️ Serveur MusicGen hors ligne</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
            Pour utiliser la génération IA, lance le serveur Python sur ton PC :
          </div>
          <div style={{ padding: 12, background: 'var(--bg-1)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#ccc', lineHeight: 1.8 }}>
            <div style={{ color: '#666' }}># Dans un terminal PowerShell :</div>
            <div>cd C:\Users\NATO\Projets\musicgen-server</div>
            <div>.\venv\Scripts\Activate.ps1</div>
            <div>python server.py</div>
          </div>
        </div>
      )}

      {/* FORMULAIRE */}
      <div className="panel" style={{ padding: 20 }}>
        <div className="label-uppercase" style={{ fontSize: 10, color: '#666', marginBottom: 12, letterSpacing: '1px' }}>🎨 PRESETS RAPIDES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 20 }}>
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => setPrompt(p.prompt)} className="btn-action" style={{ borderColor: prompt === p.prompt ? p.color : 'var(--border)', color: prompt === p.prompt ? p.color : '#ccc', background: prompt === p.prompt ? `${p.color}15` : 'var(--bg-1)', fontSize: 11, justifyContent: 'center' }}>{p.label}</button>
          ))}
        </div>

        <div className="label-uppercase" style={{ fontSize: 10, color: '#666', marginBottom: 8, letterSpacing: '1px' }}>📝 DESCRIPTION</div>
        <textarea id="musicgen-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ex: lofi hip hop beat, chill, jazzy piano, vinyl crackle..." rows={3} style={{ width: '100%', padding: 12, background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, color: '#fff', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 6 }}>DURÉE : {duration}s</div>
            <input type="range" min={4} max={30} step={1} value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#00ff88' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#666', marginTop: 2 }}><span>4s</span><span>30s</span></div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 6 }}>CRÉATIVITÉ : {temperature.toFixed(1)}</div>
            <input type="range" min={0.3} max={1.5} step={0.1} value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00ff88' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#666', marginTop: 2 }}><span>Sage</span><span>Créatif</span></div>
          </div>
        </div>

        <button onClick={handleGenerate} disabled={isGenerating || isOnline !== true} className="btn-action primary" style={{ width: '100%', marginTop: 20, padding: 14, background: isGenerating || isOnline !== true ? 'var(--bg-2)' : 'linear-gradient(135deg, #00ff88, #00b866)', color: isGenerating || isOnline !== true ? '#666' : '#000', borderColor: 'transparent', fontWeight: 700, fontSize: 13, letterSpacing: '1px' }}>
          {isGenerating ? `⏳ ${status}` : isOnline === false ? '❌ SERVEUR HORS LIGNE' : '🎵 GÉNÉRER LE MORCEAU'}
        </button>

        {isGenerating && (
          <div style={{ marginTop: 12, fontSize: 10, color: '#888', textAlign: 'center' }}>
            ⏱️ Temps estimé : {duration * 8}s à {duration * 15}s sur CPU
          </div>
        )}
      </div>

      {/* RÉSULTAT */}
      {result && (
        <div className="panel fade-in" style={{ padding: 20, borderColor: 'rgba(0, 255, 136, 0.3)', background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.04), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#00ff88' }}>✅ Génération réussie</div>
            <div className="mono" style={{ fontSize: 10, color: '#666' }}>⚡ {result.generationTime}s</div>
          </div>
          <div style={{ fontSize: 10, color: '#888', marginBottom: 10, fontStyle: 'italic' }}>"{result.prompt}"</div>
          <audio src={result.audioUrl} controls style={{ width: '100%', marginBottom: 12 }} />
          <button onClick={() => handleDownload(result.audioUrl, `musicgen-${Date.now()}.wav`)} className="btn-action" style={{ width: '100%', color: '#00ff88', borderColor: 'rgba(0, 255, 136, 0.3)', justifyContent: 'center' }}>💾 TÉLÉCHARGER WAV</button>
        </div>
      )}

      {/* HISTORIQUE */}
      {history.length > 0 && (
        <div>
          <div className="label-uppercase" style={{ fontSize: 10, color: '#666', marginBottom: 12, letterSpacing: '1px' }}>📦 HISTORIQUE · {history.length}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {history.map((h, i) => (
              <div key={i} className="panel" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.prompt}</div>
                  <div className="mono" style={{ fontSize: 9, color: '#666', marginTop: 2 }}>{new Date(h.timestamp).toLocaleTimeString('fr-FR')}</div>
                </div>
                <button onClick={() => setResult({ audioUrl: h.audioUrl, generationTime: 0, prompt: h.prompt })} className="btn-action" style={{ fontSize: 10, padding: '4px 10px' }}>▶</button>
                <button onClick={() => handleDownload(h.audioUrl, `musicgen-${i}.wav`)} className="btn-action" style={{ fontSize: 10, padding: '4px 10px' }}>💾</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};