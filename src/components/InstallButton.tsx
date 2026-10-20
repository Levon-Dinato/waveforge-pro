// src/components/InstallButton.tsx
import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallButtonProps {
  variant?: 'sidebar' | 'banner';
  onClose?: () => void;
}

export const InstallButton: React.FC<InstallButtonProps> = ({ variant = 'sidebar', onClose }) => {
  const { shouldShowInstall, isIOS, isAndroid, promptInstall, dismiss } = usePWAInstall();
  const [showManualHelp, setShowManualHelp] = useState(false);

  if (!shouldShowInstall) return null;

  const handleClick = async () => {
    const result = await promptInstall();
    if (result === 'ios' || result === 'manual') {
      setShowManualHelp(true);
    } else if (result === 'accepted') {
      onClose?.();
    }
  };

  const handleDismiss = () => {
    dismiss();
    onClose?.();
  };

  // ============================================================
  // MODALE INSTRUCTIONS (iOS + fallback desktop/mobile)
  // ============================================================
  const manualModal = showManualHelp && (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={() => setShowManualHelp(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1c1c1c',
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          padding: 24,
          maxWidth: 380,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>
          {isIOS ? '📱' : isAndroid ? '🤖' : '💻'}
        </div>
        <h3
          style={{
            margin: 0,
            marginBottom: 16,
            fontSize: 15,
            fontWeight: 700,
            color: '#00d9ff',
            textAlign: 'center',
            letterSpacing: '0.5px',
          }}
        >
          INSTALLER DROPZONE DJ
        </h3>

        {isIOS ? (
          <ol
            style={{
              margin: 0,
              padding: '0 0 0 20px',
              fontSize: 13,
              color: '#ccc',
              lineHeight: 1.8,
            }}
          >
            <li>
              Ouvre le menu <strong style={{ color: '#fff' }}>Partager</strong> de Safari{' '}
              <span style={{ color: '#00d9ff' }}>⎙</span>
            </li>
            <li>
              Fais défiler et tape sur{' '}
              <strong style={{ color: '#fff' }}>« Sur l'écran d'accueil »</strong>
            </li>
            <li>
              Confirme avec <strong style={{ color: '#fff' }}>Ajouter</strong>
            </li>
          </ol>
        ) : isAndroid ? (
          <ol
            style={{
              margin: 0,
              padding: '0 0 0 20px',
              fontSize: 13,
              color: '#ccc',
              lineHeight: 1.8,
            }}
          >
            <li>
              Ouvre le menu <strong style={{ color: '#fff' }}>⋮</strong> de Chrome (en haut à droite)
            </li>
            <li>
              Tape sur{' '}
              <strong style={{ color: '#fff' }}>« Installer l'application »</strong>
              <br />
              <span style={{ fontSize: 11, color: '#888' }}>
                (ou « Ajouter à l'écran d'accueil »)
              </span>
            </li>
            <li>
              Confirme avec <strong style={{ color: '#fff' }}>Installer</strong>
            </li>
          </ol>
        ) : (
          <ol
            style={{
              margin: 0,
              padding: '0 0 0 20px',
              fontSize: 13,
              color: '#ccc',
              lineHeight: 1.8,
            }}
          >
            <li>
              Cherche l'icône <strong style={{ color: '#fff' }}>⬇️</strong> à droite de la barre
              d'adresse
            </li>
            <li>
              OU ouvre le menu <strong style={{ color: '#fff' }}>⋮</strong> de Chrome →{' '}
              <strong style={{ color: '#fff' }}>« Installer DropZone DJ »</strong>
            </li>
            <li>Confirme l'installation</li>
          </ol>
        )}

        <button
          onClick={() => setShowManualHelp(false)}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '12px',
            border: 'none',
            borderRadius: 4,
            background: '#00d9ff',
            color: '#000',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '1px',
            cursor: 'pointer',
          }}
        >
          OK, COMPRIS
        </button>
      </div>
    </div>
  );

  // ============================================================
  // VARIANTE BANNER (mobile)
  // ============================================================
  if (variant === 'banner') {
    return (
      <>
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            left: 12,
            right: 12,
            zIndex: 90,
            padding: '12px 14px',
            background: '#1c1c1c',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              background: '#121212',
              border: '1px solid #2a2a2a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            <img src="/icons/icon-192.png" alt="DropZone DJ" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                marginBottom: 2,
              }}
            >
              Installer DropZone DJ
            </div>
            <div style={{ fontSize: 10, color: '#888' }}>
              Accès rapide · Sans barre d'URL
            </div>
          </div>

          <button
            onClick={handleClick}
            style={{
              padding: '8px 14px',
              border: 'none',
              borderRadius: 4,
              background: '#00d9ff',
              color: '#000',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.5px',
              flexShrink: 0,
            }}
          >
            INSTALLER
          </button>

          <button
            onClick={handleDismiss}
            style={{
              width: 24,
              height: 24,
              border: 'none',
              borderRadius: 4,
              background: 'transparent',
              color: '#666',
              fontSize: 16,
              cursor: 'pointer',
              flexShrink: 0,
              padding: 0,
            }}
            title="Ignorer"
          >
            ✕
          </button>
        </div>
        {manualModal}
      </>
    );
  }

  // ============================================================
  // VARIANTE SIDEBAR (desktop)
  // ============================================================
  return (
    <>
      <button
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '10px 12px',
          marginBottom: 8,
          background: '#1c1c1c',
          border: '1px solid #2a2a2a',
          borderRadius: 4,
          color: '#999',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.5px',
          transition: 'all 0.15s ease',
          width: '100%',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#2a2a2a';
          e.currentTarget.style.color = '#00d9ff';
          e.currentTarget.style.borderColor = '#00d9ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#1c1c1c';
          e.currentTarget.style.color = '#999';
          e.currentTarget.style.borderColor = '#2a2a2a';
        }}
      >
        INSTALLER L'APP
      </button>
      {manualModal}
    </>
  );
};