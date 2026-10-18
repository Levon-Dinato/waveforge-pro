import React from 'react';

export const SHORTCUTS: Record<string, Record<string, [string, string?]>> = {
  View: {
    'Zoom In': ['+'],
    'Zoom Out': ['-'],
    'Scroll Left': ['Alt+←'],
    'Scroll Right': ['Alt+→'],
    'Snap to Beat': ['B'],
    Fullscreen: ['Ctrl+Shift+F'],
  },
  Mixer: {
    'Crossfade Left': ['G'],
    'Crossfade Right': ['H'],
    'Play/Pause All': ['Shift+Space'],
  },
  Deck: {
    Cue: ['Z', '<'],
    'Play/Pause': ['X', '>'],
    Sync: ['[', ']'],
    'Key Lock': ['Shift+[', 'Shift+]'],
    'Volume -': ['D', 'J'],
    'Volume +': ['F', 'K'],
    'Pitch Bend -': ['Q', 'O'],
    'Pitch Bend +': ['W', 'P'],
    'Tempo -': ['A', 'L'],
    'Tempo +': ['S', ';'],
    'Back 1 Beat': ['C', 'N'],
    'Forward 1 Beat': ['V', 'M'],
    'Set/Trigger Cue': ['1 2 3 4 5', '6 7 8 9 0'],
    'Clear Cue': ['Shift+1 2 3 4 5', 'Shift+6 7 8 9 0'],
    'Set Cue': ['Ctrl+1 2 3 4 5', 'Ctrl+6 7 8 9 0'],
    'Auto Loop': ['R', 'U'],
    'Loop ½X': ['E', 'Y'],
    'Loop 2X': ['T', 'I'],
    'Load Track': ['Shift+←', 'Shift+→'],
    Eject: ['Ctrl+Shift+←', 'Ctrl+Shift+→'],
  },
};

const isMac = () =>
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

const formatKey = (key: string) => {
  if (isMac()) {
    return key
      .replace('Alt+', '⌥')
      .replace('Shift+', '⇧')
      .replace('Ctrl+', '⌃')
      .replace('Command+', '⌘');
  }
  return key.replace('Command+', 'Ctrl+');
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const ShortcutsOverlay: React.FC<Props> = ({ visible, onClose }) => {
  if (!visible) return null;
  return (
    <div id="shortcuts-overlay" className="visible" onClick={onClose}>
      <div
        id="shortcuts-overlay-contents"
        onClick={(e) => e.stopPropagation()}
      >
        {Object.entries(SHORTCUTS).map(([section, items]) => (
          <div key={section} className="shortcuts-section">
            <div className="shortcuts-section-title">{section}</div>
            <table>
              <tbody>
                {Object.entries(items).map(([label, keys]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{formatKey(keys[0])}</td>
                    <td>{keys[1] ? formatKey(keys[1]) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};