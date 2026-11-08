// src/pages/RadioPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';

interface Track {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_url: string | null;
  duration: number;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio?: string;
}

export const RadioPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const isMobile = useIsMobile(768);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const colors = {
    bg: isDark ? '#05050a' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    panelBg: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
    accent: '#00d9ff',
  };

  // 1. Charger le profil et les sons du DJ
  useEffect(() => {
    const fetchRadioData = async () => {
      if (!username) return;
      setLoading(true);

      // Récupérer le profil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Récupérer ses sons (mélangés)
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false });

        if (tracksData && tracksData.length > 0) {
          // On mélange les tracks pour que la radio soit variée
          const shuffled = [...tracksData].sort(() => Math.random() - 0.5);
          setTracks(shuffled);
        }
      }
      setLoading(false);
    };

    fetchRadioData();
  }, [username]);

  // 2. Gérer la lecture
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Erreur lecture:", e));
    }
    setIsPlaying(!isPlaying);
  };

  // 3. Passer au son suivant automatiquement
  const playNext = () => {
    if (tracks.length === 0) return;
    const nextIndex = (currentIndex + 1) % tracks.length; // Boucle infinie
    setCurrentIndex(nextIndex);
    setIsPlaying(true);
  };

  // 4. Quand un son se termine, on lance le suivant
  const handleEnded = () => {
    playNext();
  };

  // Déclencher la lecture quand l'index change (après un "next")
  useEffect(() => {
    if (audioRef.current && isPlaying && tracks[currentIndex]) {
      audioRef.current.play().catch(e => console.error("Erreur lecture:", e));
    }
  }, [currentIndex, isPlaying, tracks]);

  if (loading) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement de la radio...</div>;

  if (!profile) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>DJ introuvable.</div>;

  const currentTrack = tracks[currentIndex];

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '20px' : '60px' }}>
      
      {/* Header de la radio */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255, 51, 102, 0.1)', border: '1px solid rgba(255, 51, 102, 0.3)', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, color: '#ff3366', marginBottom: 16, letterSpacing: '1px', textTransform: 'uppercase' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3366', boxShadow: '0 0 10px #ff3366', animation: 'pulse 1.5s infinite' }} />
          En Direct
        </div>
        <h1 style={{ fontSize: isMobile ? '2rem' : '3rem', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
          Radio {profile.username}
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 14, marginTop: 8 }}>
          La webradio officielle de {profile.username}
        </p>
      </div>

      {/* Lecteur Principal */}
      <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 24, padding: isMobile ? 20 : 40, width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px rgba(0,0,0,0.05)' }}>
        
        {/* Avatar du DJ (remplace la pochette si pas de cover) */}
        <div style={{ width: 200, height: 200, borderRadius: '50%', background: currentTrack?.cover_url ? `url(${currentTrack.cover_url}) center/cover` : (profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : colors.border), border: `4px solid ${colors.bg}`, boxShadow: '0 10px 30px rgba(0,217,255,0.2)', position: 'relative' }}>
          {isPlaying && (
            <div style={{ position: 'absolute', bottom: 10, right: 10, background: colors.accent, color: '#000', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 900 }}>LIVE</div>
          )}
        </div>

        {/* Infos du son */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px 0' }}>
            {currentTrack ? currentTrack.title : 'Aucun son pour le moment'}
          </h2>
          <p style={{ color: colors.textMuted, fontSize: 15, margin: 0 }}>
            {currentTrack ? currentTrack.artist : profile.username}
          </p>
        </div>

        {/* Contrôles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button onClick={() => { setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length); }} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"></line></svg>
          </button>

          <button onClick={togglePlay} style={{ width: 72, height: 72, borderRadius: '50%', background: colors.accent, color: '#000', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 0 30px ${colors.accent}60` }}>
            {isPlaying ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 4 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            )}
          </button>

          <button onClick={playNext} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"></line></svg>
          </button>
        </div>

        {/* Prochain son */}
        {tracks.length > 1 && (
          <div style={{ marginTop: 20, width: '100%', borderTop: `1px solid ${colors.border}`, paddingTop: 16, textAlign: 'center', fontSize: 12, color: colors.textMuted }}>
            <span style={{ fontWeight: 800 }}>À suivre :</span> {tracks[(currentIndex + 1) % tracks.length]?.title}
          </div>
        )}
      </div>

      <div style={{ marginTop: 40 }}>
        <Link to={`/premium/${profile.username}`} style={{ color: colors.accent, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
          ← Voir le profil complet de {profile.username}
        </Link>
      </div>

      {/* Élément Audio caché */}
      {currentTrack && (
        <audio 
          ref={audioRef} 
          src={currentTrack.audio_url} 
          onEnded={handleEnded}
          autoPlay={isPlaying}
        />
      )}

      <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }`}</style>
    </div>
  );
};