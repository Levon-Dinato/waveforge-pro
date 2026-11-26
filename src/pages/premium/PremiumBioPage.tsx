// src/pages/premium/PremiumBioPage.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';

export const PremiumBioPage: React.FC = () => {
  const { profile, settings, colors, isMobile, themeColor, bioQuote, bioRest, socials, showDuo } = useOutletContext<any>();

  if (!showDuo) return <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', width: '100%', boxSizing: 'border-box', color: colors.textMuted, textAlign: 'center' }}>Bio indisponible.</div>;

  const IconUser = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  );

  const styles = profile.music_style ? profile.music_style.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '32px 16px 80px' : '64px 24px 100px', width: '100%', boxSizing: 'border-box' }}>

      {/* En-tête de section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: isMobile ? 24 : 40 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${themeColor}15`, border: `1px solid ${themeColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: themeColor, flexShrink: 0 }}>
          {IconUser}
        </div>
        <div>
          <div className="section-subtitle" style={{ marginBottom: 4 }}>{settings.duo_title || 'À propos'}</div>
          <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: colors.textMain }}>{profile.username}</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', gap: isMobile ? 24 : 48, alignItems: 'start' }}>

        {/* Portrait */}
        <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', border: `1px solid ${colors.border}`, aspectRatio: '4/5', background: colors.cardBg }}>
          <img
            src={profile.avatar_url || "/logo.jpg"}
            alt={profile.username}
            onError={(e) => { (e.target as HTMLImageElement).src = '/logo.jpg'; }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 45%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>{profile.username}</div>
            {styles.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: themeColor, marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>{styles[0]}</div>}
          </div>
        </div>

        {/* Contenu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 24, minWidth: 0 }}>
          <blockquote style={{ margin: 0, padding: '0 0 0 16px', borderLeft: `3px solid ${themeColor}` }}>
            <p style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, lineHeight: 1.4, color: colors.textMain, margin: 0, fontStyle: 'italic' }}>"{bioQuote}"</p>
          </blockquote>

          {bioRest && <p style={{ color: colors.textSoft, fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{bioRest}</p>}

          {styles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {styles.map((style: string, i: number) => (
                <span key={i} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: themeColor, background: `${themeColor}12`, border: `1px solid ${themeColor}30`, letterSpacing: '0.3px' }}>{style}</span>
              ))}
            </div>
          )}

          {socials.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
              {socials.map(s => (
                <a
                  key={s.key}
                  href={profile[s.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  style={{ width: 40, height: 40, borderRadius: 10, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, border: `1px solid ${colors.border}`, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = themeColor; e.currentTarget.style.borderColor = themeColor; e.currentTarget.style.background = `${themeColor}10`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none'; }}
                >
                  {s.logo}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
