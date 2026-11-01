import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { BasicPitch, outputToNotesPoly } from '@spotify/basic-pitch';
import audioDecode from 'audio-decode';

const app = express();

// ✅ CORS blindé pour accepter les requêtes de Vercel
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

const upload = multer({ storage: multer.memoryStorage() });

app.post('/analyze-audio', upload.single('audio'), async (req, res) => {
  try {
    console.log("Requête reçue ! Taille du fichier :", req.file?.size);
    
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni.' });

    const basicPitch = new BasicPitch('https://storage.googleapis.com/magentadata/js/checkpoints/piano_transcription/basic_pitch/model.json');
    
    // ✅ Conversion du Buffer en Uint8Array pour audio-decode
    const uint8Array = new Uint8Array(req.file.buffer);
    const audioBuffer = await audioDecode(uint8Array);
    
    console.log("Audio décodé, durée :", audioBuffer.duration);
    console.log("Lancement de l'analyse Basic Pitch (cela peut prendre du temps)...");

    const frames = [];
    const onsets = [];
    const contours = [];

    await basicPitch.evaluateModel(
      audioBuffer,
      (f, o, c) => { frames.push(...f); onsets.push(...o); contours.push(...c); },
      (percent) => {
         // Optionnel : console.log(`Progression : ${Math.round(percent * 100)}%`);
      }
    );

    console.log("Analyse terminée, formatage des notes...");

    const notes = outputToNotesPoly(frames, onsets, 0.5, 0.5, true);
    
    const formattedNotes = notes.map(n => ({
      midi: Math.round(n.pitchMidi),
      start: n.startTimeSeconds,
      duration: n.durationSeconds,
      velocity: Math.round(n.amplitude * 127),
      confidence: n.confidence || 0.8,
      track: n.pitchMidi < 48 ? 'bass' : (n.pitchMidi > 60 ? 'lead' : 'harmony')
    }));

    res.json({ notes: formattedNotes, duration: audioBuffer.duration });

  } catch (error) {
    console.error("Erreur lors de l'analyse :", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));