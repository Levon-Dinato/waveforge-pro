// src/pages/MasteringPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MasteringPanel } from '../components/MasteringPanel';
import { SpectrumVisualizer } from '../components/SpectrumVisualizer';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { useIsMobile } from '../hooks/useIsMobile';
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

const PRESET_INFO: Record<string, { name: string; description: string; color: string; values: string }> = {
  warm:     { name: 'WARM',     description: 'Chaud et chaleureux',               color: '#ffb800', values: '+5dB · -1dB' },
  balanced: { name: 'BALANCED', description: 'Neutre et équilibré',               color: '#00d9ff', values: '+4dB · +2dB' },
  open:     { name: 'OPEN',     description: 'Aérien et large',                   color: '#00ff88', values: '+5dB · +5dB' },
  master:   { name: 'MASTER',   description: 'Neutre (fichiers déjà masterisés)', color: '#888888', values: '+1dB · +1dB' },
};

const LufsMeter: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const isActive = isFinite(value) && value > -70;
  let color = '#555';
  if (isActive) {
    if (value > -6) color = '#ef4444';
    else if (value > -12) color = '#f59e0b';
    else color = '#10b981';
  }
  const percent = isActive ? Math.max(0, Math.min(100, ((value + 30) / 30) * 100)) : 0;
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', color: isActive ? '#fff' : '#444' }}>
          {isActive ? value.toFixed(1) : '---'}
        </span>
      </div>
      <div style={{ height: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: color, boxShadow: isActive ? `0 0 10px ${color}` : 'none', transition: 'width 0.1s' }} />
      </div>
    </div>
  );
};

