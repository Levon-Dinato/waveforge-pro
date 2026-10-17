// src/components/LanguageSwitcher.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = LANGS.find((l) => l.code.startsWith(i18n.language)) || LANGS[0];

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          background: 'rgba(0, 217, 255, 0.06)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          borderRadius: 8,
          color: '#fff',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 700,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 217, 255, 0.12)';
          e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 217, 255, 0.06)';
          e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.3)';
        }}
      >
        <span style={{ fontSize: 16 }}>{currentLang.flag}</span>
        <span>{currentLang.code.toUpperCase()}</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
      </button>

              {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 6,
            background: 'linear-gradient(135deg, rgba(15, 18, 28, 0.98), rgba(10, 12, 20, 0.99))',
            border: '1px solid rgba(0, 217, 255, 0.35)',
            borderRadius: 10,
            padding: 6,
            minWidth: 160,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
            zIndex: 1000,
            whiteSpace: 'nowrap',
          }}
        >
          {LANGS.map((lang) => {
            const isActive = i18n.language.startsWith(lang.code);
            return (
              <button
                key={lang.code}
                onClick={() => changeLang(lang.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  background: isActive ? 'rgba(0, 217, 255, 0.12)' : 'transparent',
                  border: 'none',
                  color: isActive ? '#00d9ff' : '#fff',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  borderRadius: 6,
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: 16 }}>{lang.flag}</span>
                <span style={{ flex: 1 }}>{lang.label}</span>
                {isActive && <span style={{ color: '#00ff88', fontSize: 14 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};