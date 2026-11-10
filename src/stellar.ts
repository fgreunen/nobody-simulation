import data from './stellar-data.json';

export const REFERENCE_AGE_YEARS = data.ageYears;
export const MAX_INITIAL_MASS = 4.5;
export interface StellarProperties {
  kind: 'pre-main-sequence star' | 'main-sequence star' | 'merger remnant';
  subtype: string;
  radius: number; // solar radii
  temperature: number; // K
  luminosity: number; // solar luminosities
  model: '125 Myr isochrone' | 'homologous merger approximation';
}
function interpolate(rows: number[][], mass: number, column: number): number {
  let i = rows.findIndex(row => row[0] >= mass);
  if (i <= 0) return rows[i < 0 ? rows.length - 1 : 0][column];
  const a = rows[i - 1], b = rows[i];
  const f = Math.log(mass / a[0]) / Math.log(b[0] / a[0]);
  return a[column] + f * (b[column] - a[column]);
}
function subtype(t: number): string {
  return t < 3700 ? 'M-type' : t < 5200 ? 'K-type' : t < 6000 ? 'G-type' : t < 7500 ? 'F-type' : t < 10000 ? 'A-type' : 'B-type';
}
export function stellarProperties(mass: number): StellarProperties {
  if (!Number.isFinite(mass) || mass < 0.08 || mass > MAX_INITIAL_MASS) throw new Error('Stellar isochrone supports 0.08–4.5 solar masses');
  // Join BHAC15 to MIST continuously over their overlapping 0.10–0.20 Msun range.
  const blend = Math.max(0, Math.min(1, (mass - 0.1) / 0.1));
  const logL = interpolate(data.bhac, mass, 1) * (1 - blend) + interpolate(data.mist, mass, 1) * blend;
  const logT = interpolate(data.bhac, mass, 2) * (1 - blend) + interpolate(data.mist, mass, 2) * blend;
  const temperature = 10 ** logT, luminosity = 10 ** logL;
  // Stefan–Boltzmann enforces luminosity consistency across interpolation/model joins.
  const radius = Math.sqrt(luminosity) * (5772 / temperature) ** 2;
  const zams = data.mist.find(row => row[4] === 0)![0];
  return { kind: mass < zams ? 'pre-main-sequence star' : 'main-sequence star', subtype: subtype(temperature), radius, temperature, luminosity, model: '125 Myr isochrone' };
}
/** Deliberately limited coalescence model: homology anchored at 1 Msun, no table extrapolation. */
export function mergerProperties(mass: number): StellarProperties {
  const anchor = stellarProperties(1);
  const radius = anchor.radius * mass ** 0.8, luminosity = anchor.luminosity * mass ** 3.5;
  const temperature = 5772 * (luminosity / radius ** 2) ** 0.25;
  return { kind: 'merger remnant', subtype: subtype(temperature), radius, temperature, luminosity, model: 'homologous merger approximation' };
}
