import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { supabase } from '../lib/supabase';

const INPUT_STYLE: React.CSSProperties = {
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(0,255,255,0.3)',
  borderRadius: '6px',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
};

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase déclenche un événement PASSWORD_RECOVERY quand le lien email est ouvert
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Vérifie si une session existe déjà (cas où l'utilisateur arrive avec un token valide)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate('/nouveautes'), 1500);
    } catch (err: any) {
      console.error('Erreur reset:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'monospace' }}>
        <GlassCard style={{ padding: '40px', maxWidth: 420, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>Vérification du lien...</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            Si rien ne se passe, le lien a peut-être expiré. Retournez à la page de connexion pour
            en demander un nouveau.
          </p>
        </GlassCard>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'monospace' }}>
        <GlassCard
          style={{
            padding: '40px',
            maxWidth: 420,
            margin: '0 auto',
            borderColor: 'rgba(0, 255, 136, 0.4)',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 8, color: '#00ff88' }}>
            Mot de passe modifié !
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
            Redirection vers vos morceaux...
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '70vh',
      }}
    >
      <GlassCard
        style={{
          padding: '32px',
          maxWidth: 420,
          width: '100%',
          borderColor: 'rgba(0, 217, 255, 0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              margin: '0 auto 12px',
              boxShadow: '0 0 24px rgba(0, 217, 255, 0.5)',
            }}
          >
            🔐
          </div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
            Nouveau mot de passe
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
            Choisissez un nouveau mot de passe sécurisé
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={INPUT_STYLE}
          />
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={INPUT_STYLE}
          />

          {error && (
            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(255, 60, 60, 0.1)',
                border: '1px solid rgba(255, 60, 60, 0.4)',
                borderRadius: 6,
                color: '#ff8c8c',
                fontSize: '0.8rem',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: '12px',
              background: loading ? '#666' : 'linear-gradient(135deg, #00d9ff, #0088ff)',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Enregistrement...' : '→ Valider le nouveau mot de passe'}
          </button>
        </form>
      </GlassCard>
    </div>
  );
};