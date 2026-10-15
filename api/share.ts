// api/share.ts

export default async function handler(req: any, res: any) {
  const trackId = req.query.id as string;

  if (!trackId) {
    return res.status(400).send('Missing track id');
  }

  // ✅ TES VRAIES VALEURS
  const supabaseUrl = 'https://ivusrxkufajugvkbpcia.supabase.co';
  const supabaseKey = 'sb_publishable_kXVwp7N6xNtvP_iQFWDI1Q_FmA7zGbT';

  let title = 'WaveForge PRO';
  let artist = 'Studio DJ & Mastering';
  let coverUrl = 'https://waveforge-pro-one.vercel.app/og-image.jpg';
  let audioUrl = '';

  try {
    console.log('🔍 Fetch Supabase:', `${supabaseUrl}/rest/v1/tracks?id=eq.${trackId}`);
    const r = await fetch(
      `${supabaseUrl}/rest/v1/tracks?id=eq.${trackId}&select=title,artist,cover_url,audio_url`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    console.log('📡 Supabase status:', r.status);
    const data = await r.json();
    console.log('📦 Supabase data:', JSON.stringify(data).substring(0, 200));
    if (Array.isArray(data) && data[0]) {
      title = data[0].title || title;
      artist = data[0].artist || artist;
      coverUrl = data[0].cover_url || coverUrl;
      audioUrl = data[0].audio_url || '';
    }
  } catch (e) {
    console.error('❌ Supabase fetch error:', e);
  }

  const safeTitle = String(title).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const safeArtist = String(artist).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const redirectUrl = `https://waveforge-pro-one.vercel.app/nouveautes?track=${trackId}`;

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>${safeTitle} — ${safeArtist} · WaveForge PRO</title>
    <meta property="og:type" content="music.song" />
    <meta property="og:site_name" content="WaveForge PRO" />
    <meta property="og:title" content="${safeTitle} — ${safeArtist}" />
    <meta property="og:description" content="Écoute ${safeTitle} par ${safeArtist} sur WaveForge PRO 🎵" />
    <meta property="og:image" content="${coverUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="https://waveforge-pro-one.vercel.app/share/${trackId}" />
    ${audioUrl ? `<meta property="og:audio" content="${audioUrl}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle} — ${safeArtist}" />
    <meta name="twitter:description" content="Écoute ${safeTitle} par ${safeArtist} sur WaveForge PRO 🎵" />
    <meta name="twitter:image" content="${coverUrl}" />
  </head>
  <body style="background:#000;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <div style="text-align:center;">
      <p>Redirection vers <strong>${safeTitle}</strong>…</p>
      <a href="${redirectUrl}" style="color:#00d9ff;">Clique ici si rien ne se passe</a>
    </div>
    <script>
      setTimeout(function() {
        window.location.href = "${redirectUrl}";
      }, 100);
    </script>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(html);
}