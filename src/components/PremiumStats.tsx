import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface PremiumStatsProps {
  profileId: string;
  themeColor: string;
}

interface DayPoint {
  date: string;      // 'YYYY-MM-DD'
  label: string;     // '12 oct'
  views: number;
  plays: number;
  downloads: number;
}

const last30Days = (): string[] => {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
};

const formatLabel = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export const PremiumStats: React.FC<PremiumStatsProps> = ({ profileId, themeColor }) => {
  const [views, setViews] = useState<number | null>(null);
  const [plays, setPlays] = useState<number | null>(null);
  const [downloads, setDownloads] = useState<number | null>(null);
  const [chartData, setChartData] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceISO = since.toISOString();

      const [viewsTotal, playsTotal, downloadsTotal, viewsRecent, playsRecent, downloadsRecent] = await Promise.all([
        supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('profile_id', profileId),
        supabase.from('track_plays').select('*', { count: 'exact', head: true }).eq('profile_id', profileId),
        supabase.from('track_downloads').select('*', { count: 'exact', head: true }).eq('profile_id', profileId),
        supabase.from('page_views').select('created_at').eq('profile_id', profileId).gte('created_at', sinceISO),
        supabase.from('track_plays').select('created_at').eq('profile_id', profileId).gte('created_at', sinceISO),
        supabase.from('track_downloads').select('created_at').eq('profile_id', profileId).gte('created_at', sinceISO),
      ]);

      setViews(viewsTotal.count ?? 0);
      setPlays(playsTotal.count ?? 0);
      setDownloads(downloadsTotal.count ?? 0);

      // Agrégation par jour
      const days = last30Days();
      const bucket: Record<string, DayPoint> = {};
      days.forEach((d) => {
        bucket[d] = { date: d, label: formatLabel(d), views: 0, plays: 0, downloads: 0 };
      });

      const add = (rows: { created_at: string }[] | null, key: 'views' | 'plays' | 'downloads') => {
        if (!rows) return;
        rows.forEach((r) => {
          const d = r.created_at.split('T')[0];
          if (bucket[d]) bucket[d][key] += 1;
        });
      };

      add(viewsRecent.data as any, 'views');
      add(playsRecent.data as any, 'plays');
      add(downloadsRecent.data as any, 'downloads');

      setChartData(days.map((d) => bucket[d]));
      setLoading(false);
    };

    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 24,
    textAlign: 'center',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 36,
    fontWeight: 900,
    color: themeColor,
    lineHeight: 1,
    fontFamily: 'Orbitron, sans-serif',
  };

  return (
    <section
      id="stats"
      style={{
        marginBottom: 120,
        paddingTop: 80,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: themeColor, marginBottom: 16 }}>
        Privé — visible uniquement par vous
      </div>
      <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 32 }}>
        Statistiques
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Vues de page</div>
          <div style={valueStyle}>{loading ? '—' : (views ?? 0)}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Plays</div>
          <div style={valueStyle}>{loading ? '—' : (plays ?? 0)}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Téléchargements</div>
          <div style={valueStyle}>{loading ? '—' : (downloads ?? 0)}</div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
          Évolution sur 30 jours
        </h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.3)"
                tick={{ fontSize: 11 }}
                interval={4}
              />
              <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#0a0a0a',
                  border: `1px solid ${themeColor}40`,
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 12,
                }}
                labelStyle={{ color: themeColor, fontWeight: 700 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }} />
              <Line type="monotone" dataKey="views" name="Vues" stroke={themeColor} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="plays" name="Plays" stroke="#a855f7" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="downloads" name="Téléchargements" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

export default PremiumStats;