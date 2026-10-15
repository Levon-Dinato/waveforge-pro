// src/components/ShareButton.tsx
import React, { useState, useRef, useEffect } from 'react';

interface ShareButtonProps {
  url: string;
  title?: string;
  text?: string;
  variant?: 'icon' | 'button';
  size?: 'small' | 'medium' | 'large';
  label?: string;
  position?: 'top' | 'bottom';
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  url,
  title = 'WaveForge PRO',
  text = 'Écoute ce son !',
  variant = 'button',
  size = 'medium',
  label = 'Partager',
  position = 'bottom',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleShare = async () => {
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {}
    }
    setMenuOpen(!menuOpen);
  };

  const shareTo = (platform: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    const encodedTitle = encodeURIComponent(title);

    let shareUrl = '';
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'reddit':
        shareUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=500,noopener,noreferrer');
      setMenuOpen(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sizes = {
    small:  { btn: 30, font: 11, iconFont: 14 },
    medium: { btn: 38, font: 12, iconFont: 16 },
    large:  { btn: 46, font: 14, iconFont: 20 },
  };
  const s = sizes[size];

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleShare}
        title={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: variant === 'icon' ? 0 : '8px 14px',
          width: variant === 'icon' ? s.btn : 'auto',
          height: variant === 'icon' ? s.btn : 'auto',
          justifyContent: 'center',
          background: 'rgba(0, 217, 255, 0.08)',
          border: '1px solid rgba(0, 217, 255, 0.4)',
          color: '#00d9ff',
          borderRadius: 6,
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: s.font,
          fontWeight: 700,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 217, 255, 0.15)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 217, 255, 0.08)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <span style={{ fontSize: s.iconFont }}>🔗</span>
        {variant === 'button' && <span>{label}</span>}
      </button>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            [position === 'bottom' ? 'top' : 'bottom']: '100%',
            [position === 'bottom' ? 'marginTop' : 'marginBottom']: 8,
            left: 0,
            background: 'linear-gradient(135deg, rgba(15, 18, 28, 0.98), rgba(10, 12, 20, 0.99))',
            border: '1px solid rgba(0, 217, 255, 0.4)',
            borderRadius: 8,
            padding: 6,
            minWidth: 210,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
            zIndex: 1000,
            fontFamily: 'monospace',
          }}
        >
          <div style={{ fontSize: 9, color: '#666', padding: '4px 8px', letterSpacing: '1px' }}>
            PARTAGER VIA
          </div>

          {[
            { id: 'facebook', icon: '📘', label: 'Facebook' },
            { id: 'twitter',  icon: '🐦', label: 'Twitter / X' },
            { id: 'whatsapp', icon: '💬', label: 'WhatsApp' },
            { id: 'telegram', icon: '✈️', label: 'Telegram' },
            { id: 'reddit',   icon: '🟠', label: 'Reddit' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => shareTo(p.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 10px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'monospace',
                textAlign: 'left',
                borderRadius: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 14 }}>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 10px',
              background: copied ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
              border: 'none',
              color: copied ? '#00ff88' : '#fff',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'monospace',
              textAlign: 'left',
              borderRadius: 4,
            }}
          >
            <span style={{ fontSize: 14 }}>{copied ? '✅' : '📋'}</span>
            <span>{copied ? 'Copié !' : 'Copier le lien'}</span>
          </button>
        </div>
      )}
    </div>
  );
};