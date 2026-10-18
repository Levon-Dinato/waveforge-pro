// src/pages/LivePage.tsx
import { useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { LiveChat } from '../components/LiveChat';

export const LivePage = () => {
  const isMobile = useIsMobile(768);
  const [chatVisible, setChatVisible] = useState(true);

  // ✅ Tes infos RTMP (récupérées de Tviply)
  const rtmpUrl = 'rtmp://live.tviply.com/stream';
  const streamKey = '6n9kjjb7qw4ko4w4ock';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Petit feedback visuel optionnel
    alert('Copié dans le presse-papiers !');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 32 : 48,
      paddingBottom: 60,
    }}>

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
          }}>DJ Control Radio</span>
        </h1>
        <p style={{
          fontSize: isMobile ? 14 : 16,
          color: 'rgba(255, 255, 255, 0.6)',
          maxWidth: 600,
          margin: 0,
          lineHeight: 1.6,
        }}>
          Écoute le live 24h/24 et discute avec les autres auditeurs. Les droits d'auteur sont gérés automatiquement par Tviply.
        </p>
      </section>

      {/* ============ LECTEUR + CHAT ============ */}
      <section>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : (chatVisible ? '1fr 340px' : '1fr'),
          gap: 16,
          transition: 'all 0.3s ease',
        }}>
          {/* LECTEUR TVIPLY - SANS SCROLL */}
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
              src="https://tviply.com/dinatoiprod/embed?t=0:33"
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              title="DJ Control Radio - Live"
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
              <LiveChat roomId="djcontrolradio" />
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
            🔴 En direct sur Tviply · Les droits sont gérés par la plateforme
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
                onClick={() => copyToClipboard(rtmpUrl)}
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
                onClick={() => copyToClipboard(streamKey)}
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
              description: 'Clique sur "Démarrer la diffusion". Ton live sera visible sur Tviply dans quelques secondes.',
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
              Ne partage <strong>jamais</strong> ta clé de flux. Elle permet à n'importe qui de diffuser à ta place. Si elle fuite, regénère-la depuis ton tableau de bord Tviply.
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