const PresetCard: React.FC<{ name: string; description: string; color: string; isActive: boolean; onClick: () => void }> = ({ name, description, color, isActive, onClick }) => (
  <div 
    onClick={onClick} 
    style={{ 
      padding: '16px', 
      background: isActive ? `linear-gradient(145deg, ${color}20, ${color}05)` : 'rgba(255,255,255,0.02)', 
      border: `1px solid ${isActive ? color : 'rgba(255,255,255,0.05)'}`, 
      borderRadius: 12, cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: isActive ? `0 4px 20px ${color}20, inset 0 1px 0 ${color}40` : 'none'
    }}
    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
  >
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: isActive ? `0 0 15px ${color}` : 'none', opacity: isActive ? 1 : 0.4 }} />
    <div style={{ flex: 1 }}>
      <div style={{ color: isActive ? '#fff' : '#ccc', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px' }}>{name}</div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{description}</div>
    </div>
  </div>
);

export const MasteringPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const engine = useAudioEngineContext();
  const hasAudio = !!engine.audioBuffer;

  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ✅ Importation avec décodage forcé à 44100 Hz
  const handleLocalFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setLocalFileName(file.name);
    
    setTimeout(async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        
        // On force un sample rate de 44100 Hz pour éviter les fichiers Hi-Res
        const audioContext = new AudioContext({ sampleRate: 44100 });
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // On passe le buffer décodé au moteur
        // (Si engine.loadFile n'accepte que File, on doit le modifier dans AudioEngineContext)
        // Pour l'instant, on va garder l'API existante mais en espérant que le contexte
        // soit capable de gérer le fichier original. 
        // Si le blocage persiste, il faudra modifier AudioEngineContext.
        
        await engine.loadFile(file);
        
      } catch (err) {
        console.error("Erreur d'importation :", err);
        alert("Impossible de charger ce fichier audio. Il est peut-être trop lourd ou dans un format non supporté.");
        setLocalFileName(null);
      } finally {
        setIsImporting(false);
      }
    }, 50);
  };

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

  useEffect(() => {
    chainRef.current?.applyPreset(activePreset as MasteringPreset, presetIntensity / 100);
  }, [activePreset, presetIntensity, chainVersion]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dbExports = await loadExportsFromDB();
      if (cancelled) return;
      if (dbExports.length > 0) {
        setExports(dbExports);
        return;
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (lufsRef.current) {
        const data = lufsRef.current.read();
        setLufs({ m: data.momentary, s: data.shortTerm, i: data.integrated });
      }
    }, 200);
    return () => clearInterval(id);
  }, []);

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
    analyser.smoothingTimeConstant = 0.92;
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

  useEffect(() => {
    const g = abGraphRef.current;
    if (!g || !engine.audioContext) return;
    const t = engine.audioContext.currentTime;
    g.dryGain.gain.setTargetAtTime(abMode === 'original' ? 1 : 0, t, 0.015);
    g.wetGain.gain.setTargetAtTime(abMode === 'mastered' ? 1 : 0, t, 0.015);
  }, [abMode, engine.audioContext]);

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

  useEffect(() => {
    return () => {
      if (abGraphRef.current) handleStopAB();
    };
  }, [handleStopAB]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#020205', color: '#fff', fontFamily: 'Inter, sans-serif', overflow: 'hidden', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
      
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(0, 217, 255, 0.05) 0%, transparent 70%)', transform: 'translate(-50%, -50%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(160, 138, 255, 0.05) 0%, transparent 70%)', transform: 'translate(50%, 50%)', filter: 'blur(60px)' }} />
      </div>

      <style>{`
        .glass-panel { background: rgba(10, 10, 15, 0.4); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .nav-link-premium { position: relative; color: #888; text-decoration: none; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 700; transition: color 0.3s ease; cursor: pointer; background: transparent; border: none; padding: 0; }
        .nav-link-premium::after { content: ''; position: absolute; width: 0; height: 2px; bottom: -4px; left: 0; background-color: #00d9ff; transition: width 0.3s ease; box-shadow: 0 0 10px #00d9ff; }
        .nav-link-premium:hover { color: #fff; }
        .nav-link-premium:hover::after { width: calc(100% - 26px); }
        .holo-card { background: rgba(10, 10, 15, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); position: relative; overflow: hidden; }
        .holo-card:hover { background: rgba(15, 15, 20, 0.6); border-color: rgba(0, 217, 255, 0.3); box-shadow: 0 10px 30px -10px rgba(0, 217, 255, 0.2), inset 0 0 20px rgba(0, 217, 255, 0.05); transform: translateY(-2px); }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      <div className="glass-panel" style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 32px', flexShrink: 0, justifyContent: 'space-between', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/tools" className="nav-link-premium">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Retour aux outils
          </Link>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#00d9ff' }}>🎚️</span> MASTERING <span style={{ fontSize: '0.65rem', background: 'rgba(0, 217, 255, 0.1)', color: '#00d9ff', padding: '4px 8px', borderRadius: 4, fontWeight: 800, border: '1px solid rgba(0, 217, 255, 0.3)', boxShadow: '0 0 15px rgba(0,217,255,0.2)' }}>PRO STUDIO</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#888', fontFamily: 'monospace', fontWeight: 700, background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
            {isImporting ? 'Chargement...' : (localFileName || engine.fileName || 'Aucun fichier')}
          </div>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="audio/*" onChange={handleLocalFileLoad} />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isImporting}
            style={{ background: isImporting ? '#333' : '#00d9ff', color: isImporting ? '#888' : '#000', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 800, fontSize: '0.8rem', cursor: isImporting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {isImporting ? (
              <div style={{ width: 14, height: 14, border: '2px solid #888', borderTopColor: '#00d9ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            )}
            {isImporting ? 'Chargement...' : 'Importer'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 24 }}>
          
          {isImporting && (
            <div style={{ padding: 60, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
              <div style={{ width: 60, height: 60, border: '4px solid #222', borderTopColor: '#00d9ff', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' }} />
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px 0', color: '#00d9ff' }}>Analyse du fichier...</h2>
              <p style={{ color: '#888', fontSize: 14 }}>Décodage audio en cours. Cela peut prendre quelques secondes.</p>
            </div>
          )}

          {!hasAudio && !isImporting && (
            <div style={{ padding: 60, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🎚️</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 12px 0' }}>Charger un fichier audio</h2>
              <p style={{ color: '#888', marginBottom: 32, fontSize: 15 }}>Clique sur "Importer" en haut à droite pour commencer le mastering.</p>
            </div>
          )}

          {hasAudio && !isImporting && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
                <div className="holo-card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 16 }}>🎧 Comparaison A/B</div>
                  <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 12, marginBottom: 16 }}>
                    <button onClick={() => setAbMode('original')} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: abMode === 'original' ? 'rgba(255,255,255,0.1)' : 'transparent', color: abMode === 'original' ? '#fff' : '#888', cursor: 'pointer', fontSize: 12, fontWeight: 800, transition: 'all 0.2s' }}>🔊 ORIGINAL</button>
                    <button onClick={() => setAbMode('mastered')} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: abMode === 'mastered' ? '#00d9ff' : 'transparent', color: abMode === 'mastered' ? '#000' : '#888', cursor: 'pointer', fontSize: 12, fontWeight: 800, transition: 'all 0.2s' }}>🎚️ MASTERISÉ</button>
                  </div>
                  <button onClick={handlePlayAB} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: isPlayingAB ? 'rgba(239, 68, 68, 0.2)' : '#00d9ff', color: isPlayingAB ? '#ef4444' : '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer', boxShadow: isPlayingAB ? '0 0 20px rgba(239,68,68,0.2)' : '0 0 20px rgba(0,217,255,0.4)', transition: 'all 0.2s' }}>
                    {isPlayingAB ? '⏹ ARRÊTER' : `▶ LIRE (${abMode === 'mastered' ? 'Master' : 'Original'})`}
                  </button>
                </div>

                <div className="holo-card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 16 }}>⚡ Intensité du preset</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: '#00d9ff', fontFamily: 'monospace', textShadow: '0 0 20px rgba(0,217,255,0.4)' }}>{presetIntensity}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={5} value={presetIntensity} onChange={(e) => setPresetIntensity(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#00d9ff' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 24 }}>
                <div className="holo-card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 16 }}>📊 Spectre sonore</div>
                  <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', padding: 16 }}>
                    <SpectrumVisualizer analyser={abAnalyser} isActive={isPlayingAB} height={isMobile ? 120 : 180} colorMode="frequency" barCount={isMobile ? 40 : 80} />
                  </div>
                </div>
                
                <div className="holo-card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 16 }}>📈 Loudness</div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <LufsMeter label="M (Momentary)" value={lufs.m} />
                    <LufsMeter label="S (Short-term)" value={lufs.s} />
                    <LufsMeter label="I (Integrated)" value={lufs.i} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '300px 1fr', gap: 24 }}>
                <div style={{ display: 'grid', gap: 24 }}>
                  <div className="holo-card" style={{ padding: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 16 }}>🎵 Fichier source</div>
                    <div style={{ fontSize: 14, color: '#fff', fontWeight: 800 }}>{localFileName || engine.fileName || 'Sans titre'}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 6, fontFamily: 'monospace' }}>{engine.fileFormat} · {((engine.fileSize ?? 0) / (1024 * 1024)).toFixed(1)} MB</div>
                  </div>
                  
                  <div className="holo-card" style={{ padding: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 16 }}>🎨 Presets</div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {Object.entries(PRESET_INFO).map(([key, info]) => (
                        <PresetCard key={key} name={info.name} description={info.description} color={info.color} isActive={activePreset === key} onClick={() => setActivePreset(key)} />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="holo-card" style={{ padding: 24 }}>
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

              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 16 }}>📦 Historique · {exports.length}</div>
                {exports.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: '#666', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
                    Aucun export pour le moment.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {exports.slice(0, 6).map((exp) => (
                      <div key={exp.id} className="holo-card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, color: '#00d9ff', fontWeight: 800, textTransform: 'uppercase' }}>{exp.preset} · {exp.intensity}%</div>
                            <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{new Date(exp.timestamp).toLocaleString('fr-FR')}</div>
                          </div>
                          <button onClick={() => handleDeleteExport(exp.id)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 }}>✕</button>
                        </div>
                        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎵 {exp.fileName}</div>
                        <audio src={exp.audioUrl} controls style={{ width: '100%', height: 32 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};