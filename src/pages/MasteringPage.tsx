// src/pages/MasteringPage.tsx
import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';

const PANEL_STYLE: React.CSSProperties = {
  background: '#1c1c1c',
  border: '1px solid #2a2a2a',
  borderRadius: 8,
};

const SLIDER_STYLE: React.CSSProperties = {
  width: '100%',
  accentColor: '#ff3366',
  cursor: 'pointer',
};

export const MasteringPage: React.FC = () => {
  const engine = useAudioEngineContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // États pour les réglages de mastering (à connecter à ton vrai moteur plus tard)
  const [inputGain, setInputGain] = useState(0);
  const [lowEq, setLowEq] = useState(0);
  const [midEq, setMidEq] = useState(0);
  const [highEq, setHighEq] = useState(0);
  const [threshold, setThreshold] = useState(-12);
  const [ratio, setRatio] = useState(4);
  const [ceiling, setCeiling] = useState(-0.1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) engine.loadFile(file);
    e.target.value = '';
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 20px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🎛️</span> MASTERING
          </h1>
          <span style={{ 
            background: 'rgba(255, 51, 102, 0.15)', color: '#ff3366', border: '1px solid rgba(255, 51, 102, 0.3)', 
            padding: '2px 8px', borderRadius: 12, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1px' 
          }}>
            PRO
          </span>
        </div>
        <p style={{ color: '#666', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>
          ÉGALISATION · COMPRESSION · LIMITEUR · EXPORT
        </p>
      </div>

      {!engine.result ? (
        /* ZONE DE DROP SI AUCUN FICHIER */
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{
            ...PANEL_STYLE, borderStyle: 'dashed', padding: '80px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ff3366'; e.currentTarget.style.background = '#1e1e1e'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.background = '#1c1c1c'; }}
        >
          <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
          <div style={{ fontSize: 48, marginBottom: 16, filter: 'drop-shadow(0 0 10px rgba(255, 51, 102, 0.3))' }}>🎚️</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px 0' }}>Charger un fichier audio</h2>
          <p style={{ color: '#999', fontSize: '0.85rem', margin: '0 0 16px 0' }}>Clique ou glisse ton fichier WAV / MP3 ici pour le masteriser</p>
          <div style={{ display: 'flex', gap: 12, color: '#666', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>Mastering auto</span><span>·</span><span>Stéréo</span><span>·</span><span>Haute qualité</span>
          </div>
        </div>
      ) : (
        /* INTERFACE DE MASTERING */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Info Fichier & Transport */}
          <div style={{ ...PANEL_STYLE, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '3px solid #ff3366' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 16 }}>🎵</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{engine.fileName}</div>
                <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                  {engine.fileFormat} · {engine.result?.bpm} BPM · {engine.result?.duration.toFixed(1)}s
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={engine.playAudioOriginal} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#fff', padding: '6px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>▶ ÉCOUTER</button>
              <button onClick={engine.stopAll} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#ff5c5c', padding: '6px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>■ STOP</button>
            </div>
          </div>

          {/* Chaîne de Mastering */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            
            {/* Module EQ */}
            <div style={{ ...PANEL_STYLE, padding: 20 }}>
              <h3 style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, fontWeight: 700 }}>Égaliseur (EQ)</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#ccc', marginBottom: 4 }}>
                    <span>LOW (Basses)</span><span>{lowEq} dB</span>
                  </div>
                  <input type="range" min="-12" max="12" step="0.5" value={lowEq} onChange={(e) => setLowEq(parseFloat(e.target.value))} style={SLIDER_STYLE} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#ccc', marginBottom: 4 }}>
                    <span>MID (Médiums)</span><span>{midEq} dB</span>
                  </div>
                  <input type="range" min="-12" max="12" step="0.5" value={midEq} onChange={(e) => setMidEq(parseFloat(e.target.value))} style={SLIDER_STYLE} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#ccc', marginBottom: 4 }}>
                    <span>HIGH (Aigus)</span><span>{highEq} dB</span>
                  </div>
                  <input type="range" min="-12" max="12" step="0.5" value={highEq} onChange={(e) => setHighEq(parseFloat(e.target.value))} style={SLIDER_STYLE} />
                </div>
              </div>
            </div>

            {/* Module Compresseur */}
            <div style={{ ...PANEL_STYLE, padding: 20 }}>
              <h3 style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, fontWeight: 700 }}>Compresseur & Limiteur</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#ccc', marginBottom: 4 }}>
                    <span>SEUIL (Threshold)</span><span>{threshold} dB</span>
                  </div>
                  <input type="range" min="-40" max="0" step="1" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} style={SLIDER_STYLE} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#ccc', marginBottom: 4 }}>
                    <span>RATIO</span><span>{ratio}:1</span>
                  </div>
                  <input type="range" min="1" max="20" step="1" value={ratio} onChange={(e) => setRatio(parseFloat(e.target.value))} style={SLIDER_STYLE} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#ccc', marginBottom: 4 }}>
                    <span>PLAFOND (Ceiling)</span><span>{ceiling} dB</span>
                  </div>
                  <input type="range" min="-3" max="0" step="0.1" value={ceiling} onChange={(e) => setCeiling(parseFloat(e.target.value))} style={SLIDER_STYLE} />
                </div>
              </div>
            </div>

            {/* Module Master Output */}
            <div style={{ ...PANEL_STYLE, padding: 20, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, fontWeight: 700 }}>Sortie Master</h3>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#ccc', marginBottom: 4 }}>
                    <span>GAIN D'ENTRÉE</span><span>{inputGain} dB</span>
                  </div>
                  <input type="range" min="-12" max="12" step="0.5" value={inputGain} onChange={(e) => setInputGain(parseFloat(e.target.value))} style={SLIDER_STYLE} />
                </div>
                
                <button style={{ 
                  width: '100%', padding: '12px', background: '#ff3366', color: '#fff', 
                  border: 'none', borderRadius: 4, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(255, 51, 102, 0.3)'
                }}>
                  ⬇ EXPORTER LE MASTER
                </button>
              </div>
            </div>

          </div>
          
          <div style={{ textAlign: 'center', marginTop: 16 }}>
             <Link to="/tools" style={{ color: '#666', fontSize: 12, textDecoration: 'none' }}>← Retour aux outils</Link>
          </div>
        </div>
      )}
    </div>
  );
};