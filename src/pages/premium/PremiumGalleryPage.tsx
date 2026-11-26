// src/pages/premium/PremiumGalleryPage.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';

export const PremiumGalleryPage: React.FC = () => {
  const { shorts, gallery, colors, isMobile, themeColor, getVideoUrlInfo, setActiveShort, setLightboxImage } = useOutletContext<any>();

  const IconGallery = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
  );

  const PlayIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '32px 16px 80px' : '64px 24px 100px', width: '100%', boxSizing: 'border-box' }}>

      {/* En-tête de section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: isMobile ? 28 : 44 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${themeColor}15`, border: `1px solid ${themeColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: themeColor, flexShrink: 0 }}>
          {IconGallery}
        </div>
        <div>
          <div className="section-subtitle" style={{ marginBottom: 4 }}>Médias</div>
          <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: colors.textMain }}>Galerie</h1>
        </div>
      </div>

      {/* Shorts vidéos */}
      {shorts.length > 0 && (
        <div style={{ marginBottom: isMobile ? 36 : 52 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: colors.textMain, margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Shorts Vidéos</h2>
            <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>{shorts.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'none' }}>
            {shorts.map(short => {
              const videoInfo = getVideoUrlInfo(short.video_url);
              return (
                <div
                  key={short.id}
                  onClick={() => setActiveShort(short)}
                  style={{
                    width: isMobile ? 140 : 180,
                    height: isMobile ? 248 : 320,
                    borderRadius: 14,
                    overflow: 'hidden',
                    position: 'relative',
                    flexShrink: 0,
                    cursor: 'pointer',
                    border: `1px solid ${colors.border}`,
                    transition: 'border-color 0.2s, transform 0.2s',
                    background: colors.cardBg
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = themeColor; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'none'; }}
                >
                  {videoInfo.type === 'video' ? (
                    <video src={videoInfo.src} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted />
                  ) : (
                    <iframe
                      src={videoInfo.src}
                      style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none', display: 'block' }}
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                      allowFullScreen
                    />
                  )}

                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: themeColor, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${themeColor}60` }}>
                      {PlayIcon}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Images */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: colors.textMain, margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>En images</h2>
          {gallery.length > 0 && <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>{gallery.length}</span>}
        </div>
        {gallery.length === 0 ? (
          <div style={{ color: colors.textMuted, padding: 60, border: `1px dashed ${colors.border}`, borderRadius: 16, textAlign: 'center' }}>Aucune image pour le moment.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {gallery.map((img) => (
              <div
                key={img.id}
                onClick={() => setLightboxImage(img.image_url)}
                style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 14, overflow: 'hidden', border: `1px solid ${colors.border}`, cursor: 'pointer', background: colors.cardBg, transition: 'border-color 0.2s, transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = themeColor; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'none'; }}
              >
                <img src={img.image_url} alt="Galerie" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
