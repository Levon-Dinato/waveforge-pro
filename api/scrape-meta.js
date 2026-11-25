// api/scrape-meta.js
// Lit les métadonnées (titre, artiste, pochette) d'une page promo externe
// pour pré-remplir le formulaire d'envoi de promo.
export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL manquante' });
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'URL invalide' });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return res.status(502).json({ error: 'Page inaccessible (' + response.status + ')' });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return res.status(400).json({ error: 'Ce lien ne pointe pas vers une page web' });

    const html = await response.text();

    const getMeta = (key) => {
      const patterns = [
        new RegExp('<meta[^>]+property=["\']' + key + '["\'][^>]+content=["\']([^"\']*)["\']', 'i'),
        new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]+property=["\']' + key + '["\']', 'i'),
        new RegExp('<meta[^>]+name=["\']' + key + '["\'][^>]+content=["\']([^"\']*)["\']', 'i'),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m && m[1]) return m[1];
      }
      return '';
    };

    const decode = (s) =>
      s
        .replace(/&amp;/g, '&')
        .replace(/&#0?39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

    const ogTitle = decode(getMeta('og:title'));
    const ogImage = decode(getMeta('og:image'));
    const ogDesc = decode(getMeta('og:description'));

    // Séparation artiste / titre sur " - ", " – " ou " — "
    let title = ogTitle.trim();
    let artist = '';
    const sep = title.match(/\s+[-–—]\s+/);
    if (sep) {
      const parts = title.split(sep[0]);
      if (parts.length === 2) {
        title = parts[1].trim();
        artist = parts[0].trim();
      }
    }

    // Fallback : tag <title> si pas d'og:title
    if (!title) {
      const t = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (t && t[1]) title = decode(t[1].trim());
    }

    if (!title && !ogImage) return res.status(404).json({ error: 'Aucune métadonnée trouvée sur cette page' });

    return res.status(200).json({ title, artist, cover: ogImage, description: ogDesc.slice(0, 300) });
  } catch (e) {
    return res.status(502).json({ error: 'Impossible de lire la page' });
  }
}
