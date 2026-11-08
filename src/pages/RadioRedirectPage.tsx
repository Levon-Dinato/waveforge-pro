// src/pages/RadioRedirectPage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const RadioRedirectPage = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // On récupère la dernière radio écoutée
    const lastRadio = localStorage.getItem('last_radio_username');
    
    if (lastRadio) {
      // Si on l'a, on redirige vers cette radio
      navigate(`/radio/${lastRadio}`, { replace: true });
    } else {
      // Sinon, on redirige vers la liste des radios
      navigate('/radios', { replace: true });
    }
  }, [navigate]);
  
  return (
    <div style={{ background: '#05050a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      Chargement de la radio...
    </div>
  );
};