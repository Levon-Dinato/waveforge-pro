// src/pages/SortieRadioPage.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { ReleaseCard } from '../components/ReleaseCard';
import { PageMeta } from '../components/PageMeta';

export const SortieRadioPage: React.FC = () => {
  const { play, currentTrack, isPlaying, currentTime, duration, seek } = usePlayer();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();

  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);

  const themeColor = '#ffffff';

  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.55)' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    cardBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
  };

  useEffect(() => {
    const fetchTracks = async () => {
      const { data } = await supabase
        .from('tracks')
        .select('*')
        .is('user_id', null)
        .neq('is_jingle', true)
        .order('created_at', { ascending: false });
      if (data) {
        const formatted = data.map((x) => ({ ...x, peaks: typeof x.peaks === 'string' ? JSON.parse(x.peaks) : x.peaks || [] }));
        setTracks(formatted);
      }
      setLoading(false);
    };
    fetchTracks();
  }, []);

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePlayTrack = (track: any) => {
    if (track.audio_url && track.audio_url.length > 0) {
      const queue = tracks.filter((t) => t.audio_url && t.audio_url.length > 0);
      play({ ...track, peaks: track.peaks }, queue);
    }
  };

  const handleDownload = (e: React.MouseEvent, url: string, filename: string) => {
    e.stopPropagation();
    alert('Aperçu 30 s — écoute directe uniquement.');
  };

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', transition: 'background 0.3s ease, color 0.3s ease' }}>
      <PageMeta title="Sortie Radio" description="Les sorties radio ELEKTRAQ — sélection IA / radar." />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: isMobile ? '24px 16px' : '60px 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: themeColor, marginBottom: 12 }}>🎵 Sortie Radio</div>
          <h1 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Sélection IA / Radar</h1>
          <p style={{ color: colors.textMuted, fontSize: 15, marginTop: 8 }}>Les titres repérés par le radar, pour ta programmation radio.</p>
        </div>

        {loading ? (
          <div style={{ color: colors.textMuted, padding: 40, textAlign: 'center' }}>Chargement...</div>
        ) : tracks.length === 0 ? (
          <div style={{ textAlign: 'center', color: colors.textMuted, padding: 40, border: `1px dashed ${colors.border}`, borderRadius: 16 }}>Aucun titre pour le moment.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>
            {tracks.slice(0, visibleCount).map((track) => (
              <ReleaseCard
                key={track.id}
                track={{ ...track, is_downloadable: false }}
                isDark={isDark}
                themeColor={themeColor}
                colors={colors}
                isCurrentTrack={currentTrack?.id === track.id}
                isThisPlaying={currentTrack?.id === track.id && isPlaying}
                isMobile={isMobile}
                handlePlayTrack={handlePlayTrack}
                handleDownload={handleDownload}
                seek={seek}
                currentTime={currentTime}
                duration={duration}
                formatTime={formatTime}
                isOwner={false}
              />
            ))}
            {tracks.length > visibleCount && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button onClick={() => setVisibleCount((prev) => prev + 8)} style={{ background: 'transparent', border: `1px solid ${themeColor}`, color: themeColor, padding: '12px 32px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Voir plus
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
