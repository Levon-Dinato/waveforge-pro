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
    // Compte les remix dans IndexedDB
    import('../remix/historyStore').then(({ historyStore }) => {
      historyStore.getAll().then((all) => setRemixCount(all.length));
    });

    // Compte les musicgen
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
    showToast('✅ Historique remix effacé');
  };

  const handleClearMusicGenHistory = async () => {
    if (!confirm('Effacer TOUT l\'historique MusicGen ?')) return;
    const { musicgenHistory } = await import('../utils/musicgenHistory');
    await musicgenHistory.clear();
    setMusicgenCount(0);
    showToast('✅ Historique MusicGen effacé');
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
    showToast('🗑️ Toutes les données ont été effacées');
  };

  return (
    <div
      className="wf-fade-in"
      style={{
        padding: isMobile ? 16 : 32,
        maxWidth: 1000,
        margin: '0 auto',
        display: 'grid',
        gap: isMobile ? 16 : 20,
      }}
    >
      {/* HEADER */}
      <div>
        <h1 className="wf-title-2" style={{ marginBottom: 6, fontSize: isMobile ? 20 : 24 }}>
          ⚙️ Réglages
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
          Préférences · Historique · Informations système
        </p>
      </div>

      {/* HISTORIQUE */}
      <div className="wf-glass" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(124, 92, 255, 0.12)',
              border: '1px solid rgba(124, 92, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            📚
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Historique
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Données stockées localement (jamais envoyées)
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* Remix */}
          <div
            style={{
              padding: 16,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="wf-label" style={{ fontSize: 9 }}>
                REMIX IA
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#ff5cf0',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {remixCount}
              </div>
            </div>
            <button
              onClick={handleClearRemixHistory}
              disabled={remixCount === 0}
              className="wf-btn wf-btn-secondary"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: 11,
                color: remixCount > 0 ? '#ff3366' : 'var(--text-disabled)',
                cursor: remixCount > 0 ? 'pointer' : 'not-allowed',
                opacity: remixCount > 0 ? 1 : 0.5,
              }}
            >
              🗑️ EFFACER
            </button>
          </div>

          {/* MusicGen */}
          <div
            style={{
              padding: 16,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="wf-label" style={{ fontSize: 9 }}>
                MUSICGEN
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#00ff88',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {musicgenCount}
              </div>
            </div>
            <button
              onClick={handleClearMusicGenHistory}
              disabled={musicgenCount === 0}
              className="wf-btn wf-btn-secondary"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: 11,
                color: musicgenCount > 0 ? '#ff3366' : 'var(--text-disabled)',
                cursor: musicgenCount > 0 ? 'pointer' : 'not-allowed',
                opacity: musicgenCount > 0 ? 1 : 0.5,
              }}
            >
              🗑️ EFFACER
            </button>
          </div>
        </div>

        <div style={{ paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <button
            onClick={handleClearAll}
            className="wf-btn"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: 12,
              background: 'rgba(255, 51, 102, 0.1)',
              border: '1px solid rgba(255, 51, 102, 0.4)',
              color: '#ff3366',
            }}
          >
            ⚠️ EFFACER TOUTES LES DONNÉES
          </button>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 8, textAlign: 'center' }}>
            Remix · MusicGen · Presets Mastering · Configurations
          </div>
        </div>
      </div>

      {/* INFORMATIONS SYSTÈME */}
      <div className="wf-glass" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(0, 217, 255, 0.12)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            🖥️
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Informations système
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Détails de l'application
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <InfoRow label="Application" value="WaveForge PRO" />
          <InfoRow label="Version" value="v1.0" />
          <InfoRow label="Navigateur" value={navigator.userAgent.split(' ').slice(-2).join(' ')} />
          <InfoRow label="Résolution" value={`${window.screen.width} × ${window.screen.height}`} />
          <InfoRow label="Langue" value={navigator.language.toUpperCase()} />
        </div>
      </div>

      {/* FOOTER */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 10,
          color: 'var(--text-tertiary)',
          letterSpacing: '1px',
          paddingTop: 8,
        }}
      >
        WAVEFORGE PRO · v1.0 · DONNÉES 100% LOCALES
      </div>

      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            background: 'rgba(20, 20, 30, 0.95)',
            border: '1px solid rgba(0, 255, 136, 0.4)',
            borderRadius: 10,
            color: '#00ff88',
            fontSize: 12,
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

// ============================================================
// SOUS-COMPOSANT : ligne d'info
// ============================================================
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 14px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: 8,
      fontSize: 12,
    }}
  >
    <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
    <span
      style={{
        color: 'var(--text-primary)',
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
      }}
    >
      {value}
    </span>
  </div>
);