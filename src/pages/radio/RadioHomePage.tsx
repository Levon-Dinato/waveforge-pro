// src/pages/radio/RadioHomePage.tsx
import React from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';
import { ParticleCanvas } from '../../components/ParticleCanvas';

export const RadioHomePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const isMobile = useIsMobile(768);
  
  const { profile, radioTracks, nowPlaying, topTracks, latestReleases, schedules, listeners, colors, visualizerColor, socials, coverImage, totalLikes, SocialLink } = useOutletContext<any>();

  return (
    <>
      <section style={{ position: 'relative', padding: isMobile ? '60px 20px 40px' : '90px 40px 60px', overflow: 'hidden' }}>
        <ParticleCanvas accent={`${visualizerColor}cc`} accent2="rgba(124,92,255,0.6)" />
        <div style={{ position: 'relative', zIndex: 3, maxWidth: 1300, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 40, alignItems: 'center' }}>
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
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
              <Link to={`/player/${username}`} target="_blank" className="rp-btn-3d" style={{ background: `linear-gradient(135deg, ${visualizerColor}, #7c5cff)`, color: '#fff', border: 'none', padding: '16px 32px', borderRadius: 12, fontSize: 14, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Écouter maintenant
              </Link>
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
          {!isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', background: `radial-gradient(circle, ${visualizerColor}40 0%, transparent 65%)`, filter: 'blur(40px)' }} />
              <div className="rp-vinyl-spin" style={{ width: 320, height: 320, borderRadius: '50%', background: '#000', boxShadow: `0 30px 80px rgba(0,0,0,0.8), inset 0 0 40px rgba(255,255,255,0.1), 0 0 60px ${visualizerColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <img src={nowPlaying?.cover_url || coverImage} alt="Cover" style={{ width: 260, height: 260, borderRadius: '50%', objectFit: 'cover', border: '4px solid rgba(255,255,255,0.1)' }} />
                <div style={{ position: 'absolute', width: 50, height: 50, borderRadius: '50%', background: '#05050a', border: '3px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: visualizerColor, boxShadow: `0 0 15px ${visualizerColor}` }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 20px 80px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        <div className="rp-glass" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, borderBottom: `1px solid ${colors.border}`, paddingBottom: 14 }}>
            <div><h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px 0' }}>🏆 Top Tracks</h2><p style={{ fontSize: 12, color: colors.textMuted, margin: 0 }}>Les sons les plus likés</p></div>
            <Link to={`/radio/${username}/top`} style={{ color: visualizerColor, fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Voir tout →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topTracks.slice(0, 3).map((track: any, index: number) => {
              const pct = Math.max(10, (track.likes_count / (topTracks[0]?.likes_count || 1)) * 100);
              return (
                <div key={track.id} className="rp-hover-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 14, background: colors.card, border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: index === 0 ? visualizerColor : colors.textMuted, width: 32, textAlign: 'center' }}>{index + 1}</div>
                  <div style={{ width: 52, height: 52, borderRadius: 10, background: `url(${track.cover_url || 'https://via.placeholder.com/56'}) center/cover`, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{track.title}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{track.artist}</div>
                    <div style={{ marginTop: 8, width: '100%', height: 4, background: colors.border, borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: visualizerColor, borderRadius: 2 }} /></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: visualizerColor, fontWeight: 900 }}>❤️ {track.likes_count || 0}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rp-glass" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, borderBottom: `1px solid ${colors.border}`, paddingBottom: 14 }}>
            <div><h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px 0' }}>✨ Dernières Sorties</h2><p style={{ fontSize: 12, color: colors.textMuted, margin: 0 }}>Les nouveautés à ne pas manquer</p></div>
            <Link to={`/radio/${username}/nouveautes`} style={{ color: visualizerColor, fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Voir tout →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 140 : 170}px, 1fr))`, gap: 20 }}>
            {latestReleases.slice(0, 4).map((track: any) => (
              <div key={track.id} className="rp-hover-card">
                <div style={{ width: '100%', paddingTop: '100%', borderRadius: 14, background: `url(${track.cover_url || 'https://via.placeholder.com/180'}) center/cover`, boxShadow: '0 10px 25px rgba(0,0,0,0.35)' }} />
                <div style={{ marginTop: 12 }}><div style={{ fontSize: 13, fontWeight: 800 }}>{track.title}</div><div style={{ fontSize: 11, color: colors.textMuted }}>{track.artist}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="rp-glass" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, borderBottom: `1px solid ${colors.border}`, paddingBottom: 14 }}>
            <div><h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px 0' }}>📅 Programme</h2><p style={{ fontSize: 12, color: colors.textMuted, margin: 0 }}>Les prochains rendez-vous</p></div>
            <Link to={`/radio/${username}/programme`} style={{ color: visualizerColor, fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Voir tout →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {schedules.slice(0, 3).map((schedule: any) => (
              <div key={schedule.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: 12, borderRadius: 10, background: colors.card, border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: visualizerColor, background: `${visualizerColor}15`, padding: '6px 12px', borderRadius: 8 }}>{schedule.start_time.slice(0, 5)}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 800 }}>{schedule.title}</div><div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{schedule.playlists?.name || 'Mix'}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};