// src/components/PremiumGuard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

const PERKS = ['Page artiste Premium', 'Studio & Mastering', 'Radio ELEKTRAQ en direct', 'Smart Link & statistiques'];

export const PremiumGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isPremium, setIsPremium] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const check = async () => {
      if (!user) {
        setIsPremium(false);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();
      setIsPremium(data?.is_premium || false);
      setLoading(false);
    };
    check();
  }, [user]);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? '#05050a' : '#f5f5f7' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`, borderTop: `3px solid ${isDark ? '#ffffff' : '#111111'}`, borderRadius: '50%', animation: 'premium-spin 0.8s linear infinite' }} />
        <style>{`@keyframes premium-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: isDark ? '#05050a' : '#f5f5f7', fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', top: -180, left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, background: isDark ? 'radial-gradient(circle, rgba(255,255,255,0.07), transparent 60%)' : 'radial-gradient(circle, rgba(0,0,0,0.05), transparent 60%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', width: '100%', maxWidth: 520, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, margin: '0 auto 24px', borderRadius: 20, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>🔒</div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 30, border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'}`, fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: isDark ? '#ffffff' : '#111111', marginBottom: 20 }}>ELEKTRAQ Premium</div>

          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 14px', color: isDark ? '#ffffff' : '#111111' }}>Accès Réservé</h1>
          <p style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)', fontSize: 15.5, lineHeight: 1.65, margin: '0 0 28px' }}>
            Cette fonctionnalité est réservée aux membres Premium. Débloque toute la suite pro pour propulser ta carrière.
          </p>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            {PERKS.map((perk) => (
              <li key={perk} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: isDark ? '#ffffff' : '#111111' }}>
                <span style={{ color: '#e8c15a', fontWeight: 900, flexShrink: 0 }}>✓</span> {perk}
              </li>
            ))}
          </ul>

          <Link to="/premium" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 44px', background: isDark ? 'linear-gradient(90deg, #ffffff, #c9c9c9)' : 'linear-gradient(90deg, #111111, #444444)', color: isDark ? '#000' : '#fff', borderRadius: 12, fontWeight: 800, fontSize: 15, textDecoration: 'none', letterSpacing: '0.2px', transition: 'transform 0.2s', boxShadow: isDark ? '0 10px 30px rgba(255,255,255,0.12)' : '0 10px 30px rgba(0,0,0,0.12)' }} onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'} onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.transform = 'none'}>
            Devenir Premium →
          </Link>

          <p style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: 13, marginTop: 20 }}>À partir de <strong style={{ color: isDark ? '#ffffff' : '#111111' }}>30 € / an</strong> — sans engagement</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
