// src/pages/radio/RadioTopPage.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';

export const RadioTopPage: React.FC = () => {
  const { topTracks, visualizerColor, colors } = useOutletContext<any>();

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 20px', width: '100%', boxSizing: 'border-box' }}>
      <div className="rp-glass" style={{ padding: 28 }}>
        <div style={{ marginBottom: 24, borderBottom: `1px solid ${colors.border}`, paddingBottom: 14 }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 4px 0' }}>🏆 Top Tracks</h2>
          <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>Les sons les plus likés de la radio</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {topTracks.map((track: any, index: number) => {
            const pct = Math.max(10, (track.likes_count / (topTracks[0]?.likes_count || 1)) * 100);
            return (
              <div key={track.id} className="rp-hover-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, background: colors.card, border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: index === 0 ? visualizerColor : colors.textMuted, width: 36, textAlign: 'center' }}>{index + 1}</div>
                <div style={{ width: 60, height: 60, borderRadius: 10, background: `url(${track.cover_url || 'https://via.placeholder.com/60'}) center/cover`, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{track.title}</div>
                  <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{track.artist}</div>
                  <div style={{ marginTop: 8, width: '100%', height: 6, background: colors.border, borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: visualizerColor, borderRadius: 3 }} /></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, color: visualizerColor, fontWeight: 900 }}>❤️ {track.likes_count || 0}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};