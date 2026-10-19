// src/pages/LivePage.tsx
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useIsMobile } from '../hooks/useIsMobile';
import { LiveChat } from '../components/LiveChat';

export const LivePage = () => {
  const isMobile = useIsMobile(768);
  const [chatVisible, setChatVisible] = useState(true);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  const rtmpUrl = 'rtmp://live.tviply.com/stream';
  const streamKey = '6n9kjjb7qw4ko4w4ock';
  const tviplyEmbedUrl = 'https://tviply.com/dropzonedj/embed';
  const tviplyChannelUrl = 'https://tviply.com/dropzonedj';

  const shareUrl = 'https://waveforge-pro-one.vercel.app/share/live';
  const shareTitle = 'DropZone DJ Live 🎧';
  const shareText = 'Regarde le live de DropZone DJ et rejoins la communauté !';

  const copyToClipboard = async (text: string, message = 'Copié dans le presse-papiers !') => {
    try {
      await navigator.clipboard.writeText(text);
      alert(message);
    } catch {
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
      fontFamily: 'Inter, sans-serif', // Style Beatport
    }}>

      <Helmet>
        <title>Live DropZone DJ 🎧</title>
        <meta property="og:title" content="Live DropZone DJ 🎧" />
        <meta property="og:description" content="Rejoins le live et partage ta passion !" />
        <meta property="og:image" content="https://waveforge-pro-one.vercel.app/og-live.jpg" />
        <meta property="og:url" content="https://waveforge-pro-one.vercel.app/live" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Live DropZone DJ 🎧" />
        <meta name="twitter:description" content="Rejoins le live et partage ta passion !" />
        <meta name="twitter:image" content="https://waveforge-pro-one.vercel.app/og-live.jpg" />
      </Helmet>

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
              }}>DropZone DJ</span>
            </h1>
            <p style={{
              fontSize: isMobile ? 14 : 16,
              color: '#999',
              maxWidth: 600,
              margin: 0,
              lineHeight: 1.6,
            }}>
              Rejoins le live et partage ta passion !
              Écoute les émissions en direct, connecte-toi pour prendre l'antenne quand tu le souhaites et échange avec les autres auditeurs.
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShareMenuOpen(!shareMenuOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: '#1c1c1c', // ✅ Fond gris Beatport
                border: '1px solid #2a2a2a', // ✅ Bordure grise
                color: '#999', // ✅ Texte gris
                borderRadius: 4, // ✅ Coins carrés
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2a2a2a';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1c1c1c';
                e.currentTarget.style.color = '#999';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Partager
            </button>

            {shareMenuOpen && (
              <>
                <div
                  onClick={() => setShareMenuOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                />

                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    background: '#1c1c1c', // ✅ Fond gris
                    border: '1px solid #2a2a2a', // ✅ Bordure grise
                    borderRadius: 8, // ✅ Coins moins arrondis
                    padding: 8,
                    minWidth: 220,
                    maxWidth: 'calc(100vw - 32px)',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
                    zIndex: 100,
                  }}
                >
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#666', // ✅ Gris
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    padding: '4px 12px 8px',
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
                        borderRadius: 4,
                        color: '#fff', // ✅ Texte blanc
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#2a2a2a'; // ✅ Hover gris
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ 
                        fontSize: 14, 
                        width: 24, 
                        textAlign: 'center',
                        filter: 'grayscale(1)', // ✅ Icônes grises
                        opacity: 0.8,
                      }}>
                        {platform.icon}
                      </span>
                      <span>{platform.label}</span>
                    </button>
                  ))}

                  <div style={{
                    height: 1,
                    background: '#2a2a2a',
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
                      borderRadius: 4,
                      color: '#fff', // ✅ Texte blanc
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#2a2a2a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ 
                      fontSize: 14, 
                      width: 24, 
                      textAlign: 'center',
                      filter: 'grayscale(1)', // ✅ Icônes grises
                      opacity: 0.8,
                    }}>🔗</span>
                    <span>Copier le lien</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : (chatVisible ? '1fr 340px' : '1fr'),
          gap: 16,
          transition: 'all 0.3s ease',
        }}>
          <div style={{
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 8, // ✅ Coins carrés
            overflow: 'hidden',
            border: '1px solid #2a2a2a', // ✅ Bordure grise
            background: '#000',
            position: 'relative',
          }}>
            <iframe
              src={tviplyEmbedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              title="DropZone DJ - Live"
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

          {chatVisible && (
            <div style={{
              height: isMobile ? 400 : 'auto',
              minHeight: isMobile ? 400 : 0,
              display: 'flex',
              flexDirection: 'column',
              background: '#1c1c1c', // ✅ Fond gris
              border: '1px solid #2a2a2a', // ✅ Bordure grise
              borderRadius: 8,
            }}>
              <LiveChat roomId="waveforgepro" />
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ fontSize: 13, color: '#666' }}>
            🔴 En direct sur DropZone DJ
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {!isMobile && (
              <button
                onClick={() => setChatVisible(!chatVisible)}
                style={{
                  fontSize: 12,
                  color: '#999',
                  background: '#1c1c1c',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {chatVisible ? 'Masquer le chat' : 'Afficher le chat'}
              </button>
            )}
            <a
              href={tviplyChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
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

      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 4, height: 24, background: '#00d9ff', borderRadius: 2 }} />
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
          color: '#999',
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
          <div style={{
            padding: 20,
            background: '#1c1c1c', // ✅ Fond gris
            border: '1px solid #2a2a2a', // ✅ Bordure grise
            borderRadius: 8, // ✅ Coins carrés
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
              Hôte (RTMP)
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <code style={{
                flex: 1,
                padding: '12px 16px',
                background: '#121212',
                border: '1px solid #2a2a2a',
                borderRadius: 4,
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
                  background: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  color: '#fff',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Copier
              </button>
            </div>
          </div>

          <div style={{
            padding: 20,
            background: '#1c1c1c',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
              Clé de flux (Stream Key)
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <code style={{
                flex: 1,
                padding: '12px 16px',
                background: '#121212',
                border: '1px solid #2a2a2a',
                borderRadius: 4,
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
                  background: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  color: '#fff',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Copier
              </button>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 20,
          marginTop: 24,
        }}>
          {[
            { step: '01', title: 'Ouvre ton logiciel', description: 'Lance OBS Studio, Streamlabs ou tout autre logiciel de diffusion compatible RTMP.', icon: '💻' },
            { step: '02', title: 'Colle les infos', description: 'Dans les paramètres de diffusion, colle l\'hôte RTMP et la clé de flux ci-dessus.', icon: '⚙️' },
            { step: '03', title: 'Go Live !', description: 'Clique sur "Démarrer la diffusion". Ton live sera visible sur DropZone DJ dans quelques secondes.', icon: '🔴' },
          ].map((item) => (
            <div key={item.step} style={{
              padding: 24,
              background: '#1c1c1c', // ✅ Fond gris
              border: '1px solid #2a2a2a', // ✅ Bordure grise
              borderRadius: 8,
              position: 'relative',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#00d9ff', letterSpacing: '2px', marginBottom: 12 }}>{item.step}</div>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: '#999', lineHeight: 1.6, margin: 0 }}>{item.description}</p>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 24,
          padding: 20,
          background: '#1c1c1c', // ✅ Fond gris
          border: '1px solid #2a2a2a', // ✅ Bordure grise
          borderRadius: 8,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <div style={{ fontSize: 20 }}>💡</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Astuce</div>
            <div style={{ fontSize: 13, color: '#999', lineHeight: 1.6 }}>
              Ne partage <strong>jamais</strong> ta clé de flux. Elle permet à n'importe qui de diffuser sur DropZone DJ en direct.
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

    </div>
  );
};