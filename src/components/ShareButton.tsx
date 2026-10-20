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

const SocialIcons = {
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  ),
  reddit: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.561-1.249-1.249-1.249zm-5.466 3.321a.32.32 0 0 0-.217.562c.207.207.485.389.825.535.34.147.719.221 1.108.221.39 0 .768-.074 1.108-.221.34-.146.618-.328.825-.535a.32.32 0 0 0 0-.442.32.32 0 0 0-.445 0c-.14.14-.34.27-.605.386a1.91 1.91 0 0 1-.883.21 1.91 1.91 0 0 1-.883-.21c-.265-.116-.464-.247-.605-.386a.32.32 0 0 0-.228-.12z" />
    </svg>
  ),
};

interface Platform {
  id: string;
  name: string;
  color: string;
  icon: React.ReactNode;
}

const PLATFORMS: Platform[] = [
  { id: 'facebook', name: 'Facebook', color: '#1877F2', icon: SocialIcons.facebook },
  { id: 'twitter',  name: 'Twitter / X', color: '#000000', icon: SocialIcons.twitter },
  { id: 'whatsapp', name: 'WhatsApp', color: '#25D366', icon: SocialIcons.whatsapp },
  { id: 'telegram', name: 'Telegram', color: '#26A5E4', icon: SocialIcons.telegram },
  { id: 'reddit',   name: 'Reddit', color: '#FF4500', icon: SocialIcons.reddit },
];

export const ShareButton: React.FC<ShareButtonProps> = ({
  url,
  title = 'DropZone DJ',
  text = 'Écoute ce son !',
  variant = 'button',
  size = 'medium',
  label = 'Partager',
  position = 'bottom',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
    if (isMobile) {
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
          return;
        } catch (e) {}
      }
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {}
      return;
    }
    setMenuOpen(!menuOpen);
  };

  const shareTo = (platform: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    const encodedTitle = encodeURIComponent(title);

    let shareUrl = '';
    switch (platform) {
      case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`; break;
      case 'twitter': shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`; break;
      case 'whatsapp': shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`; break;
      case 'telegram': shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`; break;
      case 'reddit': shareUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`; break;
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
    small:  { btn: 28, font: 11, iconFont: 14 },
    medium: { btn: 36, font: 12, iconFont: 16 },
    large:  { btn: 44, font: 13, iconFont: 18 },
  };
  const s = sizes[size];

  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: variant === 'icon' ? 0 : '8px 16px',
    width: variant === 'icon' ? s.btn : 'auto',
    height: variant === 'icon' ? s.btn : 'auto',
    background: 'transparent', // ✅ Fond transparent
    border: '1px solid #2a2a2a', // ✅ Bordure grise
    color: '#999', // ✅ Texte gris
    borderRadius: 4, // ✅ Coins carrés
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontSize: s.font,
    fontWeight: 600,
    transition: 'all 0.15s ease',
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <style>{`
        @keyframes shareMenuIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes checkPop {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .share-platform-item { transition: all 0.15s ease; }
      `}</style>

      <button
        onClick={handleShare}
        title={label}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#2a2a2a';
          e.currentTarget.style.borderColor = '#3a3a3a';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = '#2a2a2a';
          e.currentTarget.style.color = '#999';
        }}
      >
        {copied && isMobile ? (
          <svg width={s.iconFont} height={s.iconFont} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width={s.iconFont} height={s.iconFont} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        )}
        {variant === 'button' && <span>{copied && isMobile ? 'Copié !' : label}</span>}
      </button>

      {menuOpen && !isMobile && (
        <div
          style={{
            position: 'absolute',
            [position === 'bottom' ? 'top' : 'bottom']: '100%',
            [position === 'bottom' ? 'marginTop' : 'marginBottom']: 8,
            right: 0,
            background: '#1c1c1c', // ✅ Fond gris Beatport
            border: '1px solid #2a2a2a', // ✅ Bordure grise
            borderRadius: 8, // ✅ Coins carrés
            padding: 8,
            minWidth: 220,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
            zIndex: 9999,
            fontFamily: 'Inter, sans-serif',
            animation: 'shareMenuIn 0.2s ease',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: '#999',
              padding: '4px 12px 8px',
              letterSpacing: '1px',
              fontWeight: 700,
              textTransform: 'uppercase',
              borderBottom: '1px solid #2a2a2a',
              marginBottom: 4,
            }}
          >
            PARTAGER VIA
          </div>

          {PLATFORMS.map((p) => {
            const isHovered = hovered === p.id;
            return (
              <button
                key={p.id}
                onClick={() => shareTo(p.id)}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                className="share-platform-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '10px 12px',
                  background: isHovered ? '#2a2a2a' : 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  textAlign: 'left',
                  borderRadius: 4,
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    background: '#121212',
                    color: '#fff',
                    flexShrink: 0,
                    filter: 'grayscale(1)',
                    opacity: 0.8,
                  }}
                >
                  {p.icon}
                </span>
                <span style={{ fontWeight: 500 }}>{p.name}</span>
              </button>
            );
          })}

          <div style={{ height: 1, background: '#2a2a2a', margin: '6px 0' }} />

          <button
            onClick={handleCopy}
            className="share-platform-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '10px 12px',
              background: copied ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
              border: 'none',
              color: copied ? '#00ff88' : '#fff',
              cursor: 'pointer',
              fontSize: 13,
              textAlign: 'left',
              borderRadius: 4,
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 4,
                background: copied ? '#00ff88' : '#121212',
                color: copied ? '#000' : '#00ff88',
                flexShrink: 0,
              }}
            >
              {copied ? (
                <span style={{ animation: 'checkPop 0.3s ease' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </span>
            <span style={{ fontWeight: 600 }}>{copied ? 'Lien copié !' : 'Copier le lien'}</span>
          </button>
        </div>
      )}
    </div>
  );
};