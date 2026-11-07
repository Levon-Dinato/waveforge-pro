// src/pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Erreur d'authentification :", error.message);
        navigate('/auth?error=' + encodeURIComponent(error.message));
        return;
      }

      if (session) {
        navigate('/', { replace: true });
      } else {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            authListener.subscription.unsubscribe();
            navigate('/', { replace: true });
          }
        });
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#121212', color: '#fff' }}>
      <p>Connexion en cours... 🔄</p>
    </div>
  );
};