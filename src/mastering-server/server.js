// mastering-server/server.js
const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Configuration de l'upload (fichiers jusqu'à 100 Mo)
const upload = multer({ dest: 'uploads/' });

app.post('/master', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier audio fourni.' });
  }

  const inputPath = req.file.path;
  const outputPath = path.join('uploads', `mastered-${Date.now()}.wav`);

  try {
    // 1. On utilise FFmpeg pour décoder, rééchantillonner à 44.1 kHz et appliquer un mastering simple
    // (Ici, on fait un simple gain + limiteur, mais tu peux ajouter des filtres FFmpeg plus complexes)
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFrequency(44100) // Force le rééchantillonnage à 44.1 kHz
        .audioChannels(2)
        .audioFilters([
          'volume=1.5', // Gain (exemple)
          'alimiter=limit=0.95', // Limiteur pour éviter la saturation
        ])
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    // 2. On renvoie le fichier traité
    res.download(outputPath, 'mastered.wav', (err) => {
      if (err) console.error(err);
      // Nettoyage des fichiers temporaires
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });

  } catch (error) {
    console.error('Erreur FFmpeg :', error);
    res.status(500).json({ error: 'Erreur lors du mastering.' });
  }
});

// Route de test
app.get('/', (req, res) => {
  res.send('Serveur de mastering opérationnel.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});