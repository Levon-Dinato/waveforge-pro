const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
  res.send('Serveur de mastering DropZone DJ opérationnel.');
});

app.post('/master', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier audio fourni.' });
  }

  const inputPath = req.file.path;
  const outputPath = path.join('uploads', 'mastered-' + Date.now() + '.wav');

  try {
    console.log('Traitement de : ' + req.file.originalname);
    
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFrequency(44100)
        .audioChannels(2)
        .audioFilters([
          'volume=1.2',
          'alimiter=limit=0.95',
        ])
        .on('progress', (progress) => {
          console.log('Progression : ' + progress.percent + '%');
        })
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    console.log('Mastering terminé. Envoi du fichier...');

    res.download(outputPath, 'mastered-' + req.file.originalname.replace(/\.[^/.]+$/, "") + '.wav', (err) => {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      if (err) console.error('Erreur lors de l\'envoi :', err);
    });

  } catch (error) {
    console.error('Erreur FFmpeg :', error);
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    res.status(500).json({ error: 'Erreur lors du mastering audio.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Serveur démarré sur le port ' + PORT);
});
