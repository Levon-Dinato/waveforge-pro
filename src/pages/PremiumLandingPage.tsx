// src/pages/PremiumLandingPage.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { PayPalButton } from '../components/PayPalButton';

const FEATURES = [
  { icon: '✨', title: 'Page Premium', desc: 'Une page artiste personnalisable à ton image, avec modules, galerie et agenda.' },
  { icon: '🎧', title: 'DJ Auto CUE', desc: 'Analyse les BPM, prépare tes sets et exporte tes pistes pour tes platines.' },
  { icon: '🎛️', title: 'Mastering', desc: 'Donne de la puissance à tes morceaux avec notre chaîne de mastering pro.' },
  { icon: '🎹', title: 'Studio Audio', desc: 'Crée, édite et remixe avec la station de travail audio intégrée.' },
  { icon: '📻', title: 'Radio ELEKTRAQ', desc: 'Lance ta propre radio en direct, avec programmation et jingles.' },
  { icon: '🔗', title: 'Smart Link', desc: 'Regroupe Spotify, Apple Music et ELEKTRAQ dans un seul lien.' },
  { icon: '📊', title: 'Statistiques', desc: 'Suis tes écoutes, téléchargements et revenus en temps réel.' },
  { icon: '🎬', title: 'IA Vidéos', desc: 'Transforme tes musiques en clips vidéo époustouflants.' },
];

export const PremiumLandingPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isPremium = profile?.is_premium;

  const c = {
    bg: isDark ? '#05050a' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#111111',
    textMuted: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
    textSoft: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    cardBg: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  };

  const gold = '#e8c15a';

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.textMain, fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden', transition: 'background 0.3s ease, color 0.3s ease' }}>
      <Helmet>
        <title>ELEKTRAQ Premium — 30 €/an</title>
        <meta name="description" content="Débloque la suite complète ELEKTRAQ Premium : page artiste, DJ Auto CUE, mastering, radio, IA vidéos et plus. 30 €/an." />
      </Helmet>

      {/* Halo de fond subtil */}
      <div aria-hidden style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 900, height: 900, background: isDark ? 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 60%)' : 'radial-gradient(circle, rgba(0,0,0,0.05), transparent 60%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px 100px', position: 'relative' }}>
        {/* ===== HERO ===== */}
        <header style={{ textAlign: 'center', marginBottom: 80 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 30, border: `1px solid ${c.border}`, background: c.cardBg, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: c.textMain, marginBottom: 28 }}>
            <span style={{ color: gold }}>✦</span> ELEKTRAQ Premium
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05, margin: '0 0 20px' }}>
            Passe au niveau<br />
            <span style={{ background: isDark ? 'linear-gradient(90deg, #ffffff, #b9b9b9)' : 'linear-gradient(90deg, #111111, #555555)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>supérieur.</span>
          </h1>
          <p style={{ fontSize: 18, color: c.textMuted, maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            Toute la boîte à outils pour propulser ta carrière : page artiste, studio, mastering, radio et plus. Un seul abonnement, tout débloqué.
          </p>
        </header>

        {/* ===== GRILLE DE FONCTIONNALITÉS ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 80 }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: c.cardBg,
                border: `1px solid ${c.cardBorder}`,
                borderRadius: 16,
                padding: 24,
                transition: 'transform 0.25s ease, border-color 0.25s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.borderColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.borderColor = c.cardBorder; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px' }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: c.textMuted, lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* ===== TARIF ===== */}
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ background: c.cardBg, border: `1px solid ${c.cardBorder}`, borderRadius: 24, padding: 40, textAlign: 'center', backdropFilter: 'blur(20px)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: c.textSoft, marginBottom: 16 }}>Abonnement annuel</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-0.03em', color: gold }}>30 €</span>
              <span style={{ fontSize: 16, color: c.textMuted, fontWeight: 600 }}>/ an</span>
            </div>
            <div style={{ fontSize: 14, color: c.textMuted, marginBottom: 32 }}>Soit 2,50 € / mois. Sans engagement.</div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Page artiste Premium personnalisable', 'Tous les outils DJ (Studio, Mastering, Auto CUE)', 'Radio ELEKTRAQ en direct', 'Smart Link & statistiques', 'IA Vidéos & génération musicale', 'Support prioritaire'].map((item) => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, color: c.textMain }}>
                  <span style={{ color: gold, fontWeight: 900, flexShrink: 0 }}>✓</span> {item}
                </li>
              ))}
            </ul>

            {isPremium ? (
              <Link to="/settings" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '16px 32px', background: isDark ? '#ffffff' : '#111111', color: isDark ? '#000' : '#fff', borderRadius: 12, fontWeight: 800, fontSize: 15, textDecoration: 'none', transition: 'transform 0.2s' }} onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.02)'} onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)'}>
                Tu es déjà Premium — Accéder à mon espace →
              </Link>
            ) : user ? (
              <PayPalButton />
            ) : (
              <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '16px 32px', background: isDark ? '#ffffff' : '#111111', color: isDark ? '#000' : '#fff', borderRadius: 12, fontWeight: 800, fontSize: 15, textDecoration: 'none', transition: 'transform 0.2s' }} onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.02)'} onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)'}>
                Créer un compte pour commencer →
              </Link>
            )}

            <div style={{ fontSize: 12, color: c.textSoft, marginTop: 20 }}>Paiement sécurisé via PayPal. Accès débloqué immédiatement.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
