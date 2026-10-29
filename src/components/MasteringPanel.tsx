// src/components/MasteringPanel.tsx
import React, { useEffect, useRef, useState } from 'react';
import { MasteringChain, type MasteringPreset } from '../audio/masteringChain';

interface MasteringPanelProps {
  audioContext: AudioContext | null;
  sourceNode: AudioNode | null;
  sourceBuffer: AudioBuffer | null;
  preset: MasteringPreset;
  intensity: number;
  onChainReady: (chain: MasteringChain | null) => void;
  onExport: (payload: any) => void;
}

export const MasteringPanel: React.FC<MasteringPanelProps> = ({
  audioContext,
  sourceNode,
  sourceBuffer,
  preset,
  intensity,
  onChainReady,
  onExport,
}) => {
  const chainRef = useRef<MasteringChain | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!audioContext) return;
    if (!chainRef.current) {
      chainRef.current = new MasteringChain(audioContext);
      onChainReady(chainRef.current);
    }
    chainRef.current.applyPreset(preset, intensity / 100);
  }, [audioContext, preset, intensity, onChainReady]);

  useEffect(() => {
    return () => {
      onChainReady(null);
    };
  }, [onChainReady]);

  const handleExportClick = () => {
    if (sourceBuffer) {
      setIsExporting(true);
      setTimeout(() => {
        onExport({ blob: audioBufferToWav(sourceBuffer), preset, intensity });
        setIsExporting(false);
      }, 500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        .btn-export {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #000;
          box-shadow: 0 4px 15px rgba(16,185,129,0.3);
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .btn-export:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(16,185,129,0.5);
          transform: translateY(-1px);
        }
        .btn-export:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 10, color: '#555', fontWeight: 800, letterSpacing: '1.5px', marginBottom: 12 }}>CHAÎNE DE MASTERING</div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Preset : <span style={{ color: '#fff', fontWeight: 700 }}>{preset.toUpperCase()}</span></div>
        <div style={{ fontSize: 11, color: '#888' }}>Intensité : <span style={{ color: '#fff', fontWeight: 700 }}>{intensity}%</span></div>
      </div>

      <button
        onClick={handleExportClick}
        disabled={!sourceBuffer || isExporting}
        className="btn-export"
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 6,
          fontWeight: 900,
          fontSize: 13,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          border: 'none',
        }}
      >
        {isExporting ? 'EXPORTATION...' : '⬇ EXPORT WAV'}
      </button>
    </div>
  );
};

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  let result;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0, inputIndex = 0;
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function encodeWAV(samples: Float32Array, format: number, sampleRate: number, numChannels: number, bitDepth: number): Blob {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);
  floatTo16BitPCM(view, 44, samples);
  return new Blob([view], { type: 'audio/wav' });
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}