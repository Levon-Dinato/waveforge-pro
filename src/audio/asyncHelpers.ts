/**
 * Cède le contrôle au browser pour éviter les freezes.
 * Permet au navigateur de redessiner l'UI entre deux chunks de calcul.
 */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    // Utilise requestAnimationFrame si dispo, sinon setTimeout
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Yield + attend un peu (pour laisser respirer).
 */
export function yieldAndDelay(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}