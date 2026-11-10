import { expect, it } from 'vitest';
import { stellarProperties } from '../src/stellar';
import { appearance } from '../src/appearance';
// Independent published source rows, not values calculated by the interpolation routine.
it('matches BHAC15 low-mass and MIST solar/hot anchors at 125 Myr', () => {
  const low = stellarProperties(0.08);
  expect(low.temperature).toBeGreaterThan(2846); expect(low.temperature).toBeLessThan(2849);
  expect(low.luminosity).toBeGreaterThan(10 ** -2.845); expect(low.luminosity).toBeLessThan(10 ** -2.838);
  expect(low.radius).toBeCloseTo(0.1565, 2); expect(low.kind).toBe('pre-main-sequence star');
  const sun = stellarProperties(0.9967724376223931);
  expect(sun.temperature).toBeCloseTo(10 ** 3.7566378668830276, 7);
  expect(sun.luminosity).toBeCloseTo(10 ** -0.11940063265317558, 10);
  expect(sun.radius).toBeCloseTo(10 ** -0.05029889791052951, 3); expect(sun.kind).toBe('main-sequence star');
  const hot = stellarProperties(3.9934102053112444);
  expect(hot.temperature).toBeCloseTo(10 ** 4.133998689171811, 7);
  expect(hot.luminosity).toBeCloseTo(10 ** 2.5702660924878713, 8);
});
it('has continuous, luminosity-consistent properties and display across boundaries', () => {
  let last = stellarProperties(0.08);
  for (let i = 1; i <= 10000; i++) {
    const mass = 0.08 * (4.5 / 0.08) ** (i / 10000), star = stellarProperties(Math.min(4.5, mass));
    expect(star.luminosity).toBeCloseTo(star.radius ** 2 * (star.temperature / 5772) ** 4, 9);
    expect(Math.abs(star.radius / last.radius - 1)).toBeLessThan(0.01);
    expect(Math.abs(star.temperature / last.temperature - 1)).toBeLessThan(0.01);
    const a = appearance(last), b = appearance(star);
    expect(Math.abs(a.radius / b.radius - 1)).toBeLessThan(0.01);
    expect(Math.max(...a.color.map((c, j) => Math.abs(c - b.color[j])))).toBeLessThan(0.01);
    last = star;
  }
  expect(() => stellarProperties(0.079)).toThrow(); expect(() => stellarProperties(4.51)).toThrow(); expect(() => stellarProperties(NaN)).toThrow();
  expect(stellarProperties(4.5).kind).toBe('main-sequence star');
});
