// src/components/Footer.tsx
// Footer global responsive au thème clair/sombre, utilisé par toutes les pages.
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export const Footer: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colors = {
    bg: isDark ? '#08080c' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#a1a1aa' : '#666666',
    heading: isDark ? '#ffffff' : '#1a1a1a',
    accent: '#00d9ff',
    chipBg: isDark ? '#14141c' : '#f4f4f5',
    chipBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  };

  const linkStyle: React.CSSProperties = {
    color: colors.textMuted,
    textDecoration: 'none',
    fontSize: 13,
    transition: 'color 0.15s ease',
    lineHeight: 1.8,
  };

  const columnTitle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    color: colors.heading,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    marginBottom: 16,
  };

  return (
    <footer style={{
      background: colors.bg,
      borderTop: `1px solid ${colors.border}`,
      padding: '56px 24px 24px',
      fontFamily: 'Inter, sans-serif',
      color: colors.textMuted,
      transition: 'background 0.3s ease, border-color 0.3s ease',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 40,
      }}>
        {/* COLONNE 1 : LOGO + DESCRIPTION */}
        <div style={{ minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `linear-gradient(135deg, ${colors.accent} 0%, #7c5cff 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#000', fontWeight: 900, fontSize: 16,
            }}>
              DZ
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: colors.heading, letterSpacing: '-0.5px' }}>
              DROP<span style={{ color: colors.accent }}>ZONE</span> DJ
            </div>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0, maxWidth: 240 }}>
            La plateforme gratuite où les DJs indépendants partagent leurs sons et font vibrer la communauté.
          </p>
        </div>

        {/* COLONNE 2 : NAVIGATION */}
        <div>
          <h4 style={columnTitle}>Explorer</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li><Link to="/" style={linkStyle} onMouseEnter={(e) => (e.currentTarget.style.color = colors.accent)} onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}>Accueil</Link></li>
            <li><Link to="/nouveautes" style={linkStyle} onMouseEnter={(e) => (e.currentTarget.style.color = colors.accent)} onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}>Nouveautés</Link></li>
            <li><Link to="/charts" style={linkStyle} onMouseEnter={(e) => (e.currentTarget.style.color = colors.accent)} onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}>Top 50</Link></li>
            <li><Link to="/artists" style={linkStyle} onMouseEnter={(e) => (e.currentTarget.style.color = colors.accent)} onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}>Artistes</Link></li>
            <li><Link to="/genres" style={linkStyle} onMouseEnter={(e) => (e.currentTarget.style.color = colors.accent)} onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}>Genres</Link></li>
            <li><Link to="/radios" style={linkStyle} onMouseEnter={(e) => (e.currentTarget.style.color = colors.accent)} onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}>Radios</Link></li>
          </ul>
        </div>

        {/* COLONNE 3 : LÉGAL */}
        <div>
          <h4 style={columnTitle}>Légal</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li><Link to="/mentions-legales" style={linkStyle} onMouseEnter={(e) => (e.currentTarget.style.color = colors.accent)} onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}>Mentions légales</Link></li>
            <li><Link to="/confidentialite" style={linkStyle} onMouseEnter={(e) => (e.currentTarget.style.color = colors.accent)} onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}>Politique de confidentialité</Link></li>
            <li><Link to="/cgu" style={linkStyle} onMouseEnter={(e) => (e.currentTarget.style.color = colors.accent)} onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}>Conditions d'utilisation</Link></li>
            <li><Link to="/contact" style={linkStyle} onMouseEnter={(e) => (e.currentTarget.style.color = colors.accent)} onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}>Contact</Link></li>
          </ul>
        </div>

        {/* COLONNE 4 : RÉSEAUX SOCIAUX */}
        <div>
          <h4 style={columnTitle}>Suis-nous</h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { name: 'Instagram', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>, url: 'https://instagram.com' },
              { name: 'TikTok', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>, url: 'https://tiktok.com' },
              { name: 'SoundCloud', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.998 14.766c-.06 1.63-1.418 2.93-3.078 2.93H11.29c-.286 0-.521-.23-.521-.511V8.16c0-.23.157-.427.382-.485.585-.153 1.284-.229 1.939-.229 3.187 0 5.93 2.145 6.662 5.218 1.991.033 3.613 1.562 3.613 3.445l.012 1.63zM9.82 7.246c-.102 0-.19.038-.26.104-.09.084-.146.206-.146.338v9.539c0 .261.2.477.459.503H1.662c-.911 0-1.656-.744-1.656-1.656v-5.41c0-.915.745-1.656 1.656-1.656h.134c.06-1.244.58-2.35 1.404-3.144.825-.795 1.94-1.29 3.198-1.29.685 0 1.338.152 1.92.426.16.077.25.238.25.414v1.99z"/></svg>, url: 'https://soundcloud.com' },
              { name: 'X', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>, url: 'https://twitter.com' },
            ].map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                title={s.name}
                style={{
                  width: 38, height: 38, borderRadius: 8,
                  background: colors.chipBg,
                  border: `1px solid ${colors.chipBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: colors.textMuted, textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = colors.accent; e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.borderColor = colors.chipBorder; e.currentTarget.style.transform = 'none'; }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* LIGNE DE SÉPARATION */}
      <div style={{ height: 1, background: colors.border, margin: '40px 0 24px' }} />

      {/* COPYRIGHT */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        fontSize: 12,
        color: colors.textMuted,
      }}>
        <div>© {new Date().getFullYear()} DropZone DJ. Tous droits réservés.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Fait avec <span style={{ color: '#ff3366' }}>❤</span> pour les DJs.
        </div>
      </div>
    </footer>
  );
};
