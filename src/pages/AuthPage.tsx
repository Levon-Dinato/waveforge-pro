import React, { useState } from 'react';
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

type Mode = 'login' | 'signup' | 'forgot';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        });
        if (resetError) throw resetError;
        setInfo(
          'Un email vient d\'être envoyé à ' + email + '. Cliquez sur le lien pour définir un nouveau mot de passe.'
        );
      } else if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error('Les mots de passe ne correspondent pas');
        if (password.length < 6) throw new Error('Le mot de passe doit contenir au moins 6 caractères');

        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        if (data.session) {
          navigate('/nouveautes');
        } else {
          setInfo('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate('/nouveautes');
      }
    } catch (err: any) {
      console.error('Erreur auth:', err);
      const msg = err.message || '';
      if (msg.includes('Invalid login')) setError('Email ou mot de passe incorrect');
      else if (msg.includes('already registered')) setError('Cet email est déjà utilisé');
      else if (msg.includes('User not found')) setError('Aucun compte avec cet email');
      else setError(msg || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
    setPassword('');
    setConfirmPassword('');
  };

  const titles: Record<Mode, { title: string; subtitle: string; submit: string }> = {
    login: {
      title: 'Connexion',
      subtitle: 'Accédez à vos morceaux et à la communauté',
      submit: '→ Se connecter',
    },
    signup: {
      title: 'Créer un compte',
      subtitle: 'Rejoignez WaveForge PRO',
      submit: '→ Créer mon compte',
    },
    forgot: {
      title: 'Mot de passe oublié',
      subtitle: 'Recevez un lien pour en définir un nouveau',
      submit: '→ Envoyer le lien',
    },
  };

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
            {mode === 'forgot' ? '🔑' : '🎧'}
          </div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            {titles[mode].title}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
            {titles[mode].subtitle}
          </p>
        </div>

        {/* Tabs (uniquement en login/signup) */}
        {mode !== 'forgot' && (
          <div
            style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 8,
              padding: 4,
              marginBottom: 20,
            }}
          >
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: mode === m ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
                  border: mode === m ? '1px solid rgba(0, 217, 255, 0.4)' : '1px solid transparent',
                  borderRadius: 6,
                  color: mode === m ? '#00d9ff' : 'rgba(255,255,255,0.6)',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={INPUT_STYLE}
          />

          {mode !== 'forgot' && (
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={INPUT_STYLE}
            />
          )}

          {mode === 'signup' && (
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={INPUT_STYLE}
            />
          )}

          {/* Lien mot de passe oublié (uniquement en mode login) */}
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.78rem',
                textAlign: 'right',
                cursor: 'pointer',
                fontFamily: 'monospace',
                padding: 0,
                marginTop: -4,
                textDecoration: 'underline',
              }}
            >
              Mot de passe oublié ?
            </button>
          )}

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

          {info && (
            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(0, 217, 255, 0.1)',
                border: '1px solid rgba(0, 217, 255, 0.4)',
                borderRadius: 6,
                color: '#00d9ff',
                fontSize: '0.8rem',
              }}
            >
              ℹ️ {info}
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
              letterSpacing: '0.5px',
            }}
          >
            {loading ? 'Traitement...' : titles[mode].submit}
          </button>

          {/* Retour au login depuis forgot */}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.6)',
                padding: '10px',
                borderRadius: 8,
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              ← Retour à la connexion
            </button>
          )}
        </form>
      </GlassCard>
    </div>
  );
};