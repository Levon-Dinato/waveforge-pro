// src/pages/radio/RadioHomePage.tsx
import React from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useIsMobile } from '../../hooks/useIsMobile';
import { ParticleCanvas } from '../../components/ParticleCanvas';
import { useRadio } from '../../contexts/RadioContext';

export const RadioHomePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const isMobile = useIsMobile(768);
  const { isPlaying } = useRadio();
  
  const { 
    profile, radioTracks, nowPlaying, listeners, colors, visualizerColor, iconColor,
    socials, coverImage, totalLikes, SocialLink, recentTracks, handlePlayRadio 
  } = useOutletContext<any>();

  const marqueeItems = [
    `${profile.username.toUpperCase()}`, 
    `EN COURS : ${nowPlaying?.title || 'LIVE RADIO'}`, 
    `${totalLikes} LIKES`,
    `EN DIRECT`, 
    `${listeners} AUDITEURS`, 
    `${radioTracks.length} TRACKS`
  ];
  const repeatedItems = [...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems];

  const vinylSize = 300; 
  const totalBars = 140; 
  const barHeight = 30; 
  const offset = 2; 
  
  const visualizerBars = Array.from({ length: totalBars }).map((_, i) => i);
  const dynamicGradient = `linear-gradient(to top, ${visualizerColor}20, ${visualizerColor})`;

  const IconUser = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  );

  const IconHandshake = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34"></path><path d="M8 15.66 10.34 18a2 2 0 0 0 2.83 0l1.41-1.41a2 2 0 0 0 0-2.83L12 11.17a2 2 0 0 0-2.83 0L8 12.34"></path></svg>
  );

  return (
    <>
      <style>{`
        @keyframes beatCircle {
          0% { transform: scaleY(0.3); opacity: 0.5; }
          100% { transform: scaleY(1.2); opacity: 1; }
        }
      `}</style>

      <section style={{ position: 'relative', padding: isMobile ? '60px 20px 40px' : '90px 40px 60px', overflow: 'hidden' }}>
        <ParticleCanvas accent={`${visualizerColor}cc`} accent2="rgba(124,92,255,0.6)" />
        
        <div style={{ position: 'relative', zIndex: 3, maxWidth: 1300, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.3fr', gap: 40, alignItems: 'center' }}>
          
          {/* COLONNE GAUCHE : Texte */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 30, fontSize: 11, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: visualizerColor, background: `${visualizerColor}12`, border: `1px solid ${visualizerColor}40`, marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: visualizerColor, boxShadow: `0 0 10px ${visualizerColor}`, animation: 'pulseLive 2s infinite' }} /> En direct
            </div>
            <h1 style={{ fontSize: isMobile ? 36 : 60, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 20px 0' }}>
              {'Le son de '.split(' ').map((w, i) => (
                <React.Fragment key={i}><span style={{ display: 'inline-block' }}>{[...w].map((c, ci) => (<span key={ci} style={{ display: 'inline-block', opacity: 0, transform: 'translateY(24px)', animation: `letterIn 0.6s cubic-bezier(0.2,0.8,0.2,1) ${(i * 5 + ci) * 0.03}s forwards` }}>{c}</span>))}</span>{' '}</React.Fragment>
              ))}
              <span style={{ display: 'inline-block' }}>
                {[...profile.username].map((c: string, ci: number) => (<span key={ci} style={{ display: 'inline-block', opacity: 0, transform: 'translateY(24px)', animation: `letterIn 0.6s cubic-bezier(0.2,0.8,0.2,1) ${(15 + ci) * 0.03}s forwards`, background: `linear-gradient(135deg, ${visualizerColor}, #7c5cff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{c}</span>))}
              </span>
            </h1>
            <p style={{ fontSize: isMobile ? 14 : 17, color: colors.textMuted, marginBottom: 32, lineHeight: 1.6 }}>{profile.radio_instructions || 'Écoutez la meilleure sélection musicale, en direct et sans interruption.'}</p>
            
            {/* ✅ BOUTON PRINCIPAL HARMONISÉ */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40, alignItems: 'center' }}>
              <button 
                onClick={handlePlayRadio} 
                className="rp-btn-3d" 
                style={{ 
                  background: visualizerColor, 
                  color: iconColor, 
                  border: 'none', 
                  padding: '16px 32px', 
                  borderRadius: 12, 
                  fontSize: 14, 
                  fontWeight: 900, 
                  letterSpacing: '1px', 
                  textTransform: 'uppercase', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10 
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Écouter la radio
              </button>
              
              <div style={{ display: 'flex', gap: 8 }}>
                <SocialLink url={socials.instagram} name="Instagram" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>} />
                <SocialLink url={socials.tiktok} name="TikTok" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"></path></svg>} />
                <SocialLink url={socials.spotify} name="Spotify" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0z"/></svg>} />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, borderTop: `1px solid ${colors.border}`, paddingTop: 28, maxWidth: 460 }}>
              {[{ n: listeners, l: 'Auditeurs' }, { n: radioTracks.length, l: 'Titres' }, { n: totalLikes, l: 'Likes' }].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: 28, fontWeight: 900, background: `linear-gradient(135deg, ${visualizerColor}, #7c5cff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.n}</div>
                  <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginTop: 4 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* COLONNE DROITE : Vinyle + Déjà joués */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', width: vinylSize + 60, height: vinylSize + 60 }}>
                <div style={{ position: 'absolute', width: vinylSize + 40, height: vinylSize + 40, borderRadius: '50%', background: `radial-gradient(circle, ${visualizerColor}40 0%, transparent 65%)`, filter: 'blur(40px)' }} />
                
                <div style={{ position: 'absolute', width: vinylSize, height: vinylSize, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 3 }}>
                  {visualizerBars.map((_, i) => {
                    const angle = (i * 360) / totalBars;
                    const distance = (vinylSize / 2) + offset;
                    
                    return (
                      <div key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: barHeight, marginLeft: -1, marginTop: -(barHeight / 2), transformOrigin: 'center center', transform: `rotate(${angle}deg) translateY(-${distance}px)` }}>
                        <div style={{ 
                          width: '100%', height: '100%', background: dynamicGradient, borderRadius: 2, transformOrigin: 'bottom center', 
                          boxShadow: `0 0 10px ${visualizerColor}`, animationName: 'beatCircle', animationDuration: `${0.3 + Math.random() * 0.4}s`, 
                          animationDelay: `-${Math.random() * 0.5}s`, animationIterationCount: 'infinite', animationDirection: 'alternate', 
                          animationTimingFunction: 'ease-in-out', animationPlayState: isPlaying ? 'running' : 'paused' 
                        }} />
                      </div>
                    );
                  })}
                </div>

                <div className="rp-vinyl-spin" style={{ width: vinylSize, height: vinylSize, borderRadius: '50%', background: '#000', boxShadow: `0 30px 80px rgba(0,0,0,0.8), inset 0 0 40px rgba(255,255,255,0.1), 0 0 60px ${visualizerColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 4 }}>
                  <img src={nowPlaying?.cover_url || coverImage} alt="Cover" style={{ width: '82%', height: '82%', borderRadius: '50%', objectFit: 'cover', border: '4px solid rgba(255,255,255,0.1)' }} />
                  <div style={{ position: 'absolute', width: 40, height: 40, borderRadius: '50%', background: '#05050a', border: '3px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: visualizerColor, boxShadow: `0 0 15px ${visualizerColor}` }} />
                  </div>
                </div>
              </div>

              <div className="rp-glass" style={{ flexShrink: 0, width: 260, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', color: colors.textMuted, borderBottom: `1px solid ${colors.border}`, paddingBottom: 10 }}>
                  Déjà joués
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {recentTracks.length === 0 ? (
                    <div style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>Aucun historique pour le moment.</div>
                  ) : recentTracks.map((track: any) => (
                    <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={track.cover_url || 'https://via.placeholder.com/40'} alt="cover" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: colors.textMain }}>{track.title}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{ borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, padding: '18px 0', overflow: 'hidden', background: `${visualizerColor}05`, position: 'relative', zIndex: 2 }}>
        <motion.div style={{ display: 'flex', gap: 60, width: 'max-content' }} animate={{ x: ['0%', '-50%'] }} transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}>
          {repeatedItems.map((t, i) => (
            <span key={i} style={{ fontFamily: '"Space Grotesk", Inter, sans-serif', fontSize: 14, fontWeight: 700, color: colors.textMuted, letterSpacing: '2px', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 60 }}>
              {t} <span style={{ color: visualizerColor, fontSize: 10 }}>●</span>
            </span>
          ))}
        </motion.div>
      </div>

      {/* CARTES INFOS */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '40px 20px 80px' : '60px 40px 80px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 24, width: '100%', boxSizing: 'border-box' }}>
        
        <div className="rp-glass" style={{ padding: 24, background: `linear-gradient(145deg, ${visualizerColor}15, transparent 60%)`, border: `1px solid ${visualizerColor}30` }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: visualizerColor, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulseLive 1.5s infinite' }} /> En cours
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <img src={nowPlaying?.cover_url || coverImage} alt="Now playing" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', border: `2px solid ${visualizerColor}40` }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nowPlaying?.title || 'En attente'}</div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nowPlaying?.artist || 'DropZone Radio'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: colors.textMuted, fontWeight: 700 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> {listeners} auditeur{listeners > 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <button onClick={handlePlayRadio} className="rp-btn-3d" style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 18, padding: '12px', background: visualizerColor, color: iconColor, border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 12, cursor: 'pointer' }}>
            ▶ Écouter la radio
          </button>
        </div>

        <div className="rp-glass" style={{ padding: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: colors.textMain, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: visualizerColor }}>{IconUser}</span> À propos
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <img src={coverImage || 'https://via.placeholder.com/100'} alt="Avatar" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', border: `2px solid ${visualizerColor}40` }} />
            <div><div style={{ fontSize: 16, fontWeight: 900 }}>{profile.username}</div><div style={{ fontSize: 11, color: colors.textMuted }}>DJ / Producteur</div></div>
          </div>
          <p style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.6, margin: '0 0 16px 0' }}>{profile.bio ? (profile.bio.length > 140 ? profile.bio.substring(0, 140) + '...' : profile.bio) : 'Bienvenue sur ma radio !'}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <SocialLink url={socials.instagram} name="Instagram" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>} />
            <SocialLink url={socials.tiktok} name="TikTok" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"></path></svg>} />
            <SocialLink url={socials.spotify} name="Spotify" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0z"/></svg>} />
          </div>
        </div>

        <div className="rp-glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', border: `1px dashed ${colors.border}` }}>
          <div style={{ color: colors.textMuted, marginBottom: 12 }}>{IconHandshake}</div>
          <h3 style={{ fontSize: 14, fontWeight: 900, margin: '0 0 6px 0' }}>Espace Partenaire</h3>
          <p style={{ fontSize: 11, color: colors.textMuted, margin: '0 0 14px 0' }}>Ta pub vue par {listeners} auditeur{listeners > 1 ? 's' : ''}</p>
          <a href="#" style={{ display: 'inline-block', fontSize: 12, fontWeight: 800, color: visualizerColor, textDecoration: 'none', background: `${visualizerColor}15`, padding: '8px 16px', borderRadius: 8 }}>Devenir sponsor</a>
        </div>

      </div>
    </>
  );
};