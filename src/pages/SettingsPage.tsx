// src/pages/SettingsPage.tsx
import React, { useEffect, useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

export const SettingsPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const [remixCount, setRemixCount] = useState(0);
  const [musicgenCount, setMusicgenCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Charge les stats
  useEffect(() => {
    import('../remix/historyStore').then(({ historyStore }) => {
      historyStore.getAll().then((all) => setRemixCount(all.length));
    });

    import('../utils/musicgenHistory').then(({ musicgenHistory }) => {
      musicgenHistory.getAll().then((all) => setMusicgenCount(all.length));
    });
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleClearRemixHistory = async () => {
    if (!confirm('Effacer TOUT l\'historique des remix ?')) return;
    const { historyStore } = await import('../remix/historyStore');
    await historyStore.clear();
    setRemixCount(0);
    showToast('Historique remix effacé');
  };

  const handleClearMusicGenHistory = async () => {
    if (!confirm('Effacer TOUT l\'historique MusicGen ?')) return;
    const { musicgenHistory } = await import('../utils/musicgenHistory');
    await musicgenHistory.clear();
    setMusicgenCount(0);
    showToast('Historique MusicGen effacé');
  };

  const handleClearAll = async () => {
    if (!confirm('⚠️ Tout effacer (remix + MusicGen + presets Mastering) ?')) return;

    const { historyStore } = await import('../remix/historyStore');
    await historyStore.clear();

    const { musicgenHistory } = await import('../utils/musicgenHistory');
    await musicgenHistory.clear();

    const { masteringPresets } = await import('../utils/masteringPresets');
    await masteringPresets.clear();

    localStorage.removeItem('waveforge-mastering-exports');
    localStorage.removeItem('waveforge-base-path');
    localStorage.removeItem('cdj-calibration');

    setRemixCount(0);
    setMusicgenCount(0);
    showToast('Toutes les données ont été effacées');
  };

  return (
    <div style={{
      padding: isMobile ? 16 : 32,
      maxWidth: 800,
      margin: '0 auto',
      display: 'grid',
      gap: 24,
      fontFamily: 'Inter, sans-serif',
      color: '#fff',
      background: '#121212',
      minHeight: '100vh',
    }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: isMobile ? 24 : 32, fontWeight: 700 }}>
          Réglages
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
          Préférences · Historique · Informations système
        </p>
      </div>

      {/* SECTION HISTORIQUE */}
      <div style={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 8, padding: isMobile ? 20 : 32 }}>
        
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
            Historique
          </div>
          <div style={{ fontSize: 13, color: '#888' }}>
            Données stockées localement (jamais envoyées sur un serveur).
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 24 }}>
          
          {/* Remix */}
          <div style={{ padding: 20, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Remix IA
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                {remixCount}
              </div>
            </div>
            <button
              onClick={handleClearRemixHistory}
              disabled={remixCount === 0}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: 12,
                fontWeight: 600,
                background: 'transparent',
                border: '1px solid #333',
                color: remixCount > 0 ? '#ff5c5c' : '#555',
                borderRadius: 4,
                cursor: remixCount > 0 ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (remixCount > 0) e.currentTarget.style.background = 'rgba(255, 92, 92, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Effacer
            </button>
          </div>

          {/* MusicGen */}
          <div style={{ padding: 20, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                MusicGen
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                {musicgenCount}
              </div>
            </div>
            <button
              onClick={handleClearMusicGenHistory}
              disabled={musicgenCount === 0}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: 12,
                fontWeight: 600,
                background: 'transparent',
                border: '1px solid #333',
                color: musicgenCount > 0 ? '#ff5c5c' : '#555',
                borderRadius: 4,
                cursor: musicgenCount > 0 ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (musicgenCount > 0) e.currentTarget.style.background = 'rgba(255, 92, 92, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Effacer
            </button>
          </div>
        </div>

        {/* Bouton tout effacer */}
        <div style={{ paddingTop: 24, borderTop: '1px solid #2a2a2a' }}>
          <button
            onClick={handleClearAll}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: 13,
              fontWeight: 600,
              background: 'rgba(255, 51, 102, 0.1)',
              border: '1px solid rgba(255, 51, 102, 0.3)',
              color: '#ff5c5c',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 51, 102, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 51, 102, 0.1)'}
          >
            Effacer toutes les données
          </button>
          <div style={{ fontSize: 11, color: '#666', marginTop: 12, textAlign: 'center' }}>
            Remix · MusicGen · Presets Mastering · Configurations locales
          </div>
        </div>
      </div>

      {/* SECTION INFORMATIONS SYSTÈME */}
      <div style={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 8, padding: isMobile ? 20 : 32 }}>
        
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
            Informations système
          </div>
          <div style={{ fontSize: 13, color: '#888' }}>
            Détails de l'application et de ton appareil.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <InfoRow label="Application" value="DropZone DJ" />
          <InfoRow label="Version" value="v1.0" />
          <InfoRow label="Navigateur" value={navigator.userAgent.split(' ').slice(-2).join(' ')} />
          <InfoRow label="Résolution" value={`${window.screen.width} × ${window.screen.height}`} />
          <InfoRow label="Langue" value={navigator.language.toUpperCase()} />
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: 'center', fontSize: 11, color: '#555', letterSpacing: '1px', paddingTop: 8 }}>
        DROPZONE DJ · DONNÉES 100% LOCALES
      </div>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            background: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: 6,
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

// ============================================================
// SOUS-COMPOSANT : Ligne d'information
// ============================================================
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #2a2a2a', // Ligne fine de séparation
      fontSize: 13,
    }}
  >
    <span style={{ color: '#888' }}>{label}</span>
    <span style={{ color: '#fff', fontWeight: 500, fontFamily: 'monospace' }}>
      {value}
    </span>
  </div>
);