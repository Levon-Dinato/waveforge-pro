// src/pages/MasteringPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';

export const MasteringPage: React.FC = () => {
  const engine = useAudioEngineContext();

  // ✅ On vérifie si un morceau est chargé dans le Studio
  const hasAudio = !!engine.result;

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

      {/* ✅ SI AUCUN AUDIO N'EST CHARGÉ : On demande d'aller au Studio */}
      {!hasAudio ? (
        <div style={{
          background: '#1c1c1c',
          border: '2px dashed #2a2a2a',
          borderRadius: 12,
          padding: '80px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, filter: 'drop-shadow(0 0 10px rgba(255, 51, 102, 0.3))' }}>
            🔒
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px 0' }}>
            Aucun morceau chargé
          </h2>
          <p style={{ color: '#999', fontSize: '0.85rem', margin: '0 0 24px 0', maxWidth: 400 }}>
            Pour utiliser l'outil de Mastering, tu dois d'abord importer un fichier audio dans le Studio.
          </p>
          <Link to="/studio" style={{
            background: '#00d9ff',
            color: '#000',
            padding: '10px 20px',
            borderRadius: 4,
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            🎚️ Aller au Studio
          </Link>
        </div>
      ) : (
        /* ✅ SI UN AUDIO EST CHARGÉ : On affiche l'interface */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Info Fichier */}
          <div style={{ 
            background: '#1c1c1c', 
            border: '1px solid #2a2a2a', 
            borderRadius: 8,
            padding: '12px 16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
            borderLeft: '3px solid #00d9ff'
          }}>
            <span style={{ fontSize: 16 }}>🎵</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{engine.fileName}</div>
              <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                {engine.fileFormat} · {engine.result?.bpm} BPM · {engine.result?.duration.toFixed(1)}s
              </div>
            </div>
          </div>

          {/* ICI : Tu pourras mettre tes sliders de mastering (EQ, Compresseur...) */}
          <div style={{ 
            background: '#1c1c1c', 
            border: '1px solid #2a2a2a', 
            borderRadius: 8,
            padding: 40,
            textAlign: 'center',
            color: '#666'
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚙️</div>
            <h3 style={{ color: '#fff', marginBottom: 8 }}>Interface de Mastering</h3>
            <p style={{ fontSize: '0.85rem' }}>C'est ici que viendront tes réglages d'égalisation, de compression et d'exportation.</p>
          </div>

        </div>
      )}
    </div>
  );
};