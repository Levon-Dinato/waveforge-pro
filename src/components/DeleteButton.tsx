// src/components/DeleteButton.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface DeleteButtonProps {
  table: 'tracks' | 'artist_posts' | 'playlists' | 'photos' | 'videos' | 'profiles' | 'comments';
  itemId: string;
  itemOwnerId: string;
  label?: string;
  onDeleted?: () => void;
  size?: 'sm' | 'md';
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({ 
  table, itemId, itemOwnerId, label = 'Supprimer', onDeleted, size = 'sm' 
}) => {
  const { user, isAdmin, isModerator } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = user?.id === itemOwnerId || isModerator;

  if (!canDelete) return null;

  const handleDelete = async () => {
    const confirmMsg = isAdmin 
      ? `⚠️ ADMIN : Supprimer définitivement ce contenu ?`
      : `Supprimer ce contenu ?`;
    
    if (!window.confirm(confirmMsg)) return;

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

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      title={isAdmin ? `${label} (Admin)` : label}
      style={{
        background: isAdmin ? 'rgba(255, 0, 0, 0.15)' : 'transparent',
        border: isAdmin ? '1px solid rgba(255, 0, 0, 0.5)' : 'none',
        color: '#ff5c5c',
        cursor: isDeleting ? 'wait' : 'pointer',
        padding: size === 'sm' ? '4px 6px' : '8px 12px',
        borderRadius: 4,
        fontSize: size === 'sm' ? 12 : 14,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 0, 0, 0.25)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = isAdmin ? 'rgba(255, 0, 0, 0.15)' : 'transparent'; }}
    >
      {isDeleting ? '⏳' : isAdmin ? '🛡️🗑️' : '🗑️'}
      {size === 'md' && ` ${isDeleting ? 'Suppression...' : label}`}
    </button>
  );
};