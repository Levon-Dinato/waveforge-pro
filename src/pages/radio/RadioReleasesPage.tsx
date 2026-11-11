// src/pages/radio/RadioReleasesPage.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';

export const RadioReleasesPage: React.FC = () => {
  const { latestReleases, colors } = useOutletContext<any>();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px', width: '100%', boxSizing: 'border-box' }}>
      <div className="rp-glass" style={{ padding: 28 }}>
        <div style={{ marginBottom: 24, borderBottom: `1px solid ${colors.border}`, paddingBottom: 14 }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 4px 0' }}>✨ Dernières Sorties</h2>
          <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>Toutes les nouveautés de la radio</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 24 }}>
          {latestReleases.map((track: any) => (
            <div key={track.id} className="rp-hover-card">
              <div style={{ width: '100%', paddingTop: '100%', borderRadius: 16, background: `url(${track.cover_url || 'https://via.placeholder.com/200'}) center/cover`, boxShadow: '0 10px 25px rgba(0,0,0,0.35)' }} />
              <div style={{ marginTop: 12 }}><div style={{ fontSize: 15, fontWeight: 800 }}>{track.title}</div><div style={{ fontSize: 13, color: colors.textMuted }}>{track.artist}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};