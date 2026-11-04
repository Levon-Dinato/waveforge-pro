// src/components/ArtistPromoSection.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Icons = {
  link: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>,
  promo: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
  pitch: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  page: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
  stats: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  support: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
};

export const ArtistPromoSection: React.FC = () => {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const isPremium = profile?.is_premium;

  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#666666',
    accent: '#00d9ff'
  };

  // ✅ J'AI AJOUTÉ UN LIEN (mailto) SUR LA CARTE SUPPORT PRO
  const features = [
    { icon: Icons.link, title: 'Smart Link', desc: 'Regroupez toutes vos plateformes dans un lien unique.' },
    { icon: Icons.promo, title: 'Cartes Promo', desc: 'Générez de belles images pour Instagram.' },
    { icon: Icons.pitch, title: 'Pitch Playlist', desc: 'Soumettez vos sons à la playlist officielle.' },
    { icon: Icons.page, title: 'Page Premium', desc: 'Personnalisez votre page avec votre univers.' },
    { icon: Icons.stats, title: 'Statistiques', desc: 'Suivez vos écoutes, téléchargements et revenus.' },
    { icon: Icons.support, title: 'Support Pro', desc: 'Une équipe dédiée pour vous accompagner.', link: 'mailto:contact@dropzone-dj.com' } 
  ];

  return (
    <section style={{ padding: '60px 20px', background: colors.bg, borderRadius: 24, border: `1px solid ${colors.border}`, marginTop: 40 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: colors.accent, marginBottom: 12 }}>Dropzone Pro</div>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 900, color: colors.textMain, letterSpacing: '-0.03em', marginBottom: 16 }}>
            La boîte à outils de l'artiste
          </h2>
          <p style={{ fontSize: 16, color: colors.textMuted, maxWidth: 600, margin: '0 auto' }}>
            Tout ce dont vous avez besoin pour propulser votre carrière, centralisé au même endroit.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
          {features.map((f, i) => (
            <div key={i} 
              onClick={() => f.link && (window.location.href = f.link)}
              style={{ 
                background: colors.panelBg, 
                border: `1px solid ${colors.border}`, 
                borderRadius: 12, 
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: f.link ? 'pointer' : 'default', // ✅ Curseur main si lien
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                if (f.link) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = colors.accent;
                }
              }}
              onMouseLeave={e => {
                if (f.link) {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = colors.border;
                }
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${colors.accent}15`, color: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: colors.textMain, marginBottom: 4 }}>{f.title}</h3>
              <p style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={() => navigate(isPremium ? '/settings' : '/premium')}
            style={{ 
              padding: '14px 32px', 
              background: colors.accent, 
              color: '#000', 
              border: 'none', 
              borderRadius: 8, 
              fontSize: 15, 
              fontWeight: 800, 
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isPremium ? 'Accéder à mes outils 🚀' : 'Débloquer ces outils (Premium)'}
          </button>
        </div>

      </div>
    </section>
  );
};