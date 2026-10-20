// src/components/EventsTicker.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  city: string | null;
  image_url: string | null;
  url: string | null;
}

export const EventsTicker: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, event_date, location, city, image_url, url')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(5);

      if (data) setEvents(data);
    };
    loadEvents();
  }, []);

  if (events.length === 0) return null;

  const duplicatedEvents = [...events, ...events];

  return (
    <div style={{
      // ✅ MODIFICATIONS ICI POUR RÉDUIRE LA LARGEUR
      width: '100%',
      maxWidth: '1600px',       // <-- Change cette valeur (800px, 60%, 50%...)
      margin: '0px',        // <-- Centre la bannière
      // FIN DES MODIFICATIONS
      
      overflow: 'hidden',
      background: '#0f0f0f',
      border: '1px solid #2a2a2a', // On met une bordure de chaque côté puisqu'elle ne touche plus les bords
      borderRadius: 8,            // On arrondit les coins
      marginBottom: 32,           // Un peu plus d'espace en dessous
      position: 'relative',
      padding: '16px 0',
      boxSizing: 'border-box',
    }}>
      {/* Dégradés sur les côtés pour le fondu */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 40,
        background: 'linear-gradient(to right, #0f0f0f, transparent)', zIndex: 2, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 40,
        background: 'linear-gradient(to left, #0f0f0f, transparent)', zIndex: 2, pointerEvents: 'none',
      }} />

      <div style={{
        display: 'flex',
        gap: 40,
        animation: 'tickerScroll 30s linear infinite',
        width: 'max-content',
      }}>
        <style>{`
          @keyframes tickerScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .ticker-item:hover { opacity: 0.7; }
        `}</style>

        {duplicatedEvents.map((event, index) => {
          const eventDate = new Date(event.event_date);
          const dateStr = eventDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

          return (
            <Link
              key={`${event.id}-${index}`}
              to={event.url || `/events`}
              target={event.url ? '_blank' : '_self'}
              rel={event.url ? 'noopener noreferrer' : undefined}
              className="ticker-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textDecoration: 'none',
                color: '#fff',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                background: '#00d9ff',
                color: '#000',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                flexShrink: 0,
              }}>
                {dateStr}
              </div>

              {event.image_url && (
                <div style={{
                  width: 32, height: 32,
                  borderRadius: 4,
                  background: `url(${event.image_url}) center/cover`,
                  border: '1px solid #2a2a2a',
                  flexShrink: 0,
                }} />
              )}

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {event.title}
                </div>
                {event.city && (
                  <div style={{ fontSize: 11, color: '#999' }}>
                    {event.location ? `${event.location}, ` : ''}{event.city}
                  </div>
                )}
              </div>

              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#444', marginLeft: 20, flexShrink: 0 }} />
            </Link>
          );
        })}
      </div>
    </div>
  );
};