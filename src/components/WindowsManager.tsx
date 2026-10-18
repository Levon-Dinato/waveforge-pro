import React, { createContext, useCallback, useContext, useState } from 'react';

export interface WindowInstance {
  id: string;
  title: string;
  content: React.ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  type: 'toplevel' | 'popup';
  visible: boolean;
}

interface WindowsContextType {
  windows: WindowInstance[];
  open: (opts: Omit<WindowInstance, 'id' | 'z' | 'visible' | 'x' | 'y'> & Partial<Pick<WindowInstance, 'x' | 'y'>>) => string;
  close: (id: string) => void;
  focus: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  setVisible: (id: string, visible: boolean) => void;
}

const WindowsContext = createContext<WindowsContextType | null>(null);

let zCounter = 100;

export const WindowsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [windows, setWindows] = useState<WindowInstance[]>([]);

  const open = useCallback<WindowsContextType['open']>((opts) => {
    const id = `win-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setWindows((w) => [
      ...w,
      {
        id,
        title: opts.title,
        content: opts.content,
        width: opts.width,
        height: opts.height,
        type: opts.type,
        x: opts.x ?? 100 + w.length * 30,
        y: opts.y ?? 100 + w.length * 30,
        z: ++zCounter,
        visible: true,
      },
    ]);
    return id;
  }, []);

  const close = useCallback((id: string) => {
    setWindows((w) => w.filter((win) => win.id !== id));
  }, []);

  const focus = useCallback((id: string) => {
    setWindows((w) =>
      w.map((win) => (win.id === id ? { ...win, z: ++zCounter } : win)),
    );
  }, []);

  const move = useCallback((id: string, x: number, y: number) => {
    setWindows((w) => w.map((win) => (win.id === id ? { ...win, x, y } : win)));
  }, []);

  const setVisible = useCallback((id: string, visible: boolean) => {
    setWindows((w) => w.map((win) => (win.id === id ? { ...win, visible } : win)));
  }, []);

  return (
    <WindowsContext.Provider value={{ windows, open, close, focus, move, setVisible }}>
      {children}
      {windows.map((win) =>
        win.visible ? (
          <DraggableWindow key={win.id} win={win} />
        ) : null,
      )}
    </WindowsContext.Provider>
  );
};

const DraggableWindow: React.FC<{ win: WindowInstance }> = ({ win }) => {
  const ctx = useContext(WindowsContext)!;
  const [, setDragOffset] = useState<{ dx: number; dy: number } | null>(null);

  const onMouseDownHeader = (e: React.MouseEvent) => {
    e.preventDefault();
    ctx.focus(win.id);
    setDragOffset({ dx: e.clientX - win.x, dy: e.clientY - win.y });

    const onMove = (ev: MouseEvent) => {
      ctx.move(win.id, ev.clientX - (e.clientX - win.x), ev.clientY - (e.clientY - win.y));
    };
    const onUp = () => {
      setDragOffset(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className={`tn-window ${win.type}`}
      style={{
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.z,
      }}
      onMouseDown={() => ctx.focus(win.id)}
    >
      <div className="tn-window-header" onMouseDown={onMouseDownHeader}>
        <span>{win.title}</span>
        <span className="tn-window-close" onClick={() => ctx.close(win.id)}>
          ×
        </span>
      </div>
      <div className="tn-window-body">{win.content}</div>
    </div>
  );
};

export const useWindows = () => {
  const ctx = useContext(WindowsContext);
  if (!ctx) throw new Error('useWindows must be used inside WindowsProvider');
  return ctx;
};