// src/components/SessionPanel.tsx
import React, { useState, useEffect } from 'react';
import { sessionManager, type SavedSession } from '../utils/sessionManager';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';

interface SessionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionPanel: React.FC<SessionPanelProps> = ({ isOpen, onClose }) => {
  const engine = useAudioEngineContext();
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (isOpen) loadSessions();
  }, [isOpen]);

  const loadSessions = async () => {
    const list = await sessionManager.getAll();
    setSessions(list.sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleSave = async () => {
    if (!engine.audioBuffer || !engine.sourceFile) {
      alert('Charge un audio avant de sauvegarder.');
      return;
    }

    const name =
      newName.trim() ||
      engine.fileName ||
      `Session ${new Date().toLocaleDateString('fr-FR')}`;

    setIsLoading(true);
    try {
      const wavBlob = audioBufferToWavBlob(engine.audioBuffer);

      const session: SavedSession = {
        id: `session-${Date.now()}`,
        name,
        timestamp: Date.now(),
        audioBlob: wavBlob,
        fileName: engine.fileName || 'audio.wav',
        fileFormat: engine.fileFormat || 'WAV',
        fileSize: wavBlob.size,
        bpm: engine.result?.bpm ?? 120,
        sampleRate: engine.result?.sampleRate ?? 44100,
        duration: engine.result?.duration ?? 0,
        notes: engine.finalNotes || [],
        quantize: { grid: 16, swing: 0, strength: 0.8 },
        trackEnabled: { melody: true, bass: true, harmony: true, drums: true },
        snapEnabled: false,
        detectedKey: null,
      };

      await sessionManager.save(session);
      await loadSessions();
      setNewName('');
      alert(`✅ Session "${name}" sauvegardée !`);
    } catch (e) {
      console.error('Erreur sauvegarde session:', e);
      alert(`Erreur : ${(e as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async (session: SavedSession) => {
    if (!confirm(`Charger la session "${session.name}" ?\n\nCela remplacera l'audio actuel.`))
      return;

    setIsLoading(true);
    try {
      const file = new File([session.audioBlob], session.fileName, { type: 'audio/wav' });
      await engine.loadFile(file);
      onClose();
      console.log('✅ Session chargée :', session.name);
    } catch (e) {
      console.error('Erreur chargement session:', e);
      alert(`Erreur : ${(e as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer la session "${name}" ?`)) return;
    await sessionManager.delete(id);
    await loadSessions();
  };

  const handleClearAll = async () => {
    if (!confirm('Supprimer TOUTES les sessions ? Action irréversible.')) return;
    await sessionManager.clear();
    await loadSessions();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(600px, 92vw)',
          maxHeight: '85vh',
          background: 'linear-gradient(135deg, #0a0a0f, #0d0d14)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              className="label-uppercase"
              style={{ fontSize: 10, color: '#666', letterSpacing: '1px', marginBottom: 2 }}
            >
              GESTION
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
              💾 Sessions sauvegardées
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: '#888',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: 16,
            borderBottom: '1px solid var(--border)',
            background: 'rgba(0, 217, 255, 0.03)',
          }}
        >
          <div
            className="label-uppercase"
            style={{ fontSize: 10, color: '#00d9ff', marginBottom: 8, letterSpacing: '1px' }}
          >
            💾 SAUVEGARDER LA SESSION ACTUELLE
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={engine.fileName || 'Nom de la session...'}
              style={{
                flex: 1,
                minWidth: 150,
                padding: '10px 12px',
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: '#fff',
                fontSize: 12,
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleSave}
              disabled={isLoading || !engine.audioBuffer}
              className="btn-action primary"
              style={{
                background: engine.audioBuffer
                  ? 'linear-gradient(135deg, #00d9ff, #0088ff)'
                  : 'var(--bg-2)',
                color: engine.audioBuffer ? '#000' : '#666',
                borderColor: 'transparent',
                fontWeight: 700,
                padding: '10px 20px',
                whiteSpace: 'nowrap',
                cursor: engine.audioBuffer ? 'pointer' : 'not-allowed',
              }}
            >
              {isLoading ? '⏳...' : '💾 SAUVEGARDER'}
            </button>
          </div>
          {!engine.audioBuffer && (
            <div style={{ fontSize: 10, color: '#ff3366', marginTop: 6 }}>
              ⚠️ Charge un audio dans le Studio d'abord.
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {sessions.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                color: '#666',
                fontSize: 12,
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 8 }}>💾</div>
              Aucune session sauvegardée.
              <div style={{ marginTop: 8, fontSize: 11 }}>
                Charge un audio et clique sur <strong>SAUVEGARDER</strong>.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {sessions.map((session) => {
                const date = new Date(session.timestamp);
                const dateStr = date.toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const sizeMB = (session.audioBlob.size / (1024 * 1024)).toFixed(1);

                return (
                  <div
                    key={session.id}
                    className="panel"
                    style={{ padding: 12, borderColor: 'var(--border)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: 'rgba(0, 217, 255, 0.1)',
                          border: '1px solid rgba(0, 217, 255, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      >
                        🎵
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#fff',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {session.name}
                        </div>
                        <div
                          className="mono"
                          style={{ fontSize: 9, color: '#666', marginTop: 2 }}
                        >
                          {dateStr} · {session.duration.toFixed(1)}s · {session.bpm} BPM · {sizeMB} MB
                        </div>
                      </div>
                      <button
                        onClick={() => handleLoad(session)}
                        disabled={isLoading}
                        className="btn-action"
                        style={{
                          color: '#00ff88',
                          borderColor: 'rgba(0, 255, 136, 0.3)',
                          fontSize: 11,
                          padding: '6px 12px',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        📂 CHARGER
                      </button>
                      <button
                        onClick={() => handleDelete(session.id, session.name)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          border: '1px solid rgba(255, 51, 102, 0.3)',
                          background: 'transparent',
                          color: '#ff3366',
                          fontSize: 14,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {sessions.length > 0 && (
          <div
            style={{
              padding: 12,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 10,
              color: '#666',
            }}
          >
            <span>
              {sessions.length} session{sessions.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleClearAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ff3366',
                fontSize: 10,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              🗑️ TOUT SUPPRIMER
            </button>
          </div>
        )}
      </div>
    </>
  );
};

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = Math.max(-1, Math.min(1, channels[ch][i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}