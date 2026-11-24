// src/pages/LivePage.tsx
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../contexts/ThemeContext'; // ✅ IMPORT DU THEME
import { LiveChat } from '../components/LiveChat';
import { useTranslation } from 'react-i18next';

export const LivePage = () => {
  const isMobile = useIsMobile(768);
  
  // ✅ RÉCUPÉRATION DU THÈME
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t } = useTranslation();

  const [chatVisible, setChatVisible] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  const rtmpUrl = 'rtmp://live.tviply.com/stream';
  const streamKey = '6n9kjjb7qw4ko4w4ock';
  const tviplyEmbedUrl = 'https://tviply.com/elektraq/embed';
  const tviplyChannelUrl = 'https://tviply.com/elektraq';
  
  // URL à partager
  const liveShareUrl = window.location.origin + '/live';

  // ✅ PALETTE DE COULEURS DYNAMIQUES
  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7',
    panelBg: isDark ? '#181818' : '#ffffff',
    border: isDark ? '#2a2a2a' : '#e5e7eb',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#999999' : '#666666',
    inputBg: isDark ? '#121212' : '#f3f4f6',
    btnPrimaryBg: isDark ? '#ffffff' : '#1a1a1a',
    btnPrimaryText: isDark ? '#000000' : '#ffffff',
    hoverBg: isDark ? '#1e1e1e' : '#f0f0f0',
    badgeBg: isDark ? '#1e1e1e' : '#e5e7eb',
    badgeText: isDark ? '#cccccc' : '#666666',
  };

  const copyToClipboard = async (text: string, message = t('live.copied')) => {
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

  // ✅ Fonction de partage native (Intacte)
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ELEKTRAQ Live 🎧',
          text: t('live.share_text'),
          url: liveShareUrl,
        });
      } catch (err) {
        console.log('Partage annulé');
      }
    } else {
      copyToClipboard(liveShareUrl, t('live.live_link_copied'));
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 32 : 48,
      paddingBottom: 80,
      fontFamily: 'Inter, sans-serif',
      background: colors.bg, // ✅ Couleur dynamique
      minHeight: '100vh',
      color: colors.textMain, // ✅ Couleur dynamique
      transition: 'background 0.3s ease, color 0.3s ease'
    }}>

      {/* ✅ METADONNÉES POUR LE PARTAGE (Facebook, Twitter, Discord, etc.) */}
      <Helmet>
        <title>Live ELEKTRAQ 🎧 - Prends l'antenne</title>
        
        {/* Open Graph (Facebook, Discord, WhatsApp) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ELEKTRAQ" />
        <meta property="og:title" content="Live ELEKTRAQ 🎧" />
        <meta property="og:description" content="Rejoins la scène, mixe en direct et partage ta passion avec la communauté." />
        <meta property="og:url" content={liveShareUrl} />
        <meta property="og:image" content="https://elektraq.dj/og-live.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Live ELEKTRAQ 🎧" />
        <meta name="twitter:description" content="Rejoins la scène, mixe en direct et partage ta passion." />
        <meta name="twitter:image" content="https://elektraq.dj/og-live.jpg" />
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
              background: colors.badgeBg, // ✅ Couleur dynamique
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              color: colors.badgeText,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#b0b0b0', animation: 'pulse 1.5s infinite' }} />
              {t('live.badge')}
            </div>

            <h1 style={{
              fontSize: isMobile ? 36 : 52,
              fontWeight: 700,
              lineHeight: 1.1,
              margin: '0 0 24px 0',
              color: colors.textMain, // ✅ Couleur dynamique
              letterSpacing: '-1px',
            }}>
              {t('live.title')}
            </h1>
            
            <p style={{
              fontSize: isMobile ? 15 : 16,
              color: colors.textMuted, // ✅ Couleur dynamique
              maxWidth: 540,
              margin: '0 0 40px 0',
              lineHeight: 1.6,
            }}>
              {t('live.subtitle')}
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
                  background: colors.btnPrimaryBg, // ✅ Couleur dynamique
                  color: colors.btnPrimaryText, // ✅ Couleur dynamique
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {t('live.start')}
              </button>
              
              {/* ✅ Bouton Partager */}
              <button
                onClick={handleShare}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: colors.textMain, // ✅ Couleur dynamique
                  border: `1px solid ${colors.border}`, // ✅ Couleur dynamique
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                {t('live.share')}
              </button>
            </div>
          </div>

          {/* Stats discrètes */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: isMobile ? 10 : 0 }}>
             <div style={{ borderLeft: `2px solid ${colors.border}`, paddingLeft: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: colors.textMain }}>24/7</div>
                <div style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', marginTop: 4 }}>{t('live.open_air')}</div>
             </div>
             <div style={{ borderLeft: `2px solid ${colors.border}`, paddingLeft: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: colors.textMain }}>HD</div>
                <div style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', marginTop: 4 }}>{t('live.audio_quality')}</div>
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
            border: `1px solid ${colors.border}`, // ✅ Couleur dynamique
            background: '#000', // Reste noir pour la vidéo
            position: 'relative',
          }}>
            <iframe
              src={tviplyEmbedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              title="ELEKTRAQ - Live"
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
              background: colors.panelBg, // ✅ Couleur dynamique
              border: `1px solid ${colors.border}`, // ✅ Couleur dynamique
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, background: colors.hoverBg, fontWeight: 500, fontSize: 12, color: colors.textMuted }}>
                {t('live.chat')}
              </div>
              <LiveChat roomId="waveforgepro" />
            </div>
          )}
        </div>

        {/* Barre d'actions sous le lecteur */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 12, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}>
             <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#b0b0b0' }} />
             {t('live.live_on')}
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {!isMobile && (
              <button
                onClick={() => setChatVisible(!chatVisible)}
                style={{
                  fontSize: 12, color: colors.textMuted, background: 'transparent',
                  border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline'
                }}
              >
                {chatVisible ? t('live.hide_chat') : t('live.show_chat')}
              </button>
            )}
            <a
              href={tviplyChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              {t('live.open_tviply')}
            </a>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 3. POURQUOI MIXER ICI                                */}
      {/* ==================================================== */}
      <section style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 20px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 32, color: colors.textMain }}>{t('live.why_title')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { title: t('live.why1_title'), desc: t('live.why1_desc') },
            { title: t('live.why2_title'), desc: t('live.why2_desc') },
            { title: t('live.why3_title'), desc: t('live.why3_desc') }
          ].map((item, i) => (
            <div key={i} style={{ padding: '24px 0', borderTop: `1px solid ${colors.border}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px 0', color: colors.textMain }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
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
                border: `1px solid ${colors.border}`,
                color: colors.textMain,
                padding: '12px 24px',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {t('live.show_setup')}
            </button>
          </div>
        )}

        {showSetup && (
          <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: isMobile ? 20 : 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: colors.textMain }}>{t('live.setup_title')}</h2>
              <button onClick={() => setShowSetup(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 24, lineHeight: 1.6 }}>
              Dans les paramètres de diffusion de votre logiciel, sélectionnez "Personnalisé" et entrez les informations suivantes :
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Hôte RTMP */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 8 }}>{t('live.server')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    type="text" 
                    readOnly 
                    value={rtmpUrl} 
                    style={{ flex: 1, padding: '10px 12px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 13, color: colors.textMain, fontFamily: 'monospace' }} 
                  />
                  <button onClick={() => copyToClipboard(rtmpUrl, t('live.url_copied'))} style={{ padding: '0 16px', background: colors.hoverBg, border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 4, cursor: 'pointer', fontWeight: 500, fontSize: 12 }}>{t('live.copy')}</button>
                </div>
              </div>

              {/* Stream Key */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 8 }}>{t('live.stream_key')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    type="password" 
                    readOnly 
                    value={streamKey} 
                    style={{ flex: 1, padding: '10px 12px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 13, color: colors.textMain, fontFamily: 'monospace' }} 
                  />
                  <button onClick={() => copyToClipboard(streamKey, t('live.key_copied'))} style={{ padding: '0 16px', background: colors.btnPrimaryBg, border: 'none', color: colors.btnPrimaryText, borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>{t('live.copy')}</button>
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: colors.textMuted }}>
                  {t('live.never_share')}
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