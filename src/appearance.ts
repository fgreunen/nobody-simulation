import type { StellarProperties } from './stellar';
/** Artistic, continuous display mapping. Distances here are displayed parsecs, not surfaces. */
export function appearance(star: StellarProperties) {
  const radius = 0.009 + 0.012 * Math.log1p(star.radius);
  const brightness = 0.85 + 0.45 * Math.log1p(star.luminosity);
  // Continuous warm-red to blue-white temperature anchors (sRGB).
  const anchors = [[2500, 1, 0.40, 0.20], [3700, 1, 0.67, 0.43], [5772, 1, 0.91, 0.80], [10000, 0.77, 0.86, 1], [20000, 0.60, 0.74, 1]];
  const t = Math.max(2500, Math.min(20000, star.temperature));
  const upper = Math.max(1, anchors.findIndex(a => a[0] >= t));
  const a = anchors[upper - 1], b = anchors[upper], f = (t - a[0]) / (b[0] - a[0]);
  return { radius, brightness, color: a.slice(1).map((v, i) => v + f * (b[i + 1] - v)) };
}
