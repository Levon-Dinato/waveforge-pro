// src/components/LegalPageShell.tsx
// Gabarit réutilisable pour les pages légales (Mentions, CGU, Confidentialité, Contact).
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTheme } from '../contexts/ThemeContext';

interface LegalPageShellProps {
  title: string;
  updatedAt?: string;
  children: React.ReactNode;
}

export const LegalPageShell: React.FC<LegalPageShellProps> = ({ title, updatedAt, children }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#a1a1aa' : '#666666',
    accent: '#ffffff',
  };

  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: '40px 20px 80px',
        color: colors.textMain,
        fontFamily: 'Inter, sans-serif',
        minHeight: '100vh',
      }}
    >
      <Helmet>
        <title>{title} — ELEKTRAQ</title>
        <meta name="description" content={`${title} de ELEKTRAQ, la plateforme des DJs indépendants.`} />
      </Helmet>

      <div
        style={{
          background: colors.panelBg,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: '40px 36px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 900,
            margin: '0 0 8px 0',
            letterSpacing: '-0.03em',
            color: colors.textMain,
          }}
        >
          {title}
        </h1>

        {updatedAt && (
          <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: colors.accent }}>●</span> Dernière mise à jour : {updatedAt}
          </div>
        )}

        <div style={{ fontSize: 15, lineHeight: 1.8, color: colors.textMuted }}>{children}</div>
      </div>

      <style>{`
        .legal-shell h2 { font-size: 19px; font-weight: 800; color: ${colors.textMain}; margin: 28px 0 12px; }
        .legal-shell h3 { font-size: 16px; font-weight: 700; color: ${colors.textMain}; margin: 20px 0 8px; }
        .legal-shell p { margin: 10px 0; }
        .legal-shell ul { padding-left: 20px; margin: 10px 0; }
        .legal-shell li { margin: 6px 0; }
        .legal-shell strong { color: ${colors.textMain}; }
        .legal-shell a { color: ${colors.accent}; text-decoration: none; }
        .legal-shell a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
};
