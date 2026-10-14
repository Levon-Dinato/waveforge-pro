import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const colors: Record<
            ToastType,
            { bg: string; border: string; color: string }
          > = {
            success: {
              bg: 'rgba(0, 255, 136, 0.1)',
              border: 'rgba(0, 255, 136, 0.4)',
              color: '#00ff88',
            },
            error: {
              bg: 'rgba(255, 60, 60, 0.1)',
              border: 'rgba(255, 60, 60, 0.4)',
              color: '#ff8c8c',
            },
            warning: {
              bg: 'rgba(255, 200, 60, 0.1)',
              border: 'rgba(255, 200, 60, 0.4)',
              color: '#ffd43b',
            },
            info: {
              bg: 'rgba(0, 217, 255, 0.1)',
              border: 'rgba(0, 217, 255, 0.4)',
              color: '#00d9ff',
            },
          };
          const c = colors[toast.type];

          return (
            <div
              key={toast.id}
              style={{
                padding: '12px 16px',
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: 10,
                color: c.color,
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                fontWeight: 600,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: 'auto',
                maxWidth: 340,
              }}
            >
              {toast.message}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans ToastProvider');
  return ctx;
};