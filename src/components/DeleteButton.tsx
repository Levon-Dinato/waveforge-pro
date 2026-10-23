// src/components/DeleteButton.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// ✅ Icônes SVG Minimalistes
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

interface DeleteButtonProps {
  table: 'tracks' | 'artist_posts' | 'playlists' | 'photos' | 'videos' | 'profiles' | 'comments';
  itemId: string;
  itemOwnerId: string;
  label?: string;
  onDeleted?: () => void;
  size?: 'sm' | 'md';
  /** ✅ Chemin vers la page d'édition (ex: /edit/track/{id}) */
  editPath?: string;
}

// ✅ Style commun aux boutons d'action
const ACTION_BTN: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: '6px',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontSize: 13,
  transition: 'all 0.2s ease',
  cursor: 'pointer',
};

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  table, itemId, itemOwnerId, label = 'Supprimer', onDeleted, size = 'sm', editPath
}) => {
  const navigate = useNavigate();
  const { user, isAdmin, isModerator } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [hoverDelete, setHoverDelete] = useState(false);
  const [hoverEdit, setHoverEdit] = useState(false);

  // On peut supprimer/modifier si on est l'auteur ou admin/modo
  const canEdit = user?.id === itemOwnerId || isModerator;
  if (!canEdit) return null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!window.confirm(`Supprimer définitivement ce contenu ?`)) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from(table).delete().eq('id', itemId);
      if (error) throw error;
      onDeleted?.();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editPath) {
      navigate(editPath);
    } else {
      // Fallback : navigation par défaut selon la table
      const routes: Record<string, string> = {
        tracks: `/edit/track/${itemId}`,
        artist_posts: `/edit/post/${itemId}`,
        playlists: `/edit/playlist/${itemId}`,
        photos: `/edit/photo/${itemId}`,
        videos: `/edit/video/${itemId}`,
        profiles: `/settings`,
        comments: `/feed`,
      };
      navigate(routes[table] || '/');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {/* ✅ Bouton Modifier */}
      <button
        onClick={handleEdit}
        onMouseEnter={() => setHoverEdit(true)}
        onMouseLeave={() => setHoverEdit(false)}
        title="Modifier"
        style={{
          ...ACTION_BTN,
          color: hoverEdit ? '#fff' : '#555',
        }}
      >
        <PencilIcon />
        {size === 'md' && <span>Modifier</span>}
      </button>

      {/* ✅ Bouton Supprimer */}
      <button
        onClick={handleDelete}
        onMouseEnter={() => setHoverDelete(true)}
        onMouseLeave={() => setHoverDelete(false)}
        disabled={isDeleting}
        title={isAdmin ? `${label} (Admin)` : label}
        style={{
          ...ACTION_BTN,
          color: isDeleting ? '#444' : (hoverDelete ? '#fff' : '#555'),
          cursor: isDeleting ? 'wait' : 'pointer',
          opacity: isDeleting ? 0.5 : 1,
        }}
      >
        {isDeleting ? (
          <span style={{ fontSize: 14 }}>⏳</span>
        ) : (
          <>
            <TrashIcon />
            {size === 'md' && <span>{label}</span>}
          </>
        )}
      </button>
    </div>
  );
};