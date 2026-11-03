// src/components/ArtistToolkit.tsx
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Icons = {
  link: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>,
  image: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
  music: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  globe: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
  shield: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  chart: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  close: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
};

export const ArtistToolkit: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();

  // ✅ État pour gérer la modale active
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // ✅ États pour les formulaires dans les modales
  const [smartLinkData, setSmartLinkData] = useState({ title: '', url: '' });
  const [promoData, setPromoData] = useState({ title: '', coverUrl: '', artistName: '' });
  const [pitchData, setPitchData] = useState({ title: '', url: '', message: '' });

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.6)' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    cardBg: isDark ? '#121212' : '#ffffff',
    accent: '#00d9ff',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
    modalBg: isDark ? '#121212' : '#ffffff',
  };

  const TOOLS = [
    {
      id: 'smartlink',
      icon: Icons.link,
      title: "Smart Link",
      desc: "Créez un lien unique pour regrouper toutes vos plateformes (Spotify, Apple, etc.).",
      color: '#3b82f6', // Bleu
    },
    {
      id: 'promo',
      icon: Icons.image,
      title: "Cartes Promo",
      desc: "Générez de belles images (format Instagram) avec la pochette de votre son.",
      color: '#ec4899', // Rose
    },
    {
      id: 'pitch',
      icon: Icons.music,
      title: "Pitch Playlist",
      desc: "Soumettez votre son pour une chance d'être ajouté à la playlist officielle DropZone.",
      color: '#f97316', // Orange
    },
    {
      id: 'premium',
      icon: Icons.globe,
      title: "Ma Page Premium",
      desc: "Personnalisez votre page artiste, vos couleurs et vos modules.",
      color: '#00d9ff', // Cyan DropZone
    },
    {
      id: 'stats',
      icon: Icons.chart,
      title: "Mes Statistiques",
      desc: "Consultez vos vues, écoutes et téléchargements en temps réel.",
      color: '#8b5cf6', // Violet
    },
    {
      id: 'support',
      icon: Icons.shield,
      title: "Support Prioritaire",
      desc: "Un problème ? Une question ? Contactez directement l'équipe DropZone.",
      color: '#10b981', // Vert
    }
  ];

  const handleToolClick = (toolId: string) => {
    if (!user) {
      alert("🔒 Connectez-vous pour accéder aux outils artistes.");
      navigate('/auth');
      return;
    }

    if (toolId === 'premium') {
      navigate('/settings');
    } else if (toolId === 'stats') {
      navigate(`/premium/${user.user_metadata?.username || user.id}`);
    } else if (toolId === 'support') {
      window.location.href = "mailto:support@dropzone.dj";
    } else {
      setActiveModal(toolId);
    }
  };

  const closeModal = () => setActiveModal(null);

  // --- FONCTIONS DE SOUMISSION ---
  const handleGenerateLink = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = smartLinkData.title.toLowerCase().replace(/\s+/g, '-');
    alert(`Lien généré : dropzone.dj/link/${user?.id}/${slug}\n(Copiez-le et partagez-le !)`);
    setActiveModal(null);
  };

  const handleGenerateImage = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Fonctionnalité d'export d'image en cours de développement. Voici l'aperçu !");
  };

  const handlePitchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Votre son a été soumis à notre équipe A&R ! Nous reviendrons vers vous rapidement.");
    setPitchData({ title: '', url: '', message: '' });
    setActiveModal(null);
  };

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px', position: 'relative' }}>
      
      <div style={{ textAlign: 'center', marginBottom: 50 }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: colors.accent, marginBottom: 12 }}>
          DropZone Pro
        </div>
        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: colors.textMain, letterSpacing: '-1px', margin: 0 }}>
          La boîte à outils de l'artiste
        </h2>
        <p style={{ color: colors.textMuted, fontSize: 16, marginTop: 16, maxWidth: 600, margin: '16px auto 0' }}>
          Tout ce dont vous avez besoin pour propulser votre carrière, centralisé au même endroit.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        {TOOLS.map((tool, index) => (
          <div 
            key={index}
            onClick={() => handleToolClick(tool.id)}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = tool.color;
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = `0 10px 30px ${tool.color}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: `${tool.color}15`, color: tool.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              {tool.icon}
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, color: tool.color, margin: '0 0 12px 0', lineHeight: 1.3 }}>
              {tool.title}
            </h3>

            <p style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.6, margin: 0 }}>
              {tool.desc}
            </p>
            
            <div style={{ marginTop: 20, fontSize: 12, fontWeight: 800, color: colors.textMain, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5 }}>
              Cliquer pour ouvrir →
            </div>
          </div>
        ))}
      </div>

      {/* ✅ MODALES D'OUTILS */}
      {activeModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={closeModal}>
          <div style={{ background: colors.modalBg, border: `1px solid ${colors.border}`, borderRadius: 24, padding: 32, width: '100%', maxWidth: 500, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            
            <button onClick={closeModal} style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer' }}>
              {Icons.close}
            </button>

            {/* MODALE SMART LINK */}
            {activeModal === 'smartlink' && (
              <form onSubmit={handleGenerateLink}>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: colors.textMain, marginBottom: 8 }}>Créer un Smart Link</h2>
                <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 24 }}>Regroupez tous vos liens (Spotify, Apple, SoundCloud) sur une seule page.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 8, fontWeight: 700 }}>Titre du morceau</label>
                    <input type="text" required value={smartLinkData.title} onChange={e => setSmartLinkData({...smartLinkData, title: e.target.value})} style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} placeholder="Ex: My New Track" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 8, fontWeight: 700 }}>Lien principal (Spotify, etc.)</label>
                    <input type="url" required value={smartLinkData.url} onChange={e => setSmartLinkData({...smartLinkData, url: e.target.value})} style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} placeholder="https://open.spotify.com/..." />
                  </div>
                  <button type="submit" style={{ marginTop: 10, padding: 16, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>Générer mon lien</button>
                </div>
              </form>
            )}

            {/* MODALE CARTES PROMO */}
            {activeModal === 'promo' && (
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: colors.textMain, marginBottom: 8 }}>Générateur de Cartes</h2>
                <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 24 }}>Un aperçu de votre cover au format Instagram.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                  {/* Aperçu de la carte */}
                  <div style={{ width: 250, height: 250, background: '#111', borderRadius: 12, overflow: 'hidden', position: 'relative', border: `1px solid ${colors.border}` }}>
                    {promoData.coverUrl ? (
                      <img src={promoData.coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>Aperçu de l'image</div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, background: 'linear-gradient(transparent, rgba(0,0,0,0.9))' }}>
                      <div style={{ color: '#fff', fontSize: 16, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{promoData.title || 'Titre du son'}</div>
                      <div style={{ color: '#00d9ff', fontSize: 12, fontWeight: 700 }}>{promoData.artistName || 'Nom de l\'artiste'}</div>
                    </div>
                  </div>

                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input type="text" placeholder="Titre du son" value={promoData.title} onChange={e => setPromoData({...promoData, title: e.target.value})} style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                    <input type="text" placeholder="Nom de l'artiste" value={promoData.artistName} onChange={e => setPromoData({...promoData, artistName: e.target.value})} style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                    <input type="url" placeholder="URL de la cover (optionnel)" value={promoData.coverUrl} onChange={e => setPromoData({...promoData, coverUrl: e.target.value})} style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                    
                    <button onClick={handleGenerateImage} style={{ marginTop: 10, padding: 16, background: '#ec4899', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>Télécharger l'image</button>
                  </div>
                </div>
              </div>
            )}

            {/* MODALE PITCH PLAYLIST */}
            {activeModal === 'pitch' && (
              <form onSubmit={handlePitchSubmit}>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: colors.textMain, marginBottom: 8 }}>Pitch Playlist</h2>
                <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 24 }}>Soumettez votre son à notre équipe éditoriale.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 8, fontWeight: 700 }}>Titre du son</label>
                    <input type="text" required value={pitchData.title} onChange={e => setPitchData({...pitchData, title: e.target.value})} style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} placeholder="Titre de votre track" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 8, fontWeight: 700 }}>Lien d'écoute (SoundCloud, Drive...)</label>
                    <input type="url" required value={pitchData.url} onChange={e => setPitchData({...pitchData, url: e.target.value})} style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} placeholder="https://..." />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 8, fontWeight: 700 }}>Message (Optionnel)</label>
                    <textarea rows={3} value={pitchData.message} onChange={e => setPitchData({...pitchData, message: e.target.value})} style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, resize: 'vertical' }} placeholder="Pourquoi ce son correspond à DropZone ?" />
                  </div>
                  <button type="submit" style={{ marginTop: 10, padding: 16, background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>Envoyer le pitch</button>
                </div>
              </form>
            )}

          </div>
        </div>,
        document.body
      )}

    </section>
  );
};