const DAY_MS = 86_400_000;

/** Days since the Unix epoch (UTC); the band of the day changes when it does. */
export const dayNumber = (now: number) => Math.floor(now / DAY_MS);

/** Rotates through a roster once per UTC day, no backend needed. */
export function pickBandOfTheDay<T>(bands: T[], day: number): T {
  return bands[day % bands.length];
}
