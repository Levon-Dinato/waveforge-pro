// src/pages/EventsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  city: string | null;
  url: string | null;
  image_url: string | null;
  created_by: string;
}

export const EventsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // État du formulaire
  const [form, setForm] = useState({
    title: '', description: '', event_date: '', location: '', city: '', url: '', image_url: ''
  });
  const [posting, setPosting] = useState(false);

  // ✅ État pour l'édition
  const [editingId, setEditingId] = useState<string | null>(null);

  // ✅ État pour l'import Luma
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });

    if (!error && data) setEvents(data);
    setLoading(false);
  };

  // ✅ Import depuis Luma
  const handleImport = async () => {
    if (!importUrl) return;
    setImporting(true);
    try {
      const response = await fetch('/api/import-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'import');
      }

      setForm({
        title: data.title || '',
        description: data.description || '',
        event_date: data.event_date ? new Date(data.event_date).toISOString().slice(0, 16) : '',
        location: data.location || '',
        city: data.city || '',
        url: data.url || importUrl,
        image_url: data.image_url || '',
      });
      setImportUrl('');
    } catch (err: any) {
      alert('Erreur : ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/auth'); return; }
    if (!form.title || !form.event_date) return;

    setPosting(true);

    if (editingId) {
      // ✅ Mode édition
      const { error } = await supabase.from('events').update({
        title: form.title,
        description: form.description,
        event_date: new Date(form.event_date).toISOString(),
        location: form.location,
        city: form.city,
        url: form.url,
        image_url: form.image_url,
      }).eq('id', editingId);

      if (error) {
        alert('Erreur : ' + error.message);
      } else {
        setForm({ title: '', description: '', event_date: '', location: '', city: '', url: '', image_url: '' });
        setEditingId(null);
        setShowForm(false);
        loadEvents();
      }
    } else {
      // ✅ Mode création
      const { error } = await supabase.from('events').insert({
        title: form.title,
        description: form.description,
        event_date: new Date(form.event_date).toISOString(),
        location: form.location,
        city: form.city,
        url: form.url,
        image_url: form.image_url,
        created_by: user.id,
      });

      if (error) {
        alert('Erreur : ' + error.message);
      } else {
        setForm({ title: '', description: '', event_date: '', location: '', city: '', url: '', image_url: '' });
        setShowForm(false);
        loadEvents();
      }
    }
    setPosting(false);
  };

  // ✅ Supprimer un événement
  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cet événement ?')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      alert('Erreur : ' + error.message);
    } else {
      setEvents(events.filter((e) => e.id !== id));
    }
  };

  // ✅ Modifier un événement
  const startEdit = (event: Event) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description || '',
      event_date: new Date(event.event_date).toISOString().slice(0, 16),
      location: event.location || '',
      city: event.city || '',
      url: event.url || '',
      image_url: event.image_url || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ padding: isMobile ? 16 : 24, background: '#121212', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#fff' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0 }}>
            Bons plans & Soirées
          </h1>
          <p style={{ color: '#999', fontSize: 13, marginTop: 6 }}>
            Découvre les prochains événements et partage tes dates.
          </p>
        </div>
        <button
          onClick={() => {
            if (!user) { navigate('/auth'); return; }
            setShowForm(!showForm);
            setEditingId(null);
            setForm({ title: '', description: '', event_date: '', location: '', city: '', url: '', image_url: '' });
          }}
          style={{
            padding: '10px 20px',
            background: '#00d9ff',
            color: '#000',
            border: 'none',
            borderRadius: 4,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Annuler' : '+ Ajouter un événement'}
        </button>
      </div>

      {/* FORMULAIRE */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 8, padding: 20, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{editingId ? 'Modifier l\'événement' : 'Nouvel événement'}</h3>

          {/* ✅ CHAMP D'IMPORT LUMA (seulement en création) */}
          {!editingId && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 12, background: '#121212', border: '1px dashed #2a2a2a', borderRadius: 4, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, color: '#999', flex: '1 1 200px' }}>
                ⚡ Gagne du temps : importe les infos depuis un lien Luma.
              </div>
              <input
                type="url"
                placeholder="https://lu.ma/..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                style={{ flex: '1 1 200px', padding: 8, background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', fontSize: 12, minWidth: 150 }}
              />
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || !importUrl}
                style={{
                  padding: '8px 12px',
                  background: importing ? '#666' : '#00d9ff',
                  color: '#000',
                  border: 'none',
                  borderRadius: 4,
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: importing ? 'wait' : 'pointer',
                  flexShrink: 0,
                }}
              >
                {importing ? '...' : 'IMPORTER'}
              </button>
            </div>
          )}

          <input type="text" placeholder="Titre de l'événement *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', fontSize: 13 }} required />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', fontSize: 13, resize: 'vertical' }} />
          <input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} style={{ padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', fontSize: 13 }} required />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input type="text" placeholder="Lieu (ex: Rex Club)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={{ flex: 1, padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', fontSize: 13, minWidth: 150 }} />
            <input type="text" placeholder="Ville (ex: Paris)" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} style={{ flex: 1, padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', fontSize: 13, minWidth: 150 }} />
          </div>
          <input type="url" placeholder="Lien vers l'événement (billetterie, FB, etc.)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} style={{ padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', fontSize: 13 }} />
          <input type="url" placeholder="URL de l'image (optionnel)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} style={{ padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', fontSize: 13 }} />
          <button type="submit" disabled={posting} style={{ padding: '10px 20px', background: '#00d9ff', color: '#000', border: 'none', borderRadius: 4, fontWeight: 700, cursor: posting ? 'wait' : 'pointer', alignSelf: 'flex-end' }}>
            {posting ? 'Publication...' : editingId ? 'Sauvegarder' : 'Publier l\'événement'}
          </button>
        </form>
      )}

      {/* LISTE DES ÉVÉNEMENTS */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>Chargement...</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>Aucun événement pour le moment. Sois le premier à en ajouter un !</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {events.map((event) => {
            const eventDate = new Date(event.event_date);
            const isOwner = user?.id === event.created_by;
            
            return (
              <div key={event.id} style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                
                {/* ✅ BOUTONS MODIFIER / SUPPRIMER (uniquement pour le créateur) */}
                {isOwner && (
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, zIndex: 2 }}>
                    <button
                      onClick={() => startEdit(event)}
                      title="Modifier"
                      style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #2a2a2a', color: '#fff', cursor: 'pointer', padding: 6, borderRadius: 4, fontSize: 12 }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      title="Supprimer"
                      style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #2a2a2a', color: '#ff5c5c', cursor: 'pointer', padding: 6, borderRadius: 4, fontSize: 12 }}
                    >
                      🗑️
                    </button>
                  </div>
                )}

                {/* Image */}
                {event.image_url ? (
                  <div style={{ width: '100%', height: 160, background: `url(${event.image_url}) center/cover` }} />
                ) : (
                  <div style={{ width: '100%', height: 160, background: 'linear-gradient(135deg, #1c1c1c, #2a2a2a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎉</div>
                )}
                
                {/* Contenu */}
                <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, color: '#00d9ff', fontWeight: 700, textTransform: 'uppercase' }}>
                    {eventDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{event.title}</h3>
                  {event.location && (
                    <div style={{ fontSize: 12, color: '#999' }}>📍 {event.location}{event.city ? `, ${event.city}` : ''}</div>
                  )}
                  {event.description && (
                    <p style={{ fontSize: 12, color: '#ccc', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{event.description}</p>
                  )}
                  
                  {event.url && (
                    <a href={event.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 'auto', padding: '8px 12px', background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#00d9ff', textDecoration: 'none', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                      Plus d'infos →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};