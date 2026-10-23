// src/pages/LivePage.tsx
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useIsMobile } from '../hooks/useIsMobile';
import { LiveChat } from '../components/LiveChat';

export const LivePage = () => {
  const isMobile = useIsMobile(768);
  const [chatVisible, setChatVisible] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  const rtmpUrl = 'rtmp://live.tviply.com/stream';
  const streamKey = '6n9kjjb7qw4ko4w4ock';
  const tviplyEmbedUrl = 'https://tviply.com/dropzonedj/embed';
  const tviplyChannelUrl = 'https://tviply.com/dropzonedj';
  
  // URL à partager
  const liveShareUrl = window.location.origin + '/live';

  const copyToClipboard = async (text: string, message = 'Copié !') => {
    try {
      await navigator.clipboard.writeText(text);
      alert(message);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert(message);
    }
  };

  // ✅ Fonction de partage native
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DropZone DJ Live 🎧',
          text: 'Rejoins le live et vibre avec la communauté !',
          url: liveShareUrl,
        });
      } catch (err) {
        console.log('Partage annulé');
      }
    } else {
      copyToClipboard(liveShareUrl, 'Lien du live copié !');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 32 : 48,
      paddingBottom: 80,
      fontFamily: 'Inter, sans-serif',
      background: '#121212',
      minHeight: '100vh',
      color: '#fff',
    }}>

      {/* ✅ METADONNÉES POUR LE PARTAGE (Facebook, Twitter, Discord, etc.) */}
      <Helmet>
        <title>Live DropZone DJ 🎧 - Prends l'antenne</title>
        
        {/* Open Graph (Facebook, Discord, WhatsApp) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="DropZone DJ" />
        <meta property="og:title" content="Live DropZone DJ 🎧" />
        <meta property="og:description" content="Rejoins la scène, mixe en direct et partage ta passion avec la communauté." />
        <meta property="og:url" content={liveShareUrl} />
        {/* 👇 Mets ici le nom de ton image pour le Live (à placer dans le dossier public) */}
        <meta property="og:image" content="https://waveforge-pro-one.vercel.app/og-live.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Live DropZone DJ 🎧" />
        <meta name="twitter:description" content="Rejoins la scène, mixe en direct et partage ta passion." />
        <meta name="twitter:image" content="https://waveforge-pro-one.vercel.app/og-live.jpg" />
      </Helmet>

      {/* ==================================================== */}
      {/* 1. HERO SECTION                                      */}
      {/* ==================================================== */}
      <section style={{ padding: isMobile ? '32px 20px 0' : '48px 24px 0', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 40 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            
            {/* Badge Live */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              background: '#1e1e1e',
              border: '1px solid #2a2a2a',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              color: '#ccc',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3366', animation: 'pulse 1.5s infinite' }} />
              En direct
            </div>

            <h1 style={{
              fontSize: isMobile ? 36 : 52,
              fontWeight: 700,
              lineHeight: 1.1,
              margin: '0 0 24px 0',
              color: '#fff',
              letterSpacing: '-1px',
            }}>
              Prenez les commandes.
            </h1>
            
            <p style={{
              fontSize: isMobile ? 15 : 16,
              color: '#999',
              maxWidth: 540,
              margin: '0 0 40px 0',
              lineHeight: 1.6,
            }}>
              Rejoignez la scène DropZone. Diffusez vos sets en direct, partagez votre passion avec la communauté et faites découvrir votre univers musical.
            </p>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setShowSetup(true);
                  document.getElementById('setup-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  padding: '12px 24px',
                  background: '#fff',
                  color: '#000',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e0e0e0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                Commencer à mixer
              </button>
              
              {/* ✅ Bouton Partager */}
              <button
                onClick={handleShare}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: '#fff',
                  border: '1px solid #333',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1e1e1e'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Partager
              </button>
            </div>
          </div>

          {/* Stats discrètes */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: isMobile ? 10 : 0 }}>
             <div style={{ borderLeft: '2px solid #333', paddingLeft: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>24/7</div>
                <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginTop: 4 }}>Antenne ouverte</div>
             </div>
             <div style={{ borderLeft: '2px solid #333', paddingLeft: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>HD</div>
                <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginTop: 4 }}>Qualité Audio</div>
             </div>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 2. LE PLAYER & LE CHAT                               */}
      {/* ==================================================== */}
      <section style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : (chatVisible ? '1fr 320px' : '1fr'),
          gap: 16,
          transition: 'all 0.3s ease',
        }}>
          {/* Lecteur Vidéo */}
          <div style={{
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #2a2a2a',
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
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            />
          </div>

          {/* Chat */}
          {chatVisible && (
            <div style={{
              height: isMobile ? 400 : 'auto',
              display: 'flex',
              flexDirection: 'column',
              background: '#181818',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a2a', background: '#1e1e1e', fontWeight: 500, fontSize: 12, color: '#ccc' }}>
                Chat en direct
              </div>
              <LiveChat roomId="waveforgepro" />
            </div>
          )}
        </div>

        {/* Barre d'actions sous le lecteur */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 8 }}>
             <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3366' }} />
             En direct sur DropZone
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {!isMobile && (
              <button
                onClick={() => setChatVisible(!chatVisible)}
                style={{
                  fontSize: 12, color: '#aaa', background: 'transparent',
                  border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline'
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
                fontWeight: 500,
              }}
            >
              Ouvrir sur Tviply →
            </a>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 3. POURQUOI MIXER ICI                                */}
      {/* ==================================================== */}
      <section style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 20px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 32, color: '#fff' }}>Pourquoi mixer sur DropZone ?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { title: 'Outils intégrés', desc: 'Profitez de notre suite de Mastering et de nos outils pour peaufiner votre son.' },
            { title: 'Communauté active', desc: 'Une audience de passionnés prête à écouter vos meilleurs sets.' },
            { title: 'Setup simple', desc: 'Connectez votre logiciel en quelques minutes avec notre clé RTMP.' }
          ].map((item, i) => (
            <div key={i} style={{ padding: '24px 0', borderTop: '1px solid #2a2a2a' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px 0', color: '#fff' }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================================================== */}
      {/* 4. SETUP TECHNIQUE                                   */}
      {/* ==================================================== */}
      <section id="setup-section" style={{ maxWidth: 800, margin: '0 auto', width: '100%', padding: '0 20px' }}>
        
        {!showSetup && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              onClick={() => setShowSetup(true)}
              style={{
                background: 'transparent',
                border: '1px solid #333',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1e1e1e'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Afficher la configuration technique
            </button>
          </div>
        )}

        {showSetup && (
          <div style={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 8, padding: isMobile ? 20 : 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Configuration OBS / Streamlabs</h2>
              <button onClick={() => setShowSetup(false)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
              Dans les paramètres de diffusion de votre logiciel, sélectionnez "Personnalisé" et entrez les informations suivantes :
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Hôte RTMP */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#aaa', marginBottom: 8 }}>Serveur (RTMP URL)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    type="text" 
                    readOnly 
                    value={rtmpUrl} 
                    style={{ flex: 1, padding: '10px 12px', background: '#121212', border: '1px solid #333', borderRadius: 4, fontSize: 13, color: '#fff', fontFamily: 'monospace' }} 
                  />
                  <button onClick={() => copyToClipboard(rtmpUrl, 'URL copiée !')} style={{ padding: '0 16px', background: '#2a2a2a', border: '1px solid #444', color: '#fff', borderRadius: 4, cursor: 'pointer', fontWeight: 500, fontSize: 12 }}>Copier</button>
                </div>
              </div>

              {/* Stream Key */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#aaa', marginBottom: 8 }}>Clé de flux (Stream Key)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    type="password" 
                    readOnly 
                    value={streamKey} 
                    style={{ flex: 1, padding: '10px 12px', background: '#121212', border: '1px solid #333', borderRadius: 4, fontSize: 13, color: '#fff', fontFamily: 'monospace' }} 
                  />
                  <button onClick={() => copyToClipboard(streamKey, 'Clé copiée !')} style={{ padding: '0 16px', background: '#fff', border: 'none', color: '#000', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Copier</button>
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: '#888' }}>
                  Ne partagez jamais cette clé.
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

    </div>
  );
};