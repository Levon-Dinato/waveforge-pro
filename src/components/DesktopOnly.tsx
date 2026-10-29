// src/components/DesktopOnly.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const DesktopOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024); // 1024px = Tablette/Mobile
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#050505', color: '#fff', fontFamily: 'Inter, sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>💻</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 16 }}>Optimisé pour Ordinateur</h1>
        <p style={{ color: '#888', fontSize: '1rem', lineHeight: 1.6, maxWidth: 400, marginBottom: 32 }}>
          L'outil de préparation DJ nécessite un grand écran et une souris pour une expérience optimale. Veuillez vous connecter depuis un ordinateur.
        </p>
        <button onClick={() => navigate('/')} style={{ background: '#00d9ff', color: '#000', padding: '12px 24px', borderRadius: 8, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
          Retour au site
        </button>
      </div>
    );
  }

  return <>{children}</>;
};