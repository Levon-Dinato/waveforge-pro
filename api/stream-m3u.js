// api/stream-m3u.js
// Génère un fichier M3U pointant vers le flux live de la radio (Icecast/cloudflared).

export default async function handler(req, res) {
  const { username } = req.query;
  if (!username) {
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    return res.status(400).send('#EXTM3U\n');
  }

  const supabaseUrl = 'https://ivusrxkufajugvkbpcia.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dXNyeGt1ZmFqdWd2a2JwY2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MzU1MDUsImV4cCI6MjEwNzUxMTUwNX0.iwjZ-9Lm8vRazk6KR7zi0BLmZ1RYRUP9dIwfyiW83_U';

  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/profiles?username=ilike.${username}&select=username,radio_name,live_url`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const data = await r.json();
    const profile = Array.isArray(data) && data[0] ? data[0] : null;

    const name = profile?.radio_name || profile?.username || 'ELEKTRAQ';
    const streamUrl = profile?.live_url || '';

    let content;
    if (streamUrl) {
      content = `#EXTM3U\n#EXTINF:-1,${name}\n${streamUrl}\n`;
    } else {
      content = `#EXTM3U\n#EXTINF:-1,${name} — flux non configuré\n`;
    }

    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).send(content);
  } catch (e) {
    console.error('stream-m3u error:', e);
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    return res.status(500).send('#EXTM3U\n');
  }
}
