import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrackGrid } from '../components/TrackGrid';
import { useIsMobile } from '../hooks/useIsMobile';

export const HomePage: React.FC = () => {
  const isMobile = useIsMobile(768);

  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [recentTracks, setRecentTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const { data: topData } = await supabase
          .from('tracks')
          .select('*')
          .order('likes', { ascending: false })
          .limit(5);
        if (topData) setTopTracks(topData);

        const { data: recentData } = await supabase
          .from('tracks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        if (recentData) setRecentTracks(recentData);
      } catch (err) {
        console.error("Erreur chargement accueil:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  if (loading) return <div style={{ color: '#fff', padding: 40, textAlign: 'center', background: '#0a0c14', minHeight: '100vh' }}>Chargement...</div>;

  return (
    <div style={{ background: '#0a0c14', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', paddingBottom: 100 }}>
      
      {/* HERO */}
      <div style={{ position: 'relative', height: isMobile ? 300 : 400, background: 'linear-gradient(135deg, #1a1f2e, #0a0c14)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ position: 'absolute', top: '-50%', left: '20%', width: '60%', height: '200%', background: 'radial-gradient(circle, rgba(229,0,0,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 20px' }}>
          <h1 style={{ fontSize: isMobile ? 32 : 52, fontWeight: 900, margin: 0, letterSpacing: '-1px', lineHeight: 1.1 }}>Bienvenue sur <span style={{ color: '#e50000' }}>WaveForge</span></h1>
          <p style={{ fontSize: isMobile ? 14 : 18, color: '#aaa', marginTop: 15, maxWidth: 600, margin: '15px auto 0' }}>La plateforme ultime pour les DJs et producteurs. Mixez, masterisez et partagez vos sons.</p>
          <div style={{ display: 'flex', gap: 15, justifyContent: 'center', marginTop: 30 }}>
            <Link to="/studio" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '12px 24px', background: '#e50000', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(229,0,0,0.4)' }}>🎹 Aller au Studio</button>
            </Link>
            <Link to="/nouveautes" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '12px 24px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>Explorer les sons</button>
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px 15px' : '40px 20px' }}>
        
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, margin: 0 }}>🔥 Top Tracks</h2>
              <div style={{ color: '#888', fontSize: '0.8rem', marginTop: 5 }}>Les morceaux les plus likés de la semaine</div>
            </div>
          </div>
          <TrackGrid tracks={topTracks} showRank={true} />
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, margin: 0 }}>✨ Nouveautés</h2>
              <div style={{ color: '#888', fontSize: '0.8rem', marginTop: 5 }}>Les derniers sons ajoutés</div>
            </div>
            <Link to="/nouveautes" style={{ color: '#888', fontSize: '0.85rem', textDecoration: 'none' }}>Voir tout</Link>
          </div>
          <TrackGrid tracks={recentTracks} />
        </section>
      </div>
    </div>
  );
};