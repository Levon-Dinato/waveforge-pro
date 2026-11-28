// src/lib/shuffle.ts
// Mélange déterministe (LCG Park-Miller) : même ordre pour tous les auditeurs à un instant donné.
// Utilisé par la radio pour l'anti-répétition, avec un seed basé sur la journée.
export function seededShuffle<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  const rng = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
