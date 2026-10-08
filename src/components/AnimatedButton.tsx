import { useState, useEffect, useRef } from 'react';

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

interface Props {
  onClick: () => void | Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: 'default' | 'primary';
  style?: React.CSSProperties;
  className?: string;
}

export function AnimatedButton({
  onClick,
  children,
  disabled,
  variant = 'default',
  style,
  className = '',
}: Props) {
  const [state, setState] = useState<ButtonState>('idle');
  const timeoutRef = useRef<number | null>(null);

  const handleClick = async () => {
    if (disabled || state === 'loading') return;

    setState('loading');
    try {
      await onClick();
      setState('success');

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setState('idle');
      }, 1200);
    } catch (e) {
      setState('error');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setState('idle');
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const classNames = [
    'btn-action',
    variant === 'primary' ? 'primary' : '',
    state === 'loading' ? 'loading' : '',
    state === 'success' ? 'success' : '',
    state === 'error' ? 'error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classNames}
      onClick={handleClick}
      disabled={disabled || state === 'loading'}
      style={style}
    >
      {state === 'loading' ? '⏳ ' : ''}
      {state === 'success' ? '✅ ' : ''}
      {state === 'error' ? '❌ ' : ''}
      {children}
    </button>
  );
}