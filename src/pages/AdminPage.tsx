// src/pages/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { PitchAdmin } from '../components/PitchAdmin';

const Icons = {
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  music: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  chart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  trash: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  star: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
  search: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
};

type Tab = 'stats' | 'users' | 'tracks' | 'pitches';

export const AdminPage: React.FC = () => {
  const { theme } = useTheme();
  const { isAdmin, user } = useAuth();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [users, setUsers] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    border: isDark ? '#222222' : '#e5e7eb',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
    accent: '#00d9ff',
  };

  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Charger les utilisateurs
        const { data: usersData } = await supabase.from('profiles').select('*').order('username');
        if (usersData) setUsers(usersData);

        // Charger tous les sons
        const { data: tracksData } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
        if (tracksData) setTracks(tracksData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAdmin]);

  // --- ACTIONS ---
  const togglePremium = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await supabase.from('profiles').update({ is_premium: newStatus }).eq('id', userId);
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, is_premium: newStatus } : u));
    } else {
      alert("Erreur lors de la modification : " + error.message);
    }
  };

  const deleteTrack = async (track: any) => {
    if (!window.confirm(`Supprimer définitivement "${track.title}" ?`)) return;
    
    try {
      // 1. Supprimer le fichier audio du Storage
      if (track.audio_url) {
        const audioPath = track.audio_url.split(`/${AUDIO_BUCKET}/`)[1];
        if (audioPath) await supabase.storage.from(AUDIO_BUCKET).remove([audioPath]);
      }
      
      // 2. Supprimer la cover du Storage
      if (track.cover_url) {
        const coverPath = track.cover_url.split(`/${AUDIO_BUCKET}/`)[1];
        if (coverPath) await supabase.storage.from(AUDIO_BUCKET).remove([coverPath]);
      }

      // 3. Supprimer de la base de données
      await supabase.from('tracks').delete().eq('id', track.id);
      
      setTracks(tracks.filter(t => t.id !== track.id));
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  // --- FILTRES ---
  const filteredUsers = users.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()));
  const filteredTracks = tracks.filter(t => t.title?.toLowerCase().includes(search.toLowerCase()) || t.artist?.toLowerCase().includes(search.toLowerCase()));

  // --- RENDER ---
  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: colors.textMain }}>
        <h1>Accès refusé</h1>
        <p style={{ color: colors.textMuted }}>Vous devez être administrateur pour voir cette page.</p>
      </div>
    );
  }

  const StatsCard = ({ title, value, icon, color }: any) => (
    <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24, flex: 1, minWidth: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' }}>{title}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color: colors.textMain }}>{value}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: colors.textMain, margin: 0 }}>Panel Administrateur</h1>
        <p style={{ color: colors.textMuted, marginTop: 8 }}>Gérez votre plateforme DropZone.</p>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { id: 'stats', label: 'Vue d\'ensemble', icon: Icons.chart },
          { id: 'users', label: 'Utilisateurs', icon: Icons.users },
          { id: 'tracks', label: 'Tous les sons', icon: Icons.music },
          { id: 'pitches', label: 'Pitchs', icon: Icons.star },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as Tab); setSearch(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 8, border: `1px solid ${activeTab === tab.id ? colors.accent : colors.border}`,
              background: activeTab === tab.id ? `${colors.accent}15` : colors.panelBg,
              color: activeTab === tab.id ? colors.accent : colors.textMain,
              fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Barre de recherche (pour Users et Tracks) */}
      {(activeTab === 'users' || activeTab === 'tracks') && (
        <div style={{ position: 'relative', marginBottom: 24, maxWidth: 400 }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }}>{Icons.search}</div>
          <input 
            type="text" 
            placeholder={`Rechercher un ${activeTab === 'users' ? 'utilisateur' : 'son'}...`}
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 14px 12px 40px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none' }}
          />
        </div>
      )}

      {loading ? (
        <div style={{ color: colors.textMuted, textAlign: 'center', padding: 60 }}>Chargement des données...</div>
      ) : (
        <>
          {/* --- ONGLET STATS --- */}
          {activeTab === 'stats' && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <StatsCard title="Total Artistes" value={users.length} icon={Icons.users} color="#00d9ff" />
              <StatsCard title="Artistes Premium" value={users.filter(u => u.is_premium).length} icon={Icons.star} color="#fbbf24" />
              <StatsCard title="Total Sons" value={tracks.length} icon={Icons.music} color="#ec4899" />
              <StatsCard title="Likes Totaux" value={tracks.reduce((acc, t) => acc + (t.likes_count || 0), 0)} icon={Icons.star} color="#10b981" />
            </div>
          )}

          {/* --- ONGLET USERS --- */}
          {activeTab === 'users' && (
            <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ padding: '16px', fontSize: 12, color: colors.textMuted, textTransform: 'uppercase' }}>Artiste</th>
                    <th style={{ padding: '16px', fontSize: 12, color: colors.textMuted, textTransform: 'uppercase' }}>Statut</th>
                    <th style={{ padding: '16px', fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: u.avatar_url ? `url(${u.avatar_url}) center/cover` : '#333', border: `1px solid ${colors.border}` }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: colors.textMain }}>{u.username}</div>
                          <div style={{ fontSize: 12, color: colors.textMuted }}>ID: {u.id.substring(0, 8)}...</div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: u.is_premium ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.05)', color: u.is_premium ? '#fbbf24' : colors.textMuted }}>
                          {u.is_premium ? 'PREMIUM' : 'GRATUIT'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button 
                          onClick={() => togglePremium(u.id, u.is_premium)}
                          style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${u.is_premium ? '#fbbf24' : colors.border}`, color: u.is_premium ? '#fbbf24' : colors.textMain, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          {u.is_premium ? 'Retirer Premium' : 'Passer Premium'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* --- ONGLET TRACKS --- */}
          {activeTab === 'tracks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredTracks.map(t => (
                <div key={t.id} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 8, background: t.cover_url ? `url(${t.cover_url}) center/cover` : '#333' }} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colors.textMain }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{t.artist} • {t.genre} • {t.bpm} BPM</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 12, color: colors.textMuted, display: 'flex', gap: 12 }}>
                      <span>❤️ {t.likes_count || 0}</span>
                      <span>⬇️ {t.downloads || 0}</span>
                    </div>
                    <button onClick={() => deleteTrack(t)} style={{ background: 'rgba(255, 92, 92, 0.1)', border: 'none', color: '#ff5c5c', padding: 10, borderRadius: 8, cursor: 'pointer' }} title="Supprimer">
                      {Icons.trash}
                    </button>
                  </div>
                </div>
              ))}
              {filteredTracks.length === 0 && <div style={{ color: colors.textMuted, textAlign: 'center', padding: 40 }}>Aucun son trouvé.</div>}
            </div>
          )}

          {/* --- ONGLET PITCHES --- */}
          {activeTab === 'pitches' && (
            <PitchAdmin />
          )}
        </>
      )}
    </div>
  );
};