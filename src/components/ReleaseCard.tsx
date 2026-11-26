import React from 'react';
import { Link } from 'react-router-dom';
import { CanvasWaveform } from './CanvasWaveform';

interface ReleaseCardProps {
  track: any;
  isDark: boolean;
  themeColor: string;
  colors: any;
  isCurrentTrack: boolean;
  isThisPlaying: boolean;
  isMobile: boolean;
  handlePlayTrack: (track: any) => void;
  handleDownload: (e: React.MouseEvent, url: string, filename: string, trackId: string) => void;
  seek: (ratio: number) => void;
  currentTime: number;
  duration: number;
  formatTime: (time: number) => string;
  isOwner: boolean;
}

export const ReleaseCard: React.FC<ReleaseCardProps> = ({
  track, isDark, themeColor, colors, isCurrentTrack, isThisPlaying, isMobile, 
  handlePlayTrack, handleDownload, seek, currentTime, duration, formatTime
}) => {
  const isPlayable = track.audio_url && track.audio_url.length > 0;
  const iframeSrc = track.embed_code ? (track.embed_code.match(/src=["'](.*?)["']/) ? track.embed_code.match(/src=["'](.*?)["']/)[1] : track.embed_code) : null;
  const isExternalEmbed = !!iframeSrc && (iframeSrc.includes('beatport.com') || iframeSrc.includes('traxsource.com') || iframeSrc.includes('audio.com') || iframeSrc.includes('spotify.com'));

  const hasCustomBg = !!track.player_bg_image_url || !!track.player_bg_color;
  const titleColor = hasCustomBg ? '#ffffff' : colors.textMain;
  const mutedColor = hasCustomBg ? 'rgba(255,255,255,0.7)' : colors.textMuted;
  const btnBorderColor = hasCustomBg ? 'rgba(255,255,255,0.3)' : colors.border;
  const btnTextColor = hasCustomBg ? '#ffffff' : colors.textMain;

  const bgStyle = track.player_bg_image_url
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${track.player_bg_image_url}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'transparent' }
    : { background: track.player_bg_color || colors.cardBg };

  if (isExternalEmbed) {
    const isAudioCom = iframeSrc?.includes('audio.com');
    return (
      <div className="premium-glow" style={{ background: 'transparent', padding: 2, borderRadius: 18, transition: 'transform 0.3s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
        <div style={{ ...bgStyle, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, overflow: 'hidden', padding: 24, backdropFilter: 'blur(20px)' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: colors.inputBg }}>
              {track.cover_url ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: titleColor, margin: 0 }}>{track.title}</h3>
              <div style={{ fontSize: 13, color: mutedColor, marginTop: 2 }}>{track.artist} • {track.genre}</div>
            </div>
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', background: 'transparent', width: '100%' }}>
            <iframe src={iframeSrc!} width="100%" height={isAudioCom ? "180" : "162"} frameBorder="0" scrolling="no" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-presentation" style={{ display: 'block', borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-glow" style={{ background: 'transparent', padding: 2, borderRadius: 18, transition: 'transform 0.3s, box-shadow 0.3s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 15px 40px ${themeColor}15`; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ ...bgStyle, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, overflow: 'hidden', padding: 24, backdropFilter: 'blur(20px)', boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
          
          <div style={{ position: 'relative', width: 120, height: 120, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: colors.inputBg }} onClick={() => handlePlayTrack(track)}>
            {track.cover_url ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isThisPlaying ? 1 : 0, transition: 'opacity 0.2s', cursor: 'pointer' }} className="play-overlay">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', boxShadow: `0 0 15px ${themeColor}80` }}>
                {isThisPlaying ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: titleColor, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</h3>
            <div style={{ fontSize: 14, color: mutedColor, marginTop: 4 }}>{track.artist} • {track.genre}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, fontSize: 12, color: mutedColor, fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                {track.plays || 0}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                {track.likes_count || track.likes || 0}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                {track.comments_count || 0}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {track.purchase_url && (
              <a href={track.purchase_url} target="_blank" rel="noopener noreferrer" style={{ background: 'transparent', border: `1px solid ${themeColor}`, color: themeColor, padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                Acheter
              </a>
            )}
            {track.is_downloadable !== false && (
              <button onClick={(e) => handleDownload(e, track.audio_url, `${track.artist} - ${track.title}.mp3`, track.id)} style={{ background: 'transparent', border: `1px solid ${btnBorderColor}`, color: btnTextColor, padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                Télécharger
              </button>
            )}
            
            {/* ✅ CORRECTION : Icône commentaire intégrée directement ici */}
            <Link to={`/track/${track.id}`} style={{ background: 'transparent', border: `1px solid ${btnBorderColor}`, color: btnTextColor, padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              {track.comments_count || 0}
            </Link>

            <button onClick={() => handlePlayTrack(track)} style={{ width: 48, height: 48, borderRadius: '50%', background: themeColor, border: 'none', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 0 20px ${themeColor}40` }}>
              {isThisPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              )}
            </button>
          </div>
        </div>
        
        {isPlayable && (
          <div style={{ padding: '0 4px', marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: mutedColor, fontFamily: 'monospace', fontWeight: 600 }}>
                {isCurrentTrack ? formatTime(currentTime) : '0:00'}
              </span>
              <span style={{ fontSize: 11, color: mutedColor, fontFamily: 'monospace', fontWeight: 600 }}>
                {isCurrentTrack ? formatTime(duration) : formatTime(track.duration)}
              </span>
            </div>
            <CanvasWaveform
              peaks={track.peaks || []}
              isPlaying={isThisPlaying}
              themeColor={themeColor}
              progress={isCurrentTrack ? (duration > 0 ? currentTime / duration : 0) : 0}
              isCurrent={isCurrentTrack}
              onSeek={(ratio) => {
                if (!isCurrentTrack) {
                  handlePlayTrack(track);
                  setTimeout(() => seek(ratio), 100);
                } else {
                  seek(ratio);
                }
              }}
              isMobile={isMobile}
              height={80}
            />
          </div>
        )}
      </div>
    </div>
  );
};