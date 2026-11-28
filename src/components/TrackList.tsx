// src/components/TrackList.tsx
// Liste de titres style Beatport : version desktop riche + version mobile compacte.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { usePlayer } from '../contexts/PlayerContext';
import { getCamelotColor } from '../audio/keyDetector';
import { useIsMobile } from '../hooks/useIsMobile';

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

const fmtDate = (d: string) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isNew = (createdAt: string): boolean => (Date.now() - new Date(createdAt).getTime()) < 24 * 60 * 60 * 1000;

export const TrackList: React.FC<TrackListProps> = ({ tracks, onPlay, startRank = 0 }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isMobile = useIsMobile(768);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 2 }}>
      {tracks.map((track: any, idx: number) => {
        const isCurrent = currentTrack?.id === track.id && isPlaying;
        const camelot = track.camelot || (/^[1-9][0-9]?[AB]$/i.test(track.song_key || '') ? track.song_key.toUpperCase() : '');
        const keyColor = camelot ? getCamelotColor(camelot) : '';
        const showNew = isNew(track.created_at);

        const metaParts: string[] = [];
        if (track.genre) metaParts.push(track.genre);
        if (track.bpm) metaParts.push(`${Math.round(track.bpm)} BPM`);
        if (track.song_key) metaParts.push(track.song_key);
        const meta = metaParts.join(' · ');

        // ===== MOBILE : ligne compacte =====
        if (isMobile) {
          return (
            <div
              key={track.id}
              onClick={() => navigate('/track/' + track.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                borderRadius: 12, cursor: 'pointer',
                background: isCurrent ? 'rgba(148,199,72,0.08)' : colors.chipBg,
                border: `1px solid ${isCurrent ? 'rgba(148,199,72,0.4)' : colors.border}`,
                transition: 'background 0.15s',
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onPlay(track); }}
                style={{ width: 44, height: 44, borderRadius: '50%', border: `1px solid ${colors.accent}`, background: isCurrent ? colors.accent : 'transparent', color: isCurrent ? '#000' : colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 14 }}
              >
                {isCurrent ? '⏸' : '▶'}
              </button>
              <img src={track.cover_url || 'https://via.placeholder.com/50'} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: `1px solid ${colors.border}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</span>
                  {showNew && <span style={{ fontSize: 9, fontWeight: 900, color: '#000', background: colors.accent, padding: '2px 5px', borderRadius: 4, flexShrink: 0, letterSpacing: '0.5px' }}>NEW</span>}
                </div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                {meta && <div style={{ fontSize: 11, color: keyColor || colors.textMuted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.85 }}>{meta}</div>}
              </div>
              <span style={{ fontSize: 12, color: colors.textMuted, flexShrink: 0, fontWeight: 600 }}>{fmt(track.duration)}</span>
            </div>
          );
        }

        // ===== DESKTOP : ligne riche =====
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</span>
                {showNew && (
                  <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '1px', color: '#000', background: colors.accent, padding: '2px 6px', borderRadius: 4, flexShrink: 0, textTransform: 'uppercase' }}>New</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
            </div>
            {track.genre && (
              <span style={{ fontSize: 10, fontWeight: 700, color: colors.textMuted, background: colors.chipBg, border: `1px solid ${colors.border}`, padding: '3px 10px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap' }}>{track.genre}</span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, flexShrink: 0, whiteSpace: 'nowrap', minWidth: 78, textAlign: 'right' }}>{fmtDate(track.created_at)}</span>
            {track.song_key && (
              <span style={{ fontSize: 10, fontWeight: 800, color: keyColor || colors.accent, flexShrink: 0, minWidth: 30, textAlign: 'center', border: keyColor ? `1px solid ${keyColor}` : 'none', borderRadius: 5, padding: keyColor ? '2px 4px' : 0 }}>{track.song_key}</span>
            )}
            {track.bpm ? <span style={{ fontSize: 10, fontWeight: 700, color: colors.textMuted, flexShrink: 0, width: 34, textAlign: 'right' }}>{Math.round(track.bpm)}</span> : null}
            <span style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              {track.likes_count || 0}
            </span>
            <span style={{ fontSize: 10, color: colors.textMuted, flexShrink: 0, width: 30, textAlign: 'right' }}>{fmt(track.duration)}</span>
          </div>
        );
      })}
    </div>
  );
};
