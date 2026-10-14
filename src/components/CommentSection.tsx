import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Comment {
  id: string;
  track_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_username?: string;
}

interface CommentSectionProps {
  trackId: string;
}

const formatRelativeDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "a l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffH < 24) return `il y a ${diffH}h`;
  if (diffD < 7) return `il y a ${diffD}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export const CommentSection: React.FC<CommentSectionProps> = ({ trackId }) => {
  const { user, username } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  const loadComments = async () => {
    setLoading(true);
    setError(null);

    // ✅ CORRECTION : typage explicite du retour de la requête
    const { data, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('track_id', trackId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Erreur chargement commentaires:', fetchError);
      setError('Impossible de charger les commentaires');
      setLoading(false);
      return;
    }

    const rawComments: Comment[] = (data || []) as Comment[];

    // ✅ CORRECTION : typage explicite du paramètre 'c'
    const userIds = Array.from(
      new Set(rawComments.map((c: Comment) => c.user_id))
    );

    let profileMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      if (profiles) {
        // ✅ CORRECTION : typage explicite du paramètre 'p'
        profileMap = (profiles as { id: string; username: string | null }[]).reduce(
          (acc, p) => {
            acc[p.id] = p.username || 'Anonyme';
            return acc;
          },
          {} as Record<string, string>
        );
      }
    }

    // ✅ CORRECTION : typage explicite du paramètre 'c'
    const enriched: Comment[] = rawComments.map((c: Comment) => ({
      ...c,
      author_username: profileMap[c.user_id] || 'Anonyme',
    }));

    setComments(enriched);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmed = newComment.trim();
    if (!trimmed) return;
    if (trimmed.length > 500) {
      setError('Commentaire trop long (max 500 caracteres)');
      return;
    }

    setPosting(true);
    setError(null);

    try {
      const { data: inserted, error: insertError } = await supabase
        .from('comments')
        .insert({
          track_id: trackId,
          user_id: user.id,
          content: trimmed,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (inserted) {
        const enriched: Comment = {
          ...(inserted as Comment),
          author_username: username || 'Anonyme',
        };
        setComments((prev) => [...prev, enriched]);
        setNewComment('');
      }
    } catch (err: any) {
      console.error('Erreur envoi commentaire:', err);
      setError(err.message || "Erreur lors de l'envoi");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce commentaire ?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
      setComments((prev) => prev.filter((c: Comment) => c.id !== id));
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      alert('Erreur : ' + (err.message || err));
    }
  };

  return (
    <div
      style={{
        marginTop: 14,
        paddingTop: 14,
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '1px',
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        COMMENTAIRES ({comments.length})
      </div>

      {loading && (
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', padding: '8px 0' }}>
          Chargement...
        </div>
      )}

      {!loading && comments.length === 0 && (
        <div
          style={{
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.35)',
            padding: '10px 0',
            fontStyle: 'italic',
          }}
        >
          Aucun commentaire. Soyez le premier !
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {comments.map((c: Comment) => {
          const isOwn = user?.id === c.user_id;
          return (
            <div
              key={c.id}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                padding: '8px 10px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, #00d9ff, #7c5cff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                }}
              >
                🎧
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 3,
                  }}
                >
                  <Link
                    to={`/profil/${c.user_id}`}
                    style={{
                      fontSize: '0.8rem',
                      color: '#00d9ff',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    {c.author_username}
                  </Link>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {formatRelativeDate(c.created_at)}
                  </span>
                  {isOwn && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      title="Supprimer mon commentaire"
                      style={{
                        marginLeft: 'auto',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 100, 100, 0.6)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {c.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {user ? (
        <form
          onSubmit={handleSubmit}
          style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}
        >
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            maxLength={500}
            disabled={posting}
            style={{
              flex: 1,
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(0,255,255,0.25)',
              borderRadius: 6,
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={posting || !newComment.trim()}
            style={{
              padding: '8px 14px',
              background: posting || !newComment.trim() ? '#444' : '#00d9ff',
              color: '#000',
              border: 'none',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: posting || !newComment.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {posting ? '...' : 'Envoyer'}
          </button>
        </form>
      ) : (
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            background: 'rgba(0, 217, 255, 0.06)',
            border: '1px dashed rgba(0, 217, 255, 0.3)',
            borderRadius: 6,
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
          }}
        >
          <Link
            to="/auth"
            style={{
              color: '#00d9ff',
              fontWeight: 700,
              textDecoration: 'underline',
            }}
          >
            Connectez-vous
          </Link>{' '}
          pour commenter
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 8,
            fontSize: '0.75rem',
            color: '#ff8c8c',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};