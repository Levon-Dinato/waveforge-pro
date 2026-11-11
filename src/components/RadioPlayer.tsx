// src/components/RadioPlayer.tsx
import React from 'react';
import { useRadio } from '../contexts/RadioContext';
import { useTheme } from '../contexts/ThemeContext';

interface RadioPlayerProps {
  profile: any;
  visualizerColor: string;
  iconColor: string;
  isMobile?: boolean;
}

export const RadioPlayer: React.FC<RadioPlayerProps> = ({ profile, visualizerColor, iconColor, isMobile }) => {
  const { currentTrack, isPlaying, progress, duration, togglePlay, playNext, playPrev, seek, isLive } = useRadio();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const size = isMobile ? 240 : 320;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = duration > 0 ? circumference - (progress / duration) * circumference : circumference;
  
  const totalBars = 240; 
  const visualizerBars = Array.from({ length: totalBars }).map((_, i) => i);
  const dynamicGradient = `linear-gradient(to top, ${visualizerColor}40, ${visualizerColor})`;

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    return `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
  };

  if (isLive) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${visualizerColor}, ${visualizerColor}80)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 80px ${visualizerColor}90`, animation: 'pulse 3s infinite' }}>
          <div style={{ fontSize: 90 }}>🎙️</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: iconColor, letterSpacing: '3px', marginTop: 10 }}>LIVE</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px 0' }}>Live Set</h2>
          <p style={{ color: isDark ? '#888' : '#666', fontSize: 15 }}>{profile?.username} est en direct</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 30, padding: 20 }}>
        
        <div style={{ position: 'absolute', width: size + 40, height: size + 40, borderRadius: '50%', background: `radial-gradient(circle, ${visualizerColor}40 0%, transparent 60%)`, filter: 'blur(30px)', animation: isPlaying ? 'pulseGlow 2s infinite' : 'none' }} />
        
        <div className="circular-visualizer" style={{ position: 'absolute', width: size, height: size, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 3 }}>
          {visualizerBars.map((_, i) => {
            const angle = (i * 360) / totalBars;
            return (
              <div key={i} className="visualizer-bar-wrapper" style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: 45, marginLeft: -3, marginTop: -22.5, transformOrigin: 'center center', transform: `rotate(${angle}deg) translateY(-${size / 2}px)` }}>
                <div className="visualizer-bar" style={{ width: '100%', height: '100%', background: dynamicGradient, borderRadius: 4, transformOrigin: 'bottom center', boxShadow: `0 0 12px ${visualizerColor}90`, animation: `beatCircle ${0.4 + Math.random() * 0.4}s ease-in-out infinite alternate`, animationDelay: `-${Math.random() * 0.5}s`, animationPlayState: isPlaying ? 'running' : 'paused' }} />
              </div>
            );
          })}
        </div>

        <svg width={size + 40} height={size + 40} style={{ position: 'absolute', transform: 'rotate(-90deg)', zIndex: 3 }}>
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={visualizerColor} />
              <stop offset="100%" stopColor={visualizerColor} stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <circle cx={(size + 40) / 2} cy={(size + 40) / 2} r={radius + 20} stroke="url(#progressGradient)" strokeWidth={3} fill="none" strokeDasharray={circumference + 100} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.1s linear', filter: `drop-shadow(0 0 10px ${visualizerColor}90)` }} />
        </svg>
        <input type="range" min={0} max={duration || 100} value={progress} onChange={(e) => seek(Number(e.target.value))} style={{ position: 'absolute', width: size + 40, height: size + 40, opacity: 0, cursor: 'pointer', zIndex: 10, transform: 'rotate(-90deg)' }} />
        
        <div className="vinyl-container" style={{ position: 'relative', width: size, height: size, borderRadius: '50%', background: '#000', boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4 }}>
          <img src={currentTrack?.cover_url || profile?.avatar_url || 'https://via.placeholder.com/300'} alt="Cover" className="vinyl-spin" style={{ width: size - 80, height: size - 80, borderRadius: '50%', objectFit: 'cover', animation: 'spin 4s linear infinite', animationPlayState: isPlaying ? 'running' : 'paused', border: '4px solid rgba(255,255,255,0.1)' }} />
          <div className="vinyl-grooves" style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none', background: 'repeating-radial-gradient(circle, transparent, transparent 2px, rgba(255,255,255,0.03) 3px, transparent 4px)' }} />
          <div className="vinyl-label" style={{ position: 'absolute', width: 50, height: 50, borderRadius: '50%', background: isDark ? '#05050a' : '#fff', border: '3px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}>
            <div className="vinyl-hole" style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', boxShadow: '0 0 10px #fff' }} />
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20, width: '100%' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentTrack?.title || 'En attente'}
        </h1>
        <p style={{ color: isDark ? '#888' : '#666', fontSize: 15, margin: 0, fontWeight: 600 }}>
          {currentTrack?.artist || 'DropZone Radio'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 280, fontSize: 12, color: isDark ? '#888' : '#666', fontWeight: 800 }}>
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          <button onClick={playPrev} style={{ background: 'transparent', border: 'none', color: isDark ? '#fff' : '#000', cursor: 'pointer', opacity: 0.8 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"></line></svg></button>
          
          <button onClick={togglePlay} style={{ width: 70, height: 70, borderRadius: '50%', background: visualizerColor, color: iconColor, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 15px 30px ${visualizerColor}60`, transition: 'all 0.2s', transform: isPlaying ? 'scale(1)' : 'scale(0.98)' }}>
            {isPlaying ? <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> : <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 4 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
          </button>

          <button onClick={playNext} style={{ background: 'transparent', border: 'none', color: isDark ? '#fff' : '#000', cursor: 'pointer', opacity: 0.8 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"></line></svg></button>
        </div>
      </div>
    </div>
  );
};