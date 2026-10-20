// src/components/GlobalFeed.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { VideoEmbed } from './VideoEmbed';

interface GlobalPost {
  id: string;
  content: string;
  media_type: 'text' | 'image' | 'video' | 'link' | 'iframe';
  media_url: string | null;
  created_at: string;
  profile_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
}

export const GlobalFeed: React.FC = () => {
  const [posts, setPosts] = useState<GlobalPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalPosts = async () => {
      // On récupère les 5 derniers posts de tous les artistes
      const { data, error } = await supabase
        .from('artist_posts')
        .select(`
          *,
          profiles:profile_id (username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setPosts(data as GlobalPost[]);
      }
      setLoading(false);
    };

    fetchGlobalPosts();
  }, []);

  if (loading) return <div style={{ color: '#999', fontSize: '0.8rem', textAlign: 'center' }}>Chargement du feed...</div>;
  if (posts.length === 0) return <div style={{ color: '#999', fontSize: '0.8rem', textAlign: 'center', padding: 20 }}>Aucune actualité pour le moment.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {posts.map(post => (
        <div key={post.id} style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 8, padding: 16 }}>
          
          {/* En-tête du post : Avatar + Nom de l'artiste */}
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
          {post.content.trim() !== '' && (
            <div style={{ fontSize: '0.9rem', color: '#eee', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
              {post.content}
            </div>
          )}

          {/* Média (Image, Vidéo, Iframe, Lien) */}
          {post.media_url && post.media_type === 'image' && (
            <img src={post.media_url} alt="" style={{ width: '100%', borderRadius: 6, border: '1px solid #2a2a2a' }} />
          )}
          {post.media_url && post.media_type === 'video' && (
            <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
              <VideoEmbed url={post.media_url} />
            </div>
          )}
          {post.media_url && post.media_type === 'link' && (
            <a href={post.media_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '8px 12px', background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#00d9ff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
              🔗 Voir le lien
            </a>
          )}
          {post.media_url && post.media_type === 'iframe' && (
            <div style={{ width: '100%', borderRadius: 6, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
              <iframe
                src={post.media_url}
                width="100%"
                height={post.media_url.includes('soundcloud') ? "166" : "300"}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{ display: 'block' }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};