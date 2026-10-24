// src/pages/FeedPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';
import { OnlineUsersWidget } from '../components/OnlineUsersWidget';
import { DeleteButton } from '../components/DeleteButton';

// ✅ SVG Icons
const Icons = {
  heart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  heartFilled: <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff3366" stroke="#ff3366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  message: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  link: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>,
  mapPin: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  play: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  music: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
};

interface DbEvent { id: string; title: string; event_date: string; location: string | null; city: string | null; url: string | null; image_url: string | null; created_at?: string; }
interface Track { id: string; title: string; artist: string; genre: string; bpm: number; song_key: string | null; audio_url: string; cover_url: string | null; user_id: string; created_at: string; duration: number; peaks: number[]; likes_count?: number; }
interface Comment { id: string; user_id: string; content: string; created_at: string; profiles?: { username: string; avatar_url: string | null } }

type FeedItem = 
  | { type: 'track'; data: Track; date: Date }
  | { type: 'event'; data: DbEvent; date: Date }
  | { type: 'post'; data: { id: string; author: string; text: string; url?: string; postType: string; date: Date; likes_count: number; profile_id: string }; date: Date };

const isTrackItem = (item: FeedItem): item is { type: 'track'; data: Track; date: Date } => item.type === 'track';
const isEventItem = (item: FeedItem): item is { type: 'event'; data: DbEvent; date: Date } => item.type === 'event';
const isPostItem = (item: FeedItem): item is { type: 'post'; data: { id: string; author: string; text: string; url?: string; postType: string; date: Date; likes_count: number; profile_id: string }; date: Date } => item.type === 'post';

