// src/pages/FeedPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { TrackGrid } from '../components/TrackGrid';
import type { Track } from '../components/TrackGrid';

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  city: string | null;
  url: string | null;
  image_url: string | null;
  created_by: string;
}

export const FeedPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchFeed = async () => {
      setLoading(true);
      try {
        // 1. Récupérer les IDs des artistes que je suis
        const { data: follows } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = follows?.map(f => f.following_id) || [];

        if (followingIds.length === 0) {
          setTracks([]);
          setEvents([]);
          setLoading(false);
          return;
        }

        // 2. Récupérer les morceaux des artistes suivis
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*')
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(20);

        if (tracksData) setTracks(tracksData as Track[]);

        // 3. Récupérer les événements des artistes suivis
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .in('created_by', followingIds)
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(10);

        if (eventsData) setEvents(eventsData);

      } catch (err) {
        console.error('Erreur chargement feed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', background: '#121212', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#fff' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0 }}>
          Mon <span style={{ color: '#00d9ff' }}>Feed</span>
        </h1>
        <p style={{ color: '#999', fontSize: 13, marginTop: 6 }}>
          Les dernières sorties et les prochains événements des artistes que tu suis.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>Chargement de ton feed...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* ✅ SECTION ÉVÉNEMENTS */}
          {events.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 4, height: 24, background: '#ff3366', borderRadius: 2 }} />
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Prochaines dates de tes artistes</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 280 : 320}px, 1fr))`, gap: 16 }}>
                {events.map(event => {
                  const eventDate = new Date(event.event_date);
                  return (
                    <a
                      key={event.id}
                      href={event.url || '/events'}
                      target={event.url ? '_blank' : '_self'}
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: 12,
                        background: '#1c1c1c',
                        border: '1px solid #2a2a2a',
                        borderRadius: 8,
                        textDecoration: 'none',
                        color: '#fff',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00d9ff'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
                    >
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} style={{ width: 60, height: 60, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 60, height: 60, borderRadius: 4, background: '#121212', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎉</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: '#00d9ff', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                          {eventDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {event.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#999', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {event.location}{event.city ? `, ${event.city}` : ''}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* ✅ SECTION NOUVEAUX MORCEAUX */}
          {tracks.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 4, height: 24, background: '#00d9ff', borderRadius: 2 }} />
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Dernières sorties</h2>
              </div>
              <TrackGrid tracks={tracks} />
            </section>
          )}

          {/* ✅ ÉTAT VIDE */}
          {events.length === 0 && tracks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#1c1c1c', border: '1px dashed #2a2a2a', borderRadius: 8 }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🎧</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>Ton feed est vide</h3>
              <p style={{ color: '#999', fontSize: 13, margin: '0 0 24px 0', lineHeight: 1.6 }}>
                Tu ne suis encore aucun artiste. <br />
                Découvre des DJs et abonne-toi pour voir leurs sorties ici.
              </p>
              <Link to="/artists" style={{ display: 'inline-flex', padding: '10px 20px', background: '#00d9ff', color: '#000', borderRadius: 4, fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>
                Découvrir des artistes
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};