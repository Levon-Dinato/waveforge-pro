// src/components/TrackStrip.tsx
// Rayon horizontal de titres (style Beatport) : couvertures carrées, classement, lecture au survol
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { usePlayer } from '../contexts/PlayerContext';

interface TrackStripProps {
  title: string;
  tracks: any[];
  ranked?: boolean;
  onPlay: (track: any) => void;
  seeAllUrl?: string;
  seeAllLabel?: string;
}

export const TrackStrip: React.FC<TrackStripProps> = ({ title, tracks, ranked, onPlay, seeAllUrl, seeAllLabel }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { currentTrack, isPlaying } = usePlayer() as any;

  const colors = {
    accent: '#94c748',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#9e9e9e' : '#666666',
    border: isDark ? '#2a2a2d' : '#e5e7eb',
  };

  if (!tracks || tracks.length === 0) return null;

  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.textMain }}>{title}</h2>
        {seeAllUrl && (
          <button onClick={() => navigate(seeAllUrl)} style={{ background: 'none', border: 'none', color: colors.accent, fontSize: 11, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', padding: 0 }}>
            {seeAllLabel || 'Voir tout'} →
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'thin', scrollbarColor: isDark ? '#2a2a2d transparent' : 'auto' }}>
        {tracks.map((track: any, idx: number) => {
          const isCurrent = currentTrack?.id === track.id && isPlaying;
          return (
            <div key={track.id + '-' + idx} onClick={() => navigate('/track/' + track.id)} style={{ flexShrink: 0, width: 132, cursor: 'pointer', position: 'relative' }}>
              <div style={{ position: 'relative', width: 132, height: 132, borderRadius: 6, overflow: 'hidden', background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.border, border: `1px solid ${colors.border}` }}>
                {ranked && (
                  <span style={{ position: 'absolute', top: 6, left: 6, zIndex: 2, fontSize: 15, fontWeight: 900, fontStyle: 'italic', color: colors.accent, background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: 4 }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                )}
                <div
                  onClick={(e) => { e.stopPropagation(); onPlay(track); }}
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isCurrent ? 1 : 0, transition: 'opacity 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.opacity = '0'; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: colors.accent, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900 }}>
                    {isCurrent ? '⏸' : '▶'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMain, marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
              {track.bpm ? <div style={{ fontSize: 10, color: colors.accent, marginTop: 3, fontWeight: 700 }}>{track.bpm} BPM</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
