// src/pages/ChartsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { ScrollToTop } from '../components/ScrollToTop';
import { PageMeta } from '../components/PageMeta';
import { useTranslation } from 'react-i18next';
import { TrackList } from '../components/TrackList';

interface Track {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  plays: number;
  duration: number;
  audio_url: string;
  user_id: string;
  peaks: any;
  bpm: number;
  song_key: string;
  genre: string;
  player_bg_image_url: string | null;
  player_bg_color: string | null;
  previous_rank?: number | null;
}

// ✅ Composant de tendance (Flèches/Badges)
const TrendBadge = ({ currentRank, previousRank, size = 'normal' }: { currentRank: number, previousRank?: number | null, size?: 'small' | 'normal' }) => {
  const isSmall = size === 'small';
  const boxSize = isSmall ? 24 : 32;

  if (previousRank === null || previousRank === undefined) {
    return (
      <div style={{ 
        width: boxSize, height: boxSize, background: '#ffffff', color: '#000', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        borderRadius: 4, fontSize: isSmall ? 9 : 10, fontWeight: 900 
      }}>
        NEW
      </div>
    );
  }

  const diff = previousRank - currentRank;

  if (diff > 0) {
    return (
      <div style={{ 
        width: boxSize, height: boxSize, background: '#b0b0b0', color: '#fff', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
        borderRadius: 4, fontSize: isSmall ? 10 : 12, fontWeight: 900, lineHeight: 1
      }}>
        <svg width={isSmall ? 8 : 12} height={isSmall ? 8 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"></polyline></svg>
        {diff}
      </div>
    );
  } 
  
  if (diff < 0) {
    return (
      <div style={{ 
        width: boxSize, height: boxSize, background: '#b0b0b0', color: '#fff', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
        borderRadius: 4, fontSize: isSmall ? 10 : 12, fontWeight: 900, lineHeight: 1
      }}>
        <svg width={isSmall ? 8 : 12} height={isSmall ? 8 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
        {Math.abs(diff)}
      </div>
    );
  }

  return (
    <div style={{ 
      width: boxSize, height: boxSize, background: '#b0b0b0', color: '#fff', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      borderRadius: 4, fontSize: isSmall ? 14 : 18, fontWeight: 900 
    }}>
      -
    </div>
  );
};

export const ChartsPage: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { play, currentTrack, isPlaying, togglePlay } = usePlayer() as any;
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const { t } = useTranslation();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'weekly' | 'alltime'>('weekly');

  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#666666',
    accent: '#94c748',
    gold: '#b0b0b0',
    silver: '#9ca3af',
    bronze: '#b45309',
  };

  useEffect(() => {
    const fetchTopTracks = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tracks')
          .select('*')
          .or('is_jingle.is.null,is_jingle.eq.false')
          .or('is_private.is.null,is_private.eq.false')
          .order('plays', { ascending: false })
          .limit(50);

        if (error) {
          console.error("Erreur Supabase:", error);
        } else if (data) {
          setTracks(data);
        }
      } catch (err) {
        console.error("Erreur catch:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopTracks();
  }, []);

  const incrementPlayCount = async (track: Track) => {
    if (!user || user.id === track.user_id) return;
    const listenKey = `listened_${track.id}_${user.id}`;
    const lastListen = localStorage.getItem(listenKey);
    const now = Date.now();
    if (lastListen && now - parseInt(lastListen) < 60 * 1000) return;

    try {
      const { error } = await supabase.rpc('increment_play_count', { track_id_param: track.id });
      if (!error) {
        setTracks(prev => prev.map(t => t.id === track.id ? { ...t, plays: (t.plays || 0) + 1 } : t));
        localStorage.setItem(listenKey, now.toString());
      }
    } catch (err) {
      console.error("Erreur RPC:", err);
    }
  };

  const handlePlay = (track: Track) => {
    if (!user) {
      alert(t('charts.login_required'));
      navigate('/auth');
      return;
    }

    // ✅ Promo embed / sans audio : la fiche titre joue l'extrait officiel
    if (!track.audio_url) { window.location.href = '/track/' + track.id; return; }

    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      const isNew = currentTrack?.id !== track.id;
      play({
        id: track.id, title: track.title, artist: track.artist,
        audio_url: track.audio_url, cover_url: track.cover_url,
        user_id: track.user_id, duration: track.duration, peaks: track.peaks,
        bpm: track.bpm, song_key: track.song_key, genre: track.genre,
        player_bg_image_url: track.player_bg_image_url, player_bg_color: track.player_bg_color
      });
      if (isNew) incrementPlayCount(track);
    }
  };

  const formatPlays = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  const top3 = tracks.slice(0, 3);
  const rest = tracks.slice(3);
  // L'ordre visuel du podium : 2ème, 1er, 3ème
  const podiumOrder = [top3[1], top3[0], top3[2]];

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', padding: '40px 20px', color: colors.textMain, fontFamily: 'Inter, sans-serif' }}>
      <PageMeta title="Top 50" description="Le classement des morceaux les plus écoutés par la communauté ELEKTRAQ, mis à jour en temps réel." />
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: colors.accent, marginBottom: 12 }}>
            ELEKTRAQ Charts
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16 }}>
            {t('charts.title_a')} <span style={{ color: colors.accent }}>{t('charts.title_b')}</span>
          </h1>
          <p style={{ fontSize: 16, color: colors.textMuted, maxWidth: 600, margin: '0 auto' }}>
            {t('charts.subtitle')}
          </p>
        </div>

        {/* FILTRES */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 40 }}>
          <button 
            onClick={() => setTimeRange('weekly')}
            style={{ padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: timeRange === 'weekly' ? colors.accent : 'transparent', color: timeRange === 'weekly' ? '#000' : colors.textMuted, border: `1px solid ${timeRange === 'weekly' ? colors.accent : colors.border}`, transition: 'all 0.2s' }}
          >
            {t('charts.weekly')}
          </button>
          <button 
            onClick={() => setTimeRange('alltime')}
            style={{ padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: timeRange === 'alltime' ? colors.textMain : 'transparent', color: timeRange === 'alltime' ? colors.bg : colors.textMuted, border: `1px solid ${timeRange === 'alltime' ? colors.textMain : colors.border}`, transition: 'all 0.2s' }}
          >
            {t('charts.alltime')}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: colors.textMuted }}>{t('charts.loading')}</div>
        ) : tracks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: colors.textMuted, background: colors.panelBg, borderRadius: 16, border: `1px solid ${colors.border}` }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: colors.textMain, marginBottom: 8 }}>{t('charts.empty_title')}</h2>
            <p>{t('charts.empty_sub')}</p>
          </div>
        ) : (
          <>
            <TrackList tracks={tracks} onPlay={handlePlay} />
          </>
        )}
      </div>
      
      <ScrollToTop />
      
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};