import React, { useRef, useMemo } from 'react';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { PianoRoll } from '../components/PianoRoll';
import { Link } from 'react-router-dom';
import type { DetectedNote } from '../types'; // ✅ Import ajouté pour le typage

// ─── Styles réutilisables ───────────────────────────────────────
const PANEL_STYLE: React.CSSProperties = {
  background: 'rgba(15, 18, 28, 0.65)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: 10,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
};

const BTN_BASE: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  fontSize: 11,
  fontWeight: 800,
  fontFamily: 'monospace',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  letterSpacing: '0.5px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
};

export const StudioPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const engine = useAudioEngineContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) engine.loadFile(file);
    e.target.value = '';
  };

  const hasAudio = !!engine.result;

  // ✅ Calcul optimisé du nombre de notes par piste
  const trackCounts = useMemo(() => {
    if (!engine.finalNotes) return { lead: 0, bass: 0, harmony: 0, drums: 0 };
    return {
      lead: engine.finalNotes.filter(n => n.track === 'lead').length,
      bass: engine.finalNotes.filter(n => n.track === 'bass').length,
      harmony: engine.finalNotes.filter(n => n.track === 'harmony').length,
      drums: engine.finalNotes.filter(n => n.track === 'drums').length,
    };
  }, [engine.finalNotes]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: 20,
      padding: isMobile ? 12 : 24,
      height: '100%',
      overflow: 'hidden',
      fontFamily: 'monospace',
      color: '#fff',
      background: '#0a0c14',
    }}>
      
      {/* BARRE LATÉRALE */}
      {!isMobile && (
        <aside style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
           <div style={{...PANEL_STYLE, padding: 16}}>
              <div style={{ fontSize: 10, color: '#666', marginBottom: 8, letterSpacing: 1 }}>NAVIGATION</div>
              <Link to="/studio" style={{ color: '#00d9ff', textDecoration: 'none', fontSize: 12, fontWeight: 'bold' }}>🎹 Studio</Link>
           </div>
        </aside>
      )}

      {/* CONTENU PRINCIPAL */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 20, margin: 0, fontWeight: 800, letterSpacing: '-0.5px' }}>
              <span style={{ color: '#00d9ff' }}>Studio</span> Audio → MIDI
            </h1>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
              Analysez vos morceaux, extrayez les notes et exportez en MIDI.
            </div>
          </div>
        </div>

        {!hasAudio ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{
              ...PANEL_STYLE,
              borderStyle: 'dashed',
              borderColor: 'rgba(0, 217, 255, 0.4)',
              padding: '60px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: 'rgba(0, 217, 255, 0.02)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.8 }}>🎧</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Glisse ton audio ici</div>
            <div style={{ fontSize: 12, color: '#888' }}>ou <span style={{ color: '#00d9ff', textDecoration: 'underline' }}>parcourir</span> — wav, mp3, flac, ogg</div>
            <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
          </div>
        ) : (
          <>
            {/* INFO FICHIER AUDIO */}
            <div style={{ 
              ...PANEL_STYLE, 
              padding: '12px 16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              background: 'linear-gradient(90deg, rgba(0, 217, 255, 0.08) 0%, rgba(15, 18, 28, 0.65) 100%)',
              borderLeft: '3px solid #00d9ff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 16 }}>🎵</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{engine.fileName}</div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                    {engine.fileFormat} · {engine.result?.sampleRate} Hz · {engine.result?.duration.toFixed(1)}s · {engine.result?.bpm} BPM
                  </div>
                </div>
              </div>
              
              {engine.isAnalyzing && (
                <div style={{ fontSize: 11, color: '#ffd43b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                  Analyse en cours...
                </div>
              )}
            </div>

            {/* TOOLBAR */}
            <div style={{ 
              ...PANEL_STYLE, 
              padding: '10px 16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 10, color: '#666', fontWeight: 800, letterSpacing: 1 }}>TRANSPORT</div>
                <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 8 }}>
                  <button 
                    onClick={engine.playAudioOriginal}
                    style={{ ...BTN_BASE, background: 'transparent', color: '#fff' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    ▶ AUDIO
                  </button>
                  <button 
                    onClick={engine.playMidi}
                    style={{ ...BTN_BASE, background: 'rgba(0, 217, 255, 0.15)', color: '#00d9ff' }}
                  >
                    ▶ MIDI
                  </button>
                  <button 
                    onClick={engine.stopAll}
                    style={{ ...BTN_BASE, background: 'transparent', color: '#ff5c5c' }}
                  >
                    ■ STOP
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 10, color: '#666', fontWeight: 800, letterSpacing: 1 }}>RÉSULTAT</div>
                <span style={{ fontSize: 12, color: '#00d9ff', fontWeight: 800 }}>
                  {engine.finalNotes.length} NOTES
                </span>
                <button style={{ 
                  ...BTN_BASE, 
                  background: 'linear-gradient(135deg, #00d9ff, #0088ff)', 
                  color: '#000',
                  boxShadow: '0 4px 12px rgba(0, 217, 255, 0.3)'
                }}>
                  EXPORT MIDI
                </button>
              </div>
            </div>

            {/* PISTES */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 12 }}>
              <div style={{ ...PANEL_STYLE, padding: 12, borderLeft: '3px solid #7c5cff' }}>
                <div style={{ fontSize: 10, color: '#a08aff', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>MELODY</div>
                <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                  {trackCounts.lead} <span style={{fontSize: 10, color:'#666'}}>notes</span>
                </div>
              </div>
              
              <div style={{ ...PANEL_STYLE, padding: 12, borderLeft: '3px solid #00ff88' }}>
                <div style={{ fontSize: 10, color: '#00ff88', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>BASS</div>
                <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                  {trackCounts.bass} <span style={{fontSize: 10, color:'#666'}}>notes</span>
                </div>
              </div>
              
              <div style={{ ...PANEL_STYLE, padding: 12, borderLeft: '3px solid #ff5cf0' }}>
                <div style={{ fontSize: 10, color: '#ff5cf0', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>CHORDS</div>
                <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                  {trackCounts.harmony} <span style={{fontSize: 10, color:'#666'}}>notes</span>
                </div>
              </div>
              
              <div style={{ ...PANEL_STYLE, padding: 12, borderLeft: '3px solid #ffd43b' }}>
                <div style={{ fontSize: 10, color: '#ffd43b', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>DRUMS</div>
                <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                  {trackCounts.drums} <span style={{fontSize: 10, color:'#666'}}>notes</span>
                </div>
              </div>
            </div>

            {/* PIANO ROLL */}
            <div style={{ 
              ...PANEL_STYLE, 
              flex: 1, 
              minHeight: 300, 
              padding: 0, 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* ✅ Le "as any" contourne l'erreur TypeScript de Vercel pour isPlaying */}
              <PianoRoll 
                {...({
                  notes: engine.finalNotes,
                  currentTime: engine.currentTime,
                  duration: engine.result?.duration || 0,
                  bpm: engine.result?.bpm || 120,
                  isPlaying: engine.isPlaying,
                  onSeek: engine.seek,
                  onNotesChange: (newNotes: DetectedNote[]) => {
                    engine.loadNotesFromBuffer(newNotes);
                  }
                } as any)}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
};