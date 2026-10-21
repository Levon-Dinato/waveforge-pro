// src/pages/FeedPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';
import { OnlineUsersWidget } from '../components/OnlineUsersWidget';

// ✅ 1. Renommage de l'interface Event en DbEvent
interface DbEvent {
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

// ✅ 2. Utilisation de DbEvent dans le type FeedItem
type FeedItem = 
  | { type: 'track'; data: Track; date: Date }
  | { type: 'event'; data: DbEvent; date: Date }
  | { type: 'post'; data: { id: string; author: string; text: string; url?: string; postType: string; date: Date }; date: Date };

// ✅ 3. Mise à jour du Type Guard avec DbEvent
const isTrackItem = (item: FeedItem): item is { type: 'track'; data: Track; date: Date } => item.type === 'track';
const isEventItem = (item: FeedItem): item is { type: 'event'; data: DbEvent; date: Date } => item.type === 'event';
const isPostItem = (item: FeedItem): item is { type: 'post'; data: { id: string; author: string; text: string; url?: string; postType: string; date: Date }; date: Date } => item.type === 'post';

const getCleanUrl = (input: string): { url: string; isYoutube: boolean } => {
  if (!input) return { url: '', isYoutube: false };
  let url = input.trim();
  
  if (url.includes('<iframe')) {
    const match = url.match(/src=["'](.*?)["']/);
    if (match && match[1]) url = match[1];
  }

  const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
  if (isYoutube) {
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1].split('?')[0];
      url = `https://www.youtube.com/embed/${id}`;
    } else if (url.includes('watch?v=')) {
      const id = url.split('watch?v=')[1].split('&')[0];
      url = `https://www.youtube.com/embed/${id}`;
    }
  }

  return { url, isYoutube };
};

export const FeedPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(1024);
  const { play, currentTrack, isPlaying } = usePlayer();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  // ✅ 4. Mise à jour de l'état avec DbEvent
  const [upcomingEvents, setUpcomingEvents] = useState<DbEvent[]>([]);

