// src/pages/StudioPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { PianoRoll } from '../components/PianoRoll';
import type { DetectedNote } from '../types';
import { Waveform } from '../components/Waveform';
import { exportMidi, download } from '../audio/midiExporter';

interface LibraryTrack {
  id: string; coverUrl: string | null; artist: string; title: string; key: string; bpm: number;
  genre: string; audio_url: string;
}

// ✅ L'URL de TON serveur Render (à remplacer par la tienne)
const RENDER_SERVER_URL = 'https://waveforge-api-8n67.onrender.com'; 

export const StudioPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const engine = useAudioEngineContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [library, setLibrary] = useState<LibraryTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<LibraryTrack | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);
  const [detectedNotes, setDetectedNotes] = useState<DetectedNote[]>([]);

  // ✅ 1. CHARGEMENT DE LA BIBLIOTHÈQUE
  useEffect(() => {
    const fetchLibrary = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('tracks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) {
        const formatted = data.map((t: any) => ({
          id: t.id, coverUrl: t.cover_url || null, artist: t.artist || 'Inconnu',
          title: t.title, key: t.key || t.song_key || '--', bpm: t.bpm || 0,
          genre: t.genre || 'Inconnu', audio_url: t.audio_url
        }));
        setLibrary(formatted);
      }
      setLoading(false);
    };
    fetchLibrary();
  }, [user]);

  // ✅ 2. LA FONCTION MAGIQUE (Appel serveur au lieu du PC)
  const runTranscription = async (audioBlob: Blob, fileName: string) => {
    setIsAnalyzing(true);
    setDetectedNotes([]);
    setTranscriptionResult(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, fileName);

      // On envoie le fichier à TON SERVEUR RENDER
      const response = await fetch(`${RENDER_SERVER_URL}/analyze-audio`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Erreur serveur lors de l'analyse");

      const data = await response.json();
      
      if (!data || !data.notes) throw new Error("Réponse invalide du serveur");

      setDetectedNotes(data.notes);
      setTranscriptionResult({
        notes: data.notes,
        duration: data.duration || 0,
        noteCount: data.notes.length,
      });

      if (engine && typeof engine.loadNotesFromBuffer === 'function') {
        engine.loadNotesFromBuffer(data.notes);
      }
    } catch (err: any) {
      console.error("Erreur d'analyse :", err);
      alert("Erreur lors de l'analyse : " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ✅ 3. IMPORTATION D'UN NOUVEAU FICHIER
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setActiveTrack(null);
      await runTranscription(file, file.name);
    }
    e.target.value = '';
  };

  // ✅ 4. CLIC SUR UN SON DE LA BIBLIOTHÈQUE
  const handleSelectTrack = async (track: LibraryTrack) => {
    setActiveTrack(track);
    if (track.audio_url) {
      const response = await fetch(track.audio_url);
      const blob = await response.blob();
      await runTranscription(blob, `${track.artist} - ${track.title}.mp3`);
    }
  };

  // ✅ 5. EXPORT MIDI
  const handleExportMidi = () => {
  if (!detectedNotes || detectedNotes.length === 0) {
    alert("Aucune note à exporter.");
    return;
  }
  try {
    // ✅ Utilise ton exportateur Pro qui gère les pistes (Melody, Bass, Drums)
    const blob = exportMidi(detectedNotes, 120); // 120 BPM par défaut
    download(blob, `${activeTrack?.title || 'export'}_midi.mid`);
  } catch (error) {
    console.error("Erreur MIDI:", error);
  }
};

  // ✅ 6. CALCUL DES NOTES
  const trackCounts = useMemo(() => {
    const notes = detectedNotes || [];
    return {
      lead: notes.filter((n: any) => n.track !== 'bass' && n.track !== 'harmony' && n.track !== 'drums').length,
      bass: notes.filter((n: any) => n.track === 'bass').length,
      harmony: notes.filter((n: any) => n.track === 'harmony').length,
      drums: notes.filter((n: any) => n.track === 'drums').length,
    };
  }, [detectedNotes]);

  const hasAudio = !!transcriptionResult;

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#020205', color: '#00d9ff', fontFamily: 'Inter, sans-serif' }}>Chargement de la bibliothèque...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#020205', color: '#fff', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      
      {/* TOP BAR */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Retour au site
        </button>
        <span style={{ color: '#333' }}>|</span>
        <h1 style={{ fontSize: '1rem', fontWeight: 900, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#00d9ff' }}>🎧</span> Analyzer MIDI
        </h1>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* SIDEBAR BIBLIOTHÈQUE */}
        <div style={{ width: 280, background: '#0a0a0a', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #222' }}>
             <h2 style={{ fontSize: 12, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Ma Bibliothèque</h2>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {library.map(track => (
              <div key={track.id} onClick={() => handleSelectTrack(track)} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, borderRadius: 6, cursor: 'pointer', background: activeTrack?.id === track.id ? '#1a1a1a' : 'transparent', marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, background: track.coverUrl ? `url(${track.coverUrl}) center/cover` : '#222', borderRadius: 4 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: activeTrack?.id === track.id ? '#00d9ff' : '#fff' }}>{track.title}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{track.artist}</div>
                </div>
              </div>
            ))}
          </div>

          {/* BOUTON IMPORT */}
          <div style={{ padding: 16, borderTop: '1px solid #222' }}>
            <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing} style={{ width: '100%', padding: '12px', background: isAnalyzing ? '#333' : '#00d9ff', color: isAnalyzing ? '#888' : '#000', border: 'none', borderRadius: 6, fontWeight: 900, cursor: isAnalyzing ? 'wait' : 'pointer', fontSize: 13 }}>
              {isAnalyzing ? 'Analyse Serveur...' : '+ Importer un son'}
            </button>
          </div>
        </div>

        {/* ZONE PRINCIPALE (STUDIO) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {!hasAudio && !isAnalyzing ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎹</div>
              <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: 8 }}>Charger un morceau</h2>
              <p style={{ fontSize: 14, marginBottom: 24 }}>Le fichier sera analysé par notre serveur Cloud (Basic Pitch).</p>
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: '12px 24px', background: 'rgba(0,217,255,0.1)', border: '1px solid #00d9ff', color: '#00d9ff', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>Importer un fichier</button>
            </div>
          ) : isAnalyzing ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#00d9ff' }}>
              <div style={{ fontSize: 32, marginBottom: 16, animation: 'spin 2s linear infinite' }}>⚙️</div>
              <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: 8 }}>Analyse sur le serveur...</h2>
              <p style={{ fontSize: 14, color: '#888' }}>Le serveur Render extrait les notes. Cela peut prendre 10-20 secondes.</p>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              {/* INFO FICHIER + WAVEFORM */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeTrack?.title || 'Fichier importé'}</h2>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{detectedNotes.length} notes détectées · {transcriptionResult?.duration?.toFixed(1)}s</div>
                </div>
                {transcriptionResult?.midiBlob && (
                  <div style={{ flex: 2, height: 64, background: '#0a0a0a', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
                    <Waveform 
                      audioBuffer={null} 
                      currentTime={0}
                      duration={transcriptionResult.duration || 0}
                      onSeek={() => {}}
                      height={62}
                      showGrid={false}
                      variant="compact"
                    />
                  </div>
                )}
              </div>

              {/* TOOLBAR */}
              <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => engine.playMidi && engine.playMidi()} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #333', color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>▶ MIDI</button>
                  <button onClick={() => engine.stopAll && engine.stopAll()} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ff5c5c', color: '#ff5c5c', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>■ STOP</button>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#00d9ff', fontWeight: 700 }}>{detectedNotes.length} NOTES</span>
                  <button onClick={handleExportMidi} style={{ padding: '8px 16px', background: '#00d9ff', color: '#000', border: 'none', borderRadius: 4, fontWeight: 800, cursor: 'pointer', fontSize: 12 }}>EXPORT MIDI</button>
                </div>
              </div>

              {/* PISTES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '16px 24px' }}>
                <div style={{ background: '#121212', padding: 12, borderRadius: 8, borderLeft: '3px solid #7c5cff' }}>
                  <div style={{ fontSize: 10, color: '#7c5cff', fontWeight: 800 }}>MELODY</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{trackCounts.lead} <span style={{fontSize: 10, color:'#666'}}>notes</span></div>
                </div>
                <div style={{ background: '#121212', padding: 12, borderRadius: 8, borderLeft: '3px solid #00ff88' }}>
                  <div style={{ fontSize: 10, color: '#00ff88', fontWeight: 800 }}>BASS</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{trackCounts.bass} <span style={{fontSize: 10, color:'#666'}}>notes</span></div>
                </div>
                <div style={{ background: '#121212', padding: 12, borderRadius: 8, borderLeft: '3px solid #ff5cf0' }}>
                  <div style={{ fontSize: 10, color: '#ff5cf0', fontWeight: 800 }}>CHORDS</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{trackCounts.harmony} <span style={{fontSize: 10, color:'#666'}}>notes</span></div>
                </div>
                <div style={{ background: '#121212', padding: 12, borderRadius: 8, borderLeft: '3px solid #ffd43b' }}>
                  <div style={{ fontSize: 10, color: '#ffd43b', fontWeight: 800 }}>DRUMS</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{trackCounts.drums} <span style={{fontSize: 10, color:'#666'}}>notes</span></div>
                </div>
              </div>

              {/* PIANO ROLL */}
              <div style={{ flex: 1, padding: '0 24px 24px 24px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#121212', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
                  <PianoRoll 
                    {...({
                      notes: detectedNotes,
                      currentTime: 0,
                      duration: transcriptionResult?.duration || 0,
                      bpm: 120,
                      isPlaying: false,
                      onSeek: () => {},
                      onNotesChange: (newNotes: DetectedNote[]) => setDetectedNotes(newNotes)
                    } as any)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};