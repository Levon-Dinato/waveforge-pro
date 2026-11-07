import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Vérifie bien le chemin d'import

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase échange automatiquement le code reçu dans l'URL contre une session
    const handleAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Erreur d'authentification :", error.message);
        navigate('/auth?error=' + encodeURIComponent(error.message));
        return;
      }

      if (session) {
        // Connexion réussie, on redirige vers l'accueil
        navigate('/', { replace: true });
      } else {
        // Parfois, la session met une fraction de seconde à être créée
        // On utilise un écouteur pour rediriger dès qu'elle est prête
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#05050a', color: '#fff' }}>
      <p>Connexion en cours... 🔄</p>
    </div>
  );
};