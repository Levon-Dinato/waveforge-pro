import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useIsMobile } from '../hooks/useIsMobile';

const PANEL_STYLE: React.CSSProperties = {
  background: 'rgba(15, 18, 28, 0.6)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 16,
  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
};

interface ProfileData {
  id: string;
  email: string;
  bio: string;
  banner_url: string;
  avatar_url: string;
  username: string;
  created_at: string;
}

export const ProfilPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isMobile = useIsMobile(768);
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ tracks: 0, likes: 0, bpm: 0 });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
        
        if (data) {
          setProfile(data);
          // Simulation de stats (à remplacer par tes vraies requêtes si besoin)
          setStats({ tracks: 83, likes: 2, bpm: 128 });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProfile();
  }, [id]);

  const isOwnProfile = user?.id === id;

  if (loading) return <div style={{ color: '#fff', textAlign: 'center', padding: 50 }}>Chargement...</div>;
  if (!profile) return <div style={{ color: '#fff', textAlign: 'center', padding: 50 }}>Profil introuvable</div>;

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1000, margin: '0 auto', fontFamily: 'monospace', color: '#fff' }}>
      
      {/* HEADER PROFIL (Bannière + Avatar + Nom) */}
      <div style={{ position: 'relative', marginBottom: 60 }}>
        {/* Bannière */}
        <div style={{
          height: isMobile ? 160 : 240,
          borderRadius: 16,
          background: profile.banner_url 
            ? `url(${profile.banner_url}) center/cover` 
            : 'linear-gradient(135deg, #0a0c14, #1a1f2e)',
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,12,20,0.9) 0%, transparent 100%)' }} />
        </div>

        {/* Avatar & Infos */}
        <div style={{ 
          position: 'absolute', 
          bottom: -40, 
          left: 32, 
          display: 'flex', 
          alignItems: 'flex-end', 
          gap: 20,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
        }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : '#1a1f2e',
            border: '4px solid #0a0c14',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, background: '#00ff88', borderRadius: '50%', border: '3px solid #0a0c14' }} />
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <h1 style={{ fontSize: 28, margin: 0, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
              {profile.username || profile.email.split('@')[0]}
              <span style={{ fontSize: 10, background: 'rgba(0, 217, 255, 0.15)', color: '#00d9ff', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(0, 217, 255, 0.3)' }}>
                PRO DJ
              </span>
            </h1>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'TRACKS', value: stats.tracks, icon: '🎵', color: '#7c5cff' },
          { label: 'LIKES', value: stats.likes, icon: '❤️', color: '#ff5c5c' },
          { label: 'BPM MOYEN', value: stats.bpm, icon: '🎧', color: '#00d9ff' },
          { label: 'MEMBRE', value: '2026', icon: '📅', color: '#ffd43b' },
        ].map((stat, i) => (
          <div key={i} style={{ ...PANEL_STYLE, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 18 }}>{stat.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, fontWeight: 700 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* BIO */}
      <div style={{ ...PANEL_STYLE, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 12, color: '#666', letterSpacing: 2, marginBottom: 12, marginTop: 0 }}>À PROPOS</h3>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: '#ccc', margin: 0, whiteSpace: 'pre-wrap' }}>
          {profile.bio || "Aucune biographie pour le moment."}
        </p>
      </div>

      {/* ACTIONS */}
      <div style={{ display: 'flex', gap: 12 }}>
        {isOwnProfile ? (
          <button onClick={() => setIsEditing(true)} style={{ 
            padding: '12px 24px', background: '#00d9ff', color: '#000', 
            border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0, 217, 255, 0.3)'
          }}>
            ✏️ Modifier mon profil
          </button>
        ) : (
          <button style={{ 
            padding: '12px 24px', background: 'transparent', color: '#fff', 
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, fontWeight: 800, cursor: 'pointer'
          }}>
            🔗 Partager le profil
          </button>
        )}
      </div>

    </div>
  );
};