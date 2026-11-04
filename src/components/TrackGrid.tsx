// src/components/TrackGrid.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { usePlayer } from '../contexts/PlayerContext';

export interface Track {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string;
  genre: string;
  bpm: number;
  plays: number;
  likes_count: number;
  comments_count: number; // ✅ NOUVEAU
  duration: number;
  profiles?: { username: string } | null;
  user_id: string;
}

interface TrackGridProps {
  tracks: Track[];
  onPlay: (track: Track) => void;
}

const Icons = {
  play: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  playSmall: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  heart: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  comment: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  headphone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
};

export const TrackGrid: React.FC<TrackGridProps> = ({ tracks, onPlay }) => {
  const { theme } = useTheme();
  const { currentTrack, isPlaying } = usePlayer();
  const isDark = theme === 'dark';

  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7',
    cardBg: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#a1a1aa' : '#666666',
    accent: '#00d9ff',
    tagBg: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num?.toString() || '0';
  };

  if (!tracks || tracks.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted, border: `1px dashed ${colors.cardBorder}`, borderRadius: 16 }}>
        Aucun son disponible pour le moment.
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
      gap: 20 
    }}>
      {tracks.map((track) => {
        const isCurrent = currentTrack?.id === track.id && isPlaying;

        return (
          <Link 
            key={track.id} 
            to={`/track/${track.id}`}
            style={{ textDecoration: 'none' }}
          >
            <div 
              style={{ 
                background: colors.cardBg, 
                border: `1px solid ${colors.cardBorder}`, 
                borderRadius: 16, 
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = colors.accent;
                e.currentTarget.style.boxShadow = `0 10px 30px ${colors.accent}15`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = colors.cardBorder;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              
              {/* IMAGE DE COUVERTURE */}
              <div style={{ 
                width: '100%', 
                aspectRatio: '1', 
                borderRadius: 12, 
                background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.tagBg, 
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* BOUTON PLAY AU SURVOL */}
                <div 
                  onClick={(e) => { e.preventDefault(); onPlay(track); }}
                  style={{ 
                    position: 'absolute', inset: 0, 
                    background: 'rgba(0,0,0,0.4)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.2s',
                    backdropFilter: 'blur(2px)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = isCurrent ? '1' : '0'}
                >
                  <div style={{ 
                    width: 48, height: 48, borderRadius: '50%', 
                    background: isCurrent ? colors.accent : '#ffffff', 
                    color: '#000', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isCurrent ? `0 0 20px ${colors.accent}` : '0 4px 15px rgba(0,0,0,0.2)'
                  }}>
                    {isCurrent ? Icons.pause : Icons.play}
                  </div>
                </div>

                {/* BADGE SI LE SON EST EN COURS DE LECTURE */}
                {isCurrent && (
                  <div style={{ 
                    position: 'absolute', top: 8, left: 8, 
                    background: colors.accent, color: '#000', 
                    padding: '2px 8px', borderRadius: 20, 
                    fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#000', animation: 'pulse 1s infinite' }} />
                    En cours
                  </div>
                )}
              </div>

              {/* INFOS DU SON */}
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                  {track.title}
                </div>
                <div style={{ fontSize: 13, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {track.profiles?.username || track.artist}
                </div>
              </div>

              {/* STATISTIQUES (Écoutes, Likes, Commentaires) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${colors.cardBorder}` }}>
                
                {/* Écoutes */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>
                  {Icons.headphone}
                  {formatNumber(track.plays)}
                </div>

                {/* Likes */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>
                  {Icons.heart}
                  {formatNumber(track.likes_count)}
                </div>

                {/* ✅ COMMENTAIRES */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: colors.textMuted, fontWeight: 600, marginLeft: 'auto' }}>
                  {Icons.comment}
                  {formatNumber(track.comments_count || 0)}
                </div>

              </div>
            </div>
          </Link>
        );
      })}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};