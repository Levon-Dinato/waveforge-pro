// src/components/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      background: '#0f0f0f',
      borderTop: '1px solid #2a2a2a',
      padding: '40px 24px 20px 24px',
      marginTop: 'auto',
      fontFamily: 'Inter, sans-serif',
      color: '#999',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 32,
      }}>
        
        {/* COLONNE 1 : LOGO + DESCRIPTION */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#1c1c1c', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src="/icons/icon-192.png" alt="DropZone DJ" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
              DROP<span style={{ color: '#00d9ff' }}>ZONE</span> DJ
            </div>
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            La plateforme gratuite où les DJs partagent leurs sons et font vibrer la communauté.
          </p>
        </div>

        {/* COLONNE 2 : NAVIGATION */}
        <div>
          <h4 style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '1px', marginBottom: 12, textTransform: 'uppercase' }}>
            Navigation
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><Link to="/" style={{ color: '#999', textDecoration: 'none', fontSize: 12 }}>Accueil</Link></li>
            <li><Link to="/nouveautes" style={{ color: '#999', textDecoration: 'none', fontSize: 12 }}>Nouveautés</Link></li>
            <li><Link to="/genres" style={{ color: '#999', textDecoration: 'none', fontSize: 12 }}>Genres</Link></li>
            <li><Link to="/artists" style={{ color: '#999', textDecoration: 'none', fontSize: 12 }}>Artistes</Link></li>
            <li><Link to="/live" style={{ color: '#ff3366', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>🔴 Live DJ</Link></li>
          </ul>
        </div>

        {/* COLONNE 3 : LÉGAL */}
        <div>
          <h4 style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '1px', marginBottom: 12, textTransform: 'uppercase' }}>
            Légal
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><Link to="/mentions-legales" style={{ color: '#999', textDecoration: 'none', fontSize: 12 }}>Mentions légales</Link></li>
            <li><Link to="/confidentialite" style={{ color: '#999', textDecoration: 'none', fontSize: 12 }}>Politique de confidentialité</Link></li>
            <li><Link to="/cgu" style={{ color: '#999', textDecoration: 'none', fontSize: 12 }}>Conditions d'utilisation</Link></li>
            <li><Link to="/contact" style={{ color: '#999', textDecoration: 'none', fontSize: 12 }}>Contact</Link></li>
          </ul>
        </div>

        {/* COLONNE 4 : RÉSEAUX SOCIAUX */}
        <div>
          <h4 style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '1px', marginBottom: 12, textTransform: 'uppercase' }}>
            Suis-nous
          </h4>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 4, background: '#1c1c1c', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', textDecoration: 'none', fontSize: 16, transition: 'all 0.15s ease' }} title="Facebook">
              f
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 4, background: '#1c1c1c', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', textDecoration: 'none', fontSize: 16, transition: 'all 0.15s ease' }} title="Instagram">
              📷
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 4, background: '#1c1c1c', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', textDecoration: 'none', fontSize: 16, transition: 'all 0.15s ease' }} title="Twitter / X">
              𝕏
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 4, background: '#1c1c1c', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', textDecoration: 'none', fontSize: 16, transition: 'all 0.15s ease' }} title="TikTok">
              🎵
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 4, background: '#1c1c1c', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', textDecoration: 'none', fontSize: 16, transition: 'all 0.15s ease' }} title="Discord">
              💬
            </a>
          </div>
        </div>
      </div>

      {/* LIGNE DE SÉPARATION */}
      <div style={{ height: 1, background: '#2a2a2a', margin: '32px 0 20px 0' }} />

      {/* COPYRIGHT */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        fontSize: 11,
      }}>
        <div>© {new Date().getFullYear()} DropZone DJ. Tous droits réservés.</div>
        <div>Fait avec ❤️ pour les DJs.</div>
      </div>
    </footer>
  );
};