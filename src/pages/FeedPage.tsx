// src/pages/FeedPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { OnlineUsersWidget } from '../components/OnlineUsersWidget';

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
  sparkles: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
};

interface DbEvent { id: string; title: string; event_date: string; location: string | null; city: string | null; url: string | null; image_url: string | null; created_at?: string; }
// ✅ Ajout de plays et downloads dans l'interface
interface Track { id: string; title: string; artist: string; genre: string; bpm: number; song_key: string | null; audio_url: string; cover_url: string | null; user_id: string; created_at: string; duration: number; peaks: number[]; likes_count?: number; plays?: number; downloads?: number; }
interface Comment { id: string; user_id: string; content: string; created_at: string; profiles?: { username: string; avatar_url: string | null } }
interface FollowedArtist { id: string; username: string; avatar_url: string | null; }

type PostData = { 
  id: string; author: string; text: string; url?: string; postType: string; date: Date; likes_count: number; profile_id: string;
  ogTitle?: string; ogDescription?: string; ogImage?: string;
};

type FeedItem = 
  | { type: 'track'; data: Track; date: Date }
  | { type: 'event'; data: DbEvent; date: Date }
  | { type: 'post'; data: PostData; date: Date };

const isTrackItem = (item: FeedItem): item is { type: 'track'; data: Track; date: Date } => item.type === 'track';
const isEventItem = (item: FeedItem): item is { type: 'event'; data: DbEvent; date: Date } => item.type === 'event';
const isPostItem = (item: FeedItem): item is { type: 'post'; data: PostData; date: Date } => item.type === 'post';

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

