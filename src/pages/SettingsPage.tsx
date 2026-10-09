// src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { getApiKey, setApiKey, clearApiKey } from '../remix/trebloClient';
import { historyStore } from '../remix/historyStore';

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKeyState] = useState('');
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ total: 0, exported: 0 });

  useEffect(() => {
    const key = getApiKey();
    if (key) setApiKeyState(key);
    historyStore.getAll().then((all) => {
      setStats({
        total: all.length,
        exported: all.filter((e) => e.userAction === 'exported').length,
      });
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
    if (confirm('Effacer TOUT l\'historique Remix AI ? Cette action est irréversible.')) {
      await historyStore.clear();
      setStats({ total: 0, exported: 0 });
    }
  };

  return (
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 16, maxWidth: 700 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          ⚙️ Réglages
        </h2>
        <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
          Clé API · Préférences · Historique
        </p>
      </div>

      {/* Clé API Treblo */}
      <div className="panel" style={{ padding: 20 }}>
        <div className="label-uppercase" style={{ fontSize: 10, color: '#666', marginBottom: 12 }}>
          🔑 CLÉ API TREBLO
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="treblo-api-key"
            name="treblo-api-key"
            type="password"
            autoComplete="off"
            placeholder="treblo_sk_..."
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
            style={{
              flex: 1,
              padding: 10,
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12,
            }}
          />
          <button
            onClick={handleSave}
            className="btn-action primary"
            style={{ background: saved ? 'var(--green)' : 'var(--cyan)' }}
          >
            {saved ? '✅ SAUVEGARDÉ' : 'SAUVEGARDER'}
          </button>
          {apiKey && (
            <button onClick={handleClear} className="btn-action" style={{ color: '#ff3366' }}>
              EFFACER
            </button>
          )}
        </div>
        <div style={{ fontSize: 10, color: '#666', marginTop: 8 }}>
          Obtenir une clé sur <a href="https://treblo.com/developers" target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>treblo.com/developers</a>
        </div>
      </div>

      {/* Statistiques d'historique */}
      <div className="panel" style={{ padding: 20 }}>
        <div className="label-uppercase" style={{ fontSize: 10, color: '#666', marginBottom: 12 }}>
          📊 HISTORIQUE REMIX AI
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 12, marginBottom: 12 }}>
          <span><span style={{ color: '#666' }}>Total : </span><strong style={{ color: '#ff5cf0' }}>{stats.total}</strong></span>
          <span><span style={{ color: '#666' }}>Exports : </span><strong style={{ color: 'var(--green)' }}>{stats.exported}</strong></span>
        </div>
        <button
          onClick={handleClearHistory}
          className="btn-action"
          style={{ color: '#ff3366', borderColor: 'rgba(255, 51, 102, 0.3)' }}
        >
          🗑️ EFFACER L'HISTORIQUE
        </button>
      </div>

      {/* Infos app */}
      <div className="panel" style={{ padding: 20 }}>
        <div className="label-uppercase" style={{ fontSize: 10, color: '#666', marginBottom: 12 }}>
          ℹ️ À PROPOS
        </div>
        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.6 }}>
          <div><strong style={{ color: '#fff' }}>WaveForge PRO</strong> · v1.0</div>
          <div>YIN · Tone.js · Demucs · Basic Pitch</div>
          <div>Studio de production musicale IA 100% navigateur</div>
        </div>
      </div>
    </div>
  );
};