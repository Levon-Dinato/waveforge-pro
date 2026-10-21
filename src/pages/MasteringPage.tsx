// src/pages/MasteringPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MasteringPanel } from '../components/MasteringPanel';
import { SpectrumVisualizer } from '../components/SpectrumVisualizer';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { audioTransfer } from '../utils/audioTransfer';
import { LUFSMeter, type MasteringChain, type MasteringPreset } from '../audio/masteringChain';

interface MasteredExport {
  id: string;
  timestamp: number;
  preset: string;
  intensity: number;
  fileName: string;
  audioUrl: string;
  duration: number;
}

interface StoredExport extends Omit<MasteredExport, 'audioUrl'> {
  blob: Blob;
}

// ============================================================
// IndexedDB
// ============================================================
const EXPORT_DB = 'waveforge-mastering';
const EXPORT_STORE = 'exports';

function openExportDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(EXPORT_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(EXPORT_STORE)) {
        db.createObjectStore(EXPORT_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadExportsFromDB(): Promise<MasteredExport[]> {
  try {
    const db = await openExportDB();
    const stored: StoredExport[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(EXPORT_STORE, 'readonly');
      const req = tx.objectStore(EXPORT_STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return stored
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(s => ({ ...s, audioUrl: URL.createObjectURL(s.blob) }));
  } catch (e) {
    console.warn('IndexedDB load failed:', e);
    return [];
  }
}

async function saveExportToDB(exp: StoredExport): Promise<void> {
  const db = await openExportDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(EXPORT_STORE, 'readwrite');
    tx.objectStore(EXPORT_STORE).put(exp);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteExportFromDB(id: string): Promise<void> {
  const db = await openExportDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(EXPORT_STORE, 'readwrite');
    tx.objectStore(EXPORT_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ============================================================
// UI CONSTANTS & COMPONENTS
// ============================================================
const PRESET_INFO: Record<string, { name: string; description: string; color: string; values: string }> = {
  warm:     { name: 'WARM',     description: 'Chaud et chaleureux',               color: '#ffb800', values: '+5dB · -1dB' },
  balanced: { name: 'BALANCED', description: 'Neutre et équilibré',               color: '#00d9ff', values: '+4dB · +2dB' },
  open:     { name: 'OPEN',     description: 'Aérien et large',                   color: '#00ff88', values: '+5dB · +5dB' },
  master:   { name: 'MASTER',   description: 'Neutre (fichiers déjà masterisés)', color: '#888888', values: '+1dB · +1dB' },
};

const LufsMeter: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const isActive = isFinite(value) && value > -70;
  let color = 'var(--text-tertiary)';
  if (isActive) {
    if (value > -6) color = 'var(--accent-danger)';
    else if (value > -12) color = 'var(--accent-warning)';
    else color = 'var(--accent-success)';
  }
  const percent = isActive ? Math.max(0, Math.min(100, ((value + 30) / 30) * 100)) : 0;
  
  return (
    <div style={{ background: 'var(--bg-0)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="wf-label" style={{ fontSize: 9 }}>{label}</span>
        <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: isActive ? '#fff' : 'var(--text-tertiary)' }}>
          {isActive ? value.toFixed(1) : '---'}
        </span>
      </div>
      <div style={{ height: 3, background: 'var(--bg-2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: color, boxShadow: isActive ? `0 0 8px ${color}` : 'none', transition: 'width 0.1s' }} />
      </div>
    </div>
  );
};

const PresetCard: React.FC<{ name: string; description: string; color: string; isActive: boolean; onClick: () => void }> = ({ name, description, color, isActive, onClick }) => (
  <div 
    onClick={onClick} 
    style={{ 
      padding: '12px', 
      background: isActive ? 'rgba(255,255,255,0.05)' : 'var(--bg-1)', 
      border: `1px solid ${isActive ? color : 'var(--border-subtle)'}`, 
      borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 12 
    }}
  >
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: isActive ? `0 0 10px ${color}` : 'none', opacity: isActive ? 1 : 0.4 }} />
    <div style={{ flex: 1 }}>
      <div style={{ color: isActive ? '#fff' : 'var(--text-secondary)', fontWeight: 600, fontSize: 12 }}>{name}</div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{description}</div>
    </div>
  </div>
);

// ============================================================
// MAIN PAGE
// ============================================================
export const MasteringPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const engine = useAudioEngineContext();
  const hasAudio = !!engine.audioBuffer;

  const [presetIntensity, setPresetIntensity] = useState(100);
  const [activePreset, setActivePreset] = useState<string>('warm');
  const [abMode, setAbMode] = useState<'original' | 'mastered'>('original');
  const [isPlayingAB, setIsPlayingAB] = useState(false);
  const [abAnalyser, setAbAnalyser] = useState<AnalyserNode | null>(null);
  const [exports, setExports] = useState<MasteredExport[]>([]);
  const [chainVersion, setChainVersion] = useState(0);
  const [lufs, setLufs] = useState({ m: -Infinity, s: -Infinity, i: -Infinity });

  const abGraphRef = useRef<{
    source: AudioBufferSourceNode;
    dryGain: GainNode;
    wetGain: GainNode;
    analyser: AnalyserNode;
    masterOut: GainNode;
  } | null>(null);

  const chainRef = useRef<MasteringChain | null>(null);
  const lufsRef = useRef<LUFSMeter | null>(null);
  const lufsContextRef = useRef<AudioContext | null>(null);

  // -------------------- Chain ready --------------------
  const handleChainReady = useCallback((chain: MasteringChain | null) => {
    chainRef.current = chain;
    if (chain && engine.audioContext) {
      if (!lufsRef.current || lufsContextRef.current !== engine.audioContext) {
        lufsRef.current?.destroy();
        lufsRef.current = new LUFSMeter(engine.audioContext);
        lufsContextRef.current = engine.audioContext;
      }
    }
    setChainVersion(v => v + 1);
  }, [engine.audioContext]);

  // -------------------- Apply preset live --------------------
  useEffect(() => {
    chainRef.current?.applyPreset(activePreset as MasteringPreset, presetIntensity / 100);
  }, [activePreset, presetIntensity, chainVersion]);

  // -------------------- Load Exports --------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dbExports = await loadExportsFromDB();
      if (cancelled) return;
      if (dbExports.length > 0) {
        setExports(dbExports);
        return;
      }
      try {
        const raw = localStorage.getItem('waveforge-mastering-exports');
        if (!raw) return;
        const old: MasteredExport[] = JSON.parse(raw);
        const migrated: MasteredExport[] = [];
        for (const exp of old) {
          try {
            const blob = await fetch(exp.audioUrl).then(r => r.blob());
            await saveExportToDB({ ...exp, blob });
            migrated.push({ ...exp, audioUrl: URL.createObjectURL(blob) });
          } catch {}
        }
        if (!cancelled) {
          setExports(migrated);
          if (migrated.length > 0) localStorage.removeItem('waveforge-mastering-exports');
        }
      } catch (e) {
        console.warn('Legacy migration failed:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // -------------------- Transfert MusicGen --------------------
  useEffect(() => {
    audioTransfer.consume('mastering').then((pending) => {
      if (pending) {
        const file = new File([pending.blob], pending.filename, { type: 'audio/wav' });
        engine.loadFile(file);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------- LUFS Polling --------------------
  useEffect(() => {
    const id = setInterval(() => {
      if (lufsRef.current) {
        // ✅ CORRECTION ICI : Mapping des bonnes clés
        const data = lufsRef.current.read();
        setLufs({ 
          m: data.momentary, 
          s: data.shortTerm, 
          i: data.integrated 
        });
      }
    }, 200);
    return () => clearInterval(id);
  }, []);

  // -------------------- A/B Stop --------------------
  const handleStopAB = useCallback(() => {
    const g = abGraphRef.current;
    if (!g) return;
    try { g.source.stop(); } catch {}
    try { g.source.disconnect(); } catch {}
    try { g.dryGain.disconnect(); } catch {}
    try { g.wetGain.disconnect(); } catch {}
    try { g.masterOut.disconnect(); } catch {}
    try { g.analyser.disconnect(); } catch {}
    abGraphRef.current = null;
    setIsPlayingAB(false);
    setAbAnalyser(null);
  }, []);

  // -------------------- A/B Play --------------------
  const handlePlayAB = useCallback(() => {
    if (abGraphRef.current) { handleStopAB(); return; }
    
    const ctx = engine.audioContext;
    const chain = chainRef.current;
    const buffer = engine.audioBuffer;
    if (!ctx || !chain || !buffer) return;
    
    chain.applyPreset(activePreset as MasteringPreset, presetIntensity / 100);

    const source = ctx.createBufferSource(); 
    source.buffer = buffer;
    
    const dryGain = ctx.createGain(); 
    dryGain.gain.value = abMode === 'original' ? 1 : 0;
    
    const wetGain = ctx.createGain(); 
    wetGain.gain.value = abMode === 'mastered' ? 1 : 0;
    
    const analyser = ctx.createAnalyser(); 
    analyser.fftSize = 2048; 
    analyser.smoothingTimeConstant = 0.92; // ✅ Lissage fluide
    
    const masterOut = ctx.createGain();
    
    source.connect(dryGain); 
    source.connect(chain.getInputNode()); 
    chain.getOutputNode().connect(wetGain);
    
    dryGain.connect(masterOut);
    wetGain.connect(masterOut);
    
    masterOut.connect(analyser); 
    analyser.connect(ctx.destination);
    
    if (lufsRef.current) {
      try { masterOut.connect(lufsRef.current.getInput()); } catch {}
    }

    source.start(0);
    abGraphRef.current = { source, dryGain, wetGain, analyser, masterOut };
    setAbAnalyser(analyser); 
    setIsPlayingAB(true);
    
    source.onended = () => { 
      if (abGraphRef.current?.source === source) handleStopAB(); 
    };
  }, [engine, activePreset, presetIntensity, abMode, handleStopAB]);

  // -------------------- A/B Crossfade --------------------
  useEffect(() => {
    const g = abGraphRef.current;
    if (!g || !engine.audioContext) return;
    const t = engine.audioContext.currentTime;
    g.dryGain.gain.setTargetAtTime(abMode === 'original' ? 1 : 0, t, 0.015);
    g.wetGain.gain.setTargetAtTime(abMode === 'mastered' ? 1 : 0, t, 0.015);
  }, [abMode, engine.audioContext]);

  // -------------------- Export Handlers --------------------
  const handleDeleteExport = async (id: string) => {
    if (!confirm("Supprimer cet export de l'historique ?")) return;
    try { await deleteExportFromDB(id); } catch {}
    setExports(prev => prev.filter(e => e.id !== id));
  };

  const handleNewExport = useCallback(async (payload: any) => {
    const audioUrl = URL.createObjectURL(payload.blob);
    const exp = { ...payload, audioUrl };
    try { await saveExportToDB({ ...payload, blob: payload.blob }); } catch {}
    setExports(prev => [exp, ...prev].slice(0, 50));
  }, []);

  // -------------------- Cleanup on unmount --------------------
  useEffect(() => {
    return () => {
      if (abGraphRef.current) handleStopAB();
    };
  }, [handleStopAB]);

  // -------------------- Render --------------------
  return (
    <div style={{ padding: isMobile ? 12 : 24, display: 'grid', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, margin: 0, marginBottom: 8, color: '#fff' }}>
            🎚️ <span className="wf-title-gradient">Mastering</span>
            <span className="wf-badge" style={{ marginLeft: 10, verticalAlign: 'middle' }}>PRO</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0 }}>Chaîne complète : EQ 5 bandes · Compresseur · Exciter · Limiteur · Export WAV</p>
        </div>
      </div>

      {/* Pas d'audio */}
      {!hasAudio && (
        <div className="wf-glass" style={{ padding: 40, textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🎚️</div>
          <div style={{ fontSize: 16, color: '#fff', marginBottom: 10, fontWeight: 600 }}>Aucun audio chargé</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 450, margin: '0 auto 24px' }}>Charge un audio dans la page Studio pour accéder à la chaîne de mastering.</div>
          <Link to="/studio" className="wf-btn wf-btn-primary" style={{ textDecoration: 'none' }}>🎹 Aller au Studio</Link>
        </div>
      )}

      {/* UI Principale */}
      {hasAudio && (
        <>
          {/* A/B + Intensité */}
          <div className="wf-glass" style={{ padding: 16, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
            <div>
              <div className="wf-label" style={{ marginBottom: 12 }}>🎧 Comparaison A/B</div>
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-0)', padding: 4, borderRadius: 8 }}>
                <button 
                  onClick={() => setAbMode('original')} 
                  style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: abMode === 'original' ? 'var(--bg-3)' : 'transparent', color: abMode === 'original' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                >
                  🔊 ORIGINAL
                </button>
                <button 
                  onClick={() => setAbMode('mastered')} 
                  style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: abMode === 'mastered' ? 'var(--accent-primary)' : 'transparent', color: abMode === 'mastered' ? '#000' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                >
                  🎚️ MASTERISÉ
                </button>
              </div>
              <button 
                onClick={handlePlayAB} 
                className="wf-btn wf-btn-primary" 
                style={{ width: '100%', marginTop: 12, padding: '12px', background: isPlayingAB ? 'var(--accent-danger)' : 'var(--accent-primary)', color: isPlayingAB ? '#fff' : '#000' }}
              >
                {isPlayingAB ? '⏹ ARRÊTER' : `▶ LIRE (${abMode === 'mastered' ? 'Master' : 'Original'})`}
              </button>
            </div>
            
            <div>
              <div className="wf-label" style={{ marginBottom: 12 }}>⚡ Intensité du preset (Live)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span className="mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-primary)' }}>{presetIntensity}%</span>
              </div>
              <input 
                type="range" min={0} max={100} step={5} 
                value={presetIntensity} 
                onChange={(e) => setPresetIntensity(parseInt(e.target.value))} 
              />
            </div>
          </div>

          {/* Spectre + LUFS */}
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="wf-glass" style={{ padding: 16 }}>
              <div className="wf-label" style={{ marginBottom: 12 }}>📊 Spectre sonore</div>
              <div style={{ background: 'var(--bg-0)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 8 }}>
                <SpectrumVisualizer analyser={abAnalyser} isActive={isPlayingAB} height={isMobile ? 120 : 180} colorMode="frequency" barCount={isMobile ? 40 : 80} />
              </div>
            </div>
            
            <div className="wf-glass" style={{ padding: 16 }}>
              <div className="wf-label" style={{ marginBottom: 12 }}>📈 Loudness · ITU-R BS.1770</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <LufsMeter label="M (Momentary)" value={lufs.m} />
                <LufsMeter label="S (Short-term)" value={lufs.s} />
                <LufsMeter label="I (Integrated)" value={lufs.i} />
              </div>
            </div>
          </div>

          {/* Fichier + Presets + Mastering Panel */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '300px 1fr', gap: 20 }}>
            <div style={{ display: 'grid', gap: 16 }}>
               <div className="wf-glass" style={{ padding: 16 }}>
                 <div className="wf-label" style={{ marginBottom: 12 }}>🎵 Fichier source</div>
                 <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{engine.fileName || 'Sans titre'}</div>
                 <div className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                   {engine.fileFormat} · {((engine.fileSize ?? 0) / (1024 * 1024)).toFixed(1)} MB
                 </div>
               </div>
               <div className="wf-glass" style={{ padding: 16 }}>
                 <div className="wf-label" style={{ marginBottom: 12 }}>🎨 Presets</div>
                 <div style={{ display: 'grid', gap: 8 }}>
                   {Object.entries(PRESET_INFO).map(([key, info]) => (
                     <PresetCard 
                       key={key} 
                       name={info.name} 
                       description={info.description} 
                       color={info.color} 
                       isActive={activePreset === key} 
                       onClick={() => setActivePreset(key)} 
                     />
                   ))}
                 </div>
               </div>
            </div>
            
            <div>
              <MasteringPanel 
                audioContext={engine.audioContext} 
                sourceNode={null} 
                sourceBuffer={engine.audioBuffer} 
                preset={activePreset as MasteringPreset} 
                intensity={presetIntensity} 
                onChainReady={handleChainReady} 
                onExport={handleNewExport} 
              />
            </div>
          </div>

          {/* Historique des exports */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="wf-label">📦 Historique · {exports.length}</div>
            </div>

            {exports.length === 0 ? (
              <div className="wf-glass" style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', borderStyle: 'dashed' }}>
                Aucun export pour le moment.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {exports.slice(0, 6).map((exp) => (
                  <div key={exp.id} className="wf-glass wf-fade-in" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="mono" style={{ fontSize: 10, color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                          {exp.preset} · {exp.intensity}%
                        </div>
                        <div className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {new Date(exp.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteExport(exp.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--text-secondary)', padding: '4px 8px', background: 'var(--bg-0)', borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>
                      🎵 {exp.fileName}
                    </div>
                    <audio src={exp.audioUrl} controls style={{ width: '100%', height: 28 }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};