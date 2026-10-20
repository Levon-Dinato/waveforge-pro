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

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString()) // Uniquement les événements à venir
      .order('event_date', { ascending: true });

    if (!error && data) setEvents(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/auth'); return; }
    if (!form.title || !form.event_date) return;

    setPosting(true);
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
    setPosting(false);
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
          onClick={() => user ? setShowForm(!showForm) : navigate('/auth')}
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
          <h3 style={{ margin: 0, fontSize: 15 }}>Nouvel événement</h3>
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
            {posting ? 'Publication...' : 'Publier l\'événement'}
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
            return (
              <div key={event.id} style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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