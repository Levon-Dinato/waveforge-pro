import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { parseBlob } from 'music-metadata-browser';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';

// --- MODALE DE BOOKING ---
export const BookingModal: React.FC<{ isOpen: boolean; onClose: () => void; profile: any; isDark: boolean; colors: any; themeColor: string }> = ({ isOpen, onClose, profile, isDark, colors, themeColor }) => {
  const [bookingForm, setBookingForm] = useState({ name: '', email: '', type: 'booking', message: '' });
  const [sendingBooking, setSendingBooking] = useState(false);
  const [bookingSent, setBookingSent] = useState(false);

  const handleSendBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!bookingForm.name || !bookingForm.email || !bookingForm.message) { alert("Remplis tous les champs."); return; }
    setSendingBooking(true);
    try {
      const artistEmail = profile.booking_email || 'djcontrolradiotv1@gmail.com';
      const { error } = await supabase.functions.invoke('send-booking-email', {
        body: { to: artistEmail, from: bookingForm.email, subject: `${bookingForm.type} - ${profile.username}`, name: bookingForm.name, type: bookingForm.type, message: bookingForm.message },
      });
      if (error) throw error;
      setBookingSent(true); setBookingForm({ name: '', email: '', type: 'booking', message: '' });
      setTimeout(() => { onClose(); setBookingSent(false); }, 3000);
    } catch (err: any) { alert("Erreur : " + err.message); } finally { setSendingBooking(false); }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', backdropFilter: 'blur(20px)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.textMain }}>Contact / Booking</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {bookingSent ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 16, color: colors.textMain, fontWeight: 700, marginBottom: 8 }}>Message envoyé !</div>
            <div style={{ fontSize: 13, color: colors.textMuted }}>{profile?.username} te répondra bientôt.</div>
          </div>
        ) : (
          <form onSubmit={handleSendBooking} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Nom *</label>
              <input type="text" value={bookingForm.name} onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })} required style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Email *</label>
              <input type="email" value={bookingForm.email} onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })} required style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Type</label>
              <select value={bookingForm.type} onChange={(e) => setBookingForm({ ...bookingForm, type: e.target.value })} style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none' }}>
                <option value="booking">Booking</option>
                <option value="remix">Remix / Collab</option>
                <option value="presse">Presse</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Message *</label>
              <textarea value={bookingForm.message} onChange={(e) => setBookingForm({ ...bookingForm, message: e.target.value })} required rows={4} style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none', resize: 'vertical' }} />
            </div>
            <button type="submit" disabled={sendingBooking} style={{ padding: 14, background: themeColor, color: '#000', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: sendingBooking ? 'wait' : 'pointer', textTransform: 'uppercase' }}>
              {sendingBooking ? 'Envoi...' : 'Envoyer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// --- MODALE D'UPLOAD ---
export const UploadModal: React.FC<{ isOpen: boolean; onClose: () => void; user: any; isDark: boolean; colors: any; themeColor: string; onUploadSuccess: (track: any) => void }> = ({ isOpen, onClose, user, isDark, colors, themeColor, onUploadSuccess }) => {
  const [uploadForm, setUploadForm] = useState({ title: '', artist: '', genre: '', bpm: '', song_key: '', purchase_url: '', is_downloadable: true });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    let guessArtist = ""; let guessTitle = fileNameWithoutExt;
    if (fileNameWithoutExt.includes(' - ')) {
      const parts = fileNameWithoutExt.split(' - ');
      guessArtist = parts[0].trim(); guessTitle = parts.slice(1).join(' - ').trim();
    }
    setUploadForm(prev => ({ ...prev, title: prev.title || guessTitle, artist: prev.artist || guessArtist }));
    try {
      const metadata = await parseBlob(file, { skipCovers: false });
      const { common } = metadata;
      setUploadForm(prev => ({
        ...prev, title: common.title || prev.title, artist: common.artist || prev.artist,
        genre: common.genre?.[0] || prev.genre, bpm: common.bpm ? String(Math.round(common.bpm)) : prev.bpm,
        song_key: common.key || prev.song_key
      }));
      if (common.picture && common.picture.length > 0) {
        const pic = common.picture[0];
        const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format });
        setCoverFile(new File([blob], `cover-${Date.now()}.jpg`, { type: pic.format }));
      }
    } catch (err) { console.warn(err); }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Connecte-toi pour uploader.");
    if (!audioFile) return alert("Sélectionne un fichier audio.");
    if (!uploadForm.title || !uploadForm.artist) return alert("Titre et Artiste obligatoires.");

    setUploading(true);
    try {
      const audioExt = audioFile.name.split('.').pop();
      const audioName = `${user.id}/${Date.now()}-audio.${audioExt}`;
      const { error: audioError } = await supabase.storage.from(AUDIO_BUCKET).upload(audioName, audioFile);
      if (audioError) throw audioError;
      const { data: audioUrlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(audioName);

      let coverUrl = null;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop() || 'jpg';
        const coverName = `${user.id}/${Date.now()}-cover.${coverExt}`;
        const { error: coverError } = await supabase.storage.from(AUDIO_BUCKET).upload(coverName, coverFile);
        if (!coverError) {
          const { data: coverUrlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(coverName);
          coverUrl = coverUrlData.publicUrl;
        }
      }

      const { data, error: dbError } = await supabase.from('tracks').insert({
        user_id: user.id, title: uploadForm.title, artist: uploadForm.artist,
        genre: uploadForm.genre || 'Inconnu', bpm: Number(uploadForm.bpm) || 0,
        song_key: uploadForm.song_key || null, audio_url: audioUrlData.publicUrl,
        cover_url: coverUrl, purchase_url: uploadForm.purchase_url || null,
        is_downloadable: uploadForm.is_downloadable, peaks: [], duration: 0, likes_count: 0, downloads: 0
      }).select().single();

      if (dbError) throw dbError;
      if (data) onUploadSuccess(data);
      
      onClose();
      setUploadForm({ title: '', artist: '', genre: '', bpm: '', song_key: '', purchase_url: '', is_downloadable: true });
      setAudioFile(null); setCoverFile(null);
      alert("Son uploadé ! 🎵");
    } catch (err: any) { alert("Erreur : " + err.message); } finally { setUploading(false); }
  };

  if (!isOpen) return null;

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.textMain }}>Uploader un son</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Fichier Audio *</label>
            <input type="file" accept="audio/*" onChange={handleAudioFileChange} required style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
            {audioFile && <p style={{ fontSize: 11, color: '#00d9ff', marginTop: 4 }}>{audioFile.name}</p>}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Image de couverture (Optionnel)</label>
            <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
            {coverFile && <img src={URL.createObjectURL(coverFile)} alt="Cover" style={{ width: 50, height: 50, borderRadius: 6, objectFit: 'cover', marginTop: 10 }} />}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Titre *</label>
              <input type="text" value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} required style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Artiste *</label>
              <input type="text" value={uploadForm.artist} onChange={e => setUploadForm({...uploadForm, artist: e.target.value})} required style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Genre</label>
              <input type="text" value={uploadForm.genre} onChange={e => setUploadForm({...uploadForm, genre: e.target.value})} placeholder="Ex: Techno" style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>BPM</label>
              <input type="number" value={uploadForm.bpm} onChange={e => setUploadForm({...uploadForm, bpm: e.target.value})} placeholder="128" style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
            </div>
          </div>
          <div style={{ padding: 16, background: colors.inputBg, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
              <input type="checkbox" checked={uploadForm.is_downloadable} onChange={e => setUploadForm({...uploadForm, is_downloadable: e.target.checked})} style={{ width: 18, height: 18, accentColor: themeColor }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: colors.textMain }}>Autoriser le téléchargement gratuit</span>
            </label>
            <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Lien d'achat (Optionnel)</label>
            <input type="url" value={uploadForm.purchase_url} onChange={e => setUploadForm({...uploadForm, purchase_url: e.target.value})} placeholder="https://beatport.com/..." style={{ width: '100%', padding: 10, background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
          </div>
          <button type="submit" disabled={uploading} style={{ marginTop: 12, padding: 16, background: themeColor, color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: uploading ? 'wait' : 'pointer' }}>
            {uploading ? 'Upload...' : 'Publier le son'}
          </button>
        </form>
      </div>
    </div>, document.body
  );
};

// --- LIGHTBOX IMAGE ---
export const Lightbox: React.FC<{ image: string | null; onClose: () => void }> = ({ image, onClose }) => {
  if (!image) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, cursor: 'zoom-out' }}>
      <button style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer' }}>✕</button>
      <img src={image} alt="Plein écran" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
    </div>
  );
};