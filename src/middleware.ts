// middleware.ts (à la racine du projet)
import { next } from '@vercel/edge';

export const config = {
  matcher: ['/levon-dinato', '/levon-dinato/'],
};

export default async function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';

  // Détection des crawlers sociaux
  const isBot =
    /facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|WhatsApp|Discordbot|TelegramBot|Slackbot|Pinterest|redditbot|Iframely|Googlebot-Image|bingbot/i.test(
      userAgent
    );

  // Utilisateur normal → on laisse passer la SPA
  if (!isBot) {
    return next();
  }

  const url = new URL(request.url);

  // Récupère le HTML du shell SPA (index.html de Vite build)
  const shellResponse = await fetch(`${url.origin}/index.html`);
  const html = await shellResponse.text();

  const ogTags = `
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="DropZone DJ" />
    <meta property="og:url" content="${url.origin}/levon-dinato" />
    <meta property="og:title" content="Levon &amp; Dinato — DJ &amp; Production Officiel" />
    <meta property="og:description" content="Découvrez les productions Funky House, Nu-Disco et Tech House du duo Levon &amp; Dinato. Un set conçu pour faire vibrer les dancefloors." />
    <meta property="og:image" content="${url.origin}/og-levon-dinato.jpg" />
    <meta property="og:image:secure_url" content="${url.origin}/og-levon-dinato.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Levon &amp; Dinato — DJ &amp; Production Officiel" />
    <meta name="twitter:description" content="Découvrez les productions Funky House, Nu-Disco et Tech House du duo Levon &amp; Dinato." />
    <meta name="twitter:image" content="${url.origin}/og-levon-dinato.jpg" />
  `;

  // Supprime les anciennes balises OG/Twitter et injecte les nôtres
  const cleanedHtml = html
    .replace(/<meta property="og:[^"]*"[^>]*\/?>/gi, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*\/?>/gi, '')
    .replace('</head>', `${ogTags}</head>`);

  return new Response(cleanedHtml, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=60',
    },
  });
}