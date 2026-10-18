import React from 'react';

interface Props {
  visible: boolean;
  text?: string;
  /** 0 → 100 */
  progress?: number;
}

export const SplashScreen: React.FC<Props> = ({ visible, text = 'Loading…', progress = 0 }) => (
  <div id="splash-screen" className={visible ? 'visible' : ''}>
    <div className="centered">
      <div id="progress-container">
        <div id="progress-text">{text}</div>
        <div id="progress-bar">
          <div
            id="progress-bar-position"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>
    </div>
  </div>
);