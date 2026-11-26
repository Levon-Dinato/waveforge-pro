// src/pages/premium/PremiumReferencesPage.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';

export const PremiumReferencesPage: React.FC = () => {
  const { profile, settings, colors, isMobile, themeColor, prestations, showPrestations } = useOutletContext<any>();

  if (!showPrestations) return <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', width: '100%', boxSizing: 'border-box', color: colors.textMuted }}>Aucune référence pour le moment.</div>;

  const IconSparkles = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"></path></svg>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '32px 16px 80px' : '64px 24px 100px', width: '100%', boxSizing: 'border-box' }}>

      {/* En-tête de section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: isMobile ? 24 : 40 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${themeColor}15`, border: `1px solid ${themeColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: themeColor, flexShrink: 0 }}>
          {IconSparkles}
        </div>
        <div>
          <div className="section-subtitle" style={{ marginBottom: 4 }}>{settings.prestations_title || 'Parcours'}</div>
          <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: colors.textMain }}>Références</h1>
        </div>
      </div>

      {/* Intro pleine largeur */}
      <p style={{ fontSize: 15, color: colors.textSoft, lineHeight: 1.7, margin: '0 0 32px 0', maxWidth: 760, borderLeft: `3px solid ${themeColor}`, paddingLeft: 16 }}>
        Ces moments retracent les événements qui ont marqué le parcours de <strong style={{ color: colors.textMain }}>{profile.username}</strong>.
      </p>

      {/* Prestations en grille large */}
      {prestations.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          {(settings.parcours_card_title || settings.parcours_card_tag) && (
            <div style={{ marginBottom: 20 }}>
              {settings.parcours_card_tag && <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: themeColor, marginBottom: 6 }}>{settings.parcours_card_tag}</div>}
              {settings.parcours_card_title && <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: colors.textMain, margin: 0, letterSpacing: '-0.3px' }}>{settings.parcours_card_title}</h2>}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {prestations.map((item: any, i: number) => (
              <div
                key={i}
                style={{ display: 'flex', gap: 14, padding: '18px', background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 14, transition: 'border-color 0.2s, transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${themeColor}50`; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = colors.cardBorder; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 9, background: `${themeColor}15`, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: colors.textMain, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
