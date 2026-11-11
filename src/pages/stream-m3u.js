// api/stream-m3u.js
export default async function handler(req, res) {
  const { username } = req.query;

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  try {
    // 1. On cherche l'ID du DJ via son pseudo
    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?username=eq.${username}&select=id`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const profiles = await profileRes.json();
    
    if (!profiles || profiles.length === 0) {
      return res.status(404).send("DJ introuvable");
    }
    
    const userId = profiles[0].id;

    // 2. On récupère toutes ses musiques diffusées à la radio
    const tracksRes = await fetch(`${supabaseUrl}/rest/v1/tracks?user_id=eq.${userId}&in_radio=eq.true&select=title,artist,audio_url`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const tracks = await tracksRes.json();

    if (!tracks || tracks.length === 0) {
      return res.status(404).send("Aucune musique à diffuser");
    }

    // 3. On génère le fichier M3U
    let m3uContent = "#EXTM3U\n";
    tracks.forEach(track => {
      m3uContent += `#EXTINF:-1,${track.artist} - ${track.title}\n`;
      m3uContent += `${track.audio_url}\n`;
    });

    // 4. On renvoie le fichier avec le bon format
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Content-Disposition', `attachment; filename="${username}-radio.m3u"`);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate'); // Cache de 1 min
    
    return res.status(200).send(m3uContent);

  } catch (error) {
    console.error("Erreur génération M3U:", error);
    return res.status(500).send("Erreur serveur");
  }
}