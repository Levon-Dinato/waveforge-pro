// src/pages/RemixPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RemixPanel } from '../components/RemixPanel';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { getApiKey } from '../remix/trebloClient';
import { historyStore } from '../remix/historyStore';
import { analyzePreferences } from '../remix/preferences';
import type { RemixEntry, UserPreferences } from '../remix/types';

export const RemixPage: React.FC = () => {
  const engine = useAudioEngineContext();
  const hasAudio = !!engine.sourceFile;
  const [hasApiKey, setHasApiKey] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [history, setHistory] = useState<RemixEntry[]>([]);

  useEffect(() => {
    setHasApiKey(!!getApiKey());
    historyStore.getAll().then((all) => {
      setHistory(all.sort((a, b) => b.timestamp - a.timestamp));
      setPreferences(analyzePreferences(all));
    });
  }, []);

  const refreshHistory = () => {
    historyStore.getAll().then((all) => {
      setHistory(all.sort((a, b) => b.timestamp - a.timestamp));
      setPreferences(analyzePreferences(all));
    });
  };

  return (
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 20 }}>
      {/* === HEADER === */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
            🎛️ <span style={{ color: '#ff5cf0' }}>Remix AI</span>
          </h2>
          <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
            Transformation IA avec Treblo · apprentissage continu
          </p>
        </div>

        {/* Statut API Treblo */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            background: hasApiKey
              ? 'rgba(0, 255, 136, 0.06)'
              : 'rgba(255, 51, 102, 0.06)',
            border: `1px solid ${
              hasApiKey ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 51, 102, 0.3)'
            }`,
            borderRadius: 8,
            fontSize: 11,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: hasApiKey ? '#00ff88' : '#ff3366',
              boxShadow: hasApiKey ? '0 0 8px #00ff88' : 'none',
            }}
          />
          <div>
            <div className="label-uppercase" style={{ fontSize: 8, color: '#666' }}>
              TREBLO API
            </div>
            <div
              style={{
                fontSize: 11,
                color: hasApiKey ? '#00ff88' : '#ff3366',
                fontWeight: 600,
              }}
            >
              {hasApiKey ? 'CONFIGURÉE' : 'CLÉ MANQUANTE'}
            </div>
          </div>
          {!hasApiKey && (
            <Link
              to="/settings"
              style={{
                color: '#ff5cf0',
                fontSize: 10,
                textDecoration: 'none',
                marginLeft: 4,
              }}
            >
              Configurer →
            </Link>
          )}
        </div>
      </div>

      {/* === STATISTIQUES D'APPRENTISSAGE === */}
      {preferences && preferences.totalGenerations > 0 && (
        <div>
          <div
            className="label-uppercase"
            style={{
              fontSize: 10,
              color: '#666',
              marginBottom: 12,
              letterSpacing: '1px',
            }}
          >
            APPRENTISSAGE
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
            }}
          >
            <StatCard
              icon="🎛️"
              label="REMIX GÉNÉRÉS"
              value={preferences.totalGenerations}
              color="#ff5cf0"
            />
            <StatCard
              icon="💾"
              label="EXPORTS"
              value={preferences.totalExports}
              color="#00ff88"
            />
            <StatCard
              icon="⭐"
              label="NOTE MOYENNE"
              value={`${preferences.avgRating.toFixed(1)}/5`}
              color="#ffd43b"
            />
            <StatCard
              icon="🎵"
              label="BPM PRÉFÉRÉ"
              value={`${preferences.preferredBPMRange.min}-${preferences.preferredBPMRange.max}`}
              color="#00d9ff"
            />
          </div>
        </div>
      )}

      {/* === ÉTAT VIDE : PAS D'AUDIO === */}
      {!hasAudio && (
        <div
          className="panel"
          style={{
            padding: 40,
            textAlign: 'center',
            borderStyle: 'dashed',
            borderColor: 'rgba(255, 92, 240, 0.3)',
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>🎛️</div>
          <div
            style={{
              fontSize: 15,
              color: '#fff',
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            Aucun audio chargé
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#888',
              marginBottom: 24,
              maxWidth: 450,
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}
          >
            Pour transformer un morceau en remix IA, tu dois d'abord charger un audio
            dans la page Studio. Le remix sera généré via l'API Treblo avec les tags
            de style de ton choix.
          </div>
          <Link
            to="/studio"
            className="btn-action primary"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #ff5cf0, #a020a0)',
              color: '#000',
              borderColor: 'transparent',
              padding: '12px 24px',
              fontSize: 12,
            }}
          >
            🎹 Aller au Studio
          </Link>
        </div>
      )}

      {/* === PANNEAU REMIX === */}
      {hasAudio && (
        <RemixPanel
          sourceAudioFile={engine.sourceFile}
          sourceBPM={engine.result?.bpm ?? 120}
        />
      )}

      {/* === HISTORIQUE === */}
      {history.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div
              className="label-uppercase"
              style={{
                fontSize: 10,
                color: '#666',
                letterSpacing: '1px',
              }}
            >
              HISTORIQUE · {history.length} REMIX
            </div>
            <button
              onClick={refreshHistory}
              className="btn-action"
              style={{
                padding: '4px 10px',
                fontSize: 10,
                color: '#888',
              }}
            >
              🔄 RAFRAÎCHIR
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {history.slice(0, 6).map((entry) => (
              <HistoryCard key={entry.id} entry={entry} />
            ))}
          </div>

          {history.length > 6 && (
            <div
              style={{
                textAlign: 'center',
                marginTop: 12,
                fontSize: 11,
                color: '#666',
              }}
            >
              + {history.length - 6} autres remix dans l'historique
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ============================================================
   SOUS-COMPOSANTS
   ============================================================ */

const StatCard: React.FC<{
  icon: string;
  label: string;
  value: number | string;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div
    className="panel"
    style={{
      padding: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      borderColor: 'var(--border)',
      transition: 'all 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = color;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border)';
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: `${color}15`,
        border: `1px solid ${color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div
        className="label-uppercase"
        style={{ fontSize: 8, color: '#666', marginBottom: 2 }}
      >
        {label}
      </div>
      <div className="mono" style={{ fontSize: 16, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  </div>
);

const HistoryCard: React.FC<{ entry: RemixEntry }> = ({ entry }) => {
  const date = new Date(entry.timestamp);
  const dateStr = date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusColor =
    entry.userAction === 'exported'
      ? '#00ff88'
      : entry.userAction === 'deleted'
      ? '#ff3366'
      : entry.userAction === 'regenerated'
      ? '#ffd43b'
      : '#888';

  const statusLabel =
    entry.userAction === 'exported'
      ? 'EXPORTÉ'
      : entry.userAction === 'deleted'
      ? 'SUPPRIMÉ'
      : entry.userAction === 'regenerated'
      ? 'REGEN'
      : 'GÉNÉRÉ';

  return (
    <div
      className="panel fade-in"
      style={{
        padding: 14,
        borderColor: 'var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: '#fff',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.styleTags.join(' · ') || 'Sans style'}
          </div>
          <div className="mono" style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
            {dateStr}
          </div>
        </div>
        <div
          style={{
            padding: '2px 6px',
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.5px',
            borderRadius: 4,
            background: `${statusColor}15`,
            border: `1px solid ${statusColor}40`,
            color: statusColor,
            flexShrink: 0,
          }}
        >
          {statusLabel}
        </div>
      </div>

      {entry.userRating > 0 && (
        <div style={{ fontSize: 12, marginBottom: 8 }}>
          {'⭐'.repeat(entry.userRating)}
        </div>
      )}

      {entry.sourceFileName && (
        <div
          className="mono"
          style={{
            fontSize: 9,
            color: '#666',
            padding: '4px 8px',
            background: 'var(--bg-1)',
            borderRadius: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          🎵 {entry.sourceFileName}
        </div>
      )}

      {entry.resultAudioUrl && (
        <audio
          src={entry.resultAudioUrl}
          controls
          style={{ width: '100%', height: 28, marginTop: 8 }}
        />
      )}
    </div>
  );
};