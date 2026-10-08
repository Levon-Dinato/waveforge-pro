import { useState, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props {
  text: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ text, children, position = 'top' }: Props) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setVisible(true), 400);
  };

  const handleLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const positionStyles: Record<string, React.CSSProperties> = {
    top: {
      bottom: 'calc(100% + 10px)',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    bottom: {
      top: 'calc(100% + 10px)',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    left: {
      right: 'calc(100% + 10px)',
      top: '50%',
      transform: 'translateY(-50%)',
    },
    right: {
      left: 'calc(100% + 10px)',
      top: '50%',
      transform: 'translateY(-50%)',
    },
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        zIndex: visible ? 9999 : 'auto',
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {visible && (
        <div
          className="fade-in"
          style={{
            position: 'absolute',
            ...positionStyles[position],
            background: 'rgba(10, 10, 20, 0.98)',
            border: '1px solid var(--cyan)',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 11,
            color: '#e8e8f0',
            fontFamily: 'var(--font-main)',
            whiteSpace: 'normal',
            width: 200,
            textAlign: 'center',
            zIndex: 99999,
            boxShadow:
              '0 4px 24px rgba(0, 0, 0, 0.9), 0 0 24px rgba(0, 217, 255, 0.4)',
            pointerEvents: 'none',
            lineHeight: 1.4,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}