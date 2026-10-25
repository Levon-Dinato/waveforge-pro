// src/pages/FeedPage.tsx (Extrait avec les corrections)
// Remplace tout le fichier par ceci

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';
import { OnlineUsersWidget } from '../components/OnlineUsersWidget';

// ... (Les interfaces et Icons restent identiques)

export const FeedPage: React.FC = () => {
  const { user, username, isAdmin } = useAuth();
  const navigate = useNavigate();
  // ✅ SEUIL A 768 POUR LE FEED
  const isMobile = useIsMobile(768);
  const { play, currentTrack, isPlaying } = usePlayer();

  // ... (Tous les states restent identiques)

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', paddingBottom: 100 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '16px 12px' : '40px 24px', display: 'flex', gap: 40, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
        
        <div style={{ flex: 1, maxWidth: isMobile ? '100%' : 680, minWidth: 0, width: '100%' }}>
          {/* ... (Le contenu du feed reste identique) ... */}
        </div>

        {/* ✅ SIDEBAR DROITE DU FEED (Desktop uniquement) */}
        {!isMobile && (
          <aside style={{ width: 320, flexShrink: 0, position: 'sticky', top: 32, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '1px', margin: '0 0 20px 0', color: '#fff', textTransform: 'uppercase' }}>Top 5 du moment</h3>
              {/* ... (Top 5 code) ... */}
            </div>
            <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 16, padding: 20 }}>
              <OnlineUsersWidget />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};