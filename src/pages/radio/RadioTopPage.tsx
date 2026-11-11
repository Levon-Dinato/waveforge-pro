// src/pages/radio/RadioTopPage.tsx
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRadio } from '../../contexts/RadioContext';

export const RadioTopPage: React.FC = () => {
  const { topTracks, visualizerColor, colors, profile } = useOutletContext<any>();
  const { user } = useAuth();
  const { startRadio, stopRadio, isRadioActive } = useRadio();
  
  const [likedTracks, setLikedTracks] = useState<string[]>([]);

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
    const index = topTracks.findIndex((t: any) => t.id === track.id);

    if (isRadioActive) {
      stopRadio();
    }
    
    // Lancement immédiat
    startRadio(topTracks, live, liveUrl, index >= 0 ? index : 0);
  };

  const top3 = topTracks.slice(0, 3);
  const rest = topTracks.slice(3);

  const HeartIcon = ({ filled, color }: { filled: boolean, color: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={filled ? color : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  );

  const IconTrophy = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px', width: '100%', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <div style={{ color: visualizerColor, background: `${visualizerColor}15`, padding: 16, borderRadius: 20, border: `1px solid ${visualizerColor}30` }}>
          {IconTrophy}
        </div>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Top Tracks</h1>
          <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>Les sons les plus likés de la radio, classés par la communauté.</p>
        </div>
      </div>

      {topTracks.length === 0 ? (
        <div className="rp-glass" style={{ padding: 60, textAlign: 'center', color: colors.textMuted }}>
          Aucun son n'a encore été liké.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)', gap: 24, marginBottom: 48, alignItems: 'end' }}>
            {top3.map((track: any, index: number) => {
              const order = [1, 0, 2][index]; 
              const item = top3[order];
              if (!item) return null;

              const isFirst = order === 0;
              const isLiked = likedTracks.includes(item.id);
              const medals = ['#ffd700', '#c0c0c0', '#cd7f32'];

              return (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rp-glass rp-hover-card" 
                  style={{ 
                    padding: 24, 
                    borderRadius: 24, 
                    position: 'relative', 
                    background: isFirst ? `linear-gradient(180deg, ${visualizerColor}20, ${colors.card})` : colors.card,
                    border: `1px solid ${isFirst ? visualizerColor : colors.border}`,
                    boxShadow: isFirst ? `0 20px 40px ${visualizerColor}20` : 'none',
                    transform: isFirst ? 'scale(1.05)' : 'scale(1)',
                    zIndex: isFirst ? 2 : 1
                  }}
                >
                  <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', width: 32, height: 32, borderRadius: '50%', background: medals[order], color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                    {order + 1}
                  </div>

                  <div 
                    onClick={(e) => playTrack(e, item)}
                    style={{ 
                      width: '100%', aspectRatio: '1/1', borderRadius: 16, 
                      background: `url(${item.cover_url || 'https://via.placeholder.com/300'}) center/cover`, 
                      marginBottom: 20, boxShadow: '0 10px 20px rgba(0,0,0,0.4)', 
                      cursor: 'pointer', position: 'relative', overflow: 'hidden' 
                    }}
                  >
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="play-overlay">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 900, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</h3>
                    <p style={{ fontSize: 13, color: colors.textMuted, margin: '0 0 16px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.artist}</p>
                    <button 
                      onClick={(e) => handleLike(e, item.id, item.likes_count || 0)}
                      style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, 
                        background: isLiked ? `${visualizerColor}20` : 'transparent', 
                        color: isLiked ? visualizerColor : colors.textMuted, 
                        border: `1px solid ${isLiked ? visualizerColor : colors.border}`, 
                        cursor: 'pointer', fontWeight: 800, fontSize: 14, transition: 'all 0.2s'
                      }}
                    >
                      <HeartIcon filled={isLiked} color={visualizerColor} />
                      {item.likes_count || 0}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {rest.length > 0 && (
            <div className="rp-glass" style={{ borderRadius: 24, overflow: 'hidden' }}>
              <div style={{ padding: '24px 32px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>La suite du classement</h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {rest.map((track: any, index: number) => {
                  const isLiked = likedTracks.includes(track.id);
                  const rank = index + 4;
                  
                  return (
                    <motion.div 
                      key={track.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      style={{ 
                        display: 'flex', alignItems: 'center', padding: '16px 32px', 
                        borderBottom: index !== rest.length - 1 ? `1px solid ${colors.border}` : 'none',
                        transition: 'background 0.2s', cursor: 'pointer'
                      }}
                      className="hover-bg"
                      onClick={(e) => playTrack(e, track)}
                      onMouseEnter={(e) => e.currentTarget.style.background = `${visualizerColor}08`}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontSize: 18, fontWeight: 900, color: colors.textMuted, width: 48 }}>{rank}</div>
                      
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" color={visualizerColor}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      </div>

                      <div style={{ width: 56, height: 56, borderRadius: 8, background: `url(${track.cover_url || 'https://via.placeholder.com/56'}) center/cover`, marginRight: 20, flexShrink: 0 }} />
                      
                      <div style={{ flex: 1, minWidth: 0, marginRight: 20 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: colors.textMain }}>{track.title}</div>
                        <div style={{ fontSize: 13, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                      </div>

                      <div style={{ width: 100, marginRight: 32, display: window.innerWidth < 768 ? 'none' : 'block' }}>
                        <div style={{ width: '100%', height: 4, background: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.max(5, (track.likes_count / (topTracks[0]?.likes_count || 1)) * 100)}%`, height: '100%', background: visualizerColor, borderRadius: 2 }} />
                        </div>
                      </div>

                      <button 
                        onClick={(e) => handleLike(e, track.id, track.likes_count || 0)}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 12, 
                          background: isLiked ? `${visualizerColor}15` : 'transparent', 
                          color: isLiked ? visualizerColor : colors.textMuted, 
                          border: `1px solid ${isLiked ? visualizerColor : colors.border}`, 
                          cursor: 'pointer', fontWeight: 800, fontSize: 13, transition: 'all 0.2s'
                        }}
                      >
                        <HeartIcon filled={isLiked} color={visualizerColor} />
                        {track.likes_count || 0}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};