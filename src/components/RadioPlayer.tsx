// src/components/RadioPlayer.tsx
import React, { useState, useEffect } from 'react';
import { useRadio } from '../contexts/RadioContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface RadioPlayerProps {
  profile: any;
  visualizerColor: string;
  iconColor: string;
  isMobile?: boolean;
  compact?: boolean;
}

export const RadioPlayer: React.FC<RadioPlayerProps> = ({ profile, visualizerColor, iconColor, isMobile, compact }) => {
  const { currentTrack, isPlaying, progress, duration, togglePlay, isLive } = useRadio();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (currentTrack) {
      setLikeCount(currentTrack.likes_count || 0);
      if (user) {
        supabase.from('likes').select('id').eq('user_id', user.id).eq('track_id', currentTrack.id).maybeSingle()
          .then(({ data }) => setIsLiked(!!data));
      }
    }
  }, [currentTrack, user]);

  const handleLike = async () => {
    if (!user || !currentTrack) return;
    const newStatus = !isLiked;
    setIsLiked(newStatus);
    setLikeCount(prev => newStatus ? prev + 1 : prev - 1);
    if (newStatus) await supabase.from('likes').insert({ user_id: user.id, track_id: currentTrack.id });
    else await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', currentTrack.id);
  };

  // ✅ Tailles réduites si compact
  const size = compact ? 180 : (isMobile ? 240 : 320);
  const strokeWidth = compact ? 4 : 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = duration > 0 ? circumference - (progress / duration) * circumference : circumference;
  
  const totalBars = compact ? 120 : 240; 
  const visualizerBars = Array.from({ length: totalBars }).map((_, i) => i);
  const dynamicGradient = `linear-gradient(to top, ${visualizerColor}40, ${visualizerColor})`;

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    return `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
  };

  if (isLive) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${visualizerColor}, ${visualizerColor}80)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 80px ${visualizerColor}90`, animation: 'pulseGlow 3s infinite' }}>
          <div style={{ fontSize: compact ? 60 : 80 }}>🎙️</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: iconColor, letterSpacing: '3px', marginTop: 10 }}>LIVE</div>
        </div>
        <button onClick={togglePlay} style={{ width: 56, height: 56, borderRadius: '50%', background: visualizerColor, color: iconColor, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 10px 20px ${visualizerColor}60` }}>
          {isPlaying ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: compact ? 16 : 30, padding: compact ? 5 : 10 }}>
        
        <div style={{ position: 'absolute', width: size + 40, height: size + 40, borderRadius: '50%', background: `radial-gradient(circle, ${visualizerColor}40 0%, transparent 60%)`, filter: 'blur(30px)', animationName: 'pulseGlow', animationDuration: '2s', animationIterationCount: 'infinite', animationPlayState: isPlaying ? 'running' : 'paused' }} />
        
        <div className="circular-visualizer" style={{ position: 'absolute', width: size, height: size, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 3 }}>
          {visualizerBars.map((_, i) => {
            const angle = (i * 360) / totalBars;
            return (
              <div key={i} className="visualizer-bar-wrapper" style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: compact ? 25 : 35, marginLeft: -3, marginTop: compact ? -12.5 : -17.5, transformOrigin: 'center center', transform: `rotate(${angle}deg) translateY(-${size / 2}px)` }}>
                <div className="visualizer-bar" style={{ 
                  width: '100%', height: '100%', 
                  background: dynamicGradient, 
                  borderRadius: 4, 
                  transformOrigin: 'bottom center', 
                  boxShadow: `0 0 10px ${visualizerColor}90`, 
                  animationName: 'beatCircle', 
                  animationDuration: `${0.4 + Math.random() * 0.4}s`, 
                  animationDelay: `-${Math.random() * 0.5}s`, 
                  animationIterationCount: 'infinite', 
                  animationDirection: 'alternate', 
                  animationTimingFunction: 'ease-in-out',
                  animationPlayState: isPlaying ? 'running' : 'paused' 
                }} />
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
          <circle cx={(size + 40) / 2} cy={(size + 40) / 2} r={radius + 20} stroke="url(#progressGradient)" strokeWidth={compact ? 2 : 3} fill="none" strokeDasharray={circumference + 100} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 8px ${visualizerColor}90)` }} />
        </svg>
        
        <div style={{ position: 'absolute', width: size + 40, height: size + 40, zIndex: 10, cursor: 'default' }} />
        
        <div className="vinyl-container" style={{ position: 'relative', width: size, height: size, borderRadius: '50%', background: '#000', boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4 }}>
          <img 
            src={currentTrack?.cover_url || profile?.avatar_url || 'https://via.placeholder.com/300'} 
            alt="Cover" 
            className="vinyl-spin" 
            style={{ 
              width: size - (compact ? 40 : 60), height: size - (compact ? 40 : 60), borderRadius: '50%', objectFit: 'cover', 
              border: `${compact ? 3 : 4}px solid rgba(255,255,255,0.1)`,
              animationName: 'spin',
              animationDuration: '4s',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear',
              animationPlayState: isPlaying ? 'running' : 'paused' 
            }} 
          />
          <div className="vinyl-grooves" style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none', background: 'repeating-radial-gradient(circle, transparent, transparent 2px, rgba(255,255,255,0.03) 3px, transparent 4px)' }} />
          <div className="vinyl-label" style={{ position: 'absolute', width: compact ? 30 : 40, height: compact ? 30 : 40, borderRadius: '50%', background: isDark ? '#05050a' : '#fff', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}>
            <div className="vinyl-hole" style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px #fff' }} />
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: compact ? 8 : 20, width: '100%' }}>
        <h1 style={{ fontSize: compact ? 16 : 20, fontWeight: 900, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isDark ? '#fff' : '#000' }}>
          {currentTrack?.title || 'En attente'}
        </h1>
        <p style={{ color: '#888', fontSize: compact ? 12 : 14, margin: 0, fontWeight: 600 }}>
          {currentTrack?.artist || 'DropZone Radio'}
        </p>
      </div>

      <button onClick={handleLike} style={{ background: 'transparent', border: 'none', color: isLiked ? visualizerColor : (isDark ? '#888' : '#666'), cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: compact ? 12 : 13, fontWeight: 700, marginBottom: compact ? 12 : 20 }}>
        <svg width={compact ? 14 : 18} height={compact ? 14 : 18} viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        {likeCount}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 8 : 12, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: compact ? 220 : 260, fontSize: compact ? 10 : 12, color: '#888', fontWeight: 800 }}>
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
          <button onClick={togglePlay} style={{ width: compact ? 52 : 64, height: compact ? 52 : 64, borderRadius: '50%', background: visualizerColor, color: iconColor, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 10px 20px ${visualizerColor}60`, transition: 'all 0.2s', transform: isPlaying ? 'scale(1)' : 'scale(0.98)' }}>
            {isPlaying ? <svg width={compact ? 20 : 24} height={compact ? 20 : 24} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> : <svg width={compact ? 20 : 24} height={compact ? 20 : 24} viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
          </button>
        </div>
      </div>
    </div>
  );
};