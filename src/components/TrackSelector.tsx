interface TrackInfo {
  id: string;
  name: string;
  color: string;
  icon: string;
  enabled: boolean;
  count: number;
}

interface Props {
  tracks: TrackInfo[];
  onToggle: (id: string) => void;
}

export function TrackSelector({ tracks, onToggle }: Props) {
  return (
    <div
      className="panel fade-in"
      style={{
        marginBottom: 0,
        borderColor: 'rgba(0, 217, 255, 0.1)',
      }}
    >
      <div className="panel-header">
        <span>🎛️ PISTES</span>
        <span className="mono" style={{ fontSize: 10, color: '#888' }}>
          {tracks.filter((t) => t.enabled).length} / {tracks.length} ACTIVES
        </span>
      </div>
      <div className="panel-body" style={{ padding: 12 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 8,
          }}
        >
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => onToggle(track.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '10px 12px',
                background: track.enabled
                  ? 'rgba(0, 0, 0, 0.4)'
                  : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${
                  track.enabled ? track.color : 'var(--border)'
                }`,
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                opacity: track.enabled ? 1 : 0.45,
                fontFamily: 'var(--font-main)',
              }}
              title={`${track.enabled ? 'Désactiver' : 'Activer'} ${track.name}`}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 14 }}>{track.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div
                    className="label-uppercase"
                    style={{
                      color: track.enabled ? track.color : '#666',
                      fontSize: 10,
                      lineHeight: 1.1,
                    }}
                  >
                    {track.name}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 9,
                      color: track.enabled ? '#888' : '#444',
                      marginTop: 2,
                    }}
                  >
                    {track.count} NOTES
                  </div>
                </div>
              </div>
              <div
                className={`led ${track.enabled ? 'active' : ''}`}
                style={{
                  background: track.enabled ? track.color : '#333',
                  boxShadow: track.enabled
                    ? `0 0 8px ${track.color}`
                    : 'none',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  flexShrink: 0,
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}