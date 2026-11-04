// src/pages/TrackPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlayer } from '../contexts/PlayerContext';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string; avatar_url: string | null } | null;
}

export const TrackPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { play, currentTrack, isPlaying, togglePlay } = usePlayer();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [track, setTrack] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#666666',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
    accent: '#00d9ff',
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Charger le son
      const { data: trackData } = await supabase
        .from('tracks')
        .select('*, profiles(username, avatar_url)')
        .eq('id', id)
        .single();
      
      if (trackData) setTrack(trackData);

      // Charger les commentaires
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar_url)')
        .eq('track_id', id)
        .order('created_at', { ascending: false });
      
      if (commentsData) setComments(commentsData);

      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  const handlePlay = () => {
    if (!user) { navigate('/auth'); return; }
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      play({
        id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url,
        cover_url: track.cover_url, user_id: track.user_id, duration: track.duration,
        peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre,
        player_bg_image_url: track.player_bg_image_url, player_bg_color: track.player_bg_color
      });
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/auth'); return; }
    if (!newComment.trim()) return;

    setPosting(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ track_id: track.id, user_id: user.id, content: newComment.trim() })
        .select('*, profiles(username, avatar_url)')
        .single();

      if (error) throw error;
      
      setComments([data, ...comments]);
      setNewComment('');
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Supprimer ce commentaire ?")) return;
    await supabase.from('comments').delete().eq('id', commentId);
    setComments(comments.filter(c => c.id !== commentId));
  };

  if (loading) return <div style={{ background: colors.bg, minHeight: '100vh', padding: 40, color: colors.textMain, textAlign: 'center' }}>Chargement...</div>;
  if (!track) return <div style={{ background: colors.bg, minHeight: '100vh', padding: 40, color: colors.textMain, textAlign: 'center' }}>Son introuvable.</div>;

  const themeColor = track.profiles?.theme_color || '#00d9ff';
  const isCurrent = currentTrack?.id === track.id && isPlaying;

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', paddingBottom: 100 }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
        
        {/* BOUTON RETOUR */}
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 14, fontWeight: 700 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Retour
        </button>

        {/* HEADER DU SON */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap' }}>
          <div style={{ width: 220, height: 220, borderRadius: 16, background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.border, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: `1px solid ${colors.border}` }} />
          
          <div style={{ flex: 1, minWidth: 250 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: themeColor, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 8 }}>{track.genre || 'Musique'}</div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, margin: '0 0 12px 0', letterSpacing: '-0.03em' }}>{track.title}</h1>
            <Link to={`/premium/${track.profiles?.username}`} style={{ fontSize: 18, color: colors.textMuted, textDecoration: 'none', fontWeight: 600, display: 'block', marginBottom: 24 }}>
              {track.profiles?.username || track.artist}
            </Link>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <button onClick={handlePlay} style={{ padding: '12px 32px', borderRadius: 30, background: isCurrent ? themeColor : colors.textMain, color: isCurrent ? '#000' : colors.bg, border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {isCurrent ? (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Pause</>
                ) : (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Écouter</>
                )}
              </button>
              
              <div style={{ display: 'flex', gap: 12, fontSize: 13, color: colors.textMuted, fontWeight: 600 }}>
                {track.bpm && <span>• {track.bpm} BPM</span>}
                {track.song_key && <span>• {track.song_key}</span>}
                <span>• {track.plays || 0} écoutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION COMMENTAIRES */}
        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Commentaires ({track.comments_count || 0})</h2>

          {/* Formulaire d'ajout */}
          {user ? (
            <form onSubmit={handlePostComment} style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: colors.inputBg, border: `1px solid ${colors.border}`, flexShrink: 0, overflow: 'hidden' }}>
                {/* Avatar de l'utilisateur connecté (si dispo) */}
              </div>
              <div style={{ flex: 1 }}>
                <textarea 
                  value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder="Laisse un commentaire sur ce son..." 
                  rows={2}
                  style={{ width: '100%', padding: 16, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 12, color: colors.textMain, fontSize: 14, resize: 'vertical', outline: 'none' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button type="submit" disabled={posting || !newComment.trim()} style={{ padding: '8px 24px', background: themeColor, color: '#000', border: 'none', borderRadius: 20, fontWeight: 800, cursor: posting ? 'wait' : 'pointer', opacity: posting || !newComment.trim() ? 0.5 : 1 }}>
                    {posting ? 'Envoi...' : 'Publier'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div style={{ padding: 24, background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 12, textAlign: 'center', marginBottom: 40 }}>
              <p style={{ margin: '0 0 16px 0', color: colors.textMuted, fontSize: 14 }}>Connecte-toi pour laisser un commentaire.</p>
              <Link to="/auth" style={{ padding: '8px 24px', background: colors.textMain, color: colors.bg, borderRadius: 20, textDecoration: 'none', fontWeight: 800, fontSize: 14 }}>Se connecter</Link>
            </div>
          )}

          {/* Liste des commentaires */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textMuted, fontStyle: 'italic', padding: 20 }}>Aucun commentaire pour le moment. Sois le premier !</div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} style={{ display: 'flex', gap: 16 }}>
                  <Link to={`/premium/${comment.profiles?.username}`} style={{ width: 40, height: 40, borderRadius: '50%', background: comment.profiles?.avatar_url ? `url(${comment.profiles.avatar_url}) center/cover` : colors.border, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                      <Link to={`/premium/${comment.profiles?.username}`} style={{ fontSize: 14, fontWeight: 800, color: colors.textMain, textDecoration: 'none' }}>{comment.profiles?.username || 'Artiste'}</Link>
                      <span style={{ fontSize: 12, color: colors.textMuted }}>{new Date(comment.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {user && user.id === comment.user_id && (
                        <button onClick={() => handleDeleteComment(comment.id)} style={{ background: 'transparent', border: 'none', color: '#ff3366', cursor: 'pointer', fontSize: 11, fontWeight: 700, marginLeft: 'auto' }}>Supprimer</button>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 15, color: colors.textMuted, lineHeight: 1.5 }}>{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};