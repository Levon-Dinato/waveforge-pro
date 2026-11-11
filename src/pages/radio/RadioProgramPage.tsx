// src/pages/radio/RadioProgramPage.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';

export const RadioProgramPage: React.FC = () => {
  const { schedules, visualizerColor, colors } = useOutletContext<any>();

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 20px', width: '100%', boxSizing: 'border-box' }}>
      <div className="rp-glass" style={{ padding: 28 }}>
        <div style={{ marginBottom: 24, borderBottom: `1px solid ${colors.border}`, paddingBottom: 14 }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 4px 0' }}>📅 Programme</h2>
          <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>Les rendez-vous à ne pas manquer</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {schedules.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Aucun programme pour le moment.</div>
          ) : schedules.map((schedule: any) => (
            <div key={schedule.id} style={{ display: 'flex', gap: 20, alignItems: 'center', padding: 20, borderRadius: 16, background: colors.card, border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: visualizerColor, background: `${visualizerColor}15`, padding: '12px 20px', borderRadius: 12 }}>{schedule.start_time.slice(0, 5)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{schedule.title}</div>
                <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>Playlist : {schedule.playlists?.name || 'Mix'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};