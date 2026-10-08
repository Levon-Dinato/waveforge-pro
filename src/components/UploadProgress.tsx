interface Props {
  percent: number;       // 0-100
  loaded: number;        // bytes envoyés
  total: number;         // bytes total
  visible: boolean;
  stage: 'upload' | 'processing';  // upload ou traitement Demucs
}

export function UploadProgress({
  percent,
  loaded,
  total,
  visible,
  stage,
}: Props) {
  if (!visible) return null;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Après upload → passe en mode "processing" (barre infinie)
  const isProcessing = stage === 'processing';
  const displayPercent = isProcessing ? 100 : Math.round(percent);

  return (
    <div
      className="panel fade-in"
      style={{
        marginTop: 16,
        marginBottom: 16,
        borderColor: 'rgba(0, 217, 255, 0.3)',
        background: 'rgba(0, 20, 30, 0.6)',
      }}
    >
      <div className="panel-header">
        <span>
          {isProcessing
            ? '⏳ TRAITEMENT DEMUCS EN COURS'
            : '📤 ENVOI AU SERVEUR'}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--cyan)',
          }}
        >
          {isProcessing ? '...' : `${displayPercent}%`}
        </span>
      </div>
      <div className="panel-body" style={{ padding: 12 }}>
        {/* Barre de progression */}
        <div
          style={{
            width: '100%',
            height: 8,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {isProcessing ? (
            // Animation infinie pour le traitement
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: '30%',
                background:
                  'linear-gradient(90deg, transparent, var(--cyan), transparent)',
                animation: 'shimmerBtn 1.5s ease-in-out infinite',
              }}
            />
          ) : (
            // Barre classique pour l'upload
            <div
              style={{
                width: `${percent}%`,
                height: '100%',
                background:
                  'linear-gradient(90deg, #0088ff, #00d9ff)',
                boxShadow: '0 0 12px rgba(0, 217, 255, 0.6)',
                borderRadius: 4,
                transition: 'width 0.15s ease',
              }}
            />
          )}
        </div>

        {/* Infos */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
            fontSize: 10,
            color: '#888',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>
            {isProcessing
              ? '🎬 Séparation voix / instrumental...'
              : `${formatBytes(loaded)} / ${formatBytes(total)}`}
          </span>
          <span>
            {isProcessing
              ? 'Durée estimée : 30 sec - 5 min'
              : displayPercent < 100
              ? 'Envoi...'
              : '✅ Envoyé'}
          </span>
        </div>
      </div>
    </div>
  );
}