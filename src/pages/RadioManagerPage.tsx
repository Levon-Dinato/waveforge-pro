// src/pages/RadioManagerPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export const RadioManagerPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const radioTab = (searchParams.get('tab') || 'musics') as 'musics' | 'jingles' | 'schedules' | 'appearance';
  const setRadioTab = (tab: 'musics' | 'jingles' | 'schedules' | 'appearance') => {
    setSearchParams({ tab });
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myTracks, setMyTracks] = useState<any[]>([]);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  const [showJingleModal, setShowJingleModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [jingleForm, setJingleForm] = useState({ title: '', audioFile: null as File | null });
  const [scheduleForm, setScheduleForm] = useState({ title: '', start_time: '08:00', end_time: '10:00', playlist_id: '', days: [] as string[] });
  const [uploadForm, setUploadForm] = useState({ title: '', artist: '', genre: '' });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [previewTrack, setPreviewTrack] = useState<any>(null);

  const [radioSearch, setRadioSearch] = useState('');
  const [radioPage, setRadioPage] = useState(1);
  const itemsPerPageRadio = 10;

  const [isLive, setIsLive] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  
  const [radioBgUrl, setRadioBgUrl] = useState('');
  const [radioBgType, setRadioBgType] = useState('animated');
  const [radioBgOpacity, setRadioBgOpacity] = useState(0.6);
  const [uploadingBg, setUploadingBg] = useState(false);

  const [radioLogoUrl, setRadioLogoUrl] = useState('');
  const [radioInstructions, setRadioInstructions] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [radioVisualizerColor, setRadioVisualizerColor] = useState('#ff3366');

  const colors = {
    bg: isDark ? '#09090b' : '#f8fafc',
    sidebarBg: isDark ? '#121212' : '#ffffff',
    panelBg: isDark ? '#18181b' : '#ffffff',
    inputBg: isDark ? '#09090b' : '#f1f5f9',
    border: isDark ? '#27272a' : '#e2e8f0',
    textMain: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#a1a1aa' : '#64748b',
    accent: '#00d9ff',
    danger: '#ef4444',
    success: '#10b981',
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
        setRadioBgOpacity(profileData.radio_bg_opacity ?? 0.6);
        setRadioLogoUrl(profileData.radio_custom_logo_url || '');
        setRadioInstructions(profileData.radio_instructions || '');
        setRadioVisualizerColor(profileData.radio_visualizer_color || '#ff3366');
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

  const handleRadioUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !audioFile || !uploadForm.title) return alert("Titre et fichier audio obligatoires.");
    setUploading(true);
    try {
      const ext = audioFile.name.split('.').pop();
      const name = `${user.id}/radio-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(AUDIO_BUCKET).upload(name, audioFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(name);

      const { data, error } = await supabase.from('tracks').insert({
        user_id: user.id, title: uploadForm.title, artist: uploadForm.artist || profileUsername, genre: uploadForm.genre || 'Inconnu', audio_url: urlData.publicUrl, in_radio: true, is_jingle: false, peaks: [], duration: 0, likes_count: 0, downloads: 0
      }).select().single();

      if (error) throw error;
      if (data) setMyTracks([data, ...myTracks]);
      setAudioFile(null); setUploadForm({ title: '', artist: '', genre: '' });
      alert("Son ajouté à la radio ! 🎵");
    } catch (err: any) { alert("Erreur : " + err.message); } finally { setUploading(false); }
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
    if (scheduleForm.days.length === 0) return alert("Sélectionne au moins un jour.");
    setUploading(true);
    try {
      const { data, error } = await supabase.from('radio_schedules').insert({
        user_id: user.id, title: scheduleForm.title, start_time: scheduleForm.start_time, end_time: scheduleForm.end_time, playlist_id: scheduleForm.playlist_id, days: scheduleForm.days
      }).select('*, playlists(name)').single();
      
      if (error) throw error;
      if (data) setSchedules([...schedules, data].sort((a,b) => a.start_time.localeCompare(b.start_time)));
      setShowScheduleModal(false); setScheduleForm({ title: '', start_time: '08:00', end_time: '10:00', playlist_id: '', days: [] });
    } catch (err: any) { alert("Erreur : " + err.message); } finally { setUploading(false); }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm("Supprimer ce programme ?")) return;
    await supabase.from('radio_schedules').delete().eq('id', id);
    setSchedules(schedules.filter(s => s.id !== id));
  };

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
      setRadioBgUrl(data.publicUrl); setRadioBgType(isVideo ? 'video' : 'image');
    } catch (err: any) { alert("Erreur d'upload : " + err.message); } finally { setUploadingBg(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const name = `${user.id}/radio-logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(name, file);
      if (error) throw error;
      const { data } = supabase.storage.from('media').getPublicUrl(name);
      setRadioLogoUrl(data.publicUrl);
    } catch (err: any) { alert("Erreur d'upload du logo : " + err.message); } finally { setUploadingLogo(false); }
  };

  const handleSaveBackground = async () => {
    if (!user) return;
    setSaving(true);
    
    const { error } = await supabase.from('profiles').update({
      radio_bg_url: radioBgUrl,
      radio_bg_type: radioBgType,
      radio_bg_opacity: radioBgOpacity,
      radio_custom_logo_url: radioLogoUrl,
      radio_instructions: radioInstructions,
      radio_visualizer_color: radioVisualizerColor
    }).eq('id', user.id);
    
    setSaving(false);
    
    if (error) {
      console.error("Erreur Supabase lors de la sauvegarde :", error);
      alert("Erreur lors de la sauvegarde : " + error.message);
    } else {
      alert("Apparence de la radio mise à jour ! ✅");
    }
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
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px', color: colors.textMain, fontFamily: 'Inter, sans-serif', background: colors.bg, minHeight: '100vh' }}>
      
      <style>{`
        .dash-card { background: ${colors.panelBg}; border: 1px solid ${colors.border}; border-radius: 8px; }
        .dash-input { width: 100%; background: ${colors.inputBg}; border: 1px solid ${colors.border}; border-radius: 6px; padding: 10px 12px; color: ${colors.textMain}; font-size: 14px; outline: none; transition: border-color 0.2s; }
        .dash-input:focus { border-color: ${colors.accent}; }
        .dash-btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .dash-btn-primary { background: ${colors.textMain}; color: ${colors.bg}; }
        .dash-btn-primary:hover { opacity: 0.8; }
        .dash-btn-secondary { background: transparent; color: ${colors.textMain}; border: 1px solid ${colors.border}; }
        .dash-btn-secondary:hover { background: ${colors.inputBg}; }
        .dash-btn-danger { background: transparent; color: ${colors.danger}; border: 1px solid ${colors.danger}; }
        .dash-btn-danger:hover { background: rgba(239, 68, 68, 0.1); }
        .dash-tab { padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; color: ${colors.textMuted}; background: transparent; }
        .dash-tab:hover { color: ${colors.textMain}; }
        .dash-tab.active { background: ${colors.inputBg}; color: ${colors.textMain}; border-color: ${colors.border}; }
        .dash-table { width: 100%; border-collapse: collapse; text-align: left; }
        .dash-table th { padding: 12px 16px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${colors.textMuted}; border-bottom: 1px solid ${colors.border}; letter-spacing: 0.5px; }
        .dash-table td { padding: 12px 16px; border-bottom: 1px solid ${colors.border}; font-size: 14px; }
        .dash-table tr:hover { background: rgba(255,255,255,0.02); }
        .dropzone { border: 1px dashed ${colors.border}; border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.2s; background: ${colors.inputBg}; }
        .dropzone:hover { border-color: ${colors.textMuted}; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <button onClick={() => navigate('/settings')} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, marginBottom: 8, padding: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Retour à l'Espace Artiste
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>📻 Radio Manager</h1>
        </div>
        {profileUsername && (
          <div style={{ display: 'flex', gap: 12 }}>
            <a href={`/radio/${profileUsername}`} target="_blank" rel="noopener noreferrer" className="dash-btn dash-btn-secondary" style={{ textDecoration: 'none' }}>Écouter la Radio ↗</a>
            <button className="dash-btn dash-btn-primary" onClick={() => setShowJingleModal(true)}>+ Jingle</button>
          </div>
        )}
      </div>

      <div className="dash-card" style={{ padding: 20, marginBottom: 24, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', borderLeft: isLive ? `3px solid ${colors.danger}` : `3px solid ${colors.border}` }}>
        <div style={{ flex: 1, minWidth: 250 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>{isLive ? '🔴 Direct en cours' : 'Direct Audio'}</h2>
          <input type="text" placeholder="Lien du flux (Mixlr, Icecast...)" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} disabled={isLive} className="dash-input" />
        </div>
        <button onClick={toggleLiveStatus} disabled={saving} className={`dash-btn ${isLive ? 'dash-btn-danger' : 'dash-btn-primary'}`}>{isLive ? 'Arrêter' : 'Passer en Direct'}</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: `1px solid ${colors.border}`, paddingBottom: 12 }}>
        <button onClick={() => setRadioTab('musics')} className={`dash-tab ${radioTab === 'musics' ? 'active' : ''}`}>Mes musiques</button>
        <button onClick={() => setRadioTab('jingles')} className={`dash-tab ${radioTab === 'jingles' ? 'active' : ''}`}>Jingles</button>
        <button onClick={() => setRadioTab('schedules')} className={`dash-tab ${radioTab === 'schedules' ? 'active' : ''}`}>Programmation</button>
        <button onClick={() => setRadioTab('appearance')} className={`dash-tab ${radioTab === 'appearance' ? 'active' : ''}`}>Apparence</button>
      </div>

      {radioTab === 'appearance' ? (
        <div className="dash-card" style={{ padding: 32, maxWidth: 800 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Personnalisation</h2>
            <button onClick={() => setRadioTab('musics')} className="dash-btn dash-btn-secondary">← Retour aux musiques</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Logo de la radio</h3>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <label className="dropzone" style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: colors.textMuted }}>{uploadingLogo ? 'Upload...' : 'Choisir une image'}</div>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} style={{ display: 'none' }} />
                </label>
                {radioLogoUrl && (
                  <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 6, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                    <img src={radioLogoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => setRadioLogoUrl('')} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: 4, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10 }}>✕</button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Instructions / Message</h3>
              <textarea placeholder="Bienvenue sur ma radio..." value={radioInstructions} onChange={(e) => setRadioInstructions(e.target.value)} rows={3} className="dash-input" style={{ resize: 'vertical' }} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Couleur de l'égaliseur</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input 
                  type="color" 
                  value={radioVisualizerColor} 
                  onChange={(e) => setRadioVisualizerColor(e.target.value)} 
                  style={{ width: 50, height: 50, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8 }} 
                />
                <input 
                  type="text" 
                  value={radioVisualizerColor} 
                  onChange={(e) => setRadioVisualizerColor(e.target.value)} 
                  className="dash-input" 
                  style={{ flex: 1, fontFamily: 'monospace' }} 
                />
              </div>
              <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>Cette couleur sera appliquée sur les barres autour du vinyle et sur les boutons de la page publique.</p>
            </div>

            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Fond d'écran</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setRadioBgType('animated')} className={`dash-tab ${radioBgType === 'animated' ? 'active' : ''}`} style={{ flex: 1 }}>Animé</button>
                <button onClick={() => setRadioBgType('image')} className={`dash-tab ${radioBgType === 'image' ? 'active' : ''}`} style={{ flex: 1 }}>Image</button>
                <button onClick={() => setRadioBgType('video')} className={`dash-tab ${radioBgType === 'video' ? 'active' : ''}`} style={{ flex: 1 }}>Vidéo</button>
              </div>
              
              {radioBgType !== 'animated' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label className="dropzone" style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: colors.textMuted }}>{uploadingBg ? 'Upload...' : 'Choisir un fichier'}</div>
                      <input type="file" accept={radioBgType === 'video' ? 'video/*' : 'image/*'} onChange={handleBgUpload} disabled={uploadingBg} style={{ display: 'none' }} />
                    </label>
                    <input type="url" placeholder="Ou lien direct..." value={radioBgUrl} onChange={(e) => setRadioBgUrl(e.target.value)} className="dash-input" style={{ flex: 2 }} />
                  </div>
                  {radioBgUrl && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 500 }}>
                        <span>Opacité</span>
                        <span>{Math.round(radioBgOpacity * 100)}%</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.05" value={radioBgOpacity} onChange={(e) => setRadioBgOpacity(Number(e.target.value))} style={{ width: '100%', accentColor: radioVisualizerColor }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSaveBackground} disabled={saving} className="dash-btn dash-btn-primary">
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </div>
      ) : radioTab === 'schedules' ? (
        <div className="dash-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>Programmation</h2>
              <button onClick={() => setRadioTab('musics')} className="dash-btn dash-btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }}>← Retour</button>
            </div>
            <button onClick={() => setShowScheduleModal(true)} className="dash-btn dash-btn-primary">+ Nouveau Programme</button>
          </div>
          <table className="dash-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Horaires</th>
                <th>Jours</th>
                <th>Playlist</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Aucun programme défini.</td></tr>
              ) : (
                schedules.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.title}</td>
                    <td style={{ color: colors.textMuted }}>{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</td>
                    <td style={{ fontSize: 12, color: colors.textMuted }}>
                      {s.days && s.days.length > 0 ? s.days.map((d: string) => ['L','M','M','J','V','S','D'][parseInt(d)-1]).join(', ') : 'Tous les jours'}
                    </td>
                    <td>{s.playlists?.name || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleDeleteSchedule(s.id)} className="dash-btn dash-btn-danger" style={{ padding: '4px 8px', fontSize: 12 }}>Suppr.</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="dash-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px 0' }}>Ajouter un son</h3>
              <form onSubmit={handleRadioUpload} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="text" placeholder="Titre *" value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} required className="dash-input" style={{ fontSize: 12, padding: '8px' }} />
                <input type="text" placeholder="Artiste" value={uploadForm.artist} onChange={e => setUploadForm({...uploadForm, artist: e.target.value})} className="dash-input" style={{ fontSize: 12, padding: '8px' }} />
                <input type="text" placeholder="Genre (ex: House)" value={uploadForm.genre} onChange={e => setUploadForm({...uploadForm, genre: e.target.value})} className="dash-input" style={{ fontSize: 12, padding: '8px' }} />
                <label className="dropzone" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, height: 80 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: colors.textMuted }}>{audioFile ? audioFile.name : 'Choisir un MP3 *'}</span>
                  <input type="file" accept="audio/*" required onChange={(e) => setAudioFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                </label>
                <button type="submit" disabled={uploading} className="dash-btn dash-btn-primary" style={{ width: '100%', marginTop: 4 }}>
                  {uploading ? 'Upload...' : 'Ajouter à la radio'}
                </button>
              </form>
            </div>

            <div className="dash-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', justifyContent: 'space-between' }}>Catégories</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: colors.inputBg, borderRadius: 4, fontSize: 13, fontWeight: 600 }}>
                  <span>Toutes</span>
                  <span style={{ color: colors.textMuted }}>{filteredRadioTracks.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="dash-card" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" placeholder="Rechercher un titre, artiste..." value={radioSearch} onChange={(e) => setRadioSearch(e.target.value)} className="dash-input" style={{ paddingLeft: 36 }} />
              </div>
              <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 500 }}>{filteredRadioTracks.length} morceau(x)</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>Titre</th>
                    <th>Artiste</th>
                    <th>Genre</th>
                    <th>Dans la radio</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTracks.map(track => (
                    <tr key={track.id}>
                      <td>
                        <button onClick={() => setPreviewTrack(track)} style={{ width: 24, height: 24, borderRadius: '50%', background: colors.inputBg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 4, background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.inputBg, flexShrink: 0 }} />
                          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{track.title}</div>
                        </div>
                      </td>
                      <td style={{ color: colors.textMuted }}>{track.artist}</td>
                      <td><span style={{ fontSize: 11, background: colors.inputBg, padding: '2px 8px', borderRadius: 4, border: `1px solid ${colors.border}` }}>{track.genre || 'Inconnu'}</span></td>
                      <td>
                        <button onClick={() => toggleRadioStatus(track.id, track.in_radio)} style={{ width: 36, height: 20, borderRadius: 10, background: track.in_radio ? colors.success : colors.border, border: 'none', cursor: 'pointer', position: 'relative' }}>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: track.in_radio ? 19 : 3 }} />
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button onClick={() => handleDeleteTrack(track.id)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.danger }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 16, borderTop: `1px solid ${colors.border}` }}>
                <button onClick={() => setRadioPage(p => Math.max(1, p - 1))} disabled={radioPage === 1} className="dash-btn dash-btn-secondary" style={{ padding: '4px 12px' }}>←</button>
                <span style={{ fontSize: 12, color: colors.textMuted }}>Page {radioPage} / {totalPages}</span>
                <button onClick={() => setRadioPage(p => Math.min(totalPages, p + 1))} disabled={radioPage === totalPages} className="dash-btn dash-btn-secondary" style={{ padding: '4px 12px' }}>→</button>
              </div>
            )}
          </div>
        </div>
      )}

      {previewTrack && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: colors.panelBg, padding: 16, borderRadius: 12, border: `1px solid ${colors.accent}`, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{previewTrack.title}</div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>{previewTrack.artist}</div>
          </div>
          <audio src={previewTrack.audio_url} controls autoPlay style={{ height: 36 }} />
          <button onClick={() => setPreviewTrack(null)} style={{ background: 'transparent', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
      )}

      {showJingleModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="dash-card" style={{ padding: 24, width: '100%', maxWidth: 400 }}>
            <h2 style={{ color: colors.textMain, marginTop: 0, fontSize: 18 }}>Ajouter un Jingle</h2>
            <form onSubmit={handleJingleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input type="file" accept="audio/*" required onChange={(e) => setJingleForm({...jingleForm, audioFile: e.target.files?.[0] || null})} className="dash-input" />
              <input type="text" placeholder="Nom du jingle" value={jingleForm.title} onChange={e => setJingleForm({...jingleForm, title: e.target.value})} required className="dash-input" />
              <button type="submit" disabled={uploading} className="dash-btn dash-btn-primary">Ajouter</button>
            </form>
          </div>
        </div>, document.body
      )}

      {showScheduleModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="dash-card" style={{ padding: 24, width: '100%', maxWidth: 500 }}>
            <h2 style={{ color: colors.textMain, marginTop: 0, fontSize: 18 }}>Nouveau Programme</h2>
            <form onSubmit={handleAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input type="text" placeholder="Nom (ex: Morning Show)" value={scheduleForm.title} onChange={e => setScheduleForm({...scheduleForm, title: e.target.value})} required className="dash-input" />
              
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, display: 'block' }}>Début</label>
                  <input type="time" value={scheduleForm.start_time} onChange={e => setScheduleForm({...scheduleForm, start_time: e.target.value})} required className="dash-input" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, display: 'block' }}>Fin</label>
                  <input type="time" value={scheduleForm.end_time} onChange={e => setScheduleForm({...scheduleForm, end_time: e.target.value})} required className="dash-input" />
                </div>
              </div>

              <div>
                <label style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, display: 'block' }}>Jours de diffusion</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => {
                    const dayNum = (i + 1).toString();
                    const isActive = scheduleForm.days.includes(dayNum);
                    return (
                      <button key={i} type="button" 
                        onClick={() => {
                          setScheduleForm(prev => ({
                            ...prev, 
                            days: isActive ? prev.days.filter(x => x !== dayNum) : [...prev.days, dayNum]
                          }));
                        }}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 4, border: `1px solid ${isActive ? colors.accent : colors.border}`, background: isActive ? `${colors.accent}20` : 'transparent', color: colors.textMain, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, display: 'block' }}>Playlist</label>
                <select value={scheduleForm.playlist_id} onChange={e => setScheduleForm({...scheduleForm, playlist_id: e.target.value})} required className="dash-input">
                  <option value="">Sélectionner...</option>
                  {myPlaylists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={uploading} className="dash-btn dash-btn-primary">Créer</button>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
};