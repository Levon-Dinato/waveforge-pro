import { useRef, useState, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { analyzePolyphonic } from '../audio/basicPitchEngine';
import { splitTracks } from '../audio/noteSplitter';
import { quantizeNotes } from '../audio/quantizer';
import type { DetectedNote, AnalysisResult, EngineSettings } from '../types';

const DEFAULT_SETTINGS: EngineSettings = {
  sensitivity: 0.5,
  minDuration: 0.05,
  minVelocity: 20,
  quantize: { grid: 16, triplet: false, swing: 0, strength: 0.8 },
  keySnap: false,
  instrument: 'piano',
  splitTracks: true,
};

export function useAudioEngine() {
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const rafRef = useRef<number | null>(null);
  const playheadRef = useRef(0);

  const [rawNotes, setRawNotes] = useState<DetectedNote[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [settings, setSettings] = useState<EngineSettings>(DEFAULT_SETTINGS);

  const finalNotes = useMemo(() => {
    if (!result) return [];
    let notes = rawNotes;

    notes = notes.filter(
      (n) => n.duration >= settings.minDuration && n.velocity >= settings.minVelocity
    );

    if (settings.splitTracks) notes = splitTracks(notes);

    notes = quantizeNotes(notes, result.bpm, settings.quantize);

    return notes;
  }, [rawNotes, result, settings]);

  const getSynth = useCallback(() => {
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 1.2 },
      }).toDestination();
      synthRef.current.volume.value = -8;
    }
    return synthRef.current;
  }, []);

  const loadFile = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setResult(null);
    setRawNotes([]);

    try {
      const buf = await file.arrayBuffer();
      const ctx = Tone.getContext().rawContext as AudioContext;
      const audioBuffer = await ctx.decodeAudioData(buf.slice(0));
      audioBufferRef.current = audioBuffer;

      const notes = await analyzePolyphonic(audioBuffer, settings.sensitivity);
      const bpm = 120;

      setRawNotes(notes);
      setResult({
        notes,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        bpm,
      });
    } catch (e) {
      console.error('Erreur analyse:', e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [settings.sensitivity]);

  const loadNotesFromBuffer = useCallback((notes: DetectedNote[]) => {
    setRawNotes(notes);
  }, []);

  const stopAll = useCallback(() => {
    audioSourceRef.current?.stop();
    audioSourceRef.current = null;
    getSynth().releaseAll();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
  }, [getSynth]);

  const playAudioOriginal = useCallback(async () => {
    await Tone.start();
    stopAll();
    if (!audioBufferRef.current) return;

    const ctx = Tone.getContext().rawContext as AudioContext;
    const src = ctx.createBufferSource();
    src.buffer = audioBufferRef.current;
    src.connect(ctx.destination);
    const offset = playheadRef.current;
    src.start(0, offset);
    audioSourceRef.current = src;
    setIsPlaying(true);

    const startWall = performance.now() - offset * 1000;
    const tick = () => {
      const t = (performance.now() - startWall) / 1000;
      setCurrentTime(t);
      playheadRef.current = t;
      if (t < (audioBufferRef.current?.duration ?? 0)) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        stopAll();
        playheadRef.current = 0;
        setCurrentTime(0);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopAll]);

  const playMidi = useCallback(async () => {
    await Tone.start();
    stopAll();
    if (!finalNotes.length || !result) return;

    const synth = getSynth();
    const now = Tone.now() + 0.05;
    const offset = playheadRef.current;

    finalNotes.forEach((n) => {
      if (n.start + n.duration < offset) return;
      const startAt = now + Math.max(0, n.start - offset);
      const freq = Tone.Frequency(n.midi, 'midi').toFrequency();
      synth.triggerAttackRelease(freq, Math.max(0.05, n.duration), startAt, n.velocity / 127);
    });

    const startWall = performance.now() - offset * 1000;
    setIsPlaying(true);

    const tick = () => {
      const t = (performance.now() - startWall) / 1000;
      setCurrentTime(t);
      playheadRef.current = t;
      if (t < result.duration) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        stopAll();
        playheadRef.current = 0;
        setCurrentTime(0);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [finalNotes, result, stopAll, getSynth]);

  const seek = useCallback((t: number) => {
    playheadRef.current = Math.max(0, t);
    setCurrentTime(playheadRef.current);
  }, []);

  return {
    rawNotes,
    finalNotes,
    result,
    isAnalyzing,
    isPlaying,
    currentTime,
    settings,
    setSettings,
    loadFile,
    loadNotesFromBuffer,
    playAudioOriginal,
    playMidi,
    stopAll,
    seek,
    audioBuffer: audioBufferRef.current,
  };
}