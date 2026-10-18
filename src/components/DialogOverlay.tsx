import React, { useEffect } from 'react';

export interface DialogOptions {
  title?: string;
  body?: string;
  okText?: string;
  cancelText?: string;
  onOk?: () => void;
  onCancel?: () => void;
}

interface Props {
  visible: boolean;
  options: DialogOptions;
  onClose: () => void;
}

export const DialogOverlay: React.FC<Props> = ({ visible, options, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (visible && e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  const handleOk = () => {
    options.onOk?.();
    onClose();
  };
  const handleCancel = () => {
    options.onCancel?.();
    onClose();
  };

  return (
    <div
      id="dialog-overlay"
      className={visible ? 'visible' : ''}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div id="dialog-overlay-contents">
        <div id="dialog-overlay-title-bar">
          <div id="dialog-overlay-close-button" onClick={onClose} />
          <div id="dialog-overlay-title-text">{options.title ?? ''}</div>
        </div>
        <div id="dialog-overlay-body">
          <div id="dialog-overlay-body-text">{options.body ?? ''}</div>
          <div id="dialog-overlay-buttons">
            {options.cancelText && (
              <button
                className="tn-btn"
                style={{ flex: 1, height: 32, lineHeight: '30px' }}
                onClick={handleCancel}
              >
                {options.cancelText}
              </button>
            )}
            <button
              className="tn-btn tn-btn-accent"
              style={{ flex: 1, height: 32, lineHeight: '30px' }}
              onClick={handleOk}
            >
              {options.okText ?? 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};