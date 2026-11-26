// src/pages/premium/PremiumHomePage.tsx
import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as ArrowButtonModule from '../../components/ArrowButton';

const ArrowButton = (ArrowButtonModule as any).ArrowButton || (ArrowButtonModule as any).default || null;

const Icons = {
  share: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>,
};

export const PremiumHomePage: React.FC = () => {
  const { user } = useAuth();
  const {
    profile, tracks, followersCount, followingCount, isFollowing, followLoading, handleFollow,
    isOwner, themeColor, colors, isDark, isMobile, handleShare, heroTitle, heroDesc, renderTitle, navigate
  } = useOutletContext<any>();

  return (
    <section style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingBottom: 48 }}>

      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 1000, padding: '0 24px' }}>

        <h1 className="hero-title" style={{ fontSize: isMobile ? '3rem' : 'clamp(4rem, 10vw, 8rem)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.05em', marginBottom: 16, color: colors.textMain }}>
          {renderTitle(heroTitle)}
        </h1>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: colors.textSoft }}><strong style={{ color: colors.textMain, fontWeight: 800 }}>{followersCount}</strong> abonné{followersCount > 1 ? 's' : ''}</span>
          <span style={{ fontSize: 14, color: colors.textSoft }}><strong style={{ color: colors.textMain, fontWeight: 800 }}>{followingCount}</strong> abonnement{followingCount > 1 ? 's' : ''}</span>
        </div>

        <p style={{ color: colors.textSoft, fontSize: isMobile ? '0.95rem' : 'clamp(1.1rem, 2vw, 1.4rem)', fontWeight: 400, lineHeight: 1.6, maxWidth: 700, margin: '0 auto 28px auto' }}>
          {heroDesc}
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center' }}>
          {ArrowButton ? (
            <>
              <ArrowButton label="Écouter les tracks" color={themeColor} onClick={() => navigate(`/premium/${profile.username}/musique`)} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>} />
              <ArrowButton label="Partager" color={themeColor} onClick={handleShare} variant="outline" icon={Icons.share} />
            </>
          ) : (
            <>
              <Link to={`/premium/${profile.username}/musique`} style={{ background: themeColor, border: `1px solid ${themeColor}`, color: '#000', padding: '16px 32px', fontSize: 14, borderRadius: 8, fontWeight: 800, textDecoration: 'none', boxShadow: `0 8px 20px ${themeColor}40` }}>ÉCOUTER</Link>
              <button onClick={handleShare} style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', border: `1px solid ${colors.border}`, color: colors.textMain, padding: '16px 32px', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer', backdropFilter: 'blur(10px)' }}>PARTAGER</button>
            </>
          )}

          {profile?.is_premium && (
            <Link
              to={`/radio/${profile.username}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: isMobile ? '10px 20px' : '16px 32px',
                background: 'linear-gradient(135deg, #94c748, #6d9c2f)',
                color: '#000', borderRadius: 8, fontSize: 14, fontWeight: 800,
                textDecoration: 'none', boxShadow: '0 8px 20px rgba(148, 199, 72, 0.4)',
                border: 'none', cursor: 'pointer', backdropFilter: 'blur(10px)'
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#000' }} />
              ÉCOUTER LA RADIO
            </Link>
          )}

          {user && !isOwner && (
            <button onClick={handleFollow} disabled={followLoading} style={{ padding: isMobile ? '10px 20px' : '16px 32px', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: followLoading ? 'wait' : 'pointer', background: isFollowing ? 'transparent' : themeColor, color: isFollowing ? colors.textMain : '#000', border: isFollowing ? `1px solid ${colors.border}` : 'none', backdropFilter: 'blur(10px)' }}>
              {isFollowing ? '✓ Suivi' : '+ Suivre'}
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, borderTop: `1px solid ${colors.border}`, paddingTop: 20, maxWidth: 460, margin: '28px auto 0 auto' }}>
          {[{ n: tracks.length, l: 'Titres' }, { n: followersCount, l: 'Abonnés' }, { n: followingCount, l: 'Abonnements' }].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 28, fontWeight: 900, color: themeColor }}>{s.n}</div>
              <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
