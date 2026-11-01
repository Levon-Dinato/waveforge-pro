// src/pages/StudioPage.tsx
import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { PianoRoll } from '../components/PianoRoll';
import type { DetectedNote } from '../types';
import { Midi } from '@tonejs/midi';

// ─── Styles réutilisables (Style Beatport) ──────────────────────
const PANEL_STYLE: React.CSSProperties = {
  background: '#1c1c1c',
  border: '1px solid #2a2a2a',
  borderRadius: 8,
};

const BTN_BASE: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 4,
  border: '1px solid #2a2a2a',
  background: 'transparent',
  color: '#999',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
};

export const StudioPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const engine = useAudioEngineContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ✅ État pour le Drag & Drop
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) engine.loadFile(file);
    e.target.value = '';
  };

  // ✅ Gestion du Drag & Drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      engine.loadFile(file);
    } else {
      alert("Veuillez glisser un fichier audio valide (mp3, wav, flac, ogg).");
    }
  }, [engine]);

  // ✅ Fonction d'Export MIDI sécurisée
  const handleExportMidi = () => {
    if (!engine.finalNotes || engine.finalNotes.length === 0) {
      alert("Aucune note à exporter.");
      return;
    }

    try {
      const midi = new Midi();
      const track = midi.addTrack();
      
      // On force le type pour éviter les erreurs TypeScript (as any[])
      const notesToExport = (engine.finalNotes as any[]); 
      const sortedNotes = [...notesToExport].sort((a, b) => (a.time || 0) - (b.time || 0));
      
      sortedNotes.forEach(note => {
        track.addNote({
          midi: note.midi || note.pitch || 60, // Sécurité si le champ s'appelle pitch
          time: note.time || note.startTime || 0, 
          duration: note.duration || 0.1, 
          velocity: note.velocity || 0.8 
        });
      });

                // Conversion en fichier binaire et téléchargement
      const midiBytes = midi.toArray();
      // ✅ CORRECTION : On force le type pour satisfaire TypeScript
      const blob = new Blob([midiBytes as any], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Sécurité si engine.fileName est undefined
      const safeFileName = engine.fileName ? engine.fileName.replace(/\.[^/.]+$/, "") : "export";
      a.download = `${safeFileName}_export.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors de l'export MIDI:", error);
      alert("Erreur lors de la génération du fichier MIDI.");
    }
  };

  const hasAudio = !!engine.result;

  // ✅ Calcul optimisé du nombre de notes par piste
  const trackCounts = useMemo(() => {
    if (!engine.finalNotes) return { lead: 0, bass: 0, harmony: 0, drums: 0 };
    const notes = engine.finalNotes || [];
    return {
      lead: notes.filter((n: any) => n.track === 'lead').length,
      bass: notes.filter((n: any) => n.track === 'bass').length,
      harmony: notes.filter((n: any) => n.track === 'harmony').length,
      drums: notes.filter((n: any) => n.track === 'drums').length,
    };
  }, [engine.finalNotes]);

  return (
    <div style={{
      maxWidth: 1000,
      margin: '0 auto',
      padding: '60px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      minHeight: '100vh',
      fontFamily: 'Inter, sans-serif',
      color: '#fff',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      
      {/* ✅ EN-TÊTE */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🎚️</span> STUDIO / REMIX
          </h1>
          <span style={{ 
            background: 'rgba(124, 92, 255, 0.15)', 
            color: '#a08aff', 
            border: '1px solid rgba(124, 92, 255, 0.3)', 
            padding: '2px 8px', 
            borderRadius: 12, 
            fontSize: '0.65rem', 
            fontWeight: 700, 
            letterSpacing: '1px' 
          }}>
            CRÉATION
          </span>
        </div>
        <p style={{ color: '#666', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>
          ÉDITION · MIDI · REMIX · SÉQUENCEUR
        </p>
      </div>

      {/* CONTENU PRINCIPAL */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        
        {!hasAudio ? (
          /* ✅ ZONE DE DROP AVEC DRAG & DROP ACTIF */
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              ...PANEL_STYLE,
              borderStyle: 'dashed',
              borderColor: isDragging ? '#7c5cff' : '#2a2a2a',
              background: isDragging ? '#1e1e1e' : '#1c1c1c',
              padding: '80px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isDragging) e.currentTarget.style.borderColor = '#7c5cff';
            }}
            onMouseLeave={(e) => {
              if (!isDragging) e.currentTarget.style.borderColor = '#2a2a2a';
            }}
          >
            <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            
            <div style={{ 
              fontSize: 48, 
              marginBottom: 16, 
              filter: 'drop-shadow(0 0 10px rgba(124, 92, 255, 0.3))',
              transform: isDragging ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.2s ease'
            }}>
              🎹
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px 0' }}>
              {isDragging ? "Relâche pour charger" : "Charger un morceau"}
            </h2>
            <p style={{ color: '#999', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
              Clique ou glisse un fichier audio ici pour extraire les notes (wav, mp3, flac, ogg)
            </p>
            <div style={{ display: 'flex', gap: 12, color: '#666', fontSize: '0.75rem', fontWeight: 600 }}>
              <span>Studio Audio → MIDI</span>
              <span>·</span>
              <span>Piano Roll intégré</span>
              <span>·</span>
              <span>Export</span>
            </div>
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
              borderLeft: '3px solid #00d9ff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 16 }}>🎵</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{engine.fileName}</div>
                  <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                    {engine.fileFormat} · {engine.result?.sampleRate} Hz · {engine.result?.duration.toFixed(1)}s · {engine.result?.bpm} BPM
                  </div>
                </div>
              </div>
              
              {engine.isAnalyzing && (
                <div style={{ fontSize: 11, color: '#00d9ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
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
                <div style={{ fontSize: 10, color: '#999', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>TRANSPORT</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button 
                    onClick={engine.playAudioOriginal}
                    style={BTN_BASE}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#999'; }}
                  >
                    ▶ AUDIO
                  </button>
                  <button 
                    onClick={engine.playMidi}
                    style={BTN_BASE}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#999'; }}
                  >
                    ▶ MIDI
                  </button>
                  <button 
                    onClick={engine.stopAll}
                    style={{...BTN_BASE, color: '#ff5c5c'}}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 92, 92, 0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    ■ STOP
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 10, color: '#999', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>RÉSULTAT</div>
                <span style={{ fontSize: 12, color: '#00d9ff', fontWeight: 700 }}>
                  {engine.finalNotes.length} NOTES
                </span>
                <button 
                  onClick={handleExportMidi}
                  disabled={engine.finalNotes.length === 0}
                  style={{ 
                    ...BTN_BASE, 
                    background: engine.finalNotes.length > 0 ? '#00d9ff' : '#2a2a2a', 
                    color: engine.finalNotes.length > 0 ? '#000' : '#666',
                    borderColor: engine.finalNotes.length > 0 ? '#00d9ff' : '#333',
                    fontWeight: 700,
                    cursor: engine.finalNotes.length > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  EXPORT MIDI
                </button>
              </div>
            </div>

            {/* PISTES */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 12 }}>
              <div style={{ ...PANEL_STYLE, padding: 12, borderLeft: '3px solid #7c5cff' }}>
                <div style={{ fontSize: 10, color: '#7c5cff', fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>MELODY</div>
                <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                  {trackCounts.lead} <span style={{fontSize: 10, color:'#666'}}>notes</span>
                </div>
              </div>
              
              <div style={{ ...PANEL_STYLE, padding: 12, borderLeft: '3px solid #00ff88' }}>
                <div style={{ fontSize: 10, color: '#00ff88', fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>BASS</div>
                <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                  {trackCounts.bass} <span style={{fontSize: 10, color:'#666'}}>notes</span>
                </div>
              </div>
              
              <div style={{ ...PANEL_STYLE, padding: 12, borderLeft: '3px solid #ff5cf0' }}>
                <div style={{ fontSize: 10, color: '#ff5cf0', fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>CHORDS</div>
                <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                  {trackCounts.harmony} <span style={{fontSize: 10, color:'#666'}}>notes</span>
                </div>
              </div>
              
              <div style={{ ...PANEL_STYLE, padding: 12, borderLeft: '3px solid #ffd43b' }}>
                <div style={{ fontSize: 10, color: '#ffd43b', fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>DRUMS</div>
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