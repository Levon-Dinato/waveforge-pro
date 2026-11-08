// src/pages/RadioManagerPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export const RadioManagerPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myTracks, setMyTracks] = useState<any[]>([]);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  // Modales
  const [showJingleModal, setShowJingleModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [jingleForm, setJingleForm] = useState({ title: '', audioFile: null as File | null });
  const [scheduleForm, setScheduleForm] = useState({ title: '', start_time: '08:00', end_time: '10:00', playlist_id: '' });

  // États pour le Control Panel Radio
  const [radioSearch, setRadioSearch] = useState('');
  const [radioTab, setRadioTab] = useState<'musics' | 'jingles' | 'schedules' | 'settings'>('musics');
  const [radioPage, setRadioPage] = useState(1);
  const itemsPerPageRadio = 8;

  // États Live & Profil
  const [isLive, setIsLive] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  
  // ✅ NOUVEAUX ÉTATS : Fond d'écran
  const [radioBgUrl, setRadioBgUrl] = useState('');
  const [radioBgType, setRadioBgType] = useState('animated');
  const [uploadingBg, setUploadingBg] = useState(false);

  const colors = {
    bg: isDark ? '#05050a' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    inputBg: isDark ? '#1f1f1f' : '#f3f4f6', 
    border: isDark ? '#333333' : '#e5e7eb', 
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#a1a1aa' : '#666666',
    accent: '#ff3366',
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData) {
        setIsLive(profileData.is_live || false);
        setLiveUrl(profileData.live_url || '');
        setProfileUsername(profileData.username || '');
        setRadioBgUrl(profileData.radio_bg_url || '');
        setRadioBgType(profileData.radio_bg_type || 'animated');
      }

      const { data: tracksData } = await supabase.from('tracks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (tracksData) setMyTracks(tracksData);

      const { data: playlistsData } = await supabase.from('playlists').select('*').eq('user_id', user.id);
      if (playlistsData) setMyPlaylists(playlistsData);

      const { data: schedulesData } = await supabase.from('radio_schedules').select('*, playlists(name)').eq('user_id', user.id).order('start_time');
      if (schedulesData) setSchedules(schedulesData);

      setLoading(false);
    };
    fetchData();
  }, [user]);

  // ... (Autres fonctions : toggleLive, toggleRadio, handleJingle, handleSchedule, etc. restent inchangées) ...
  const toggleLiveStatus = async () => {
    if (!user) return;
    if (!isLive && !liveUrl.trim()) return alert("Renseigne un lien de flux audio.");
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ is_live: !isLive, live_url: liveUrl }).eq('id', user.id);
    setSaving(false);
    if (!error) { setIsLive(!isLive); alert(isLive ? "Direct terminé." : "Tu es EN DIRECT ! 🎙️"); }
  };

  const toggleRadioStatus = async (trackId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('tracks').update({ in_radio: !currentStatus }).eq('id', trackId);
    if (!error) setMyTracks(myTracks.map(t => t.id === trackId ? { ...t, in_radio: !currentStatus } : t));
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!window.confirm("Supprimer ce son ?")) return;
    await supabase.from('tracks').delete().eq('id', trackId);
    setMyTracks(myTracks.filter(t => t.id !== trackId));
  };

  const handleJingleUpload = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || !jingleForm.audioFile || !jingleForm.title) return;
    setUploading(true);
    try {
      const ext = jingleForm.audioFile.name.split('.').pop();
      const name = `${user.id}/jingle-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(AUDIO_BUCKET).upload(name, jingleForm.audioFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(name);

      const { data, error } = await supabase.from('tracks').insert({
        user_id: user.id, title: jingleForm.title, artist: profileUsername || 'Jingle', genre: 'Jingle', audio_url: urlData.publicUrl, is_jingle: true, in_radio: true, peaks: [], duration: 0, likes_count: 0, downloads: 0
      }).select().single();

      if (error) throw error;
      if (data) setMyTracks([data, ...myTracks]);
      setShowJingleModal(false); setJingleForm({ title: '', audioFile: null });
    } catch (err: any) { alert("Erreur : " + err.message); } finally { setUploading(false); }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || !scheduleForm.playlist_id || !scheduleForm.title) return;
    setUploading(true);
    try {
      const { data, error } = await supabase.from('radio_schedules').insert({
        user_id: user.id, title: scheduleForm.title, start_time: scheduleForm.start_time, end_time: scheduleForm.end_time, playlist_id: scheduleForm.playlist_id
      }).select('*, playlists(name)').single();
      
      if (error) throw error;
      if (data) setSchedules([...schedules, data].sort((a,b) => a.start_time.localeCompare(b.start_time)));
      setShowScheduleModal(false); setScheduleForm({ title: '', start_time: '08:00', end_time: '10:00', playlist_id: '' });
    } catch (err: any) { alert("Erreur : " + err.message); } finally { setUploading(false); }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm("Supprimer ce programme ?")) return;
    await supabase.from('radio_schedules').delete().eq('id', id);
    setSchedules(schedules.filter(s => s.id !== id));
  };

  // ✅ NOUVELLE FONCTION : Upload du fond d'écran
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingBg(true);
    try {
      const isVideo = file.type.includes('video');
      const ext = file.name.split('.').pop();
      const name = `${user.id}/radio-bg-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(name, file);
      if (error) throw error;
      const { data } = supabase.storage.from('media').getPublicUrl(name);
      
      setRadioBgUrl(data.publicUrl);
      setRadioBgType(isVideo ? 'video' : 'image');
    } catch (err: any) {
      alert("Erreur d'upload : " + err.message);
    } finally {
      setUploadingBg(false);
    }
  };

  // ✅ NOUVELLE FONCTION : Sauvegarder le fond d'écran
  const handleSaveBackground = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      radio_bg_url: radioBgUrl,
      radio_bg_type: radioBgType
    }).eq('id', user.id);
    setSaving(false);
    if (!error) alert("Fond d'écran mis à jour ! ✅");
  };

  const filteredRadioTracks = useMemo(() => {
    let list = myTracks.filter(t => radioTab === 'jingles' ? t.is_jingle : !t.is_jingle);
    if (radioSearch.trim()) {
      const q = radioSearch.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    }
    return list;
  }, [myTracks, radioTab, radioSearch]);

  useEffect(() => { setRadioPage(1); }, [radioTab, radioSearch]);
  const indexOfLast = radioPage * itemsPerPageRadio;
  const currentTracks = filteredRadioTracks.slice(indexOfLast - itemsPerPageRadio, indexOfLast);
  const totalPages = Math.ceil(filteredRadioTracks.length / itemsPerPageRadio);

  if (loading) return <div style={{ padding: 40, color: colors.textMain, textAlign: 'center', background: colors.bg, minHeight: '100vh' }}>Chargement...</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', color: colors.textMain, fontFamily: 'Inter, sans-serif', background: colors.bg, minHeight: '100vh' }}>
      
      <div style={{ marginBottom: 32 }}>
        <button onClick={() => navigate('/settings')} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, marginBottom: 16, padding: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Retour aux réglages
        </button>
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          📻 Radio Manager <span style={{ fontSize: 12, background: '#ff3366', color: '#fff', padding: '4px 10px', borderRadius: 6, letterSpacing: '1px' }}>PREMIUM</span>
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* BLOC LIVE */}
        <div style={{ background: isLive ? 'rgba(255,51,102,0.05)' : colors.panelBg, padding: 32, borderRadius: 16, border: `1px solid ${isLive ? '#ff3366' : colors.border}` }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: 20, color: isLive ? '#ff3366' : colors.textMain }}>
                {isLive ? '🔴 TU ES EN DIRECT' : '⚫ Direct Audio'}
              </h2>
              <input type="text" placeholder="Lien de ton flux (Mixlr, Icecast...)" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} disabled={isLive} style={{ width: '100%', padding: 14, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
            </div>
            <button onClick={toggleLiveStatus} disabled={saving} style={{ padding: '16px 32px', background: isLive ? '#ff3366' : '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>
              {isLive ? 'Arrêter le Direct' : 'Passer en Direct'}
            </button>
          </div>
        </div>

        {/* TABLEAU DE GESTION */}
        <div style={{ background: colors.panelBg, borderRadius: 16, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          
          <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setRadioTab('musics')} style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: radioTab === 'musics' ? '#ff3366' : 'transparent', color: radioTab === 'musics' ? '#fff' : colors.textMuted, border: `1px solid ${radioTab === 'musics' ? '#ff3366' : colors.border}` }}>Musiques</button>
              <button onClick={() => setRadioTab('jingles')} style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: radioTab === 'jingles' ? '#ff3366' : 'transparent', color: radioTab === 'jingles' ? '#fff' : colors.textMuted, border: `1px solid ${radioTab === 'jingles' ? '#ff3366' : colors.border}` }}>Jingles</button>
              <button onClick={() => setRadioTab('schedules')} style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: radioTab === 'schedules' ? '#ff3366' : 'transparent', color: radioTab === 'schedules' ? '#fff' : colors.textMuted, border: `1px solid ${radioTab === 'schedules' ? '#ff3366' : colors.border}` }}>Programmation</button>
              <button onClick={() => setRadioTab('settings')} style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: radioTab === 'settings' ? '#ff3366' : 'transparent', color: radioTab === 'settings' ? '#fff' : colors.textMuted, border: `1px solid ${radioTab === 'settings' ? '#ff3366' : colors.border}` }}>Apparence</button>
            </div>
            
            {radioTab !== 'schedules' && radioTab !== 'settings' && (
              <div style={{ display: 'flex', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
                <input type="text" placeholder="Rechercher..." value={radioSearch} onChange={(e) => setRadioSearch(e.target.value)} style={{ padding: '10px 16px', borderRadius: 8, background: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.textMain, maxWidth: 250 }} />
                <button onClick={() => setShowJingleModal(true)} style={{ background: 'linear-gradient(135deg, #ff3366, #7c5cff)', color: '#fff', padding: '10px 20px', borderRadius: 8, fontWeight: 800, border: 'none', cursor: 'pointer' }}>+ Jingle</button>
              </div>
            )}
            {radioTab === 'schedules' && (
              <button onClick={() => setShowScheduleModal(true)} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', padding: '10px 20px', borderRadius: 8, fontWeight: 800, border: 'none', cursor: 'pointer' }}>+ Nouveau Programme</button>
            )}
          </div>

          {radioTab === 'settings' ? (
            /* ✅ NOUVEL ONGLET : APPARENCE */
            <div style={{ padding: 32 }}>
              <h3 style={{ margin: '0 0 24px 0', fontSize: 20 }}>🎨 Fond d'écran de la Radio</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Choisir le type de fond</label>
                  <select value={radioBgType} onChange={(e) => setRadioBgType(e.target.value)} style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8 }}>
                    <option value="animated">✨ Animé (Défaut Aurora)</option>
                    <option value="image">🖼️ Image Fixe</option>
                    <option value="video">🎥 Vidéo en boucle</option>
                  </select>
                </div>

                {radioBgType !== 'animated' && (
                  <div style={{ padding: 24, background: colors.inputBg, borderRadius: 12, border: `1px dashed ${colors.border}` }}>
                    <label style={{ display: 'block', marginBottom: 12, fontWeight: 600 }}>Fichier (Image ou Vidéo)</label>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ background: '#00d9ff', color: '#000', padding: '10px 20px', borderRadius: 8, cursor: uploadingBg ? 'wait' : 'pointer', fontWeight: 800 }}>
                        {uploadingBg ? 'Upload...' : '📁 Choisir un fichier'}
                        <input type="file" accept={radioBgType === 'video' ? 'video/*' : 'image/*'} onChange={handleBgUpload} disabled={uploadingBg} style={{ display: 'none' }} />
                      </label>
                      <span style={{ color: colors.textMuted, fontSize: 14 }}>ou</span>
                      <input type="url" placeholder="Coller un lien direct (https://...)" value={radioBgUrl} onChange={(e) => setRadioBgUrl(e.target.value)} style={{ flex: 1, minWidth: 200, padding: 12, background: colors.panelBg, border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8 }} />
                    </div>

                    {radioBgUrl && (
                      <div style={{ marginTop: 20 }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: 12, color: colors.textMuted }}>Aperçu :</p>
                        {radioBgType === 'video' ? (
                          <video src={radioBgUrl} autoPlay loop muted style={{ width: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                          <img src={radioBgUrl} alt="Aperçu" style={{ width: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'cover' }} />
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button onClick={handleSaveBackground} disabled={saving} style={{ padding: 16, background: '#ff3366', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 16, cursor: saving ? 'wait' : 'pointer' }}>
                  {saving ? 'Enregistrement...' : 'Enregistrer l\'apparence'}
                </button>
              </div>
            </div>
          ) : radioTab !== 'schedules' ? (
            /* TABLEAU MUSIQUES / JINGLES */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
                    <th style={{ padding: '16px 24px', color: colors.textMuted }}>Titre</th>
                    <th style={{ padding: '16px 24px', color: colors.textMuted }}>Type</th>
                    <th style={{ padding: '16px 24px', color: colors.textMuted, textAlign: 'center' }}>Dans la radio</th>
                    <th style={{ padding: '16px 24px', color: colors.textMuted, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTracks.map(track => (
                    <tr key={track.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '16px 24px', fontWeight: 700 }}>{track.title}</td>
                      <td style={{ padding: '16px 24px' }}><span style={{ fontSize: 10, background: track.is_jingle ? '#ff3366' : '#00d9ff', color: '#000', padding: '2px 8px', borderRadius: 4 }}>{track.is_jingle ? 'JINGLE' : 'MUSIQUE'}</span></td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <button onClick={() => toggleRadioStatus(track.id, track.in_radio)} style={{ width: 44, height: 24, borderRadius: 12, background: track.in_radio ? '#10b981' : colors.border, border: 'none', cursor: 'pointer', position: 'relative' }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: track.in_radio ? 23 : 3 }} />
                        </button>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <button onClick={() => handleDeleteTrack(track.id)} style={{ background: 'transparent', color: '#ff3366', border: '1px solid #ff3366', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>Suppr.</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: 20 }}>
                  <button onClick={() => setRadioPage(p => Math.max(1, p - 1))} disabled={radioPage === 1}>← Précédent</button>
                  <span>Page {radioPage} / {totalPages}</span>
                  <button onClick={() => setRadioPage(p => Math.min(totalPages, p + 1))} disabled={radioPage === totalPages}>Suivant →</button>
                </div>
              )}
            </div>
          ) : (
            /* TABLEAU PROGRAMMATION */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
                    <th style={{ padding: '16px 24px', color: colors.textMuted }}>Nom du programme</th>
                    <th style={{ padding: '16px 24px', color: colors.textMuted }}>Horaires</th>
                    <th style={{ padding: '16px 24px', color: colors.textMuted }}>Playlist associée</th>
                    <th style={{ padding: '16px 24px', color: colors.textMuted, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Aucun programme défini.</td></tr>
                  ) : (
                    schedules.map(s => (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '16px 24px', fontWeight: 700 }}>{s.title}</td>
                        <td style={{ padding: '16px 24px' }}>{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</td>
                        <td style={{ padding: '16px 24px', color: '#00d9ff' }}>{s.playlists?.name || 'Playlist inconnue'}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <button onClick={() => handleDeleteSchedule(s.id)} style={{ background: 'transparent', color: '#ff3366', border: '1px solid #ff3366', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>Suppr.</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODALES (Jingle & Programme) */}
      {showJingleModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: colors.panelBg, padding: 32, borderRadius: 16, width: '100%', maxWidth: 400 }}>
            <h2 style={{ color: '#ff3366', marginTop: 0 }}>🎙️ Ajouter un Jingle</h2>
            <form onSubmit={handleJingleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input type="file" accept="audio/*" required onChange={(e) => setJingleForm({...jingleForm, audioFile: e.target.files?.[0] || null})} style={{ color: colors.textMain }} />
              <input type="text" placeholder="Nom du jingle" value={jingleForm.title} onChange={e => setJingleForm({...jingleForm, title: e.target.value})} required style={{ padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8 }} />
              <button type="submit" disabled={uploading} style={{ padding: 14, background: '#ff3366', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>Ajouter</button>
            </form>
          </div>
        </div>, document.body
      )}

      {showScheduleModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: colors.panelBg, padding: 32, borderRadius: 16, width: '100%', maxWidth: 500 }}>
            <h2 style={{ color: '#10b981', marginTop: 0 }}>📅 Nouveau Programme</h2>
            <form onSubmit={handleAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input type="text" placeholder="Nom (ex: Morning Show)" value={scheduleForm.title} onChange={e => setScheduleForm({...scheduleForm, title: e.target.value})} required style={{ padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8 }} />
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: colors.textMuted, fontSize: 12 }}>Heure de début</label>
                  <input type="time" value={scheduleForm.start_time} onChange={e => setScheduleForm({...scheduleForm, start_time: e.target.value})} required style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: colors.textMuted, fontSize: 12 }}>Heure de fin</label>
                  <input type="time" value={scheduleForm.end_time} onChange={e => setScheduleForm({...scheduleForm, end_time: e.target.value})} required style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8 }} />
                </div>
              </div>
              <div>
                <label style={{ color: colors.textMuted, fontSize: 12 }}>Playlist à diffuser</label>
                <select value={scheduleForm.playlist_id} onChange={e => setScheduleForm({...scheduleForm, playlist_id: e.target.value})} required style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8 }}>
                  <option value="">Sélectionner une playlist...</option>
                  {myPlaylists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={uploading} style={{ padding: 14, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>Créer le programme</button>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
};