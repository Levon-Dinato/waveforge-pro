// src/pages/StudioPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { useTheme } from '../contexts/ThemeContext';
import { PianoRoll } from '../components/PianoRoll';
import type { DetectedNote } from '../types';
import { exportMidi, download } from '../audio/midiExporter';

interface LibraryTrack {
  id: string; coverUrl: string | null; artist: string; title: string; key: string; bpm: number;
  genre: string; audio_url: string;
}

const RENDER_SERVER_URL = 'https://waveforge-api-8n67.onrender.com'; 

export const StudioPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const engine = useAudioEngineContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [library, setLibrary] = useState<LibraryTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<LibraryTrack | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0); // Pour le fake loader
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);
  const [detectedNotes, setDetectedNotes] = useState<DetectedNote[]>([]);

  const colors = {
    bg: isDark ? '#050508' : '#f5f5f7',
    panelBg: isDark ? 'rgba(15, 15, 20, 0.7)' : 'rgba(255, 255, 255, 0.8)',
    cardBg: isDark ? '#0d0d12' : '#ffffff',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    accent: '#00d9ff',
    accentGradient: 'linear-gradient(135deg, #00d9ff, #7c5cff)',
  };

  // 1. CHARGEMENT DE LA BIBLIOTHÈQUE
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
    
    // ✅ RÉVEIL DU SERVEUR DÈS L'OUVERTURE DE LA PAGE (Ping silencieux)
    fetch(`${RENDER_SERVER_URL}/ping`).catch(() => {});
  }, [user]);

  // Fake loader animé pour faire patienter
  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
      }, 5000); // Change de message toutes les 5 sec
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // 2. LA FONCTION D'ANALYSE
  const runTranscription = async (audioBlob: Blob, fileName: string) => {
    setIsAnalyzing(true);
    setDetectedNotes([]);
    setTranscriptionResult(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, fileName);

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

  // 3. IMPORTATION
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setActiveTrack(null);
      await runTranscription(file, file.name);
    }
    e.target.value = '';
  };

  // 4. SÉLECTION D'UN SON
  const handleSelectTrack = async (track: LibraryTrack) => {
    setActiveTrack(track);
    if (track.audio_url) {
      const response = await fetch(track.audio_url);
      const blob = await response.blob();
      await runTranscription(blob, `${track.artist} - ${track.title}.mp3`);
    }
  };

  // 5. EXPORT MIDI
  const handleExportMidi = () => {
    if (!detectedNotes || detectedNotes.length === 0) return;
    try {
      const blob = exportMidi(detectedNotes, 120);
      download(blob, `${activeTrack?.title || 'export'}_midi.mid`);
    } catch (error) {
      console.error("Erreur MIDI:", error);
    }
  };

  const trackCounts = useMemo(() => {
    const notes = detectedNotes || [];
    return {
      lead: notes.filter((n: any) => n.track !== 'bass' && n.track !== 'harmony' && n.track !== 'drums').length,
      bass: notes.filter((n: any) => n.track === 'bass').length,
      harmony: notes.filter((n: any) => n.track === 'harmony').length,
      drums: notes.filter((n: any) => n.track === 'drums').length,
    };
  }, [detectedNotes]);

  const loadingMessages = [
    "Initialisation du serveur Render (Cold Start)...",
    "Envoi de l'audio sur le serveur...",
    "Analyse des fréquences et séparation des pistes...",
    "Extraction des notes MIDI en cours..."
  ];

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: colors.bg, color: colors.accent, fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 800 }}>Chargement du Studio...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: colors.bg, color: colors.textMain, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      
      {/* BACKGROUND DECORATIF (Néon) */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(0, 217, 255, 0.05) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(124, 92, 255, 0.05) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      {/* TOP BAR */}
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.panelBg, backdropFilter: 'blur(20px)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = colors.textMain} onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Quitter le studio
          </button>
          <div style={{ height: 20, width: 1, background: colors.border }} />
          <h1 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 10, background: colors.accentGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <span style={{ fontSize: 20 }}>🎹</span> Analyzer Pro
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: colors.accent, background: 'rgba(0, 217, 255, 0.1)', padding: '6px 12px', borderRadius: 20, border: `1px solid rgba(0, 217, 255, 0.3)` }}>
            ● SERVEUR EN LIGNE
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', zIndex: 1 }}>
        
        {/* SIDEBAR BIBLIOTHÈQUE */}
        <div style={{ width: 300, background: colors.panelBg, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(20px)' }}>
          <div style={{ padding: '20px 20px 12px 20px' }}>
             <h2 style={{ fontSize: 12, fontWeight: 900, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Ma Bibliothèque</h2>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
            {library.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>Aucune musique.</div>
            ) : (
              library.map(track => (
                <div key={track.id} onClick={() => handleSelectTrack(track)} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, borderRadius: 8, cursor: 'pointer', background: activeTrack?.id === track.id ? 'rgba(0, 217, 255, 0.1)' : 'transparent', border: `1px solid ${activeTrack?.id === track.id ? 'rgba(0, 217, 255, 0.3)' : 'transparent'}`, marginBottom: 6, transition: 'all 0.2s' }} onMouseEnter={(e) => { if (activeTrack?.id !== track.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }} onMouseLeave={(e) => { if (activeTrack?.id !== track.id) e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width: 40, height: 40, background: track.coverUrl ? `url(${track.coverUrl}) center/cover` : 'rgba(255,255,255,0.1)', borderRadius: 6, flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: activeTrack?.id === track.id ? colors.accent : colors.textMain }}>{track.title}</div>
                    <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{track.artist}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: 20, borderTop: `1px solid ${colors.border}` }}>
            <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing} style={{ width: '100%', padding: '14px', background: isAnalyzing ? colors.border : colors.accentGradient, color: '#000', border: 'none', borderRadius: 8, fontWeight: 900, cursor: isAnalyzing ? 'wait' : 'pointer', fontSize: 14, boxShadow: isAnalyzing ? 'none' : '0 8px 20px rgba(0, 217, 255, 0.3)', transition: 'all 0.2s', transform: isAnalyzing ? 'scale(0.98)' : 'scale(1)' }}>
              {isAnalyzing ? 'Analyse...' : '+ Importer un son'}
            </button>
          </div>
        </div>

        {/* ZONE PRINCIPALE (STUDIO) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* INFO FICHIER */}
          <div style={{ padding: '20px 32px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 20, background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ width: 60, height: 60, borderRadius: 12, background: activeTrack?.coverUrl ? `url(${activeTrack.coverUrl}) center/cover` : 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.5px' }}>
                {activeTrack?.title || 'Nouveau Projet'}
              </h2>
              <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, display: 'flex', gap: 12, fontWeight: 600 }}>
                <span style={{ color: colors.accent }}>{detectedNotes.length > 0 ? `${detectedNotes.length} notes` : 'En attente'}</span>
                <span>•</span>
                <span>{transcriptionResult?.duration?.toFixed(1) || '0.0'}s</span>
                <span>•</span>
                <span>120 BPM</span>
              </div>
            </div>
          </div>

          {/* TOOLBAR (Style DAW) */}
          <div style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, background: colors.panelBg }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => engine.playMidi && engine.playMidi()} disabled={detectedNotes.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: detectedNotes.length === 0 ? 'transparent' : 'rgba(0, 217, 255, 0.1)', border: `1px solid ${detectedNotes.length === 0 ? colors.border : colors.accent}`, color: detectedNotes.length === 0 ? colors.textMuted : colors.accent, borderRadius: 8, cursor: detectedNotes.length === 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 800, transition: 'all 0.2s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> LECTURE
              </button>
              <button onClick={() => engine.stopAll && engine.stopAll()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'rgba(255, 92, 92, 0.1)', border: '1px solid rgba(255, 92, 92, 0.3)', color: '#ff5c5c', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"></rect></svg> STOP
              </button>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: colors.textMain, fontWeight: 800, letterSpacing: 1 }}>{detectedNotes.length} <span style={{color: colors.textMuted, fontSize: 11}}>NOTES</span></span>
              <div style={{ height: 20, width: 1, background: colors.border }} />
              <button onClick={handleExportMidi} disabled={detectedNotes.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: detectedNotes.length === 0 ? 'transparent' : colors.accentGradient, border: 'none', color: detectedNotes.length === 0 ? colors.textMuted : '#000', borderRadius: 8, fontWeight: 900, cursor: detectedNotes.length === 0 ? 'not-allowed' : 'pointer', fontSize: 13, boxShadow: detectedNotes.length === 0 ? 'none' : '0 4px 15px rgba(0, 217, 255, 0.3)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> EXPORT MIDI
              </button>
            </div>
          </div>

          {/* PISTES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: '20px 32px' }}>
            {[
              { label: 'MELODY', count: trackCounts.lead, color: '#7c5cff' },
              { label: 'BASS', count: trackCounts.bass, color: '#00ff88' },
              { label: 'CHORDS', count: trackCounts.harmony, color: '#ff5cf0' },
              { label: 'DRUMS', count: trackCounts.drums, color: '#ffd43b' }
            ].map((track, i) => (
              <div key={i} style={{ background: colors.cardBg, padding: 16, borderRadius: 12, border: `1px solid ${colors.border}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: track.color }} />
                <div style={{ fontSize: 11, color: track.color, fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>{track.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: colors.textMain }}>{track.count} <span style={{fontSize: 11, color: colors.textMuted, fontWeight: 600}}>notes</span></div>
              </div>
            ))}
          </div>

          {/* PIANO ROLL */}
          <div style={{ flex: 1, padding: '0 32px 32px 32px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: '100%', height: '100%', background: colors.cardBg, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden', position: 'relative', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)' }}>
              
              <PianoRoll 
                {...({
                  notes: detectedNotes,
                  currentTime: 0,
                  duration: transcriptionResult?.duration || 10,
                  bpm: 120,
                  isPlaying: false,
                  onSeek: () => {},
                  onNotesChange: (newNotes: DetectedNote[]) => setDetectedNotes(newNotes)
                } as any)}
              />

              {/* OVERLAY : Message si aucun son n'est chargé */}
              {detectedNotes.length === 0 && !isAnalyzing && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,8,0.6)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <div style={{ fontSize: 60, marginBottom: 20, opacity: 0.8 }}>🎼</div>
                  <h2 style={{ fontSize: '1.4rem', color: colors.textMain, marginBottom: 8, fontWeight: 900 }}>Grille de composition</h2>
                  <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: 30, textAlign: 'center', maxWidth: 400, lineHeight: 1.5 }}>Importe un son à gauche pour extraire ses notes et les faire apparaître sur la partition.</p>
                  <button onClick={() => fileInputRef.current?.click()} style={{ padding: '14px 28px', background: 'rgba(0,217,255,0.15)', border: `1px solid ${colors.accent}`, color: colors.accent, borderRadius: 8, fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s', fontSize: 14 }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,217,255,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,217,255,0.15)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                    Importer un son
                  </button>
                </div>
              )}

              {/* OVERLAY : Animation d'analyse PRO */}
              {isAnalyzing && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,8,0.9)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                  
                  {/* Loader animé circulaire */}
                  <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 30 }}>
                     <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(0, 217, 255, 0.1)', borderRadius: '50%' }} />
                     <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 1.5s linear infinite' }} />
                     <div style={{ position: 'absolute', inset: 10, border: '3px solid transparent', borderBottomColor: '#7c5cff', borderRadius: '50%', animation: 'spin 2s linear infinite reverse' }} />
                     <div style={{ fontSize: 32 }}>🎵</div>
                  </div>

                  <h2 style={{ fontSize: '1.5rem', color: colors.textMain, marginBottom: 12, fontWeight: 900, textAlign: 'center' }}>
                    {loadingMessages[loadingStep]}
                  </h2>
                  
                  <p style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 450, lineHeight: 1.6, background: 'rgba(255,255,255,0.03)', padding: '16px 24px', borderRadius: 12, border: `1px solid ${colors.border}` }}>
                    <strong style={{ color: '#ffd43b' }}>⏳ Patience :</strong> L'analyse sur le serveur Render peut prendre <strong>1 à 2 minutes</strong> si le serveur était endormi. <br/> Ne quitte pas cette page.
                  </p>

                  <style>{`
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                  `}</style>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};