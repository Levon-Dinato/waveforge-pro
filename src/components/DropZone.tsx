import { useCallback, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  isAnalyzing: boolean;
}

export function DropZone({ onFile, isAnalyzing }: Props) {
  const [hover, setHover] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setHover(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('audio')) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${hover ? '#7c5cff' : '#333'}`,
        background: hover ? 'rgba(124,92,255,0.08)' : '#0e0e16',
        borderRadius: 16,
        padding: '48px 24px',
        textAlign: 'center',
        transition: 'all .2s',
        cursor: 'pointer',
      }}
    >
      <input
        type="file"
        accept="audio/*"
        id="file-input"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
        <div style={{ fontSize: 48 }}>🎧</div>
        <h2 style={{ margin: '12px 0', color: '#fff', fontSize: 22 }}>
          {isAnalyzing ? 'Analyse en cours…' : 'Glisse ton audio ici'}
        </h2>
        <p style={{ color: '#888', margin: 0, fontSize: 14 }}>
          ou{' '}
          <span style={{ color: '#7c5cff', textDecoration: 'underline' }}>
            parcourir
          </span>{' '}
          — wav, mp3, flac, ogg
        </p>
      </label>
    </div>
  );
}