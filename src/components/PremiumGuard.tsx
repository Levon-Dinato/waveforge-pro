// src/components/PremiumGuard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const PremiumGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>;

  if (!isPremium) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#0a0a0a' }}>
        <div style={{ background: 'rgba(10,18,26,0.8)', border: '1px solid rgba(0,217,255,0.3)', padding: 48, borderRadius: 16, textAlign: 'center', maxWidth: 500 }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>🔒</div>
          <h2 style={{ color: '#fff', fontSize: 28, marginBottom: 16, fontFamily: 'Orbitron' }}>Accès Réservé</h2>
          <p style={{ color: '#8c9f98', marginBottom: 32, lineHeight: 1.6 }}>
            Cette fonctionnalité est réservée aux membres <b style={{ color: '#00d9ff' }}>Premium</b>. Passez à l'abonnement pour débloquer tous les outils pro.
          </p>
          <Link to="/settings" style={{ display: 'inline-block', padding: '18px 40px', background: 'linear-gradient(90deg, #0077ff, #00d9ff)', color: '#000', borderRadius: 8, fontWeight: 800, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: 1 }}>
            Devenir Premium →
          </Link>
          <p style={{ color: '#8c9f98', fontSize: 14, marginTop: 20 }}>À partir de <b style={{ color: '#00d9ff' }}>30 € / an</b></p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};