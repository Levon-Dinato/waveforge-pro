// api/og.js
export default async function handler(req, res) {
  const { username } = req.query;
  
  // Tes clés Supabase (Vercel les connait déjà normalement via tes variables d'environnement)
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  let title = `Radio ${username} — DropZone DJ`;
  let description = "Ta radio, ta musique, ton univers. Écoute les meilleurs DJs en direct.";
  let image = "https://dropzone-dj.vercel.app/radio-og.jpg"; // Image par défaut

  try {
    // On va chercher le logo ou l'avatar du DJ dans Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?username=eq.${username}&select=radio_custom_logo_url,avatar_url`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const profile = data[0];
      // On utilise le logo de la radio s'il existe, sinon l'avatar, sinon l'image par défaut
      if (profile.radio_custom_logo_url) image = profile.radio_custom_logo_url;
      else if (profile.avatar_url) image = profile.avatar_url;
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
  }

  // On renvoie une page HTML ultra-légère UNIQUEMENT pour les robots
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        
        <!-- Balises magiques pour Facebook, Twitter, WhatsApp, etc. -->
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:url" content="https://dropzone-dj.vercel.app/radio/${username}" />
        <meta property="og:type" content="website" />
        
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