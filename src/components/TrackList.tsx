// src/components/TrackList.tsx
// Liste de titres style Beatport : lignes avec classement, pochette, titre/artiste, genre, tonalité, BPM, durée
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { usePlayer } from '../contexts/PlayerContext';

interface TrackListProps {
  tracks: any[];
  onPlay: (track: any) => void;
  startRank?: number;
}

const fmt = (s: number) => {
  if (!s || s <= 0) return '—';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

export const TrackList: React.FC<TrackListProps> = ({ tracks, onPlay, startRank = 0 }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { currentTrack, isPlaying } = usePlayer() as any;

  const colors = {
    accent: '#94c748',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#9e9e9e' : '#666666',
    border: isDark ? '#2a2a2d' : '#e5e7eb',
    rowHover: isDark ? '#17171b' : '#f3f4f6',
    chipBg: isDark ? '#101013' : '#f0f0f0',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {tracks.map((track: any, idx: number) => {
        const isCurrent = currentTrack?.id === track.id && isPlaying;
        return (
          <div
            key={track.id}
            onClick={() => navigate('/track/' + track.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
              background: isCurrent ? 'rgba(148,199,72,0.07)' : 'transparent',
              border: `1px solid ${isCurrent ? 'rgba(148,199,72,0.35)' : 'transparent'}`,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = colors.rowHover; }}
            onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ width: 24, fontSize: 12, fontWeight: 900, fontStyle: 'italic', color: isCurrent ? colors.accent : colors.textMuted, textAlign: 'center', flexShrink: 0 }}>
              {isCurrent ? '▶' : startRank + idx + 1}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onPlay(track); }}
              style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${colors.accent}`, background: isCurrent ? colors.accent : 'transparent', color: isCurrent ? '#000' : colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 11 }}
            >
              {isCurrent ? '⏸' : '▶'}
            </button>
            <img src={track.cover_url || 'https://via.placeholder.com/50'} alt="" style={{ width: 44, height: 44, borderRadius: 4, objectFit: 'cover', flexShrink: 0, border: `1px solid ${colors.border}` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
            </div>
            {track.genre && (
              <span style={{ fontSize: 10, fontWeight: 700, color: colors.textMuted, background: colors.chipBg, border: `1px solid ${colors.border}`, padding: '3px 10px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap' }}>{track.genre}</span>
            )}
            {track.song_key && <span style={{ fontSize: 10, fontWeight: 800, color: colors.accent, flexShrink: 0, width: 24, textAlign: 'center' }}>{track.song_key}</span>}
            {track.bpm ? <span style={{ fontSize: 10, fontWeight: 700, color: colors.textMuted, flexShrink: 0, width: 34, textAlign: 'right' }}>{Math.round(track.bpm)}</span> : null}
            <span style={{ fontSize: 10, color: colors.textMuted, flexShrink: 0, width: 30, textAlign: 'right' }}>{fmt(track.duration)}</span>
          </div>
        );
      })}
    </div>
  );
};
