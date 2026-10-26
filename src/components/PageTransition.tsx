// src/components/PageTransition.tsx
import React from 'react';
import { motion } from 'framer-motion';

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, filter: 'blur(10px)', scale: 0.98 }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
      exit={{ opacity: 0, y: -30, filter: 'blur(10px)', scale: 0.98 }}
      transition={{ 
        duration: 0.5, 
        ease: [0.22, 1, 0.36, 1] // Courbe très pro
      }}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </motion.div>
  );
};