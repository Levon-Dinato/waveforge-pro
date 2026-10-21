// src/pages/AuthPage.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// ✅ Style des inputs aligné sur le reste du site
const INPUT_STYLE: React.CSSProperties = {
  padding: '12px 14px',
  background: '#121212',
  border: '1px solid #333',
  borderRadius: '6px',
  color: '#fff',
  fontFamily: 'Inter, sans-serif',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.2s',
};

type Mode = 'login' | 'signup' | 'forgot';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ✅ Récupération de la page d'origine (si l'utilisateur a été redirigé)
  const from = location.state?.from || '/';

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
          // ✅ Redirection après inscription
          navigate(from, { replace: true });
        } else {
          setInfo('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // ✅ Redirection après connexion
        navigate(from, { replace: true });
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
      submit: 'Se connecter',
    },
    signup: {
      title: 'Créer un compte',
      subtitle: 'Rejoignez DropZone DJ',
      submit: 'Créer mon compte',
    },
    forgot: {
      title: 'Mot de passe oublié',
      subtitle: 'Recevez un lien pour en définir un nouveau',
      submit: 'Envoyer le lien',
    },
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#121212',
        fontFamily: 'Inter, sans-serif',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#181818',
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          padding: '40px 32px',
          maxWidth: 420,
          width: '100%',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: '#222',
              border: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              margin: '0 auto 16px',
            }}
          >
            {mode === 'forgot' ? '🔑' : '🎧'}
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#fff' }}>
            {titles[mode].title}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#888' }}>
            {titles[mode].subtitle}
          </p>
        </div>

        {/* Tabs (uniquement en login/signup) */}
        {mode !== 'forgot' && (
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #2a2a2a',
              marginBottom: 24,
            }}
          >
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: mode === m ? '2px solid #fff' : '2px solid transparent',
                  color: mode === m ? '#fff' : '#888',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: '-1px', // Pour coller la bordure
                }}
              >
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={INPUT_STYLE}
            onFocus={(e) => e.target.style.borderColor = '#00d9ff'}
            onBlur={(e) => e.target.style.borderColor = '#333'}
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
              onFocus={(e) => e.target.style.borderColor = '#00d9ff'}
              onBlur={(e) => e.target.style.borderColor = '#333'}
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
              onFocus={(e) => e.target.style.borderColor = '#00d9ff'}
              onBlur={(e) => e.target.style.borderColor = '#333'}
            />
          )}

          {/* Lien mot de passe oublié */}
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                fontSize: '12px',
                textAlign: 'right',
                cursor: 'pointer',
                padding: 0,
                marginTop: -8,
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
            >
              Mot de passe oublié ?
            </button>
          )}

          {/* Messages d'erreur / info */}
          {error && (
            <div style={{ padding: '12px', background: 'rgba(255, 51, 102, 0.1)', border: '1px solid rgba(255, 51, 102, 0.3)', borderRadius: 6, color: '#ff5c5c', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {info && (
            <div style={{ padding: '12px', background: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.3)', borderRadius: 6, color: '#00d9ff', fontSize: '13px' }}>
              {info}
            </div>
          )}

          {/* Bouton principal */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: '14px',
              background: loading ? '#333' : '#fff',
              color: loading ? '#888' : '#000',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#e0e0e0'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#fff'; }}
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
                border: 'none',
                color: '#888',
                padding: '10px',
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: 8,
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
            >
              ← Retour à la connexion
            </button>
          )}
        </form>
      </div>
    </div>
  );
};