const linkify = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#00d9ff', textDecoration: 'underline', wordBreak: 'break-all' }}>
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
  const isMobile = useIsMobile(768);
  const { play, currentTrack, isPlaying } = usePlayer();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DbEvent[]>([]);
  const [feedMode, setFeedMode] = useState<'following' | 'discover'>('discover');
  const [followedArtists, setFollowedArtists] = useState<FollowedArtist[]>([]);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [postContent, setPostContent] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [postType, setPostType] = useState<'texte' | 'lien' | 'image' | 'video'>('texte');
  const [linkPreview, setLinkPreview] = useState<{ title: string; desc: string; image: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userPostLikes, setUserPostLikes] = useState<Record<string, boolean>>({});
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [currentCommentItem, setCurrentCommentItem] = useState<{ type: 'track' | 'post'; id: string } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    textLight: isDark ? '#dddddd' : '#333333',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    panelBg: isDark ? 'rgba(18, 18, 18, 0.65)' : 'rgba(255, 255, 255, 0.75)',
    modalBg: isDark ? '#121212' : '#ffffff',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
    avatarBg: isDark ? '#1a1a1a' : '#e5e7eb',
    btnPublishBg: isDark ? '#ffffff' : '#1a1a1a',
    btnPublishText: isDark ? '#000000' : '#ffffff',
    btnPublishDisabledBg: isDark ? '#1a1a1a' : '#e5e7eb',
    btnPublishDisabledText: isDark ? '#555555' : '#999999',
    accent: '#00d9ff',
    cardHoverBorder: isDark ? 'rgba(0, 217, 255, 0.3)' : 'rgba(0, 217, 255, 0.4)',
  };

  useEffect(() => {
    if (commentsModalOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [commentsModalOpen]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let followedUserIds: string[] = [];
        if (user) {
          const { data: followsData } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
          followedUserIds = followsData?.map(f => f.following_id) || [];
          setFollowedIds(followedUserIds);

          if (followedUserIds.length > 0) {
            const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url').in('id', followedUserIds);
            setFollowedArtists(profilesData || []);
            setFeedMode('following');
          }
        }

        const { data: tracksData } = await supabase.from('tracks').select('*').order('created_at', { ascending: false }).limit(40);
        const today = new Date().toISOString().split('T')[0];
        const { data: eventsData } = await supabase.from('events').select('*').gte('event_date', today).order('event_date', { ascending: true }).limit(10);
        const { data: postsData } = await supabase.from('artist_posts').select('*, profiles:profile_id(username)').order('created_at', { ascending: false }).limit(20);

        const combined: FeedItem[] = [];
        (tracksData || []).forEach(t => combined.push({ type: 'track', data: t as Track, date: new Date(t.created_at) }));
        (eventsData || []).forEach(e => combined.push({ type: 'event', data: e as DbEvent, date: new Date(e.created_at || e.event_date) }));
        (postsData || []).forEach(p => combined.push({ 
          type: 'post', 
          data: { 
            id: p.id, author: p.profiles?.username || 'Utilisateur', text: p.content, url: p.media_url, postType: p.media_type, 
            date: new Date(p.created_at), likes_count: p.likes_count || 0, profile_id: p.profile_id,
            ogTitle: p.og_title, ogDescription: p.og_description, ogImage: p.og_image
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

  const filteredFeedItems = useMemo(() => {
    if (feedMode === 'following' && followedIds.length > 0) {
      return feedItems.filter(item => {
        if (isTrackItem(item)) return followedIds.includes(item.data.user_id);
        if (isPostItem(item)) return followedIds.includes(item.data.profile_id);
        return false;
      });
    }
    return feedItems;
  }, [feedItems, feedMode, followedIds]);

  useEffect(() => {
    if (postType !== 'lien' || !postUrl.includes('http')) {
      setLinkPreview(null);
      return;
    }
    const fetchPreview = async () => {
      setLoadingPreview(true);
      try {
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(postUrl)}`);
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          setLinkPreview({
            title: json.data.title || '',
            desc: json.data.description || '',
            image: json.data.image?.url || json.data.logo?.url || ''
          });
        }
      } catch (err) { console.log(err); } finally { setLoadingPreview(false); }
    };
    const timer = setTimeout(fetchPreview, 800); 
    return () => clearTimeout(timer);
  }, [postUrl, postType]);

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
      isTrackItem(item) && item.data.id === trackId ? { ...item, data: { ...item.data, likes_count: (item.data.likes_count || 0) + (isLiked ? -1 : 1) } } : item
    ));
    try {
      if (isLiked) await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', trackId);
      else await supabase.from('likes').insert({ user_id: user.id, track_id: trackId });
    } catch (err) {}
  };

  const handleLikePost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!user) { navigate('/auth'); return; }
    const isLiked = userPostLikes[postId];
    setUserPostLikes(prev => ({ ...prev, [postId]: !isLiked }));
    setFeedItems(prev => prev.map(item => 
      isPostItem(item) && item.data.id === postId ? { ...item, data: { ...item.data, likes_count: (item.data.likes_count || 0) + (isLiked ? -1 : 1) } } : item
    ));
    try {
      if (isLiked) await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', postId);
      else await supabase.from('post_likes').insert({ user_id: user.id, post_id: postId });
    } catch (err) {}
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
      user_id: user.id, content: newComment.trim(),
      ...(currentCommentItem.type === 'track' ? { track_id: currentCommentItem.id } : { post_id: currentCommentItem.id })
    }).select('*, profiles:user_id(username, avatar_url)').single();
    if (!error && data) {
      setComments(prev => [...prev, data as Comment]);
      setNewComment('');
    }
  };

  const handlePublish = async () => {
    if ((!postContent.trim() && !postUrl.trim()) || !user) return;
    const { url } = getCleanUrl(postUrl);
    const dbMediaType = (postType === 'texte' || postType === 'lien') ? 'text' : postType;

    const { data, error } = await supabase.from('artist_posts').insert({
      profile_id: user.id, content: postContent || ' ', media_url: url || null, media_type: dbMediaType,
      og_title: linkPreview?.title || null, og_description: linkPreview?.desc || null, og_image: linkPreview?.image || null,
    }).select('*, profiles:profile_id(username)').single();

    if (!error && data) {
      const newItem: FeedItem = {
        type: 'post', date: new Date(data.created_at),
        data: {
          id: data.id, author: data.profiles?.username || username || 'Utilisateur', text: data.content,
          url: data.media_url, postType: data.media_type, date: new Date(data.created_at), likes_count: 0, profile_id: data.profile_id,
          ogTitle: data.og_title, ogDescription: data.og_description, ogImage: data.og_image
        }
      };
      setFeedItems(prev => [newItem, ...prev]);
      setPostContent(''); setPostUrl(''); setPostType('texte'); setLinkPreview(null);
    }
  };

  const startEditing = (post: any) => {
    setEditingPostId(post.id); setEditContent(post.text); setEditUrl(post.url || '');
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim() && !editUrl.trim()) return;
    const { url } = getCleanUrl(editUrl);
    const { error } = await supabase.from('artist_posts').update({ content: editContent || ' ', media_url: url || null }).eq('id', postId);
    if (!error) {
      setFeedItems(prev => prev.map(item => isPostItem(item) && item.data.id === postId ? { ...item, data: { ...item.data, text: editContent, url: url } } : item));
      setEditingPostId(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Supprimer définitivement ce post ?")) return;
    await supabase.from('artist_posts').delete().eq('id', postId);
    setFeedItems(prev => prev.filter(item => !(isPostItem(item) && item.data.id === postId)));
  };

  // ✅ MODIFICATION ICI : On ajoute la logique de comptage d'écoute
  const handlePlayClick = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    if (!user) {
      alert("🔒 Inscrivez-vous gratuitement pour écouter les morceaux en entier.");
      navigate('/auth');
      return;
    }
    
    const isNew = currentTrack?.id !== track.id;
    play(track);

    if (isNew && user.id !== track.user_id) {
      const listenKey = `listened_${track.id}_${user.id}`;
      const lastListen = localStorage.getItem(listenKey);
      const now = Date.now();
      
      if (!lastListen || now - parseInt(lastListen) >= 30 * 60 * 1000) {
        try {
          const { error } = await supabase.rpc('increment_play_count', { track_id_param: track.id });
          if (!error) {
            setFeedItems(prev => prev.map(item => 
              isTrackItem(item) && item.data.id === track.id 
                ? { ...item, data: { ...item.data, plays: (item.data.plays || 0) + 1 } } 
                : item
            ));
            localStorage.setItem(listenKey, now.toString());
          }
        } catch (err) { console.error(err); }
      }
    }
  };

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', transition: 'background 0.3s ease, color 0.3s ease' }}>
      
      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto', 
        padding: isMobile ? '16px 12px' : '24px', 
        display: 'flex', 
        gap: 40, 
        flexDirection: isMobile ? 'column' : 'row',
        height: isMobile ? 'auto' : 'calc(100vh - 120px)',
      }}>
        
        <div style={{ 
          flex: 1, 
          maxWidth: isMobile ? '100%' : 680, 
          minWidth: 0, 
          width: '100%',
          overflowY: isMobile ? 'visible' : 'auto',
          paddingRight: isMobile ? 0 : 20,
          paddingBottom: currentTrack ? 100 : 20
        }}>
          
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>Fil d'<span style={{ color: colors.accent }}>actualité</span></h1>
            <p style={{ color: colors.textMuted, fontSize: 14, marginTop: 8 }}>Toutes les dernières pépites et les prochains événements.</p>
          </div>

          {user && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: colors.panelBg, padding: 6, borderRadius: 12, border: `1px solid ${colors.border}`, width: 'fit-content', backdropFilter: 'blur(20px)' }}>
              <button onClick={() => setFeedMode('following')} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: feedMode === 'following' ? colors.accent : 'transparent', color: feedMode === 'following' ? '#000' : colors.textMuted, fontWeight: 800, fontSize: 13, transition: 'all 0.2s' }}>
                Mon Feed {followedArtists.length > 0 && `(${followedArtists.length})`}
              </button>
              <button onClick={() => setFeedMode('discover')} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: feedMode === 'discover' ? colors.accent : 'transparent', color: feedMode === 'discover' ? '#000' : colors.textMuted, fontWeight: 800, fontSize: 13, transition: 'all 0.2s' }}>
                Découverte
              </button>
            </div>
          )}

          {feedMode === 'following' && followedArtists.length > 0 && (
            <div style={{ marginBottom: 24, background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 16, backdropFilter: 'blur(20px)' }}>
              <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', margin: '0 0 16px 0', color: colors.textMuted, textTransform: 'uppercase' }}>Artistes que tu suis</h3>
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
                {followedArtists.map(artist => (
                  <div key={artist.id} onClick={() => navigate(`/premium/${artist.username}`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : colors.avatarBg, border: `2px solid ${colors.accent}`, boxShadow: `0 0 15px ${colors.accent}40` }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: colors.textMain, whiteSpace: 'nowrap', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {feedMode === 'following' && followedArtists.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: colors.panelBg, border: `1px dashed ${colors.border}`, borderRadius: 16, marginBottom: 24, backdropFilter: 'blur(20px)' }}>
              <div style={{ color: colors.textMuted, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{Icons.music}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px 0', color: colors.textMain }}>Tu ne suis encore personne</h3>
              <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>Découvre des artistes et clique sur "Suivre" sur leur profil.</p>
              <button onClick={() => setFeedMode('discover')} style={{ padding: '10px 20px', background: colors.accent, color: '#000', borderRadius: 8, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Explorer la découverte</button>
            </div>
          )}

          {user && (
            <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: isMobile ? 16 : 24, marginBottom: 32, backdropFilter: 'blur(20px)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', background: colors.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: colors.accent, border: `1px solid ${colors.border}`, fontSize: 18 }}>
                  {(username || user.email)?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                  <textarea placeholder="Quoi de neuf ? Publie une actu..." value={postContent} onChange={(e) => setPostContent(e.target.value)} rows={2} style={{ background: 'transparent', border: 'none', color: colors.textMain, fontSize: 15, outline: 'none', resize: 'vertical', fontFamily: 'inherit', width: '100%', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }} />
                  
                  {postType !== 'texte' && (
                    <input type="text" placeholder={postType === 'image' ? "Lien direct de l'image (https://...)" : "Lien YouTube, Twitch, Facebook..."} value={postUrl} onChange={(e) => setPostUrl(e.target.value)} style={{ padding: '12px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 12, color: colors.textMain, fontSize: 13, outline: 'none', width: '100%', overflowWrap: 'anywhere' }} />
                  )}

                  {postType === 'lien' && loadingPreview && <div style={{ fontSize: 12, color: colors.accent, fontWeight: 600 }}>Chargement de l'aperçu...</div>}
                  {postType === 'lien' && linkPreview && (
                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden', background: colors.inputBg, display: 'flex', flexDirection: 'column' }}>
                      {linkPreview.image && <img src={linkPreview.image} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />}
                      <div style={{ padding: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: colors.textMain, wordBreak: 'break-word' }}>{linkPreview.title}</div>
                        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, wordBreak: 'break-word' }}>{linkPreview.desc}</div>
                      </div>
                    </div>
                  )}

                  <div style={{ height: 1, background: colors.border, margin: '4px 0' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {(['texte', 'lien', 'image', 'video'] as const).map((type) => (
                        <button key={type} onClick={() => { setPostType(type); setPostUrl(''); setLinkPreview(null); }} style={{ background: 'transparent', border: 'none', color: postType === type ? colors.accent : colors.textMuted, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', padding: 0, letterSpacing: '0.5px' }}>
                          {type}
                        </button>
                      ))}
                    </div>
                    <button onClick={handlePublish} disabled={!postContent.trim() && !postUrl.trim()} style={{ background: (postContent.trim() || postUrl.trim()) ? colors.btnPublishBg : colors.btnPublishDisabledBg, color: (postContent.trim() || postUrl.trim()) ? colors.btnPublishText : colors.btnPublishDisabledText, border: 'none', padding: '10px 24px', borderRadius: 20, fontWeight: 800, fontSize: 13, cursor: (postContent.trim() || postUrl.trim()) ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                      Publier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', color: colors.textMuted, padding: 40 }}>Chargement...</div>
          ) : filteredFeedItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: colors.panelBg, border: `1px dashed ${colors.border}`, borderRadius: 16, backdropFilter: 'blur(20px)' }}>
              <div style={{ color: colors.border, marginBottom: 16 }}>{Icons.music}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>{feedMode === 'following' ? "Rien de nouveau chez tes artistes" : "Le feed est vide"}</h3>
              {feedMode === 'following' && <p style={{ color: colors.textMuted, fontSize: 13 }}>Reviens plus tard ou découvre d'autres artistes.</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {filteredFeedItems.map((item, index) => {
                
                if (isPostItem(item)) {
                  const { isYoutube, url: cleanUrl } = getCleanUrl(item.data.url || '');
                  const isLiked = userPostLikes[item.data.id] || false;
                  const isEditing = editingPostId === item.data.id;
                  const hasOgData = !!item.data.ogImage;

                  return (
                    <div key={`post-${item.data.id}-${index}`} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 20, overflow: 'hidden', backdropFilter: 'blur(20px)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = colors.cardHoverBorder; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'none'; }}>
                      
                      <div style={{ padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                          <div className="avatar-circle" onClick={() => navigate(`/profil/${item.data.profile_id}`)} style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', background: colors.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: colors.accent, cursor: 'pointer', fontSize: 18, border: `1px solid ${colors.border}` }}>
                            {item.data.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: colors.textMain, cursor: 'pointer' }} onClick={() => navigate(`/profil/${item.data.profile_id}`)}>{item.data.author}</div>
                            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{formatDate(item.date)}</div>
                          </div>
                        </div>
                        
                        {!isEditing && (isAdmin || user?.id === item.data.profile_id) && (
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => startEditing(item.data)} style={{ background: 'transparent', border: 'none', color: colors.accent, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Modifier</button>
                            <button onClick={() => handleDeletePost(item.data.id)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Supprimer</button>
                          </div>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4} style={{ width: '100%', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 12, color: colors.textMain, padding: 16, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                          {item.data.postType !== 'text' && <input type="text" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="Lien du média" style={{ width: '100%', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 12, color: colors.textMain, padding: 16, fontSize: 13, outline: 'none' }} />}
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => handleSaveEdit(item.data.id)} style={{ padding: '10px 20px', background: colors.accent, color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Enregistrer</button>
                            <button onClick={() => setEditingPostId(null)} style={{ padding: '10px 20px', background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '0 20px 16px', fontSize: 15, color: colors.textLight, whiteSpace: 'pre-wrap', lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {linkify(item.data.text)}
                        </div>
                      )}

                      {!isEditing && (
                        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 24 }}>
                          <button onClick={(e) => handleLikePost(e, item.data.id)} style={{ background: 'transparent', border: 'none', color: isLiked ? '#ff3366' : colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                            {isLiked ? Icons.heartFilled : Icons.heart} {item.data.likes_count || 0}
                          </button>
                          <button onClick={() => openComments('post', item.data.id)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                            {Icons.message} Commenter
                          </button>
                        </div>
                      )}

                      {!isEditing && hasOgData && (
                        <a href={cleanUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', background: colors.inputBg, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, textDecoration: 'none', color: colors.textMain }}>
                          {item.data.ogImage && <img src={item.data.ogImage} alt={item.data.ogTitle} style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }} />}
                          <div style={{ padding: '16px 20px' }}>
                            {item.data.ogTitle && <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{item.data.ogTitle}</div>}
                            {item.data.ogDescription && <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.5 }}>{item.data.ogDescription}</div>}
                            <div style={{ fontSize: 11, color: colors.accent, marginTop: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>{new URL(cleanUrl).hostname}</div>
                          </div>
                        </a>
                      )}

                      {!isEditing && !hasOgData && item.data.postType === 'image' && cleanUrl && (
                        <div style={{ width: '100%', maxHeight: 400, background: '#000', display: 'flex', justifyContent: 'center', borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }}>
                          <img src={cleanUrl} alt="Post" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
                        </div>
                      )}

                      {!isEditing && !hasOgData && item.data.postType === 'text' && cleanUrl && (
                        <a href={cleanUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', background: colors.inputBg, color: colors.accent, textDecoration: 'none', fontSize: 13, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, wordBreak: 'break-all', fontWeight: 600 }}>
                          {Icons.link} {cleanUrl}
                        </a>
                      )}

                      {!isEditing && item.data.postType === 'video' && isYoutube && cleanUrl && (
                        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000', borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }}>
                          <iframe src={cleanUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen title="YouTube" scrolling="no" />
                        </div>
                      )}
                    </div>
                  );
                }
                
                const authorName = isTrackItem(item) ? item.data.artist : 'Organisateur';
                const isThisPlaying = isTrackItem(item) && currentTrack?.id === item.data.id && isPlaying;
                const isLiked = isTrackItem(item) && userLikes[item.data.id];
                
                return (
                  <div key={`${item.type}-${item.data.id}-${index}`} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 20, overflow: 'hidden', backdropFilter: 'blur(20px)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = colors.cardHoverBorder; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'none'; }}>
                    <div style={{ padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div className="avatar-circle" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', background: colors.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.type === 'track' ? colors.accent : '#ff3366', fontWeight: 'bold', fontSize: 18, border: `1px solid ${colors.border}` }}>
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: colors.textMain }}>
                            {authorName} <span style={{ color: colors.textMuted, fontWeight: 500, fontSize: 13 }}>{item.type === 'track' ? 'a partagé un son' : 'a créé un événement'}</span>
                          </div>
                          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{formatDate(item.date)}</div>
                        </div>
                      </div>
                    </div>

                    {isTrackItem(item) && (
                      <>
                        <div style={{ padding: '0 20px 16px', fontSize: 15, color: colors.textLight }}>
                          Découvrez le nouveau son : <strong style={{ color: colors.textMain }}>{item.data.title}</strong>
                        </div>
                        
                        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 24 }}>
                          <button onClick={(e) => handleLikeTrack(e, item.data.id)} style={{ background: 'transparent', border: 'none', color: isLiked ? '#ff3366' : colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                            {isLiked ? Icons.heartFilled : Icons.heart} {item.data.likes_count || 0}
                          </button>
                          <button onClick={() => openComments('track', item.data.id)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                            {Icons.message} Commenter
                          </button>
                        </div>

                        <div style={{ position: 'relative', width: '100%', height: isMobile ? 220 : 360, background: item.data.cover_url ? `url(${item.data.cover_url}) center/cover` : colors.inputBg, cursor: 'pointer', borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }} onClick={() => navigate(`/track/${item.data.id}`)}>
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <button onClick={(e) => handlePlayClick(e, item.data)} style={{ width: 72, height: 72, borderRadius: '50%', background: isThisPlaying ? colors.accent : 'rgba(255,255,255,0.1)', border: isThisPlaying ? 'none' : '1px solid rgba(255,255,255,0.4)', color: isThisPlaying ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)', boxShadow: isThisPlaying ? `0 0 30px ${colors.accent}80` : 'none' }} onMouseEnter={e => { if (!isThisPlaying) e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }} onMouseLeave={e => { if (!isThisPlaying) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}>
                              {isThisPlaying ? Icons.pause : Icons.play}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {isEventItem(item) && (
                      <>
                        <div style={{ padding: '0 20px 16px', fontSize: 15, color: colors.textLight }}>Nouvel événement : <strong style={{ color: colors.textMain }}>{item.data.title}</strong></div>
                        {item.data.image_url ? (
                          <div style={{ width: '100%', aspectRatio: '16 / 9', background: `url(${item.data.image_url}) center/cover`, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }} />
                        ) : (
                          <div style={{ width: '100%', height: 160, background: colors.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.border, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }}>{Icons.calendar}</div>
                        )}
                        <div style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.accent, fontWeight: 800, marginBottom: 8 }}>{Icons.calendar} {new Date(item.data.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: colors.textMuted }}>{Icons.mapPin} {item.data.location} {item.data.city ? `, ${item.data.city}` : ''}</div>
                        </div>
                      </>
                    )}

                    {isTrackItem(item) && (
                      <div style={{ padding: '16px 20px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => navigate(`/track/${item.data.id}`)} style={{ background: 'transparent', border: 'none', color: colors.accent, cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>Écouter ↗</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isMobile && (
          <aside style={{ 
            width: 320, 
            flexShrink: 0,
            height: '100%',
            overflowY: 'auto',
            paddingRight: 10
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div style={{ background: `linear-gradient(135deg, ${colors.accent}15, transparent 60%), ${colors.panelBg}`, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, backdropFilter: 'blur(20px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ color: colors.accent }}>{Icons.sparkles}</div>
                  <h3 style={{ fontSize: 14, fontWeight: 900, color: colors.textMain, margin: 0 }}>Bienvenue sur DropZone</h3>
                </div>
                <p style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.5, margin: '0 0 16px 0' }}>
                  Découvre les meilleurs sons, partage tes propres tracks et connecte-toi avec la communauté.
                </p>
              </div>

              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, backdropFilter: 'blur(20px)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '1px', margin: '0 0 20px 0', color: colors.textMain, textTransform: 'uppercase' }}>Top 5 du moment</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {topTracks.map((track, index) => (
                    <div 
                      key={track.id} 
                      style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'transform 0.2s' }} 
                      onClick={() => navigate(`/track/${track.id}`)}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      <div style={{ 
                        fontSize: 24, 
                        background: index === 0 ? `linear-gradient(135deg, ${colors.accent}, #a855f7)` : 'transparent',
                        WebkitBackgroundClip: index === 0 ? 'text' : 'unset',
                        WebkitTextFillColor: index === 0 ? 'transparent' : colors.textMuted,
                        color: index === 0 ? 'transparent' : colors.textMuted,
                        fontWeight: 900, 
                        fontStyle: 'italic', 
                        width: 32, 
                        textAlign: 'center' 
                      }}>
                        0{index + 1}
                      </div>
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.inputBg, flexShrink: 0, border: `1px solid ${colors.border}`, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                        <div style={{ fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{track.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, backdropFilter: 'blur(20px)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '1px', margin: '0 0 20px 0', color: colors.textMain, textTransform: 'uppercase' }}>Événements à venir</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {upcomingEvents.map((event) => (
                    <a 
                      key={event.id} 
                      href={event.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        textDecoration: 'none', 
                        padding: 16, 
                        borderRadius: 12, 
                        background: colors.inputBg, 
                        borderLeft: `3px solid ${colors.accent}`, 
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${colors.accent}10`; e.currentTarget.style.borderLeftWidth = '6px'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = colors.inputBg; e.currentTarget.style.borderLeftWidth = '3px'; }}
                    >
                      <div style={{ fontSize: 11, color: colors.accent, fontWeight: 900, marginBottom: 6, letterSpacing: '1px' }}>
                        {new Date(event.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 }}>{event.city || event.location}</div>
                    </a>
                  ))}
                </div>
              </div>

              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, backdropFilter: 'blur(20px)' }}>
                <OnlineUsersWidget />
              </div>

              <div style={{ padding: '0 24px', fontSize: 11, color: colors.textMuted, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span>© {new Date().getFullYear()} DropZone.dj</span>
                <span>•</span>
                <span style={{ cursor: 'pointer' }}>Confidentialité</span>
                <span>•</span>
                <span style={{ cursor: 'pointer' }}>CGU</span>
              </div>

            </div>
          </aside>
        )}
      </div>

      {commentsModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setCommentsModalOpen(false)}>
          <div style={{ background: colors.modalBg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, width: '100%', maxWidth: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: colors.textMain }}>Commentaires</h2>
              <button onClick={() => setCommentsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20, paddingRight: 10 }}>
              {loadingComments ? (
                <div style={{ color: colors.textMuted, textAlign: 'center', padding: 20 }}>Chargement...</div>
              ) : comments.length === 0 ? (
                <div style={{ color: colors.textMuted, textAlign: 'center', padding: 20, fontStyle: 'italic' }}>Aucun commentaire.</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                    <div className="avatar-circle" style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '50%', background: colors.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: colors.accent, border: `1px solid ${colors.border}` }}>
                      {c.profiles?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: colors.textMain }}>{c.profiles?.username || 'Anonyme'} <span style={{ color: colors.textMuted, fontWeight: 500, fontSize: 11, marginLeft: 8 }}>{formatDate(new Date(c.created_at))}</span></div>
                      <div style={{ fontSize: 14, color: colors.textLight, marginTop: 4, lineHeight: 1.5 }}>{c.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ajouter un commentaire..." onKeyDown={(e) => e.key === 'Enter' && submitComment()} style={{ flex: 1, padding: '12px 16px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 30, color: colors.textMain, outline: 'none', fontSize: 14 }} />
              <button onClick={submitComment} disabled={!newComment.trim() || !user} style={{ padding: '12px 24px', background: colors.accent, color: '#000', border: 'none', borderRadius: 30, fontWeight: 800, cursor: 'pointer', fontSize: 13, opacity: (!newComment.trim() || !user) ? 0.5 : 1 }}>Envoyer</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};