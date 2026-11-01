import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { BasicPitch, outputToNotesPoly } from '@spotify/basic-pitch';
import audioDecode from 'audio-decode';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

const upload = multer({ storage: multer.memoryStorage() });

// ✅ RÉÉCHANTILLONNAGE ROBUSTE POUR NODE.JS
function resampleAudioBuffer(audioBuffer, targetSampleRate = 22050) {
  let channelData;
  
  // Récupération des données selon le type d'objet renvoyé
  if (typeof audioBuffer.getChannelData === 'function') {
    channelData = audioBuffer.getChannelData(0);
  } else if (audioBuffer.channelData) {
    channelData = Array.isArray(audioBuffer.channelData) ? audioBuffer.channelData[0] : audioBuffer.channelData;
  } else {
    throw new Error("Format audio non reconnu par le serveur.");
  }

  // On utilise la longueur réelle du tableau de données, pas audioBuffer.length qui peut être undefined
  const inputLength = channelData.length;
  const ratio = audioBuffer.sampleRate / targetSampleRate;
  const newLength = Math.floor(inputLength / ratio);

  const resampledData = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    resampledData[i] = channelData[Math.floor(i * ratio)];
  }

  // On retourne un objet complet qui imite parfaitement un AudioBuffer
  return {
    sampleRate: targetSampleRate,
    length: newLength,
    duration: newLength / targetSampleRate,
    numberOfChannels: 1,
    getChannelData: () => resampledData,
    channelData: [resampledData]
  };
}

app.post('/analyze-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni.' });

    const basicPitch = new BasicPitch('https://cdn.jsdelivr.net/npm/@spotify/basic-pitch/model/model.json');
    
    const uint8Array = new Uint8Array(req.file.buffer);
    const decodedBuffer = await audioDecode(uint8Array);
    
    // ✅ On applique le rééchantillonnage
    const audioBuffer = resampleAudioBuffer(decodedBuffer, 22050);
    
    console.log("Audio décodé et prêt. Durée :", audioBuffer.duration, "s. Lancement de l'analyse...");

    const frames = [];
    const onsets = [];
    const contours = [];

    await basicPitch.evaluateModel(
      audioBuffer,
      (f, o, c) => { frames.push(...f); onsets.push(...o); contours.push(...c); },
      (percent) => {}
    );

    const notes = outputToNotesPoly(frames, onsets, 0.5, 0.5, true);
    
    // ✅ Formatage Pro des notes (Bass, Harmony, Lead)
    const formattedNotes = notes.map(n => {
      let track = 'lead';
      if (n.pitchMidi < 48) track = 'bass';
      else if (n.pitchMidi < 60) track = 'harmony';
      
      return {
        midi: Math.round(n.pitchMidi),
        start: n.startTimeSeconds,
        duration: Math.max(0.05, n.durationSeconds),
        velocity: Math.max(1, Math.round(n.amplitude * 127)),
        confidence: n.confidence || 0.8,
        track: track
      };
    });

    console.log("Analyse terminée :", formattedNotes.length, "notes.");
    res.json({ notes: formattedNotes, duration: audioBuffer.duration });

  } catch (error) {
    console.error("Erreur lors de l'analyse :", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));