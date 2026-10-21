const PresetInfo: React.FC<{
  name: string;
  description: string;
  color: string;
  values: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ name, description, color, values, isActive, onClick }) => {
  // ✅ Style sans conflit (pas de mélange border/borderLeft)
  const activeBorder = isActive ? `1px solid ${color}40` : '1px solid transparent';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '8px 10px',
        background: isActive ? `${color}10` : 'var(--bg-1)',
        borderRadius: 6,
        borderTop: activeBorder,
        borderRight: activeBorder,
        borderBottom: activeBorder,
        borderLeft: `3px solid ${color}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 2,
        }}
      >
        <span style={{ color, fontWeight: 700, fontSize: 11, letterSpacing: '0.5px' }}>
          {name}
          {isActive && <span style={{ marginLeft: 6, fontSize: 9 }}>✓</span>}
        </span>
        <span className="mono" style={{ fontSize: 8, color: '#666' }}>
          {values}
        </span>
      </div>
      <div style={{ fontSize: 9, color: '#666' }}>{description}</div>
    </div>
  );
};