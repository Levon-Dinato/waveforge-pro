// src/pages/MasteringPage.tsx
import React, { useRef } from 'react';

export const MasteringPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Ta logique pour récupérer le fichier audio
  };

  return (
    <div style={{ 
      maxWidth: 1000, 
      margin: '0 auto', 
      padding: '60px 20px', 
      color: '#fff', 
      fontFamily: 'Inter, sans-serif' 
    }}>
      
      {/* En-tête de l'outil */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🎛️</span> MASTERING
          </h1>
          <span style={{ 
            background: 'rgba(255, 51, 102, 0.15)', 
            color: '#ff3366', 
            border: '1px solid rgba(255, 51, 102, 0.3)', 
            padding: '2px 8px', 
            borderRadius: 12, 
            fontSize: '0.65rem', 
            fontWeight: 700, 
            letterSpacing: '1px' 
          }}>
            PRO
          </span>
        </div>
        <p style={{ color: '#666', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>
          ÉGALISATION · COMPRESSION · LIMITEUR · EXPORT
        </p>
      </div>

      {/* Zone de Drop minimaliste */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          background: '#1c1c1c',
          border: '2px dashed #2a2a2a',
          borderRadius: 12,
          padding: '80px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#ff3366'; // Rouge au survol
          e.currentTarget.style.background = '#1e1e1e';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#2a2a2a';
          e.currentTarget.style.background = '#1c1c1c';
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="audio/*"
        />
        
        <div style={{ fontSize: 48, marginBottom: 16, filter: 'drop-shadow(0 0 10px rgba(255, 51, 102, 0.3))' }}>
          🎚️
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px 0' }}>
          Charger un fichier audio
        </h2>
        <p style={{ color: '#999', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
          Clique ou glisse ton fichier WAV / MP3 ici
        </p>
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          color: '#666', 
          fontSize: '0.75rem', 
          fontWeight: 600 
        }}>
          <span>Mastering auto</span>
          <span>·</span>
          <span>Stéréo</span>
          <span>·</span>
          <span>Haute qualité</span>
        </div>
      </div>

      {/* Espace pour tes modules de mastering (boutons, sliders, etc.) */}
      {/* <div style={{ marginTop: 32 }}>
        ... tes composants de mastering ici ...
      </div> */}
    </div>
  );
};