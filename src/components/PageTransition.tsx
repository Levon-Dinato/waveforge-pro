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
    const timer = setTimeout(() => setShowWipe(false), 700);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', flex: 1 }}>
      <motion.div
        initial={{ opacity: 0, y: 20, filter: 'blur(8px)', scale: 0.99 }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
        exit={{ opacity: 0, y: -16, filter: 'blur(8px)', scale: 0.99 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </motion.div>

      {showWipe && (
        <>
          <style>{`
            .wipe-transition {
              position: fixed; inset: 0; z-index: 999999;
              background: ${isDark
                ? 'linear-gradient(135deg, #0a0a0a 0%, #12121a 50%, #0a0a0a 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 50%, #ffffff 100%)'};
              display: flex; justify-content: center; align-items: center;
              transform: translateX(100%);
              animation: slideWipeAnim 0.7s cubic-bezier(0.77, 0, 0.175, 1) forwards;
              pointer-events: none;
              overflow: hidden;
            }
            .wipe-transition::after {
              content: '';
              position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
              background: linear-gradient(180deg, #00d9ff, #7c5cff, #ff5cf0);
              box-shadow: 0 0 24px rgba(0, 217, 255, 0.6);
            }
            .wipe-transition .wt-inner {
              display: flex; flex-direction: column; align-items: center; gap: 14px;
            }
            .wipe-transition .wt-mark {
              width: 46px; height: 46px; border-radius: 12px;
              background: linear-gradient(135deg, #00d9ff, #7c5cff);
              display: flex; align-items: center; justify-content: center;
              color: #000; font-weight: 900; font-size: 20px;
              box-shadow: 0 8px 30px rgba(0, 217, 255, 0.4);
            }
            .wipe-transition span {
              color: ${isDark ? '#ffffff' : '#111111'};
              font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: 700;
              letter-spacing: 5px; opacity: 0; transform: scale(0.9); transition: all 0.3s;
            }
            .wipe-transition.active span { opacity: 1; transform: scale(1); transition-delay: 0.22s; }
            @keyframes slideWipeAnim {
              0% { transform: translateX(100%); }
              42% { transform: translateX(0); }
              58% { transform: translateX(0); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
          <div className="wipe-transition active">
            <div className="wt-inner">
              <div className="wt-mark">DZ</div>
              <span>DROPZONE DJ</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
