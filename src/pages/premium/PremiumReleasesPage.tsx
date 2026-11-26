// src/pages/premium/PremiumReleasesPage.tsx
import React, { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { SpotifyPlayer } from '../../components/SpotifyPlayer';

export const PremiumReleasesPage: React.FC = () => {
  const { profile, settings, tracks, colors, isMobile, themeColor, showReleases, isOwner, currentTrack, isPlaying, handlePlayTrack, handleDownload, setShowUploadModal } = useOutletContext<any>();
  const [visibleTracksCount, setVisibleTracksCount] = useState(4);

  if (!showReleases) return <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', width: '100%', boxSizing: 'border-box', color: colors.textMuted }}>Aucune sortie pour le moment.</div>;

  const IconMusic = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
  );

  const formatDuration = (s: number) => {
    if (!s || isNaN(s)) return '--:--';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '32px 16px 80px' : '64px 24px 100px', width: '100%', boxSizing: 'border-box' }}>

      {/* En-tête de section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: isMobile ? 28 : 40 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${themeColor}15`, border: `1px solid ${themeColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: themeColor, flexShrink: 0 }}>
          {IconMusic}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="section-subtitle" style={{ marginBottom: 4 }}>Musique</div>
          <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: colors.textMain }}>{settings.releases_title || 'Dernières Sorties'}</h1>
        </div>
        {isOwner && (
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={() => setShowUploadModal(true)} style={{ padding: '10px 16px', background: themeColor, color: '#000', borderRadius: 8, fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: `0 4px 15px ${themeColor}40` }}>
              + Nouveau son
            </button>
            <Link to="/settings" style={{ padding: '10px 16px', color: themeColor, fontSize: 12, fontWeight: 800, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px', border: `1px solid ${themeColor}40`, borderRadius: 8, display: 'flex', alignItems: 'center' }}>Gérer</Link>
          </div>
        )}
      </div>

      {/* Spotify */}
      {profile.spotify_url && (
        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 16,
          padding: isMobile ? 16 : 20,
          marginBottom: isMobile ? 24 : 32,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: colors.textMain, margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: themeColor }} /> Écouter sur Spotify
          </h3>
          <SpotifyPlayer url={profile.spotify_url} height={352} />
        </div>
      )}

      {/* Liste des tracks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tracks.length > 0 ? tracks.slice(0, visibleTracksCount).map((track, index) => {
          const isThisPlaying = currentTrack?.id === track.id && isPlaying;
          return (
            <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16, padding: isMobile ? '10px 12px' : '12px 16px', background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, transition: 'border-color 0.2s, background 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${themeColor}40`; e.currentTarget.style.background = `${themeColor}06`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.cardBorder; e.currentTarget.style.background = colors.cardBg; }}
            >
              <span style={{ fontSize: 13, fontWeight: 800, color: colors.textMuted, width: 22, textAlign: 'center', flexShrink: 0, fontFamily: 'monospace' }}>{index + 1}</span>

              <button onClick={() => handlePlayTrack(track)} style={{ width: 40, height: 40, borderRadius: '50%', background: themeColor, color: '#000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 14px ${themeColor}30`, transition: 'transform 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                {isThisPlaying ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                )}
              </button>

              <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.inputBg, border: `1px solid ${colors.border}` }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}{track.genre ? ` · ${track.genre}` : ''}</div>
              </div>

              {!isMobile && (
                <>
                  {track.bpm ? <span style={{ fontSize: 11, fontWeight: 700, color: themeColor, background: `${themeColor}12`, border: `1px solid ${themeColor}30`, padding: '3px 8px', borderRadius: 6, fontFamily: 'monospace', flexShrink: 0 }}>{track.bpm} BPM</span> : null}
                  {track.song_key ? <span style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, background: colors.inputBg, border: `1px solid ${colors.border}`, padding: '3px 8px', borderRadius: 6, fontFamily: 'monospace', flexShrink: 0 }}>{track.song_key}</span> : null}
                  <span style={{ fontSize: 12, color: colors.textMuted, width: 44, textAlign: 'right', flexShrink: 0, fontFamily: 'monospace' }}>{formatDuration(track.duration)}</span>
                </>
              )}

              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {track.purchase_url && <a href={track.purchase_url} target="_blank" rel="noopener noreferrer" style={{ padding: '7px 12px', border: `1px solid ${themeColor}`, color: themeColor, borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>Acheter</a>}
                {track.is_downloadable !== false && <button onClick={(e) => handleDownload(e, track.audio_url, `${track.artist} - ${track.title}.mp3`, track.id)} style={{ padding: '7px 12px', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Télécharger</button>}
              </div>
            </div>
          );
        }) : (
          <div style={{ color: colors.textMuted, padding: 40, border: `1px dashed ${colors.border}`, borderRadius: 16, textAlign: 'center' }}>
            Aucun son pour le moment.
          </div>
        )}

        {tracks.length > visibleTracksCount && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => setVisibleTracksCount(prev => prev + 4)} style={{ background: 'transparent', border: `1px solid ${themeColor}`, color: themeColor, padding: '12px 32px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = `${themeColor}12`}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Voir plus de sons
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
