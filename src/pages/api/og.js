// api/og.js
export default async function handler(req, res) {
  const { username } = req.query;
  
  // On récupère les variables d'environnement (avec ou sans VITE_)
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  // ✅ URL DE TON PROJET VERCEL
  const baseUrl = "https://waveforge-pro-one.vercel.app";
  
  let title = `Radio ${username} — DropZone DJ`;
  let description = "Ta radio, ta musique, ton univers. Écoute les meilleurs DJs en direct.";
  let image = `${baseUrl}/radio-og.jpg`; // ✅ L'image par défaut utilise ton domaine

  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Variables d'environnement Supabase manquantes");
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?username=eq.${username}&select=radio_custom_logo_url,avatar_url`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const profile = data[0];
      if (profile.radio_custom_logo_url) image = profile.radio_custom_logo_url;
      else if (profile.avatar_url) image = profile.avatar_url;
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate'); 
  
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:url" content="${baseUrl}/radio/${username}" />
        <meta property="og:type" content="website" />
        <meta property="fb:app_id" content="1234567890" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${image}" />
      </head>
      <body>
        <p>Redirection vers la radio...</p>
      </body>
    </html>
  `);
}