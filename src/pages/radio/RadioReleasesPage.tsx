// src/pages/radio/RadioReleasesPage.tsx
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRadio } from '../../contexts/RadioContext';

export const RadioReleasesPage: React.FC = () => {
  const { latestReleases, visualizerColor, colors, profile } = useOutletContext<any>();
  const { user } = useAuth();
  const { startRadio, stopRadio, isRadioActive } = useRadio();
  
  const [likedTracks, setLikedTracks] = useState<string[]>([]);
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchLikes = async () => {
      const { data } = await supabase.from('likes').select('track_id').eq('user_id', user.id);
      if (data) setLikedTracks(data.map(d => d.track_id));
    };
    fetchLikes();
  }, [user]);

  const handleLike = async (e: React.MouseEvent, trackId: string, currentLikes: number) => {
    e.stopPropagation();
    if (!user) { alert("Connecte-toi pour liker un son !"); return; }
    
    const isAlreadyLiked = likedTracks.includes(trackId);
    
    if (isAlreadyLiked) setLikedTracks(prev => prev.filter(id => id !== trackId));
    else setLikedTracks(prev => [...prev, trackId]);

    try {
      if (isAlreadyLiked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', trackId);
        await supabase.from('tracks').update({ likes_count: Math.max(0, currentLikes - 1) }).eq('id', trackId);
      } else {
        await supabase.from('likes').insert({ user_id: user.id, track_id: trackId });
        await supabase.from('tracks').update({ likes_count: currentLikes + 1 }).eq('id', trackId);
      }
    } catch (err) {
      console.error(err);
      if (isAlreadyLiked) setLikedTracks(prev => [...prev, trackId]);
      else setLikedTracks(prev => prev.filter(id => id !== trackId));
    }
  };

  // ✅ LECTURE INSTANTANÉE (Sans clignotement)
  const playTrack = (e: React.MouseEvent, track: any) => {
    e.preventDefault();
    e.stopPropagation();

    const live = profile?.is_live || false;
    const liveUrl = profile?.live_url || '';
    const index = latestReleases.findIndex((t: any) => t.id === track.id);

    if (isRadioActive) {
      stopRadio();
    }
    
    startRadio(latestReleases, live, liveUrl, index >= 0 ? index : 0);
  };

  const IconSparkles = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
  );

  const HeartIcon = ({ filled }: { filled: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? visualizerColor : "none"} stroke={filled ? visualizerColor : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <div style={{ color: visualizerColor, background: `${visualizerColor}15`, padding: 16, borderRadius: 20, border: `1px solid ${visualizerColor}30` }}>
          {IconSparkles}
        </div>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Nouveautés</h1>
          <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>Les dernières pépites ajoutées à la radio.</p>
        </div>
      </div>

      {latestReleases.length === 0 ? (
        <div className="rp-glass" style={{ padding: 60, textAlign: 'center', color: colors.textMuted }}>
          Aucune nouveauté pour le moment.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 32 }}>
          {latestReleases.map((track: any, index: number) => {
            const isLiked = likedTracks.includes(track.id);
            const isHovered = hoveredTrack === track.id;

            return (
              <motion.div 
                key={track.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onMouseEnter={() => setHoveredTrack(track.id)}
                onMouseLeave={() => setHoveredTrack(null)}
                style={{ position: 'relative' }}
              >
                <div style={{ 
                  position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 20, overflow: 'hidden',
                  boxShadow: isHovered ? `0 20px 40px ${visualizerColor}30` : '0 10px 20px rgba(0,0,0,0.3)',
                  transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                  transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                  background: `url(${track.cover_url || 'https://via.placeholder.com/300'}) center/cover`
                }}>
                  <div style={{ 
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', 
                    opacity: isHovered ? 1 : 0, transition: 'opacity 0.3s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <button 
                      onClick={(e) => playTrack(e, track)}
                      style={{
                        width: 60, height: 60, borderRadius: '50%', background: visualizerColor, color: '#000',
                        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        transform: isHovered ? 'scale(1)' : 'scale(0.5)', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                        boxShadow: `0 0 30px ${visualizerColor}80`
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 4 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: colors.textMain }}>{track.title}</div>
                    <div style={{ fontSize: 13, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{track.artist}</div>
                  </div>
                  <button 
                    onClick={(e) => handleLike(e, track.id, track.likes_count || 0)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, 
                      background: isLiked ? `${visualizerColor}15` : 'transparent', 
                      color: isLiked ? visualizerColor : colors.textMuted, 
                      border: `1px solid ${isLiked ? visualizerColor : colors.border}`, 
                      cursor: 'pointer', fontWeight: 800, fontSize: 12, transition: 'all 0.2s'
                    }}
                  >
                    <HeartIcon filled={isLiked} />
                    {track.likes_count || 0}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};