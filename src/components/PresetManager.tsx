// src/components/PresetManager.tsx
import React, { useState, useEffect } from 'react';
import {
  masteringPresets,
  type UserMasteringPreset,
} from '../utils/masteringPresets';

interface PresetManagerProps {
  /** Paramètres actuels à sauvegarder */
  currentValues: {
    loudness: number;
    presence: number;
    width: number;
    saturation: number;
    eqBands: { frequency: number; gain: number; q: number }[];
    monoMakerEnabled: boolean;
    monoMakerFreq: number;
  };
  /** Callback quand un preset est chargé */
  onLoadPreset: (preset: UserMasteringPreset) => void;
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  currentValues,
  onLoadPreset,
}) => {
  const [presets, setPresets] = useState<UserMasteringPreset[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showList, setShowList] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    const list = await masteringPresets.getAll();
    setPresets(list.sort((a, b) => b.createdAt - a.createdAt));
  };

  const showToast = (msg: string, color = '#00ff88') => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    const name = newPresetName.trim();
    if (!name) {
      alert('Donne un nom au preset.');
      return;
    }

    const preset: UserMasteringPreset = {
      id: `preset-${Date.now()}`,
      name,
      createdAt: Date.now(),
      ...currentValues,
    };

    await masteringPresets.save(preset);
    await loadPresets();
    setNewPresetName('');
    setShowSaveDialog(false);
    showToast(`✅ Preset "${name}" sauvegardé`);
  };

  const handleLoad = (preset: UserMasteringPreset) => {
    onLoadPreset(preset);
    setShowList(false);
    showToast(`📂 Preset "${preset.name}" chargé`, '#00d9ff');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le preset "${name}" ?`)) return;
    await masteringPresets.delete(id);
    await loadPresets();
    showToast('🗑️ Preset supprimé', '#ff3366');
  };

  const handleExport = async () => {
    const json = await masteringPresets.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waveforge-mastering-presets-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 Presets exportés', '#ffd43b');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const count = await masteringPresets.importFromJson(text);
        await loadPresets();
        showToast(`📥 ${count} preset(s) importé(s)`, '#00ff88');
      } catch (err) {
        alert('Fichier invalide');
      }
    };
    input.click();
  };

  return (
    <div>
      {/* Barre de boutons */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setShowSaveDialog(!showSaveDialog)}
          style={{
            flex: 1,
            minWidth: 100,
            padding: '8px 12px',
            background: showSaveDialog ? 'rgba(0, 255, 136, 0.15)' : 'var(--bg-1)',
            border: `1px solid ${showSaveDialog ? '#00ff88' : 'var(--border)'}`,
            borderRadius: 6,
            color: showSaveDialog ? '#00ff88' : '#ccc',
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.5px',
          }}
        >
          💾 SAUVEGARDER
        </button>

        <button
          onClick={() => setShowList(!showList)}
          style={{
            flex: 1,
            minWidth: 100,
            padding: '8px 12px',
            background: showList ? 'rgba(0, 217, 255, 0.15)' : 'var(--bg-1)',
            border: `1px solid ${showList ? '#00d9ff' : 'var(--border)'}`,
            borderRadius: 6,
            color: showList ? '#00d9ff' : '#ccc',
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.5px',
          }}
        >
          📂 MES PRESETS ({presets.length})
        </button>

        <button
          onClick={handleExport}
          disabled={presets.length === 0}
          style={{
            padding: '8px 12px',
            background: 'var(--bg-1)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: presets.length > 0 ? '#ffd43b' : '#444',
            fontSize: 12,
            cursor: presets.length > 0 ? 'pointer' : 'not-allowed',
          }}
          title="Exporter en JSON"
        >
          📤
        </button>

        <button
          onClick={handleImport}
          style={{
            padding: '8px 12px',
            background: 'var(--bg-1)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: '#ffd43b',
            fontSize: 12,
            cursor: 'pointer',
          }}
          title="Importer depuis JSON"
        >
          📥
        </button>
      </div>

      {/* Dialogue de sauvegarde */}
      {showSaveDialog && (
        <div
          style={{
            padding: 12,
            marginBottom: 12,
            background: 'rgba(0, 255, 136, 0.05)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: '#00ff88',
              fontWeight: 700,
              letterSpacing: '1px',
              marginBottom: 8,
            }}
          >
            💾 NOUVEAU PRESET
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setShowSaveDialog(false);
              }}
              placeholder="Ex: Deep House Warm"
              autoFocus
              style={{
                flex: 1,
                padding: '8px 10px',
                background: 'var(--bg-0)',
                border: '1px solid #00ff88',
                borderRadius: 4,
                color: '#fff',
                fontSize: 11,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSave}
              style={{
                padding: '8px 14px',
                background: '#00ff88',
                border: 'none',
                borderRadius: 4,
                color: '#000',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✓
            </button>
          </div>
          <div
            style={{
              fontSize: 9,
              color: '#666',
              marginTop: 6,
            }}
          >
            Sauvegarde les réglages actuels (EQ + Mono-Maker + knobs)
          </div>
        </div>
      )}

      {/* Liste des presets */}
      {showList && (
        <div
          style={{
            padding: 12,
            marginBottom: 12,
            background: 'rgba(0, 217, 255, 0.05)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: '#00d9ff',
              fontWeight: 700,
              letterSpacing: '1px',
              marginBottom: 8,
            }}
          >
            📂 MES PRESETS
          </div>

          {presets.length === 0 ? (
            <div
              style={{
                fontSize: 10,
                color: '#666',
                textAlign: 'center',
                padding: 16,
              }}
            >
              Aucun preset sauvegardé.
              <div style={{ marginTop: 4, fontSize: 9 }}>
                Clique sur 💾 SAUVEGARDER pour créer ton premier preset.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {presets.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    background: 'var(--bg-0)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#fff',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: 9, color: '#666', marginTop: 2 }}
                    >
                      {new Date(p.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {p.monoMakerEnabled && ' · MONO'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleLoad(p)}
                    style={{
                      padding: '4px 10px',
                      background: 'rgba(0, 217, 255, 0.1)',
                      border: '1px solid #00d9ff',
                      borderRadius: 4,
                      color: '#00d9ff',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    CHARGER
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    style={{
                      padding: '4px 8px',
                      background: 'transparent',
                      border: '1px solid rgba(255, 51, 102, 0.3)',
                      borderRadius: 4,
                      color: '#ff3366',
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            background: '#0d0d14',
            border: `1px solid ${toast.color}60`,
            borderRadius: 8,
            color: toast.color,
            fontSize: 11,
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: `0 8px 24px ${toast.color}20`,
            animation: 'slideUp 0.3s ease',
          }}
        >
          {toast.msg}
          <style>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translate(-50%, 20px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};