const getCleanUrl = (input: string): { url: string; isYoutube: boolean } => {
  if (!input) return { url: '', isYoutube: false };
  let url = input.trim();
  if (url.includes('<iframe')) {
    const match = url.match(/src=["'](.*?)["']/);
    if (match && match[1]) url = match[1];
  }
  const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
  if (isYoutube) {
    if (url.includes('youtu.be/')) url = `https://www.youtube.com/embed/${url.split('youtu.be/')[1].split('?')[0]}`;
    else if (url.includes('watch?v=')) url = `https://www.youtube.com/embed/${url.split('watch?v=')[1].split('&')[0]}`;
  }
  return { url, isYoutube };
};

// ✅ FONCTION POUR TRANSFORMER LES URL EN LIENS CLIQUABLES
const linkify = (text: string) => {
  if (!text) return null;
  // Regex pour détecter les liens http/https
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: '#00d9ff', textDecoration: 'underline', wordBreak: 'break-all' }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export const FeedPage: React.FC = () => {
  const { user, username, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(1024);
  const { play, currentTrack, isPlaying } = usePlayer();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DbEvent[]>([]);

  // Post form
  const [postContent, setPostContent] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [postType, setPostType] = useState<'texte' | 'lien' | 'image' | 'video' | 'iframe'>('texte');

  // Modification du post
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editUrl, setEditUrl] = useState('');

  // Likes & Comments
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userPostLikes, setUserPostLikes] = useState<Record<string, boolean>>({});
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [currentCommentItem, setCurrentCommentItem] = useState<{ type: 'track' | 'post'; id: string } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: tracksData } = await supabase.from('tracks').select('*').order('created_at', { ascending: false }).limit(20);
        const today = new Date().toISOString().split('T')[0];
        const { data: eventsData } = await supabase.from('events').select('*').gte('event_date', today).order('event_date', { ascending: true }).limit(10);
        const { data: postsData } = await supabase.from('artist_posts').select('*, profiles:profile_id(username)').order('created_at', { ascending: false }).limit(20);

        const combined: FeedItem[] = [];
        (tracksData || []).forEach(t => combined.push({ type: 'track', data: t as Track, date: new Date(t.created_at) }));
        (eventsData || []).forEach(e => combined.push({ type: 'event', data: e as DbEvent, date: new Date(e.created_at || e.event_date) }));
        (postsData || []).forEach(p => combined.push({ 
          type: 'post', 
          data: { 
            id: p.id, 
            author: p.profiles?.username || 'Utilisateur', 
            text: p.content, 
            url: p.media_url, 
            postType: p.media_type, 
            date: new Date(p.created_at),
            likes_count: p.likes_count || 0,
            profile_id: p.profile_id
          }, 
          date: new Date(p.created_at) 
        }));

        combined.sort((a, b) => b.date.getTime() - a.date.getTime());
        setFeedItems(combined);

        const { data: topData } = await supabase.from('tracks').select('*').order('likes_count', { ascending: false }).limit(5);
        if (topData) setTopTracks(topData as Track[]);

        if (eventsData) setUpcomingEvents(eventsData.slice(0, 3) as DbEvent[]);

        if (user) {
          const { data: trackLikes } = await supabase.from('likes').select('track_id').eq('user_id', user.id);
          const { data: postLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id);
          
          const trackLikesMap: Record<string, boolean> = {};
          trackLikes?.forEach(l => { trackLikesMap[l.track_id] = true; });
          setUserLikes(trackLikesMap);

          const postLikesMap: Record<string, boolean> = {};
          postLikes?.forEach(l => { postLikesMap[l.post_id] = true; });
          setUserPostLikes(postLikesMap);
        }
      } catch (err) {
        console.error('Erreur chargement feed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffH = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffH < 1) return "À l'instant";
    if (diffH < 24) return `Il y a ${diffH}h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const handleLikeTrack = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    if (!user) { navigate('/auth'); return; }

    const isLiked = userLikes[trackId];
    setUserLikes(prev => ({ ...prev, [trackId]: !isLiked }));
    setFeedItems(prev => prev.map(item => 
      isTrackItem(item) && item.data.id === trackId 
        ? { ...item, data: { ...item.data, likes_count: (item.data.likes_count || 0) + (isLiked ? -1 : 1) } } 
        : item
    ));

    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', trackId);
      } else {
        await supabase.from('likes').insert({ user_id: user.id, track_id: trackId });
      }
    } catch (err) {
      setUserLikes(prev => ({ ...prev, [trackId]: isLiked }));
      setFeedItems(prev => prev.map(item => 
        isTrackItem(item) && item.data.id === trackId 
          ? { ...item, data: { ...item.data, likes_count: (item.data.likes_count || 0) + (isLiked ? 1 : -1) } } 
          : item
      ));
    }
  };

  const handleLikePost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!user) { navigate('/auth'); return; }

    const isLiked = userPostLikes[postId];
    setUserPostLikes(prev => ({ ...prev, [postId]: !isLiked }));
    setFeedItems(prev => prev.map(item => 
      isPostItem(item) && item.data.id === postId 
        ? { ...item, data: { ...item.data, likes_count: (item.data.likes_count || 0) + (isLiked ? -1 : 1) } } 
        : item
    ));

    try {
      if (isLiked) {
        await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', postId);
      } else {
        await supabase.from('post_likes').insert({ user_id: user.id, post_id: postId });
      }
    } catch (err) {
      setUserPostLikes(prev => ({ ...prev, [postId]: isLiked }));
      setFeedItems(prev => prev.map(item => 
        isPostItem(item) && item.data.id === postId 
          ? { ...item, data: { ...item.data, likes_count: (item.data.likes_count || 0) + (isLiked ? 1 : -1) } } 
          : item
      ));
    }
  };

  const openComments = async (type: 'track' | 'post', id: string) => {
    setCurrentCommentItem({ type, id });
    setCommentsModalOpen(true);
    setLoadingComments(true);
    setNewComment('');

    let query = supabase.from('comments').select('*, profiles:user_id(username, avatar_url)').order('created_at', { ascending: true });
    if (type === 'track') query = query.eq('track_id', id);
    else query = query.eq('post_id', id);

    const { data } = await query;
    setComments(data as Comment[] || []);
    setLoadingComments(false);
  };

  const submitComment = async () => {
    if (!newComment.trim() || !user || !currentCommentItem) return;
    const { data, error } = await supabase.from('comments').insert({
      user_id: user.id,
      content: newComment.trim(),
      ...(currentCommentItem.type === 'track' ? { track_id: currentCommentItem.id } : { post_id: currentCommentItem.id })
    }).select('*, profiles:user_id(username, avatar_url)').single();

    if (!error && data) {
      setComments(prev => [...prev, data as Comment]);
      setNewComment('');
    } else {
      alert("Erreur : " + error?.message);
    }
  };

  const handlePublish = async () => {
    if ((!postContent.trim() && !postUrl.trim()) || !user) return;
    const { url } = getCleanUrl(postUrl);

    const dbMediaType = (postType === 'texte' || postType === 'lien' || postType === 'iframe') ? 'text' : postType;

    const { data, error } = await supabase.from('artist_posts').insert({
      profile_id: user.id,
      content: postContent || ' ',
      media_url: url || null,
      media_type: dbMediaType,
    }).select('*, profiles:profile_id(username)').single();

    if (!error && data) {
      const newItem: FeedItem = {
        type: 'post',
        date: new Date(data.created_at),
        data: {
          id: data.id,
          author: data.profiles?.username || username || 'Utilisateur',
          text: data.content,
          url: data.media_url,
          postType: data.media_type,
          date: new Date(data.created_at),
          likes_count: 0,
          profile_id: data.profile_id,
        }
      };
      setFeedItems(prev => [newItem, ...prev]);
      setPostContent('');
      setPostUrl('');
      setPostType('texte');
    } else {
      alert("Erreur lors de la publication : " + error?.message);
    }
  };

  const startEditing = (post: any) => {
    setEditingPostId(post.id);
    setEditContent(post.text);
    setEditUrl(post.url || '');
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim() && !editUrl.trim()) return;
    const { url } = getCleanUrl(editUrl);

    const { error } = await supabase.from('artist_posts').update({
      content: editContent || ' ',
      media_url: url || null,
    }).eq('id', postId);

    if (error) {
      alert("Erreur lors de la modification : " + error.message);
    } else {
      setFeedItems(prev => prev.map(item => 
        isPostItem(item) && item.data.id === postId 
          ? { ...item, data: { ...item.data, text: editContent, url: url } } 
          : item
      ));
      setEditingPostId(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Supprimer définitivement ce post ?")) return;
    await supabase.from('artist_posts').delete().eq('id', postId);
    setFeedItems(prev => prev.filter(item => !(isPostItem(item) && item.data.id === postId)));
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', paddingBottom: 120 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '16px' : '40px 24px', display: 'flex', gap: 40, alignItems: 'flex-start' }}>
        
        <div style={{ flex: 1, maxWidth: 680, minWidth: 0 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>Fil d'<span style={{ color: '#00d9ff' }}>actualité</span></h1>
            <p style={{ color: '#666', fontSize: 14, marginTop: 8 }}>Toutes les dernières pépites et les prochains événements.</p>
          </div>

          {user && (
            <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 16, padding: 20, marginBottom: 32 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#00d9ff', border: '1px solid #333' }}>
                  {(username || user.email)?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <textarea 
                    placeholder="Quoi de neuf ? Publie une actu..." 
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={2}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 16, outline: 'none', resize: 'vertical', fontFamily: 'inherit', width: '100%', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }} 
                  />
                  {postType !== 'texte' && (
                    <input 
                      type="text" 
                      placeholder={postType === 'image' ? "Lien direct de l'image (https://...)" : "Lien YouTube, Twitch, Tviply ou code iframe"}
                      value={postUrl}
                      onChange={(e) => setPostUrl(e.target.value)}
                      style={{ padding: '12px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', width: '100%', overflowWrap: 'anywhere' }} 
                    />
                  )}
                  <div style={{ height: 1, background: '#222' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                      {(['texte', 'lien', 'image', 'video', 'iframe'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => { setPostType(type); setPostUrl(''); }}
                          style={{ background: 'transparent', border: 'none', color: postType === type ? '#00d9ff' : '#666', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={handlePublish}
                      disabled={!postContent.trim() && !postUrl.trim()}
                      style={{ background: (postContent.trim() || postUrl.trim()) ? '#fff' : '#1a1a1a', color: (postContent.trim() || postUrl.trim()) ? '#000' : '#555', border: 'none', padding: '8px 20px', borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: (postContent.trim() || postUrl.trim()) ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
                    >
                      Publier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>Chargement...</div>
          ) : feedItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#121212', border: '1px dashed #222', borderRadius: 16 }}>
              <div style={{ color: '#444', marginBottom: 16 }}>{Icons.music}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>Le feed est vide</h3>
              <p style={{ color: '#666', fontSize: 14, margin: '0 0 24px 0' }}>Sois le premier à partager un son !</p>
              <button onClick={() => navigate('/studio')} style={{ padding: '10px 24px', background: '#fff', color: '#000', borderRadius: 20, fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 14 }}>
                Uploader un son
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {feedItems.map((item, index) => {
                
                if (isPostItem(item)) {
                  const { isYoutube, url: cleanUrl } = getCleanUrl(item.data.url || '');
                  const isTviplyOrOther = !isYoutube && cleanUrl.includes('http');
                  const isLiked = userPostLikes[item.data.id] || false;
                  const isEditing = editingPostId === item.data.id;

                  return (
                    <div key={`post-${item.data.id}-${index}`} style={{ background: '#121212', border: '1px solid #222', borderRadius: 16, overflow: 'hidden' }}>
                      
                      {/* EN-TÊTE DU POST */}
                      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div onClick={() => navigate(`/profil/${item.data.profile_id}`)} style={{ width: 44, height: 44, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#00d9ff', cursor: 'pointer' }}>
                            {item.data.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer' }} onClick={() => navigate(`/profil/${item.data.profile_id}`)}>{item.data.author}</div>
                            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{formatDate(item.date)}</div>
                          </div>
                        </div>
                        
                        {/* BOUTONS MODIFIER ET SUPPRIMER (EN HAUT À DROITE) */}
                        {!isEditing && (isAdmin || user?.id === item.data.profile_id) && (
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => startEditing(item.data)} style={{ background: 'transparent', border: 'none', color: '#00d9ff', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'color 0.2s' }}>Modifier</button>
                            <button onClick={() => handleDeletePost(item.data.id)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'color 0.2s' }}>Supprimer</button>
                          </div>
                        )}
                      </div>
                      
                      {/* CORPS DU POST */}
                      {isEditing ? (
                        <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <textarea 
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={4}
                            style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: 12, fontSize: 15, fontFamily: 'inherit', resize: 'vertical', overflowWrap: 'anywhere' }}
                          />
                          {item.data.postType !== 'text' && (
                            <input 
                              type="text"
                              value={editUrl}
                              onChange={(e) => setEditUrl(e.target.value)}
                              placeholder="Lien du média"
                              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: 12, fontSize: 13, overflowWrap: 'anywhere' }}
                            />
                          )}
                          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                            <button onClick={() => handleSaveEdit(item.data.id)} style={{ padding: '8px 16px', background: '#00d9ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Enregistrer</button>
                            <button onClick={() => setEditingPostId(null)} style={{ padding: '8px 16px', background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '0 20px 20px 20px', fontSize: 15, color: '#ddd', whiteSpace: 'pre-wrap', lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {/* ✅ ICI : On utilise la fonction linkify au lieu du texte brut */}
                          {linkify(item.data.text)}
                        </div>
                      )}

                      {!isEditing && item.data.postType === 'image' && cleanUrl && (
                        <div style={{ width: '100%', maxHeight: 500, background: '#000', display: 'flex', justifyContent: 'center', borderTop: '1px solid #222', borderBottom: '1px solid #222' }}>
                          <img src={cleanUrl} alt="Post" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
                        </div>
                      )}

                      {!isEditing && item.data.postType === 'text' && cleanUrl && (
                        <a href={cleanUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', background: '#0a0a0a', color: '#00d9ff', textDecoration: 'none', fontSize: 13, borderTop: '1px solid #222', borderBottom: '1px solid #222', wordBreak: 'break-all' }}>
                          {Icons.link} {cleanUrl}
                        </a>
                      )}

                      {!isEditing && item.data.postType === 'video' && isYoutube && cleanUrl && (
                        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000', borderTop: '1px solid #222', borderBottom: '1px solid #222' }}>
                          <iframe src={cleanUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen title="YouTube" scrolling="no" />
                        </div>
                      )}

                      {!isEditing && item.data.postType === 'video' && isTviplyOrOther && cleanUrl && (
                        <div style={{ width: '100%', height: isMobile ? 300 : 450, background: '#000', borderTop: '1px solid #222', borderBottom: '1px solid #222' }}>
                          <iframe src={cleanUrl} style={{ width: '100%', height: '100%', border: 'none' }} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Live" scrolling="no" />
                        </div>
                      )}

                      {/* FOOTER DU POST */}
                      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 24 }}>
                          <button 
                            onClick={(e) => handleLikePost(e, item.data.id)}
                            style={{ background: 'transparent', border: 'none', color: isLiked ? '#ff3366' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, transition: 'color 0.2s' }}
                          >
                            {isLiked ? Icons.heartFilled : Icons.heart} {item.data.likes_count || 0}
                          </button>
                          <button 
                            onClick={() => openComments('post', item.data.id)}
                            style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
                          >
                            {Icons.message} Commenter
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                const authorName = isTrackItem(item) ? item.data.artist : 'Organisateur';
                const isThisPlaying = isTrackItem(item) && currentTrack?.id === item.data.id && isPlaying;
                const isLiked = isTrackItem(item) && userLikes[item.data.id];
                
                return (
                  <div key={`${item.type}-${item.data.id}-${index}`} style={{ background: '#121212', border: '1px solid #222', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '20px 20px 16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.type === 'track' ? '#00d9ff' : '#ff3366', fontWeight: 'bold' }}>
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
                            {authorName} <span style={{ color: '#666', fontWeight: 400 }}>{item.type === 'track' ? 'a partagé un son' : 'a créé un événement'}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{formatDate(item.date)}</div>
                        </div>
                      </div>
                      
                      {(isAdmin || (isTrackItem(item) && user?.id === item.data.user_id)) && isTrackItem(item) && (
                        <DeleteButton table="tracks" itemId={item.data.id} itemOwnerId={item.data.user_id} onDeleted={() => setFeedItems(prev => prev.filter(i => !(isTrackItem(i) && i.data.id === item.data.id)))} />
                      )}
                    </div>

                    {isTrackItem(item) && (
                      <>
                        <div style={{ padding: '0 20px 16px 20px', fontSize: 15, color: '#ddd' }}>
                          Découvrez le nouveau son : <strong style={{ color: '#fff' }}>{item.data.title}</strong>
                        </div>
                        <div style={{ position: 'relative', width: '100%', height: isMobile ? 220 : 340, background: item.data.cover_url ? `url(${item.data.cover_url}) center/cover` : '#0a0a0a', cursor: 'pointer', borderTop: '1px solid #222', borderBottom: '1px solid #222' }} onClick={() => navigate(`/track/${item.data.id}`)}>
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <button onClick={(e) => { e.stopPropagation(); play(item.data); }} style={{ width: 72, height: 72, borderRadius: '50%', background: isThisPlaying ? '#00d9ff' : 'rgba(255,255,255,0.1)', border: isThisPlaying ? 'none' : '1px solid rgba(255,255,255,0.3)', color: isThisPlaying ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}>
                              {isThisPlaying ? Icons.pause : Icons.play}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {isEventItem(item) && (
                      <>
                        <div style={{ padding: '0 20px 16px 20px', fontSize: 15, color: '#ddd' }}>Nouvel événement : <strong style={{ color: '#fff' }}>{item.data.title}</strong></div>
                        {item.data.image_url ? (
                          <div style={{ width: '100%', aspectRatio: '16 / 9', background: `url(${item.data.image_url}) center/cover`, borderTop: '1px solid #222', borderBottom: '1px solid #222' }} />
                        ) : (
                          <div style={{ width: '100%', height: 160, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', borderTop: '1px solid #222', borderBottom: '1px solid #222' }}>{Icons.calendar}</div>
                        )}
                        <div style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#00d9ff', fontWeight: 700, marginBottom: 6 }}>{Icons.calendar} {new Date(item.data.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#888' }}>{Icons.mapPin} {item.data.location} {item.data.city ? `, ${item.data.city}` : ''}</div>
                        </div>
                      </>
                    )}

                    <div style={{ padding: '16px 20px', borderTop: '1px solid #222', display: 'flex', gap: 24 }}>
                      {isTrackItem(item) ? (
                        <button 
                          onClick={(e) => handleLikeTrack(e, item.data.id)}
                          style={{ background: 'transparent', border: 'none', color: isLiked ? '#ff3366' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, transition: 'color 0.2s' }}
                        >
                          {isLiked ? Icons.heartFilled : Icons.heart} {item.data.likes_count || 0}
                        </button>
                      ) : (
                        <button style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>{Icons.heart} J'aime</button>
                      )}
                      <button 
                        onClick={() => openComments(isTrackItem(item) ? 'track' : 'post', item.data.id)}
                        style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
                      >
                        {Icons.message} Commenter
                      </button>
                      {isEventItem(item) && (
                        <a href={item.data.url || '#'} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>Billets ↗</a>
                      )}
                      {isTrackItem(item) && (
                        <button onClick={() => navigate(`/track/${item.data.id}`)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Écouter ↗</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isMobile && (
          <aside style={{ width: 320, flexShrink: 0, position: 'sticky', top: 32, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '1px', margin: '0 0 20px 0', color: '#fff', textTransform: 'uppercase' }}>Top 5 du moment</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {topTracks.map((track, index) => (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => navigate(`/track/${track.id}`)}>
                    <div style={{ fontSize: 18, color: index === 0 ? '#00d9ff' : '#333', fontWeight: 900, fontStyle: 'italic', width: 24 }}>0{index + 1}</div>
                    <div style={{ width: 44, height: 44, borderRadius: 6, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{track.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '1px', margin: '0 0 20px 0', color: '#fff', textTransform: 'uppercase' }}>Événements à venir</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {upcomingEvents.map((event) => (
                  <a key={event.id} href={event.url || '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{ fontSize: 11, color: '#00d9ff', fontWeight: 800, marginBottom: 4, letterSpacing: '0.5px' }}>{new Date(event.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
                    <div style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{event.city || event.location}</div>
                  </a>
                ))}
              </div>
            </div>
            <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 16, padding: 20 }}>
              <OnlineUsersWidget />
            </div>
          </aside>
        )}
      </div>

      {commentsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Commentaires</h2>
              <button onClick={() => setCommentsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {loadingComments ? (
                <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>Chargement...</div>
              ) : comments.length === 0 ? (
                <div style={{ color: '#666', textAlign: 'center', padding: 20, fontStyle: 'italic' }}>Aucun commentaire pour le moment.</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#00d9ff', flexShrink: 0 }}>
                      {c.profiles?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.profiles?.username || 'Anonyme'} <span style={{ color: '#666', fontWeight: 400, fontSize: 11, marginLeft: 8 }}>{formatDate(new Date(c.created_at))}</span></div>
                      <div style={{ fontSize: 14, color: '#ddd', marginTop: 4 }}>{c.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <input 
                type="text" 
                value={newComment} 
                onChange={(e) => setNewComment(e.target.value)} 
                placeholder="Ajouter un commentaire..." 
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                style={{ flex: 1, padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none' }} 
              />
              <button 
                onClick={submitComment} 
                disabled={!newComment.trim() || !user}
                style={{ padding: '12px 20px', background: '#fff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};