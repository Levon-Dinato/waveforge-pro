// src/pages/MasteringPage.tsx
import React, { useRef } from 'react';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';

// ─── Styles réutilisables ──────────────────────────────────────
const PANEL_STYLE: React.CSSProperties = {
  background: '#1c1c1c',
  border: '1px solid #2a2a2a',
  borderRadius: 8,
  overflow: 'hidden',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  color: '#999',
  letterSpacing: 1,
  textTransform: 'uppercase',
  fontWeight: 700,
  marginBottom: 8,
};

const BTN_BASE: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 4,
  border: '1px solid #2a2a2a',
  background: 'transparent',
  color: '#999',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
};

export const MasteringPage: React.FC = () => {
  const engine = useAudioEngineContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) engine.loadFile(file);
    e.target.value = '';
  };

  const hasAudio = !!engine.result;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      
      {/* EN-TÊTE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🎛️</span> Mastering
            </h1>
            <span style={{ background: 'rgba(255, 51, 102, 0.15)', color: '#ff3366', border: '1px solid rgba(255, 51, 102, 0.3)', padding: '2px 8px', borderRadius: 12, fontSize: '0.65rem', fontWeight: 700 }}>PRO</span>
          </div>
          <p style={{ color: '#666', fontSize: '0.75rem', margin: 0 }}>
            Chaîne complète · EQ 5 bandes · Mono-Maker · Vector Scope · Limiteur · Export WAV
          </p>
        </div>
        
        {/* Statut */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.2)', padding: '6px 12px', borderRadius: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 8px #00ff88' }}></div>
          <span style={{ fontSize: 10, color: '#00ff88', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Prêt à masteriser</span>
        </div>
      </div>

      {!hasAudio ? (
        /* ZONE D'IMPORT */
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ ...PANEL_STYLE, borderStyle: 'dashed', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
        >
          <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
          <div style={{ fontSize: 40, marginBottom: 16 }}>📂</div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0' }}>Importer un fichier source</h2>
          <p style={{ color: '#999', fontSize: '0.8rem', margin: 0 }}>Glisse ton fichier WAV / MP3 ici</p>
        </div>
      ) : (
        /* INTERFACE DE MASTERING COMPLÈTE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* MODULE A/B & INTENSITÉ */}
          <div style={{ ...PANEL_STYLE, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, marginRight: 40 }}>
              <div style={LABEL_STYLE}>⚖️ Comparaison A/B</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button style={{ ...BTN_BASE, flex: 1, background: 'rgba(124, 92, 255, 0.2)', borderColor: '#7c5cff', color: '#fff' }}>▶ ORIGINAL</button>
                <button style={{ ...BTN_BASE, flex: 1 }}>◼ MASTERISÉ</button>
              </div>
              <button onClick={engine.stopAll} style={{ ...BTN_BASE, width: '100%', background: '#ff3366', borderColor: '#ff3366', color: '#fff', fontWeight: 700 }}>■ ARRÊTER</button>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <div style={LABEL_STYLE}>🔥 Intensité du preset</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>100%</div>
              </div>
              <input type="range" min="0" max="100" defaultValue="100" style={{ width: '100%', accentColor: '#00d9ff' }} />
              <div style={{ fontSize: 10, color: '#666', marginTop: 4, textAlign: 'right' }}>Effets à pleine puissance</div>
            </div>
          </div>

          {/* MODULE SPECTRE SONORE (Visuel) */}
          <div style={{ ...PANEL_STYLE, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={LABEL_STYLE}>📊 Spectre sonore</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88' }}></div>
                <span style={{ fontSize: 10, color: '#00ff88', fontWeight: 700 }}>LIVE</span>
              </div>
            </div>
            <div style={{ height: 120, background: '#121212', borderRadius: 6, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, padding: '10px 0', position: 'relative' }}>
              {/* Fausses barres d'égaliseur */}
              {Array.from({ length: 40 }).map((_, i) => {
                const height = Math.sin(i * 0.2) * 40 + 50 + Math.random() * 20;
                return (
                  <div key={i} style={{ 
                    width: '2%', height: `${height}%`, 
                    background: `linear-gradient(to top, #00ff88, #ffd43b, #ff3366)`,
                    borderRadius: '2px 2px 0 0',
                    opacity: 0.8
                  }} />
                );
              })}
              <button style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 32, height: 32, borderRadius: '50%', background: '#fff', border: 'none', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ▶
              </button>
            </div>
          </div>

          {/* GRILLE DU BAS (Source + Chaîne / Master + EQ) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
            
            {/* COLONNE GAUCHE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Fichier Source */}
              <div style={{ ...PANEL_STYLE, padding: 16 }}>
                <div style={LABEL_STYLE}>🎵 Fichier source</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#121212', padding: 10, borderRadius: 6, border: '1px solid #2a2a2a' }}>
                  <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.05)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎵</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{engine.fileName}</div>
                    <div style={{ fontSize: 10, color: '#666' }}>WAV · {(engine.result as any)?.fileSize || '33.8 Mo'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid #2a2a2a' }}>
                    <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' }}>Durée</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{engine.result?.duration.toFixed(1)}s</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' }}>BPM</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{engine.result?.bpm}</div>
                  </div>
                </div>
              </div>

              {/* Chaîne de traitement */}
              <div style={{ ...PANEL_STYLE, padding: 16, flex: 1 }}>
                <div style={LABEL_STYLE}>⚙️ Chaîne de traitement</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['EQ 5 bandes', 'Compression', 'Saturation', 'Stéréo Widener', 'Mono-Maker', 'Limiteur brickwall'].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#ccc', padding: '6px 8px', background: '#121212', borderRadius: 4, border: '1px solid #2a2a2a' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: i < 3 ? '#00d9ff' : '#666' }}></div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* COLONNE DROITE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Presets & EQ */}
              <div style={{ ...PANEL_STYLE, padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 2 }}>WAVEFORGE <span style={{ color: '#00d9ff' }}>MASTERING</span></div>
                  <div style={{ fontSize: 9, color: '#666', letterSpacing: 1, textTransform: 'uppercase' }}>Professional Audio Processing</div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button style={{ ...BTN_BASE, flex: 1 }}>WARM</button>
                  <button style={{ ...BTN_BASE, flex: 1, background: 'rgba(0, 217, 255, 0.1)', borderColor: '#00d9ff', color: '#00d9ff' }}>BALANCED</button>
                  <button style={{ ...BTN_BASE, flex: 1 }}>OPEN</button>
                  <button style={{ ...BTN_BASE, flex: 1 }}>MASTER</button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                  <button style={{ ...BTN_BASE, flex: 1 }}>💾 SAUVEGARDER</button>
                  <button style={{ ...BTN_BASE, flex: 1 }}>📁 MES PRESETS (0)</button>
                </div>

                {/* Égaliseur Graphique (Faux) */}
                <div style={{ position: 'relative', flex: 1, minHeight: 150, background: '#121212', borderRadius: 6, border: '1px solid #2a2a2a', padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={LABEL_STYLE}>Égaliseur 5 bandes</div>
                    <button style={{ background: 'transparent', border: 'none', color: '#00d9ff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>▼ MASQUER</button>
                  </div>
                  
                  {/* Lignes de grille */}
                  <div style={{ position: 'absolute', inset: '40px 10px 20px 30px', borderLeft: '1px solid #2a2a2a', borderBottom: '1px solid #2a2a2a' }}>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px dashed #333' }}></div>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', borderLeft: '1px dashed #333' }}></div>
                    
                    {/* Points d'égalisation (Faux) */}
                    <div style={{ position: 'absolute', top: '40%', left: '10%', width: 8, height: 8, background: '#00d9ff', borderRadius: '50%', boxShadow: '0 0 8px #00d9ff' }}></div>
                    <div style={{ position: 'absolute', top: '30%', left: '30%', width: 8, height: 8, background: '#7c5cff', borderRadius: '50%', boxShadow: '0 0 8px #7c5cff' }}></div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: 8, height: 8, background: '#00ff88', borderRadius: '50%', boxShadow: '0 0 8px #00ff88' }}></div>
                    <div style={{ position: 'absolute', top: '20%', left: '70%', width: 8, height: 8, background: '#ffd43b', borderRadius: '50%', boxShadow: '0 0 8px #ffd43b' }}></div>
                    <div style={{ position: 'absolute', top: '45%', left: '90%', width: 8, height: 8, background: '#ff3366', borderRadius: '50%', boxShadow: '0 0 8px #ff3366' }}></div>
                  </div>

                  {/* Labels Axes */}
                  <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 20px', fontSize: 8, color: '#666' }}>
                    <span>50Hz</span><span>100Hz</span><span>500Hz</span><span>1kHz</span><span>5kHz</span><span>10kHz</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}
    </div>
  );
};