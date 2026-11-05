// src/components/ScrollButtons.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { usePlayer } from '../contexts/PlayerContext';

export const ScrollButtons: React.FC = () => {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(true);
  const { theme } = useTheme();
  // On récupère currentTrack pour savoir si le lecteur audio est ouvert
  const { currentTrack } = usePlayer() as any; 
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const totalHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;

      // Affiche le bouton "Haut" si on a scrollé de 300px
      setShowTop(scrollY > 300);

      // Affiche le bouton "Bas" si on n'est pas déjà tout en bas
      setShowBottom(scrollY + viewportHeight < totalHeight - 100);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Vérification initiale
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  // Style de base pour les boutons
  const buttonStyle: React.CSSProperties = {
    width: 44, 
    height: 44, 
    borderRadius: '50%', 
    background: isDark ? 'rgba(18, 18, 18, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    color: isDark ? '#ffffff' : '#1a1a1a',
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
    transition: 'all 0.2s ease',
    opacity: 0.9
  };

  // On ajuste la position en fonction du lecteur audio
  const bottomPosition = currentTrack ? 120 : 30;

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: bottomPosition, 
      right: 30, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 10, 
      zIndex: 9999,
      transition: 'bottom 0.3s ease'
    }}>
      {showTop && (
        <button 
          onClick={scrollToTop}
          style={buttonStyle}
          title="Retour en haut"
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#00d9ff'; e.currentTarget.style.color = '#00d9ff'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = isDark ? '#ffffff' : '#1a1a1a'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        </button>
      )}

      {showBottom && (
        <button 
          onClick={scrollToBottom}
          style={buttonStyle}
          title="Aller en bas"
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#00d9ff'; e.currentTarget.style.color = '#00d9ff'; e.currentTarget.style.transform = 'translateY(3px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = isDark ? '#ffffff' : '#1a1a1a'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M19 12l-7 7-7-7"/>
          </svg>
        </button>
      )}
    </div>
  );
};