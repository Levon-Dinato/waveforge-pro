// api/levon-dinato.ts
export default async function handler(req: any, res: any) {
  const userAgent = req.headers['user-agent'] || '';

  // Détection des bots (Facebook, Twitter, WhatsApp, Discord, etc.)
  const isBot = /facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|WhatsApp|Discordbot|TelegramBot|Slackbot|Pinterest|redditbot|Iframely|Googlebot-Image|bingbot/i.test(userAgent);

  if (isBot) {
    // Si c'est un bot, on renvoie les balises Open Graph
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Levon & Dinato — DJ & Production Officiel</title>
        
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="DropZone DJ" />
        <meta property="og:url" content="https://waveforge-pro-one.vercel.app/levon-dinato" />
        <meta property="og:title" content="Levon &amp; Dinato — DJ &amp; Production Officiel" />
        <meta property="og:description" content="Découvrez les productions Funky House, Nu-Disco et Tech House du duo Levon &amp; Dinato." />
        <meta property="og:image" content="https://waveforge-pro-one.vercel.app/og-levon-dinato.jpg" />
        <meta property="og:image:secure_url" content="https://waveforge-pro-one.vercel.app/og-levon-dinato.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Levon &amp; Dinato — DJ &amp; Production Officiel" />
        <meta name="twitter:image" content="https://waveforge-pro-one.vercel.app/og-levon-dinato.jpg" />
      </head>
      <body>
        <h1>Levon &amp; Dinato</h1>
      </body>
      </html>
    `);
  } else {
    // Si c'est un humain, on lui renvoie le vrai site React (index.html)
    const origin = `https://${req.headers.host}`;
    const response = await fetch(`${origin}/index.html`);
    const html = await response.text();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  }
}