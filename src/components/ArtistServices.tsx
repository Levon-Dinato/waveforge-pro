// src/components/ArtistServices.tsx
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const Icons = {
  shield: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  link: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>,
  globe: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
  card: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  playlist: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  video: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
};

const SERVICES = [
  {
    icon: Icons.shield,
    title: "Alertes de profil d'artiste",
    badge: "ULTIMATE",
    desc: "Détection automatique de toute modification non autorisée de vos publications sur Spotify et Apple.",
    color: '#3b82f6', // Bleu
  },
  {
    icon: Icons.link,
    title: "HyperFollow",
    desc: "Faites la promotion de vos sorties avec une page simple (et gratuite) pour promouvoir votre musique, vos vidéos et fournir des liens vers vos réseaux.",
    color: '#ec4899', // Rose
  },
  {
    icon: Icons.globe,
    title: "Bandzoogle",
    badge: "ESSAYEZ GRATUITEMENT",
    desc: "Créez un site web personnalisé avec votre musique, votre kit de presse, vos réseaux sociaux et bien plus encore.",
    color: '#f97316', // Orange
  },
  {
    icon: Icons.card,
    title: "Cartes Promo",
    desc: "Des images magnifiques et gratuites de vos illustrations. Partagez-les sur Instagram, X et partout ailleurs.",
    color: '#3b82f6', // Bleu
  },
  {
    icon: Icons.playlist,
    title: "Playlist Spotlight",
    desc: "Soumettez votre musique pour une chance d'être choisi(e) dans une playlist Spotify de DistroKid.",
    color: '#8b5cf6', // Violet
  },
  {
    icon: Icons.video,
    title: "Générateur de Canvas Spotify",
    desc: "Un moyen rapide et gratuit pour créer une vidéo 'Canvas' personnalisée sur Spotify. Choisissez parmi des milliers de clips.",
    color: '#10b981', // Vert
  }
];

export const ArtistServices: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.6)' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    cardBg: isDark ? '#121212' : '#ffffff',
    badgeBg: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
  };

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px' }}>
      
      {/* En-tête de la section */}
      <div style={{ textAlign: 'center', marginBottom: 50 }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#00d9ff', marginBottom: 12 }}>
          Pour les Artistes
        </div>
        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: colors.textMain, letterSpacing: '-1px', margin: 0 }}>
          Des outils pour propulser votre carrière
        </h2>
        <p style={{ color: colors.textMuted, fontSize: 16, marginTop: 16, maxWidth: 600, margin: '16px auto 0' }}>
          Découvrez notre suite d'outils exclusifs pour vous aider à promouvoir votre musique et à développer votre audience.
        </p>
      </div>

      {/* Grille des services */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: 24 
      }}>
        {SERVICES.map((service, index) => (
          <div 
            key={index}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = service.color;
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = `0 10px 30px ${service.color}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Badge (optionnel) */}
            {service.badge && (
              <div style={{
                position: 'absolute',
                top: 16,
                background: service.badge === 'ULTIMATE' ? '#00d9ff' : '#fbbf24',
                color: '#000',
                fontSize: 9,
                fontWeight: 900,
                padding: '4px 10px',
                borderRadius: 20,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {service.badge}
              </div>
            )}

            {/* Icône */}
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `${service.color}15`,
              color: service.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              marginTop: service.badge ? 16 : 0,
            }}>
              {service.icon}
            </div>

            {/* Titre */}
            <h3 style={{ 
              fontSize: 18, 
              fontWeight: 800, 
              color: service.color, 
              margin: '0 0 12px 0',
              lineHeight: 1.3
            }}>
              {service.title}
            </h3>

            {/* Description */}
            <p style={{ 
              fontSize: 14, 
              color: colors.textMuted, 
              lineHeight: 1.6, 
              margin: 0 
            }}>
              {service.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};