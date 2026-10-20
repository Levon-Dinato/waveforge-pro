// src/components/GlobalFeed.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { VideoEmbed } from './VideoEmbed';
import { useAuth } from '../contexts/AuthContext';

interface PostComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { username: string; avatar_url: string | null };
}

interface GlobalPost {
  id: string;
  content: string;
  media_type: 'text' | 'image' | 'video' | 'link' | 'iframe';
  media_url: string | null;
  created_at: string;
  profile_id: string;
  profiles?: { username: string; avatar_url: string | null };
  post_likes?: { user_id: string }[];
  post_comments?: PostComment[];
}

export const GlobalFeed: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<GlobalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});

  const fetchPosts = async () => {
    setLoading(true);
    
    // 1. On récupère d'abord les posts avec le profil de l'auteur
    const { data: postsData, error: postsError } = await supabase
      .from('artist_posts')
      .select(`
        *,
        profiles:profile_id (username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (postsError || !postsData) {
      console.error("Erreur fetch posts:", postsError);
      setLoading(false);
      return;
    }

    // 2. Pour chaque post, on récupère ses likes et ses commentaires
    const formattedPosts = await Promise.all(postsData.map(async (post: any) => {
      // Récupération des likes
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('user_id')
        .eq('post_id', post.id);

      // Récupération des commentaires + profil de l'auteur du commentaire
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select(`
          id, content, created_at, user_id,
          profiles:user_id (username, avatar_url)
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      return {
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles,
        post_likes: likesData || [],
        post_comments: (commentsData || []).map((c: any) => ({
          ...c,
          profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
        }))
      };
    }));

    setPosts(formattedPosts);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) { alert("Connecte-toi pour liker !"); return; }
    
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    }
    fetchPosts(); // Recharge pour mettre à jour l'UI
  };

  const handleComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!user) { alert("Connecte-toi pour commenter !"); return; }
    const content = commentText[postId];
    if (!content?.trim()) return;

    await supabase.from('post_comments').insert({ post_id: postId, user_id: user.id, content: content.trim() });
    setCommentText({ ...commentText, [postId]: '' }); // Vide le champ
    fetchPosts(); // Recharge pour voir le commentaire
  };

  if (loading) return <div style={{ color: '#999', fontSize: '0.8rem', textAlign: 'center' }}>Chargement du feed...</div>;
  if (posts.length === 0) return <div style={{ color: '#999', fontSize: '0.8rem', textAlign: 'center', padding: 20 }}>Aucune actualité pour le moment.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {posts.map(post => {
        const isLiked = post.post_likes?.some(like => like.user_id === user?.id);
        const likesCount = post.post_likes?.length || 0;

        return (
          <div key={post.id} style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 8, padding: 16 }}>
            
            {/* En-tête : Avatar + Nom + Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Link to={`/profil/${post.profile_id}`} style={{ textDecoration: 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#121212', overflow: 'hidden', border: '1px solid #2a2a2a' }}>
                  {post.profiles?.avatar_url ? (
                    <img src={post.profiles.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎧</div>
                  )}
                </div>
              </Link>
              <div>
                <Link to={`/profil/${post.profile_id}`} style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
                  {post.profiles?.username || 'Artiste inconnu'}
                </Link>
                <div style={{ fontSize: '0.7rem', color: '#666' }}>
                  {new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Contenu texte */}
            {post.content && post.content.trim() !== '' && (
              <div style={{ fontSize: '0.9rem', color: '#eee', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
                {post.content}
              </div>
            )}

            {/* Médias conditionnels */}
            {post.media_url && post.media_type === 'image' && (
              <img src={post.media_url} alt="" style={{ width: '100%', borderRadius: 6, border: '1px solid #2a2a2a', marginBottom: 12 }} />
            )}
            {post.media_url && post.media_type === 'video' && (
              <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #2a2a2a', marginBottom: 12 }}>
                <VideoEmbed url={post.media_url} />
              </div>
            )}
            {post.media_url && post.media_type === 'link' && (
              <a href={post.media_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '8px 12px', background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#00d9ff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', marginBottom: 12 }}>
                🔗 Voir le lien
              </a>
            )}
            {post.media_url && post.media_type === 'iframe' && (
              <div style={{ width: '100%', borderRadius: 6, overflow: 'hidden', border: '1px solid #2a2a2a', marginBottom: 12 }}>
                <iframe src={post.media_url} width="100%" height={post.media_url.includes('soundcloud') ? "166" : "300"} frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style={{ display: 'block' }} />
              </div>
            )}

            {/* ✅ BOUTONS D'INTERACTION */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid #2a2a2a', paddingTop: 12, marginTop: 8 }}>
              <button 
                onClick={() => handleLike(post.id, !!isLiked)}
                style={{ background: 'none', border: 'none', color: isLiked ? '#ff3366' : '#999', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {isLiked ? '❤️' : '🤍'} {likesCount} J'aime
              </button>
              <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                💬 {post.post_comments?.length || 0} Commentaires
              </div>
            </div>

            {/* ✅ SECTION COMMENTAIRES */}
            <div style={{ marginTop: 12, background: '#121212', borderRadius: 6, padding: 12 }}>
              {/* Liste des commentaires */}
              {post.post_comments && post.post_comments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  {post.post_comments.map(comment => (
                    <div key={comment.id} style={{ display: 'flex', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1c1c1c', overflow: 'hidden', border: '1px solid #2a2a2a', flexShrink: 0 }}>
                        {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🎧</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{comment.profiles?.username || 'Utilisateur'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#ccc' }}>{comment.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulaire d'ajout de commentaire */}
              <form onSubmit={(e) => handleComment(e, post.id)} style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  placeholder="Écrire un commentaire..."
                  value={commentText[post.id] || ''}
                  onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                  style={{ flex: 1, background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 20, padding: '6px 12px', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
                />
                <button type="submit" style={{ background: 'transparent', border: 'none', color: commentText[post.id]?.trim() ? '#00d9ff' : '#444', fontSize: '0.8rem', fontWeight: 700, cursor: commentText[post.id]?.trim() ? 'pointer' : 'default' }}>
                  Envoyer
                </button>
              </form>
            </div>

          </div>
        );
      })}
    </div>
  );
};