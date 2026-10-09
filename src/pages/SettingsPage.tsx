// src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { getApiKey, setApiKey, clearApiKey } from '../remix/trebloClient';
import { historyStore } from '../remix/historyStore';
import { analyzePreferences } from '../remix/preferences';
import type { UserPreferences } from '../remix/types';

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKeyState] = useState('');
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    const key = getApiKey();
    if (key) setApiKeyState(key);

    historyStore.getAll().then((all) => {
      setHistoryCount(all.length);
      setPreferences(analyzePreferences(all));
    });
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    setApiKey(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    if (confirm('Effacer la clé API Treblo ?')) {
      clearApiKey();
      setApiKeyState('');
    }
  };

  const handleClearHistory = async () => {
    if (
      confirm(
        "Effacer TOUT l'historique Remix AI ? Cette action est irréversible."
      )
    ) {
      await historyStore.clear();
      setHistoryCount(0);
      setPreferences(analyzePreferences([]));
    }
  };

  const handleResetAll = async () => {
    if (
      confirm(
        '⚠️ ATTENTION : Cela va effacer la clé API ET l\'historique. Continuer ?'
      )
    ) {
      clearApiKey();
      await historyStore.clear();
      setApiKeyState('');
      setHistoryCount(0);
      setPreferences(analyzePreferences([]));
      alert('Réinitialisation complète effectuée.');
    }
  };

  const hasKey = !!getApiKey();

  return (
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 20, maxWidth: 800 }}>
      {/* === HEADER === */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          ⚙️ <span style={{ color: 'var(--text)' }}>Réglages</span>
        </h2>
        <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
          Clé API · préférences · historique · informations système
        </p>
      </div>

      {/* === SECTION : CLÉ API TREBLO === */}
      <Section
        icon="🔑"
        title="CLÉ API TREBLO"
        description="Nécessaire pour générer des remix IA"
        status={{
          label: hasKey ? 'CONFIGURÉE' : 'MANQUANTE',
          color: hasKey ? '#00ff88' : '#ff3366',
        }}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              id="treblo-api-key-input"
              name="treblo-api-key"
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              placeholder="treblo_sk_..."
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 40px 10px 12px',
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: '#fff',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: 14,
                padding: 4,
              }}
              title={showKey ? 'Masquer' : 'Afficher'}
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>

          <button
            onClick={handleSave}
            className="btn-action primary"
            style={{
              background: saved ? 'var(--green)' : '#ff5cf0',
              color: '#000',
              borderColor: 'transparent',
              fontWeight: 700,
              padding: '10px 20px',
              whiteSpace: 'nowrap',
            }}
          >
            {saved ? '✅ SAUVEGARDÉ' : 'SAUVEGARDER'}
          </button>

          {apiKey && (
            <button
              onClick={handleClear}
              className="btn-action"
              style={{
                color: '#ff3366',
                borderColor: 'rgba(255, 51, 102, 0.3)',
                padding: '10px 16px',
                whiteSpace: 'nowrap',
              }}
            >
              🗑️
            </button>
          )}
        </div>

        <div style={{ fontSize: 10, color: '#666', lineHeight: 1.6 }}>
          📌 Obtiens une clé gratuite sur{' '}
          <a
            href="https://treblo.com/developers"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--cyan)', textDecoration: 'none' }}
          >
            treblo.com/developers
          </a>{' '}
          → Account → API Keys
        </div>
      </Section>

      {/* === SECTION : STATISTIQUES D'APPRENTISSAGE === */}
      <Section
        icon="📊"
        title="APPRENTISSAGE REMIX AI"
        description="Statistiques de tes générations passées"
      >
        {preferences && preferences.totalGenerations > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 12,
            }}
          >
            <MiniStat label="REMIX" value={preferences.totalGenerations} color="#ff5cf0" />
            <MiniStat label="EXPORTS" value={preferences.totalExports} color="#00ff88" />
            <MiniStat
              label="NOTE MOY"
              value={preferences.avgRating.toFixed(1)}
              color="#ffd43b"
              suffix="/5"
            />
            <MiniStat
              label="BPM PRÉF"
              value={`${preferences.preferredBPMRange.min}-${preferences.preferredBPMRange.max}`}
              color="#00d9ff"
            />
          </div>
        ) : (
          <div
            style={{
              fontSize: 11,
              color: '#666',
              padding: 12,
              background: 'var(--bg-1)',
              borderRadius: 6,
              textAlign: 'center',
            }}
          >
            Aucune donnée d'apprentissage pour le moment.
            <br />
            Génère ton premier remix dans la page Remix AI pour commencer !
          </div>
        )}
      </Section>

      {/* === SECTION : HISTORIQUE === */}
      <Section
        icon="💾"
        title="HISTORIQUE"
        description="Gestion des données stockées localement"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 12,
            background: 'var(--bg-1)',
            borderRadius: 6,
            marginBottom: 10,
          }}
        >
          <div>
            <div
              className="label-uppercase"
              style={{ fontSize: 9, color: '#666', marginBottom: 2 }}
            >
              REMIX ENREGISTRÉS
            </div>
            <div
              className="mono"
              style={{ fontSize: 16, fontWeight: 700, color: '#ff5cf0' }}
            >
              {historyCount}
            </div>
          </div>
          <button
            onClick={handleClearHistory}
            disabled={historyCount === 0}
            className="btn-action"
            style={{
              color: historyCount > 0 ? '#ff3366' : '#444',
              borderColor:
                historyCount > 0 ? 'rgba(255, 51, 102, 0.3)' : 'var(--border)',
              fontSize: 11,
              cursor: historyCount > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            🗑️ EFFACER L'HISTORIQUE
          </button>
        </div>

        <div style={{ fontSize: 10, color: '#666', lineHeight: 1.5 }}>
          L'historique contient tes remix, notes et préférences. Il est stocké
          localement dans ton navigateur (IndexedDB) et n'est envoyé à aucun serveur.
        </div>
      </Section>

      {/* === SECTION : SYSTÈME === */}
      <Section
        icon="ℹ️"
        title="INFORMATIONS SYSTÈME"
        description="Détails de l'application"
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <InfoRow label="Application" value="WaveForge PRO" />
          <InfoRow label="Version" value="v2.0" />
          <InfoRow label="Navigateur" value={navigator.userAgent.split(' ').slice(-2).join(' ')} />
          <InfoRow label="Résolution" value={`${window.screen.width} × ${window.screen.height}`} />

          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid var(--border)',
            }}
          >
            <div
              className="label-uppercase"
              style={{ fontSize: 9, color: '#666', marginBottom: 8 }}
            >
              MODULES INTÉGRÉS
            </div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                fontSize: 10,
              }}
            >
              {['YIN', 'Tone.js', 'Demucs', 'Basic Pitch', 'Essentia', 'Treblo API'].map(
                (mod) => (
                  <span
                    key={mod}
                    style={{
                      padding: '3px 8px',
                      background: 'var(--bg-1)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      color: '#888',
                    }}
                  >
                    {mod}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* === SECTION : ZONE DE DANGER === */}
      <div
        className="panel"
        style={{
          padding: 20,
          borderColor: 'rgba(255, 51, 102, 0.3)',
          background:
            'linear-gradient(135deg, rgba(255, 51, 102, 0.03), transparent)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div
              className="label-uppercase"
              style={{ fontSize: 10, color: '#ff3366', letterSpacing: '1px' }}
            >
              ZONE DE DANGER
            </div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
              Actions irréversibles
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 12,
            background: 'var(--bg-1)',
            borderRadius: 6,
            gap: 12,
          }}
        >
          <div style={{ fontSize: 11, color: '#888', flex: 1 }}>
            Réinitialiser complètement WaveForge : effacer la clé API, l'historique
            et toutes les préférences.
          </div>
          <button
            onClick={handleResetAll}
            className="btn-action"
            style={{
              color: '#ff3366',
              borderColor: 'rgba(255, 51, 102, 0.5)',
              background: 'rgba(255, 51, 102, 0.05)',
              fontSize: 11,
              padding: '10px 16px',
              whiteSpace: 'nowrap',
            }}
          >
            ⚠️ TOUT RÉINITIALISER
          </button>
        </div>
      </div>

      {/* === FOOTER INFO === */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 10,
          color: '#444',
          paddingTop: 8,
        }}
      >
        WaveForge PRO · Audio → MIDI Studio · Fait avec ❤️ à la maison
      </div>
    </div>
  );
};

