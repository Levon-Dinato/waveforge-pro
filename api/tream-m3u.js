// api/stream-m3u.js
export default async function handler(req, res) {
  const { username } = req.query;

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  try {
    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?username=eq.${username}&select=id,is_live,live_url`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const profiles = await profileRes.json();
    
    if (!profiles || profiles.length === 0) return res.status(404).send("DJ introuvable");
    const profile = profiles[0];

    let m3uContent = "#EXTM3U\r\n";

    // ✅ SI LE DJ EST EN DIRECT, ON DIFFUSE LE FLUX LIVE
    if (profile.is_live && profile.live_url) {
      m3uContent += `#EXTINF:-1,${username} - LIVE\r\n${profile.live_url}\r\n`;
    } 
    // SINON, ON RENVOIE LA PLAYLIST SYNCHRONISÉE
    else {
      const tracksRes = await fetch(`${supabaseUrl}/rest/v1/tracks?user_id=eq.${profile.id}&in_radio=eq.true&select=title,artist,audio_url,duration&order=created_at.asc`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      const tracks = await tracksRes.json();

      if (!tracks || tracks.length === 0) return res.status(404).send("Aucune musique");

      // Synchronisation temporelle (même calcul que le player)
      const RADIO_EPOCH = new Date('2024-01-01T00:00:00Z').getTime();
      const elapsedSeconds = Math.floor((Date.now() - RADIO_EPOCH) / 1000);
      const durations = tracks.map(t => (t.duration && t.duration > 0) ? t.duration : 240);
      const totalDuration = durations.reduce((acc, d) => acc + d, 0);
      
      let timeToPlay = elapsedSeconds % totalDuration;
      let startIndex = 0;
      for (let i = 0; i < tracks.length; i++) {
        if (timeToPlay < durations[i]) { startIndex = i; break; }
        timeToPlay -= durations[i];
      }

      const orderedTracks = [...tracks.slice(startIndex), ...tracks.slice(0, startIndex)];
      orderedTracks.forEach(track => {
        m3uContent += `#EXTINF:-1,${track.artist} - ${track.title}\r\n${track.audio_url}\r\n`;
      });
    }

    // ✅ On force le navigateur / VLC à télécharger ou lire le M3U
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Content-Disposition', `attachment; filename="${username}-radio.m3u"`);
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    
    return res.status(200).send(m3uContent);

  } catch (error) {
    console.error(error);
    return res.status(500).send("Erreur serveur");
  }
}