// src/components/PageTransition.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showWipe, setShowWipe] = useState(false);

  useEffect(() => {
    setShowWipe(true);
    const timer = setTimeout(() => setShowWipe(false), 800);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', flex: 1 }}>
      <motion.div
        initial={{ opacity: 0, y: 30, filter: 'blur(10px)', scale: 0.98 }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
        exit={{ opacity: 0, y: -30, filter: 'blur(10px)', scale: 0.98 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </motion.div>

      {showWipe && (
        <>
          <style>{`
            .wipe-transition {
              position: fixed; inset: 0; z-index: 999999; 
              /* ✅ INVERSÉ : Sombre en dark, Blanc en light */
              background: ${isDark ? '#111111' : '#ffffff'}; 
              border-left: 4px solid ${isDark ? '#ffffff' : '#000000'};
              display: flex; justify-content: center; align-items: center;
              box-shadow: -10px 0 60px ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
              transform: translateX(100%);
              animation: slideWipeAnim 0.8s cubic-bezier(0.77, 0, 0.175, 1) forwards;
              pointer-events: none;
            }
            .wipe-transition span {
              /* ✅ Texte Blanc en dark, Noir en light */
              color: ${isDark ? '#ffffff' : '#000000'}; 
              font-family: 'Space Grotesk', sans-serif; font-size: 1.8rem; font-weight: 700;
              letter-spacing: 6px; opacity: 0; transform: scale(0.9); transition: all 0.3s;
              text-shadow: 0 0 30px ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'};
            }
            .wipe-transition.active span { opacity: 1; transform: scale(1); transition-delay: 0.3s; }
            @keyframes slideWipeAnim {
              0% { transform: translateX(100%); }
              40% { transform: translateX(0); }
              60% { transform: translateX(0); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
          <div className="wipe-transition active">
            <span>DROPZONE DJ</span>
          </div>
        </>
      )}
    </div>
  );
};