// src/components/PageTransition.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [showWipe, setShowWipe] = useState(false);

  // On déclenche le Wipe à chaque changement de page
  useEffect(() => {
    setShowWipe(true);
    const timer = setTimeout(() => setShowWipe(false), 800);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', flex: 1 }}>
      {/* ✅ TON EFFET FRAMER MOTION (Inchangé) */}
      <motion.div
        initial={{ opacity: 0, y: 30, filter: 'blur(10px)', scale: 0.98 }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
        exit={{ opacity: 0, y: -30, filter: 'blur(10px)', scale: 0.98 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </motion.div>

      {/* ✅ LE NOUVEAU WIPE TRANSITION (Inspiré du HTML Levon) */}
      {showWipe && (
        <>
          <style>{`
            .wipe-transition {
              position: fixed; inset: 0; z-index: 999999; 
              background: #05050a; border-left: 4px solid #ff3366;
              display: flex; justify-content: center; align-items: center;
              box-shadow: -10px 0 60px rgba(255, 51, 102, 0.5);
              transform: translateX(100%);
              animation: slideWipeAnim 0.8s cubic-bezier(0.77, 0, 0.175, 1) forwards;
              pointer-events: none;
            }
            .wipe-transition span {
              color: #ff3366; font-family: 'Space Grotesk', sans-serif; font-size: 1.8rem; font-weight: 700;
              letter-spacing: 6px; opacity: 0; transform: scale(0.9); transition: all 0.3s;
              text-shadow: 0 0 30px #ff3366;
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