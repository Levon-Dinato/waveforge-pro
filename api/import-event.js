// api/import-event.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL manquante' });
  }

  try {
    // On extrait l'ID de l'événement depuis l'URL Luma
    // Ex: https://lu.ma/abcdefg -> abcdefg
    const match = url.match(/lu\.ma\/([a-zA-Z0-9]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Lien Luma invalide. Format attendu : https://lu.ma/xxxxx' });
    }
    const eventId = match[1];

    // Appel à l'API publique de Luma
    const response = await fetch(`https://api.lu.ma/event/get?event_api_id=${eventId}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Événement introuvable sur Luma');
    }

    const data = await response.json();
    const event = data.event;

    if (!event) {
      return res.status(404).json({ error: 'Événement introuvable' });
    }

    // On renvoie les infos au format attendu par le formulaire
    return res.status(200).json({
      title: event.name || '',
      description: event.description || '',
      event_date: event.start_at || '',
      location: event.location?.name || '',
      city: event.location?.city || '',
      url: url,
      image_url: event.cover_url || '',
    });

  } catch (error) {
    console.error('Erreur import Luma:', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de l\'import' });
  }
}