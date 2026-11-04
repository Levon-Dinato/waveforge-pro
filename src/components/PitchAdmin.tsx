// src/components/PitchAdmin.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

const Icons = {
  play: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  check: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  x: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  trash: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
};

export const PitchAdmin: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [pitches, setPitches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    border: isDark ? '#222222' : '#e5e7eb',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
  };

  const fetchPitches = async () => {
    try {
      const { data, error } = await supabase
        .from('pitch_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPitches(data || []);
    } catch (err) {
      console.error("Erreur chargement pitchs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPitches();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('pitch_submissions')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      setPitches(pitches.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (err) {
      alert("Erreur lors de la mise à jour du statut.");
    }
  };

  const deletePitch = async (id: string) => {
    if (!window.confirm("Supprimer définitivement ce pitch ?")) return;
    try {
      await supabase.from('pitch_submissions').delete().eq('id', id);
      setPitches(pitches.filter(p => p.id !== id));
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) return <div style={{ color: colors.textMain, padding: 20 }}>Chargement des pitchs...</div>;

  return (
    <div style={{ background: colors.panelBg, padding: 24, borderRadius: 16, border: `1px solid ${colors.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: colors.textMain, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          🎵 Pitchs Playlists ({pitches.length})
        </h2>
        <button onClick={fetchPitches} style={{ background: 'transparent', border: 'none', color: '#00d9ff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Rafraîchir</button>
      </div>

      {pitches.length === 0 ? (
        <p style={{ color: colors.textMuted, textAlign: 'center', padding: 40 }}>Aucun pitch pour le moment.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pitches.map((pitch) => (
            <div key={pitch.id} style={{ 
              background: colors.bg, padding: 16, borderRadius: 12, border: `1px solid ${colors.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: colors.textMain }}>{pitch.track_title}</span>
                  <span style={{ fontSize: 10, background: pitch.status === 'pending' ? '#f9731620' : '#10b98120', color: pitch.status === 'pending' ? '#f97316' : '#10b981', padding: '2px 8px', borderRadius: 12, fontWeight: 800, textTransform: 'uppercase' }}>
                    {pitch.status === 'pending' ? 'En attente' : 'Accepté'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: colors.textMuted }}>Par <strong style={{ color: colors.textMain }}>{pitch.artist_name}</strong> • {formatDate(pitch.created_at)}</div>
                {pitch.message && <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 8, fontStyle: 'italic' }}>"{pitch.message}"</div>}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <a href={pitch.track_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#00d9ff', color: '#000', borderRadius: 8, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
                  {Icons.play} Écouter
                </a>
                
                {pitch.status !== 'accepted' && (
                  <button onClick={() => updateStatus(pitch.id, 'accepted')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                    {Icons.check} Accepter
                  </button>
                )}
                
                <button onClick={() => deletePitch(pitch.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'transparent', color: '#ff5c5c', border: '1px solid rgba(255, 92, 92, 0.3)', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                  {Icons.trash}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};