  const [postContent, setPostContent] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [postType, setPostType] = useState<'texte' | 'lien' | 'image' | 'video'>('texte');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: tracksData } = await supabase.from('tracks').select('*').order('created_at', { ascending: false }).limit(20);
        const today = new Date().toISOString().split('T')[0];
        const { data: eventsData } = await supabase.from('events').select('*').gte('event_date', today).order('event_date', { ascending: true }).limit(10);

        const combined: FeedItem[] = [];
        (tracksData || []).forEach(t => combined.push({ type: 'track', data: t as Track, date: new Date(t.created_at) }));
        // ✅ 5. Cast en DbEvent
        (eventsData || []).forEach(e => combined.push({ type: 'event', data: e as DbEvent, date: new Date(e.created_at || e.event_date) }));
        combined.sort((a, b) => b.date.getTime() - a.date.getTime());
        setFeedItems(combined);

        const { data: topData } = await supabase.from('tracks').select('*').order('likes_count', { ascending: false }).limit(5);
        if (topData) setTopTracks(topData as Track[]);

        // ✅ 6. Cast en DbEvent
        if (eventsData) setUpcomingEvents(eventsData.slice(0, 3) as DbEvent[]);
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
    if (!postContent.trim() && !postUrl.trim()) return;
    const { url } = getCleanUrl(postUrl);

    const newPost: FeedItem = {
      type: 'post',
      date: new Date(),
      data: {
        id: Math.random().toString(),
        author: user?.email?.split('@')[0] || 'Utilisateur',
        text: postContent,
        url: url,
        postType: postType === 'video' ? 'video' : postType,
        date: new Date(),
      }
    };

    setFeedItems(prev => [newPost, ...prev]);
    setPostContent('');
    setPostUrl('');
    setPostType('texte');
  };

  const handleDeletePost = (postId: string) => {
    if (window.confirm("Supprimer définitivement ce post ?")) {
      setFeedItems(prev => prev.filter(item => !(isPostItem(item) && item.data.id === postId)));
    }
  };

  return (
    <div style={{ background: '#121212', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', paddingBottom: 120 }}>
      
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '16px' : '24px 16px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        
        {/* COLONNE GAUCHE */}
        <div style={{ flex: 1, maxWidth: 680, minWidth: 0 }}>
          
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0 }}>
              Fil d'<span style={{ color: '#00d9ff' }}>actualité</span>
            </h1>
            <p style={{ color: '#999', fontSize: 13, marginTop: 6 }}>
              Toutes les dernières pépites et les prochains événements.
            </p>
          </div>

          {/* COMPOSER */}
          {user && (
            <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input 
                    type="text" 
                    placeholder="Quoi de neuf ? Publie une actu..." 
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 15, outline: 'none' }} 
                  />
                  
                  {postType !== 'texte' && (
                    <div>
                      <input 
                        type="text" 
                        placeholder={
                          postType === 'image' ? "Lien direct de l'image (ex: https://site.com/photo.jpg)" : 
                          "Collez le lien YouTube, Twitch, Tviply ou le code iframe"
                        }
                        value={postUrl}
                        onChange={(e) => setPostUrl(e.target.value)}
                        style={{ padding: '10px', background: '#121212', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none', width: '100%' }} 
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ height: 1, background: '#2a2a2a', margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {(['texte', 'lien', 'image', 'video'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => { setPostType(type); setPostUrl(''); }}
                      style={{
                        background: 'transparent', border: 'none',
                        color: postType === type ? '#00d9ff' : '#888',
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                        cursor: 'pointer', padding: 0, transition: 'color 0.2s'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                  <span onClick={() => navigate('/studio')} style={{ fontSize: 11, color: '#888', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                    🎵 SON
                  </span>
                </div>

                <button 
                  onClick={handlePublish}
                  disabled={!postContent.trim() && !postUrl.trim()}
                  style={{ 
                    background: (postContent.trim() || postUrl.trim()) ? '#00d9ff' : '#333', 
                    color: (postContent.trim() || postUrl.trim()) ? '#000' : '#888', 
                    border: 'none', padding: '6px 16px', borderRadius: 20, 
                    fontWeight: 700, fontSize: 12, 
                    cursor: (postContent.trim() || postUrl.trim()) ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
                >
                  Envoyer
                </button>
              </div>
            </div>
          )}

          {/* FEED */}
          {loading ? (
            <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>Chargement...</div>
          ) : feedItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#1e1e1e', border: '1px dashed #2a2a2a', borderRadius: 12 }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🌐</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>Le feed est vide</h3>
              <p style={{ color: '#999', fontSize: 13, margin: '0 0 24px 0' }}>Sois le premier à partager un son !</p>
              
              <button onClick={() => navigate('/studio')} style={{ padding: '10px 20px', background: '#00d9ff', color: '#000', borderRadius: 20, fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 13 }}>
                Uploader un son
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {feedItems.map((item, index) => {
                
                // ✅ RENDU POST
                if (isPostItem(item)) {
                  const { isYoutube, url: cleanUrl } = getCleanUrl(item.data.url || '');
                  const isTviplyOrOther = !isYoutube && cleanUrl.includes('http');

                  return (
                    <div key={`post-${item.data.id}-${index}`} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {item.data.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{item.data.author}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{formatDate(item.date)} · 🌍</div>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ padding: '0 16px 16px 16px', fontSize: 14, color: '#ddd', whiteSpace: 'pre-wrap' }}>
                        {item.data.text}
                      </div>

                      {item.data.postType === 'image' && cleanUrl && (
                        <div style={{ width: '100%', maxHeight: 500, overflow: 'hidden', background: '#000', display: 'flex', justifyContent: 'center' }}>
                          <img src={cleanUrl} alt="Post" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x400/1e1e1e/888888?text=Image+introuvable'; }} />
                        </div>
                      )}

                      {item.data.postType === 'lien' && cleanUrl && (
                        <a href={cleanUrl} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '12px 16px', background: '#121212', color: '#00d9ff', textDecoration: 'none', fontSize: 13, borderTop: '1px solid #2a2a2a', wordBreak: 'break-all' }}>
                          🔗 {cleanUrl}
                        </a>
                      )}

                      {item.data.postType === 'video' && isYoutube && cleanUrl && (
                        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000', overflow: 'hidden' }}>
                          <iframe src={cleanUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen title="YouTube" scrolling="no" />
                        </div>
                      )}

                      {item.data.postType === 'video' && isTviplyOrOther && cleanUrl && (
                        <div style={{ width: '100%', height: isMobile ? 400 : 500, background: '#000', borderTop: '1px solid #2a2a2a' }}>
                          <iframe src={cleanUrl} style={{ width: '100%', height: '100%', border: 'none' }} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Live" scrolling="no" />
                        </div>
                      )}

                      <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <button style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>👍 J'aime</button>
                          <button style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>💬 Commenter</button>
                        </div>
                        <button onClick={() => handleDeletePost(item.data.id)} style={{ background: 'transparent', border: 'none', color: '#ff5c5c', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🗑️ Supprimer</button>
                      </div>
                    </div>
                  );
                }

                // ✅ RENDU TRACK / EVENT
                const authorName = isTrackItem(item) ? item.data.artist : 'Organisateur';
                const isThisPlaying = isTrackItem(item) && currentTrack?.id === item.data.id && isPlaying;
                
                return (
                  <div key={`${item.type}-${item.data.id}-${index}`} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
                    
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
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ padding: '0 16px 12px 16px', fontSize: 14, color: '#ddd' }}>
                          Nouvel événement : <strong>{item.data.title}</strong> 📅
                        </div>
                        
                        {isEventItem(item) && item.data.image_url ? (
                          <div style={{ width: '100%', aspectRatio: '16 / 9', background: `url(${item.data.image_url}) center/cover` }} />
                        ) : (
                          <div style={{ width: '100%', height: 120, background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎉</div>
                        )}
                        
                        {isEventItem(item) && (
                          <div style={{ padding: 16 }}>
                            <div style={{ fontSize: 12, color: '#00d9ff', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                              {new Date(item.data.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div style={{ fontSize: 14, color: '#fff' }}>📍 {item.data.location} {item.data.city ? `, ${item.data.city}` : ''}</div>
                          </div>
                        )}
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

        {/* COLONNE DROITE */}
        {!isMobile && (
          <aside style={{ width: 300, flexShrink: 0, position: 'sticky', top: 24, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                {upcomingEvents.map((event) => (
                  <a key={event.id} href={event.url || '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{ fontSize: 11, color: '#ff3366', fontWeight: 700, marginBottom: 2 }}>
                      {new Date(event.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
                    <div style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {event.city || event.location}</div>
                  </a>
                ))}
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