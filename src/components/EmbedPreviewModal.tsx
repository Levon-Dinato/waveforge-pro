// src/components/EmbedPreviewModal.tsx
// Fenêtre de lecture des promos embed (player officiel intégré, partout sur le site)
import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

interface EmbedPreviewModalProps {
  track: {
    id: string;
    title: string;
    artist: string;
    cover_url?: string | null;
    embed_code?: string;
    purchase_url?: string | null;
  };
  onClose: () => void;
}

export const EmbedPreviewModal: React.FC<EmbedPreviewModalProps> = ({ track, onClose }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colors = {
    panelBg: isDark ? '#121212' : '#ffffff',
    border: isDark ? '#222222' : '#e5e7eb',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    accent: isDark ? '#ffffff' : '#111111',
  };

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ padding: 24, width: '100%', maxWidth: 560, background: colors.panelBg, borderRadius: 16, border: `1px solid ${colors.border}`, position: 'relative', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 20 }}>✕</button>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16, paddingRight: 30 }}>
          {track.cover_url && <img src={track.cover_url} alt="cover" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: `1px solid ${colors.border}`, flexShrink: 0 }} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
            <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{track.artist}</div>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>🎧 {t('nouveautes.embed_listen')}</div>
        <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${colors.border}` }} dangerouslySetInnerHTML={{ __html: track.embed_code || '' }} />

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {track.purchase_url && (
            <a href={track.purchase_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', padding: '12px', background: colors.accent, color: isDark ? '#000' : '#ffffff', borderRadius: 10, fontWeight: 800, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              🛒 {t('nouveautes.open_official')}
            </a>
          )}
          <button onClick={() => { onClose(); navigate('/track/' + track.id); }} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {t('nouveautes.view_track')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
