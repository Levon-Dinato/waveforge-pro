// src/audio/basicPitch.worker.ts
import { BasicPitch, noteFramesToTime, outputToNotesPoly, addPitchBendsToNoteEvents } from '@spotify/basic-pitch';
import * as tf from '@tensorflow/tfjs';

// ✅ IMPORTANT : On importe uniquement le backend CPU pour éviter le conflit WebGL
import '@tensorflow/tfjs-backend-cpu';

let model: BasicPitch | null = null;

async function getModel(): Promise<BasicPitch> {
  if (!model) {
    // On force le CPU de manière propre
    await tf.setBackend('cpu');
    await tf.ready();
    
    console.log('🧠 Worker : Backend TF.js =', tf.getBackend());
    model = new BasicPitch('/model/model.json');
  }
  return model;
}

self.onmessage = async (e: MessageEvent) => {
  const { samples, onsetThresh, frameThresh, minNoteLen } = e.data;

  try {
    const bp = await getModel();

    const frames: number[][] = [];
    const onsets: number[][] = [];
    const contours: number[][] = [];

    await bp.evaluateModel(
      samples,
      (f, o, c) => {
        frames.push(...f);
        onsets.push(...o);
        contours.push(...c);
      },
      (progress) => {
        self.postMessage({ type: 'progress', progress });
      }
    );

    if (frames.length === 0) {
      self.postMessage({ type: 'result', notes: [] });
      return;
    }

    const noteEvents = outputToNotesPoly(
      frames, 
      onsets, 
      onsetThresh, 
      frameThresh, 
      minNoteLen,
      true, 
      undefined, 
      undefined, 
      true, 
      11
    );

    const notes = noteFramesToTime(
      addPitchBendsToNoteEvents(contours, noteEvents)
    );

    self.postMessage({ type: 'result', notes });
  } catch (err) {
    self.postMessage({ type: 'error', message: (err as Error).message });
  }
};