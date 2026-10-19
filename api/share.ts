// api/share.ts

export default async function handler(req: any, res: any) {
  const trackId = req.query.id as string;

  if (!trackId) {
    return res.status(400).send('Missing track id');
  }

  // ✅ NOUVEAU : Si c'est le live, on renvoie l'affiche avec le bon slogan
  if (trackId === 'live') {
    const liveHtml = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Live DropZone DJ 🎧</title>
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="DropZone DJ" />
    <meta property="og:title" content="Rejoins le live DropZone DJ !" />
    <meta property="og:description" content="Les nouvelles sorties et les remixes. Les promos, edits et morceaux exclusifs autorisés au partage. Nouveautés House, Tech House, EDM, Dance et Underground." />
    <meta property="og:image" content="https://waveforge-pro-one.vercel.app/og-live.jpg" />
    <meta property="og:url" content="https://waveforge-pro-one.vercel.app/share/live" />
    
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Rejoins le live DropZone DJ !" />
    <meta name="twitter:description" content="Les nouvelles sorties et les remixes. Une communauté où les DJs présentent leurs productions et leurs découvertes." />
    <meta name="twitter:image" content="https://waveforge-pro-one.vercel.app/og-live.jpg" />
  </head>
  <body style="background:#121212;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <div style="text-align:center;">
      <p>Redirection vers le Live…</p>
      <a href="https://waveforge-pro-one.vercel.app/live" style="color:#00d9ff;">Clique ici si rien ne se passe</a>
    </div>
    <script>
      setTimeout(function() {
        window.location.href = "https://waveforge-pro-one.vercel.app/live";
      }, 100);
    </script>
  </body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(liveHtml);
  }

  // ⬇️ LE RESTE DU CODE POUR LES TRACKS ⬇️
  const supabaseUrl = 'https://ivusrxkufajugvkbpcia.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dXNyeGt1ZmFqdWd2a2JwY2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MzU1MDUsImV4cCI6MjEwNzUxMTUwNX0.iwjZ-9Lm8vRazk6KR7zi0BLmZ1RYRUP9dIwfyiW83_U';

  let title = 'DropZone DJ'; // ✅ Nouveau nom par défaut
  let artist = 'Studio DJ & Mastering';
  let coverUrl = 'https://waveforge-pro-one.vercel.app/og-image.jpg';
  let audioUrl = '';

  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/tracks?id=eq.${trackId}&select=title,artist,cover_url,audio_url`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    const data = await r.json();
    if (Array.isArray(data) && data[0]) {
      title = data[0].title || title;
      artist = data[0].artist || artist;
      coverUrl = data[0].cover_url || coverUrl;
      audioUrl = data[0].audio_url || '';
    }
  } catch (e) {
    console.error('Supabase fetch error:', e);
  }

  const safeTitle = String(title).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const safeArtist = String(artist).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const redirectUrl = `https://waveforge-pro-one.vercel.app/track/${trackId}`; // ✅ Redirige vers la page Track

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>${safeTitle} — ${safeArtist} · DropZone DJ</title>
    <meta property="og:type" content="music.song" />
    <meta property="og:site_name" content="DropZone DJ" />
    <meta property="og:title" content="${safeTitle} — ${safeArtist}" />
    <meta property="og:description" content="Écoute ${safeTitle} par ${safeArtist} sur DropZone DJ 🎵" />
    <meta property="og:image" content="${coverUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="https://waveforge-pro-one.vercel.app/share/${trackId}" />
    ${audioUrl ? `<meta property="og:audio" content="${audioUrl}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle} — ${safeArtist}" />
    <meta name="twitter:description" content="Écoute ${safeTitle} par ${safeArtist} sur DropZone DJ 🎵" />
    <meta name="twitter:image" content="${coverUrl}" />
  </head>
  <body style="background:#121212;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
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