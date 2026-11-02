// src/components/PremiumStats.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext'; // ✅ IMPORT DU THEME
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
  const { theme } = useTheme(); // ✅ RÉCUPÉRATION DU THÈME
  const isDark = theme === 'dark';

  const [views, setViews] = useState<number | null>(null);
  const [plays, setPlays] = useState<number | null>(null);
  const [downloads, setDownloads] = useState<number | null>(null);
  const [chartData, setChartData] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ PALETTE DE COULEURS DYNAMIQUES
  const colors = {
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#666666',
    textDark: isDark ? 'rgba(255,255,255,0.3)' : '#999999',
    cardBg: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    sectionBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    gridLine: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    tooltipBg: isDark ? '#0a0a0a' : '#ffffff',
  };

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
    background: colors.cardBg, // ✅ DYNAMIQUE
    border: `1px solid ${colors.cardBorder}`, // ✅ DYNAMIQUE
    borderRadius: 16,
    padding: 24,
    textAlign: 'center',
    boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.03)', // ✅ AJOUT D'OMBRE EN MODE CLAIR
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.textMuted, // ✅ DYNAMIQUE
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
        borderTop: `1px solid ${colors.sectionBorder}`, // ✅ DYNAMIQUE
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: themeColor, marginBottom: 16 }}>
        Privé — visible uniquement par vous
      </div>
      <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 32, color: colors.textMain }}>
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

      <div style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: colors.textMuted, margin: '0 0 24px' }}>
          Évolution sur 30 jours
        </h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridLine} /> {/* ✅ DYNAMIQUE */}
              <XAxis
                dataKey="label"
                stroke={colors.textDark} // ✅ DYNAMIQUE
                tick={{ fontSize: 11, fill: colors.textMuted }} // ✅ DYNAMIQUE
                interval={4}
              />
              <YAxis 
                stroke={colors.textDark} // ✅ DYNAMIQUE
                tick={{ fontSize: 11, fill: colors.textMuted }} // ✅ DYNAMIQUE
                allowDecimals={false} 
              />
              <Tooltip
                contentStyle={{
                  background: colors.tooltipBg, // ✅ DYNAMIQUE
                  border: `1px solid ${themeColor}40`,
                  borderRadius: 8,
                  color: colors.textMain, // ✅ DYNAMIQUE
                  fontSize: 12,
                  boxShadow: isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.1)'
                }}
                labelStyle={{ color: themeColor, fontWeight: 700 }}
                itemStyle={{ color: colors.textMain }} // ✅ DYNAMIQUE (force la couleur du texte dans le tooltip)
              />
              <Legend wrapperStyle={{ fontSize: 12, color: colors.textMuted }} /> {/* ✅ DYNAMIQUE */}
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