// src/pages/LivePage.tsx
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useIsMobile } from '../hooks/useIsMobile';
import { LiveChat } from '../components/LiveChat';

export const LivePage = () => {
  const isMobile = useIsMobile(768);
  const [chatVisible, setChatVisible] = useState(true);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  // ✅ Tes infos RTMP (à mettre à jour si Tviply te donne une nouvelle clé)
  const rtmpUrl = 'rtmp://live.tviply.com/stream';
  const streamKey = '6n9kjjb7qw4ko4w4ock';

  // ✅ Nouvelle URL Tviply pour WaveForgePro
  const tviplyEmbedUrl = 'https://tviply.com/waveforgepro/embed';
  const tviplyChannelUrl = 'https://tviply.com/waveforgepro';

  // ✅ URL de partage canonique (fixe, pas window.location.href)
  const shareUrl = 'https://waveforge-pro-one.vercel.app/live';
  const shareTitle = 'WaveForge Pro Live 🎧';
  const shareText = 'Regarde le live de WaveForge Pro et rejoins la communauté !';

  // ✅ Clipboard robuste (fallback HTTP / vieux navigateurs)
  const copyToClipboard = async (text: string, message = 'Copié dans le presse-papiers !') => {
    try {
      await navigator.clipboard.writeText(text);
      alert(message);
    } catch {
      // Fallback pour HTTP / navigateurs sans Clipboard API
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert(message);
    }
  };

  // ✅ URLs de partage par réseau (shareTitle inclus)
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle + ' — ' + shareText)}&url=${encodeURIComponent(shareUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareTitle + ' — ' + shareText + ' ' + shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
    setShareMenuOpen(false);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 32 : 48,
      paddingBottom: 60,
    }}>

      {/* ✅ BALISES SEO / RÉSEAUX SOCIAUX POUR LA PAGE LIVE */}
      <Helmet>
        <title>Live WaveForge Pro 🎧</title>
        <meta property="og:title" content="Live WaveForge Pro 🎧" />
        <meta property="og:description" content="Rejoins le live et partage ta passion !" />
        <meta property="og:image" content="https://waveforge-pro-one.vercel.app/og-live.jpg" />
        <meta property="og:url" content="https://waveforge-pro-one.vercel.app/live" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Live WaveForge Pro 🎧" />
        <meta name="twitter:description" content="Rejoins le live et partage ta passion !" />
        <meta name="twitter:image" content="https://waveforge-pro-one.vercel.app/og-live.jpg" />
      </Helmet>

      {/* ============ HEADER ============ */}
      <section style={{ position: 'relative' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: 'rgba(255, 51, 102, 0.08)',
          border: '1px solid rgba(255, 51, 102, 0.25)',
          borderRadius: 100,
          fontSize: 10,
          fontWeight: 700,
          color: '#ff3366',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          marginBottom: 20,
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#ff3366',
            boxShadow: '0 0 10px #ff3366',
            animation: 'pulse 1.5s infinite',
          }} />
          En direct maintenant
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 24,
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: isMobile ? 36 : 56,
              fontWeight: 700,
              letterSpacing: isMobile ? '-1px' : '-2px',
              lineHeight: 1,
              margin: '0 0 16px 0',
              color: '#fff',
            }}>
              Live <span style={{
                background: 'linear-gradient(135deg, #ff3366, #ff5cf0)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>WaveForge Pro</span>
            </h1>
            <p style={{
              fontSize: isMobile ? 14 : 16,
              color: 'rgba(255, 255, 255, 0.6)',
              maxWidth: 600,
              margin: 0,
              lineHeight: 1.6,
            }}>
              Rejoins le live et partage ta passion !
              Écoute les émissions en direct, connecte-toi pour prendre l'antenne quand tu le souhaites et échange avec les autres auditeurs.
            </p>
          </div>

          {/* ✅ BOUTON DE PARTAGE MODERNISÉ */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShareMenuOpen(!shareMenuOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.03)', // Fond verre
                border: '1px solid rgba(255, 255, 255, 0.1)', // Bordure fine
                color: 'rgba(255, 255, 255, 0.6)', // Gris clair
                borderRadius: 30, // Très arrondi
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.4)';
                e.currentTarget.style.color = '#00d9ff';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 217, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Icône SVG moderne */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Partager
            </button>

            {/* MENU DÉROULANT DE PARTAGE */}
            {shareMenuOpen && (
              <>
                {/* Overlay pour fermer en cliquant à l'extérieur */}
                <div
                  onClick={() => setShareMenuOpen(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99,
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    background: 'linear-gradient(135deg, rgba(15, 18, 28, 0.98), rgba(10, 12, 20, 0.99))',
                    border: '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: 12,
                    padding: 8,
                    minWidth: 220,
                    maxWidth: 'calc(100vw - 32px)',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 217, 255, 0.15)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    zIndex: 100,
                  }}
                >
                  <div style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'rgba(0, 217, 255, 0.6)',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    padding: '4px 12px 10px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: 6,
                  }}>
                    Partager sur
                  </div>

                  {[
                    { key: 'twitter' as const, label: 'Twitter / X', icon: '𝕏' },
                    { key: 'facebook' as const, label: 'Facebook', icon: '📘' },
                    { key: 'whatsapp' as const, label: 'WhatsApp', icon: '💬' },
                    { key: 'linkedin' as const, label: 'LinkedIn', icon: '💼' },
                    { key: 'telegram' as const, label: 'Telegram', icon: '✈️' },
                  ].map((platform) => (
                    <button
                      key={platform.key}
                      onClick={() => handleShare(platform.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>
                        {platform.icon}
                      </span>
                      <span>{platform.label}</span>
                    </button>
                  ))}

                  <div style={{
                    height: 1,
                    background: 'rgba(255, 255, 255, 0.08)',
                    margin: '6px 8px',
                  }} />

                  <button
                    onClick={() => {
                      copyToClipboard(shareUrl, 'Lien copié !');
                      setShareMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      color: '#00ff88',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 255, 136, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>🔗</span>
                    <span>Copier le lien</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ============ LECTEUR + CHAT ============ */}
      <section>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : (chatVisible ? '1fr 340px' : '1fr'),
          gap: 16,
          transition: 'all 0.3s ease',
        }}>
          {/* LECTEUR TVIPLY - SANS MASQUE */}
          <div style={{
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#000',
            position: 'relative',
          }}>
            <iframe
              src={tviplyEmbedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              title="WaveForge Pro - Live"
              scrolling="no"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                overflow: 'hidden',
                display: 'block',
              }}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            />
          </div>

          {/* CHAT */}
          {chatVisible && (
            <div style={{
              height: isMobile ? 400 : 'auto',
              minHeight: isMobile ? 400 : 0,
              display: 'flex',
              flexDirection: 'column',
            }}>
              <LiveChat roomId="waveforgepro" />
            </div>
          )}
        </div>

        {/* BOUTON MASQUER/AFFICHER LE CHAT */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' }}>
            🔴 En direct sur WaveForme.Pro
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {!isMobile && (
              <button
                onClick={() => setChatVisible(!chatVisible)}
                style={{
                  fontSize: 13,
                  color: '#00d9ff',
                  background: 'transparent',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {chatVisible ? '💬 Masquer le chat' : '💬 Afficher le chat'}
              </button>
            )}
            <a
              href={tviplyChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                color: '#00d9ff',
                textDecoration: 'none',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Ouvrir sur Tviply →
            </a>
          </div>
        </div>
      </section>

      {/* ============ COMMENT LANCER TON LIVE (RTMP) ============ */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg, #00d9ff, #7c5cff)', borderRadius: 2 }} />
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: isMobile ? 22 : 28,
            fontWeight: 700,
            margin: 0,
            letterSpacing: '-0.5px',
            color: '#fff',
          }}>
            Lancer ton propre live
          </h2>
        </div>

        <p style={{
          fontSize: 14,
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: 24,
          lineHeight: 1.6,
        }}>
          Pour diffuser ton live, configure ton logiciel de diffusion (OBS, Streamlabs, etc.) avec les informations ci-dessous.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {/* HÔTE */}
          <div style={{
            padding: 20,
            background: 'rgba(30, 32, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#00d9ff', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
              Hôte (RTMP)
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <code style={{
                flex: 1,
                padding: '12px 16px',
                background: '#0a0c14',
                border: '1px solid #333',
                borderRadius: 8,
                fontSize: 14,
                color: '#fff',
                fontFamily: 'monospace',
                minWidth: 0,
                overflow: 'auto',
                whiteSpace: 'nowrap',
              }}>
                {rtmpUrl}
              </code>
              <button
                onClick={() => copyToClipboard(rtmpUrl, 'Hôte RTMP copié !')}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(0, 217, 255, 0.1)',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  color: '#00d9ff',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                📋 Copier
              </button>
            </div>
          </div>

          {/* CLÉ DE FLUX */}
          <div style={{
            padding: 20,
            background: 'rgba(30, 32, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ff5cf0', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
              Clé de flux (Stream Key)
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <code style={{
                flex: 1,
                padding: '12px 16px',
                background: '#0a0c14',
                border: '1px solid #333',
                borderRadius: 8,
                fontSize: 14,
                color: '#fff',
                fontFamily: 'monospace',
                minWidth: 0,
                overflow: 'auto',
                whiteSpace: 'nowrap',
              }}>
                {streamKey}
              </code>
              <button
                onClick={() => copyToClipboard(streamKey, 'Clé de flux copiée !')}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(255, 92, 240, 0.1)',
                  border: '1px solid rgba(255, 92, 240, 0.3)',
                  color: '#ff5cf0',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                📋 Copier
              </button>
            </div>
          </div>
        </div>

        {/* ÉTAPES */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 20,
          marginTop: 24,
        }}>
          {[
            {
              step: '01',
              title: 'Ouvre ton logiciel',
              description: 'Lance OBS Studio, Streamlabs ou tout autre logiciel de diffusion compatible RTMP.',
              icon: '💻',
            },
            {
              step: '02',
              title: 'Colle les infos',
              description: 'Dans les paramètres de diffusion, colle l\'hôte RTMP et la clé de flux ci-dessus.',
              icon: '⚙️',
            },
            {
              step: '03',
              title: 'Go Live !',
              description: 'Clique sur "Démarrer la diffusion". Ton live sera visible sur WaveForme.Pro dans quelques secondes.',
              icon: '🔴',
            },
          ].map((item) => (
            <div key={item.step} style={{
              padding: 24,
              background: 'rgba(30, 32, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              position: 'relative',
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#00d9ff',
                letterSpacing: '2px',
                marginBottom: 12,
              }}>
                {item.step}
              </div>
              <div style={{ fontSize: 32, marginBottom: 12 }}>
                {item.icon}
              </div>
              <h3 style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: 16,
                fontWeight: 700,
                margin: '0 0 8px 0',
                color: '#fff',
              }}>
                {item.title}
              </h3>
              <p style={{
                fontSize: 13,
                color: 'rgba(255, 255, 255, 0.55)',
                lineHeight: 1.6,
                margin: 0,
              }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* ASTUCE */}
        <div style={{
          marginTop: 24,
          padding: 20,
          background: 'rgba(0, 217, 255, 0.05)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <div style={{ fontSize: 20 }}>💡</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#00d9ff', marginBottom: 4 }}>
              Astuce
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6 }}>
              Ne partage <strong>jamais</strong> ta clé de flux. Elle permet à n'importe qui de diffuser sur WaveForme.pro en direct.
            </div>
          </div>
        </div>
      </section>

      {/* Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

    </div>
  );
};