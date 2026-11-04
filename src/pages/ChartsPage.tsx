// src/pages/ChartsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';

// ✅ INTERFACE TRACK COMPLÈTE
interface Track {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  plays: number;
  duration: number;
  audio_url: string;
  profiles: { username: string } | null;
  user_id: string;
  peaks: any;
  bpm: number;
  song_key: string;
  genre: string;
  player_bg_image_url: string | null;
  player_bg_color: string | null;
}

export const ChartsPage: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { play, currentTrack, isPlaying, togglePlay } = usePlayer();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#666666',
    accent: '#00d9ff',
    gold: '#fbbf24',
    silver: '#9ca3af',
    bronze: '#b45309',
  };

  useEffect(() => {
    const fetchTopTracks = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tracks')
        .select('*, profiles(username)')
        .order('plays', { ascending: false })
        .limit(50);

      if (!error && data) setTracks(data);
      setLoading(false);
    };
    fetchTopTracks();
  }, []);

  const handlePlay = (track: Track) => {
    if (!user) {
      alert("Connecte-toi pour écouter les sons !");
      navigate('/auth');
      return;
    }
    
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      play({
        id: track.id,
        title: track.title,
        artist: track.artist,
        audio_url: track.audio_url,
        cover_url: track.cover_url,
        user_id: track.user_id,
        duration: track.duration,
        peaks: track.peaks,
        bpm: track.bpm,
        song_key: track.song_key,
        genre: track.genre,
        player_bg_image_url: track.player_bg_image_url,
        player_bg_color: track.player_bg_color
      });
    }
  };

  const formatPlays = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  const top3 = tracks.slice(0, 3);
  const rest = tracks.slice(3);

  // Ordre du podium : 2ème - 1er - 3ème
  const podiumOrder = [top3[1], top3[0], top3[2]];

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', padding: '40px 20px', color: colors.textMain, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: colors.accent, marginBottom: 12 }}>
            DropZone Charts
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Top 50 <span style={{ color: colors.accent }}>des sons</span>
          </h1>
          <p style={{ fontSize: 16, color: colors.textMuted, maxWidth: 600, margin: '0 auto' }}>
            Les morceaux les plus écoutés par la communauté. Le classement est mis à jour en temps réel.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: colors.textMuted }}>Chargement du classement...</div>
        ) : (
          <>
            {/* PODIUM TOP 3 */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 20, marginBottom: 60, flexWrap: 'wrap' }}>
              {podiumOrder.map((track, index) => {
                if (!track) return null;
                const rank = track === top3[0] ? 1 : track === top3[1] ? 2 : 3;
                const isFirst = rank === 1;
                const isSecond = rank === 2;
                const isThird = rank === 3;
                
                const medalColor = isFirst ? colors.gold : isSecond ? colors.silver : colors.bronze;
                const height = isFirst ? 280 : isSecond ? 220 : 200;
                const coverSize = isFirst ? 120 : isSecond ? 90 : 80;
                const isCurrent = currentTrack?.id === track.id && isPlaying;

                return (
                  <div key={track.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: isFirst ? 220 : 180 }}>
                    
                    {/* Couronne pour le 1er */}
                    {isFirst && <div style={{ fontSize: 40, marginBottom: -10 }}>👑</div>}
                    
                    <div 
                      onClick={() => handlePlay(track)}
                      style={{ 
                        position: 'relative',
                        width: coverSize, height: coverSize, 
                        borderRadius: '50%', 
                        background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.border, 
                        border: `4px solid ${medalColor}`,
                        boxShadow: `0 0 30px ${medalColor}40`,
                        cursor: 'pointer',
                        marginBottom: 16,
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isCurrent ? 1 : 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.opacity = '0' }}>
                        {isCurrent ? (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                        ) : (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        )}
                      </div>
                    </div>

                    <div style={{ 
                      background: colors.panelBg, 
                      border: `1px solid ${colors.border}`, 
                      borderTop: `4px solid ${medalColor}`,
                      borderRadius: '16px 16px 0 0', 
                      padding: '20px 16px', 
                      textAlign: 'center',
                      width: '100%',
                      height: height,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start'
                    }}>
                      <div style={{ fontSize: 32, fontWeight: 900, color: medalColor, marginBottom: 8 }}>#{rank}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{track.title}</div>
                      <div style={{ fontSize: 13, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.profiles?.username || track.artist}</div>
                      
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        {formatPlays(track.plays || 0)} écoutes
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LISTE RESTE DU TOP 50 */}
            <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, overflow: 'hidden' }}>
              {rest.map((track, index) => {
                const rank = index + 4;
                const isCurrent = currentTrack?.id === track.id && isPlaying;
                
                return (
                  <div 
                    key={track.id} 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', 
                      borderBottom: index !== rest.length - 1 ? `1px solid ${colors.border}` : 'none',
                      transition: 'background 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => handlePlay(track)}
                  >
                    <div style={{ width: 40, fontSize: 18, fontWeight: 800, color: colors.textMuted, textAlign: 'center' }}>{rank}</div>
                    
                    <div style={{ position: 'relative', width: 56, height: 56, borderRadius: 8, background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.border, flexShrink: 0 }}>
                      {isCurrent && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${colors.accent}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: isCurrent ? colors.accent : colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {track.title}
                      </div>
                      <div style={{ fontSize: 13, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {track.profiles?.username || track.artist}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.textMuted, fontWeight: 600, width: 100, justifyContent: 'flex-end' }}>
                      {formatPlays(track.plays || 0)} <span style={{ fontSize: 10 }}>écoutes</span>
                    </div>

                    <button 
                      style={{ 
                        width: 36, height: 36, borderRadius: '50%', 
                        background: isCurrent ? colors.accent : 'transparent', 
                        border: `1px solid ${isCurrent ? colors.accent : colors.border}`,
                        color: isCurrent ? '#000' : colors.textMain,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {isCurrent ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};