/* ============================================================
   SOUS-COMPOSANTS
   ============================================================ */

const Section: React.FC<{
  icon: string;
  title: string;
  description?: string;
  status?: { label: string; color: string };
  children: React.ReactNode;
}> = ({ icon, title, description, status, children }) => (
  <div className="panel" style={{ padding: 20 }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--bg-1)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div
            className="label-uppercase"
            style={{ fontSize: 10, color: '#fff', letterSpacing: '1px', fontWeight: 700 }}
          >
            {title}
          </div>
          {description && (
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
              {description}
            </div>
          )}
        </div>
      </div>

      {status && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.5px',
            borderRadius: 10,
            background: `${status.color}15`,
            border: `1px solid ${status.color}40`,
            color: status.color,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: status.color,
            }}
          />
          {status.label}
        </div>
      )}
    </div>

    {children}
  </div>
);

const MiniStat: React.FC<{
  label: string;
  value: number | string;
  color: string;
  suffix?: string;
}> = ({ label, value, color, suffix }) => (
  <div
    style={{
      padding: '10px 12px',
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      textAlign: 'center',
    }}
  >
    <div
      className="label-uppercase"
      style={{ fontSize: 8, color: '#666', marginBottom: 4 }}
    >
      {label}
    </div>
    <div
      className="mono"
      style={{ fontSize: 16, fontWeight: 700, color }}
    >
      {value}
      {suffix && <span style={{ fontSize: 10, color: '#666' }}>{suffix}</span>}
    </div>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: 11,
      padding: '6px 0',
    }}
  >
    <span style={{ color: '#666' }}>{label}</span>
    <span className="mono" style={{ color: '#ccc', fontSize: 10 }}>
      {value}
    </span>
  </div>
);