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

// ✅ Rééchantillonnage (44100 -> 22050 Hz pour l'IA)
function resampleAudioBuffer(audioBuffer, targetSampleRate = 22050) {
  if (audioBuffer.sampleRate === targetSampleRate) return audioBuffer;
  const ratio = audioBuffer.sampleRate / targetSampleRate;
  const newLength = Math.floor(audioBuffer.length / ratio);
  const channelData = audioBuffer.getChannelData(0);
  const resampledData = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    resampledData[i] = channelData[Math.floor(i * ratio)];
  }

  return {
    sampleRate: targetSampleRate,
    length: newLength,
    duration: newLength / targetSampleRate,
    numberOfChannels: 1,
    getChannelData: () => resampledData,
  };
}

app.post('/analyze-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni.' });

    const basicPitch = new BasicPitch('https://cdn.jsdelivr.net/npm/@spotify/basic-pitch/model/model.json');
    
    const uint8Array = new Uint8Array(req.file.buffer);
    const decodedBuffer = await audioDecode(uint8Array);
    const audioBuffer = resampleAudioBuffer(decodedBuffer, 22050);
    
    console.log("Analyse de l'audio (durée :", audioBuffer.duration, "s)...");

    const frames = [];
    const onsets = [];
    const contours = [];

    await basicPitch.evaluateModel(
      audioBuffer,
      (f, o, c) => { frames.push(...f); onsets.push(...o); contours.push(...c); },
      (percent) => {}
    );

    const notes = outputToNotesPoly(frames, onsets, 0.5, 0.5, true);
    
    // ✅ FORMATAGE "PRO" DES NOTES POUR TON FRONT-END
    const formattedNotes = notes.map(n => {
      let track = 'lead';
      if (n.pitchMidi < 48) track = 'bass';       // Notes graves = Basse
      else if (n.pitchMidi < 60) track = 'harmony'; // Notes médiums = Accords/Harmonie
      
      return {
        midi: Math.round(n.pitchMidi),
        start: n.startTimeSeconds,
        duration: Math.max(0.05, n.durationSeconds), // Durée min pour éviter les notes invisibles
        velocity: Math.max(1, Math.round(n.amplitude * 127)), // Vélocité 1-127
        confidence: n.confidence || 0.8,
        track: track
      };
    });

    console.log("Analyse terminée :", formattedNotes.length, "notes détectées.");
    res.json({ notes: formattedNotes, duration: audioBuffer.duration });

  } catch (error) {
    console.error("Erreur lors de l'analyse :", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));