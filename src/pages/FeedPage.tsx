// src/pages/FeedPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';
import { OnlineUsersWidget } from '../components/OnlineUsersWidget';

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  city: string | null;
  url: string | null;
  image_url: string | null;
  created_at?: string;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  song_key: string | null;
  audio_url: string;
  cover_url: string | null;
  user_id: string;
  created_at: string;
  duration: number;
  peaks: number[];
}

type FeedItem = 
  | { type: 'track'; data: Track; date: Date }
  | { type: 'event'; data: Event; date: Date };

// ✅ Type Guards pour aider TypeScript à comprendre le typage
const isTrackItem = (item: FeedItem): item is { type: 'track'; data: Track; date: Date } => {
  return item.type === 'track';
};

const isEventItem = (item: FeedItem): item is { type: 'event'; data: Event; date: Date } => {
  return item.type === 'event';
};

export const FeedPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(1024);
  const { play, currentTrack, isPlaying } = usePlayer();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);

  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'texte' | 'lien' | 'image' | 'video' | 'iframe'>('texte');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        const today = new Date().toISOString().split('T')[0];
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .gte('event_date', today) 
          .order('event_date', { ascending: true })
          .limit(10);

        const combined: FeedItem[] = [];
        (tracksData || []).forEach(t => {
          combined.push({ type: 'track', data: t as Track, date: new Date(t.created_at) });
        });
        (eventsData || []).forEach(e => {
          combined.push({ type: 'event', data: e as Event, date: new Date(e.created_at || e.event_date) });
        });
        combined.sort((a, b) => b.date.getTime() - a.date.getTime());
        setFeedItems(combined);

        const { data: topData } = await supabase
          .from('tracks')
          .select('*')
          .order('likes_count', { ascending: false })
          .limit(5);
        if (topData) setTopTracks(topData as Track[]);

        if (eventsData) setUpcomingEvents(eventsData.slice(0, 3));

      } catch (err) {
        console.error('Erreur chargement feed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffH = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffH < 1) return "À l'instant";
    if (diffH < 24) return `Il y a ${diffH}h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const handlePublish = () => {
    if (!postContent.trim()) return;
    alert(`La publication de type "${postType}" sera bientôt disponible !`);
    setPostContent('');
  };

  return (
    <div style={{ background: '#121212', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', paddingBottom: 120 }}>
      
      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto', 
        padding: isMobile ? '16px' : '24px 16px',
        display: 'flex',
        gap: 32,
        alignItems: 'flex-start'
      }}>
        
        {/* ==================================================== */}
        {/* COLONNE GAUCHE (Le Feed)                             */}
        {/* ==================================================== */}
        <div style={{ flex: 1, maxWidth: 680, minWidth: 0 }}>
          
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0 }}>
              Fil d'<span style={{ color: '#00d9ff' }}>actualité</span>
            </h1>
            <p style={{ color: '#999', fontSize: 13, marginTop: 6 }}>
              Toutes les dernières pépites et les prochains événements.
            </p>
          </div>

          {user && (
            <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16, marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <input 
                  type="text" 
                  placeholder="Quoi de neuf ? Publie une actu..." 
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 15, outline: 'none' }} 
                />
              </div>

              <div style={{ height: 1, background: '#2a2a2a', margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {(['texte', 'lien', 'image', 'video', 'iframe'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setPostType(type)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: postType === type ? '#00d9ff' : '#888',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'color 0.2s'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                  <span 
                    onClick={() => navigate('/studio')} 
                    style={{ fontSize: 11, color: '#888', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#00d9ff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                  >
                    🎵 SON
                  </span>
                </div>

                <button 
                  onClick={handlePublish}
                  style={{ 
                    background: postContent.trim() ? '#00d9ff' : '#333', 
                    color: postContent.trim() ? '#000' : '#888', 
                    border: 'none', 
                    padding: '6px 16px', 
                    borderRadius: 20, 
                    fontWeight: 700, 
                    fontSize: 12, 
                    cursor: postContent.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
                >
                  Envoyer
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>Chargement...</div>
          ) : feedItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#1e1e1e', border: '1px dashed #2a2a2a', borderRadius: 12 }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🌐</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>Le feed est vide</h3>
              <p style={{ color: '#999', fontSize: 13, margin: '0 0 24px 0' }}>Sois le premier à partager un son !</p>
              <Link to="/studio" style={{ display: 'inline-flex', padding: '10px 20px', background: '#00d9ff', color: '#000', borderRadius: 20, fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>Uploader un son</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {feedItems.map((item, index) => {
                const authorName = item.type === 'track' ? item.data.artist : 'Organisateur';
                const isThisPlaying = item.type === 'track' && currentTrack?.id === item.data.id && isPlaying;
                
                return (
                  <div key={`${item.type}-${item.data.id}-${index}`} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    
                    <div style={{ padding: '16px 16px 12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: item.type === 'track' ? '#00d9ff' : '#ff3366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                            {authorName} {item.type === 'track' ? <span style={{ color: '#888', fontWeight: 400 }}>· a partagé un son</span> : <span style={{ color: '#888', fontWeight: 400 }}>· a créé un événement</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{formatDate(item.date)} · 🌍</div>
                        </div>
                      </div>
                    </div>

                    {isTrackItem(item) ? (
                      <>
                        <div style={{ padding: '0 16px 12px 16px', fontSize: 14, color: '#ddd' }}>
                          Découvrez le nouveau son : <strong>{item.data.title}</strong> 🎶
                        </div>
                        
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1', background: item.data.cover_url ? `url(${item.data.cover_url}) center/cover` : '#222', cursor: 'pointer' }} onClick={() => navigate(`/track/${item.data.id}`)}>
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); play(item.data); }}
                              style={{ width: 64, height: 64, borderRadius: '50%', background: isThisPlaying ? '#00d9ff' : 'rgba(0,0,0,0.6)', border: '2px solid #fff', color: isThisPlaying ? '#000' : '#fff', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                            >
                              {isThisPlaying ? '⏸' : '▶'}
                            </button>
                          </div>
                          <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 8 }}>
                            <span style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{item.data.bpm} BPM</span>
                            {item.data.song_key && <span style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{item.data.song_key}</span>}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ padding: '0 16px 12px 16px', fontSize: 14, color: '#ddd' }}>
                          Nouvel événement : <strong>{item.data.title}</strong> 📅
                        </div>
                        
                        {item.data.image_url ? (
                          <div style={{ width: '100%', aspectRatio: '16 / 9', background: `url(${item.data.image_url}) center/cover` }} />
                        ) : (
                          <div style={{ width: '100%', height: 120, background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎉</div>
                        )}
                        
                        <div style={{ padding: 16 }}>
                          <div style={{ fontSize: 12, color: '#00d9ff', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                            {new Date(item.data.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: 14, color: '#fff' }}>📍 {item.data.location} {item.data.city ? `, ${item.data.city}` : ''}</div>
                        </div>
                      </>
                    )}

                    <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between' }}>
                      <button style={{ flex: 1, background: 'transparent', border: 'none', color: '#aaa', padding: '8px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>👍 J'aime</button>
                      <button style={{ flex: 1, background: 'transparent', border: 'none', color: '#aaa', padding: '8px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>💬 Commenter</button>
                      {isEventItem(item) && (
                        <a href={item.data.url || '#'} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: 'transparent', border: 'none', color: '#00d9ff', padding: '8px', textDecoration: 'none', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>🎟️ Billets</a>
                      )}
                      {isTrackItem(item) && (
                        <button onClick={() => navigate(`/track/${item.data.id}`)} style={{ flex: 1, background: 'transparent', border: 'none', color: '#00d9ff', padding: '8px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>⬇️ Écouter</button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* COLONNE DROITE (Sidebar FIXE)                        */}
        {/* ==================================================== */}
        {!isMobile && (
          <aside style={{ 
            width: 300, 
            flexShrink: 0, 
            position: 'sticky', 
            top: 24, 
            alignSelf: 'flex-start', 
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            paddingBottom: 24
          }}>
            
            <div style={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', margin: '0 0 16px 0', color: '#fff' }}>🔥 TOP 5 DU MOMENT</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topTracks.map((track, index) => (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate(`/track/${track.id}`)}>
                    <div style={{ width: 16, textAlign: 'center', fontSize: 13, color: '#00d9ff', fontWeight: 700 }}>{index + 1}</div>
                    <div style={{ width: 40, height: 40, borderRadius: 4, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', margin: '0 0 16px 0', color: '#fff' }}>📅 ÉVÉNEMENTS À VENIR</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcomingEvents.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>Aucun événement prévu.</div>
                ) : (
                  upcomingEvents.map((event) => (
                    <a key={event.id} href={event.url || '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                      <div style={{ fontSize: 11, color: '#ff3366', fontWeight: 700, marginBottom: 2 }}>
                        {new Date(event.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
                      <div style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {event.city || event.location}</div>
                    </a>
                  ))
                )}
              </div>
            </div>

            <div style={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16, flexShrink: 0 }}>
              <OnlineUsersWidget />
            </div>

          </aside>
        )}

      </div>
    </div>
  );
};