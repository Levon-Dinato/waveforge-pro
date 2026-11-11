// src/components/AmbientBackground.tsx
import React from 'react';

export const AmbientBackground: React.FC = () => (
  <>
    <style>{`
      .ambient-orb { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(100px); opacity: 0.35; }
      .orb-1 { width: 500px; height: 500px; background: #ff3366; top: -150px; left: -150px; animation: drift1 25s ease-in-out infinite; }
      .orb-2 { width: 400px; height: 400px; background: #7c5cff; bottom: 10%; right: -100px; opacity: 0.25; animation: drift2 30s ease-in-out infinite; }
      .orb-3 { width: 450px; height: 450px; background: #00d9ff; top: 40%; left: 40%; opacity: 0.1; animation: drift1 35s ease-in-out infinite reverse; }
      @keyframes drift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(150px, 100px) scale(1.15); } }
      @keyframes drift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-120px, -80px) scale(1.2); } }
    `}</style>
    <div className="ambient-orb orb-1" />
    <div className="ambient-orb orb-2" />
    <div className="ambient-orb orb-3" />
  </>
);