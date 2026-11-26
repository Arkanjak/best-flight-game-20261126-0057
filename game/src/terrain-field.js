// terrain-field.js — the valley the game flies over: one analytic heightfield, the runway strip,
// and the colour bands that make hills, forest, rock, snow and the western lake readable at a glance.
// World units are metres: +x is east, +y is north, heights are metres above the runway datum.

export const RUNWAY = { halfWidth: 30, halfLength: 450 };

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0, edge1, v) {
  const t = clamp01((v - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// Height of the ground at a world point. Rolling hills, a peak field, an eastern ridge and a
// shallow lake basin, all flattened near the runway and along its southern approach corridor so
// takeoffs and landings have a fair, readable surface.
export function terrainHeightAt(x, y) {
  const hills =
    20 * Math.sin(x * 0.0021 + 1.3) * Math.cos(y * 0.0018 - 0.7) +
    12 * Math.sin(x * 0.005 - 0.4) * Math.sin(y * 0.004 + 2.1);
  const peaks = 150 * Math.pow(Math.abs(Math.sin(x * 0.00105 + 0.8) * Math.sin(y * 0.00092 - 1.15)), 3);
  const ridge = 70 * Math.exp(-Math.pow((x - 1400) * 0.0011, 2)) * (0.6 + 0.4 * Math.sin(y * 0.002));
  let h = 6 + hills + peaks + ridge;

  const lake = Math.exp(-(Math.pow((x + 1500) * 0.0012, 2) + Math.pow((y - 900) * 0.0012, 2)));
  h = h * (1 - lake * 0.85) - lake * 4;

  const dySeg = y < -RUNWAY.halfLength ? -RUNWAY.halfLength - y : y > RUNWAY.halfLength ? y - RUNWAY.halfLength : 0;
  let d = Math.hypot(Math.max(Math.abs(x) - RUNWAY.halfWidth, 0), dySeg);
  if (y < -RUNWAY.halfLength && Math.abs(x) < 90) {
    d = Math.min(d, Math.abs(x) * 0.35 + (-RUNWAY.halfLength - y) * 0.06);
  }
  h *= smoothstep(0, 240, d);
  return h;
}

export function isOnRunway(x, y) {
  return Math.abs(x) <= RUNWAY.halfWidth + 2 && Math.abs(y) <= RUNWAY.halfLength + 5;
}

// Colour for a terrain quad from its mean height and slope. Bands run water, sand, grass, meadow,
// forest, rock, snow; slope darkens the face so relief reads even in a small screenshot. Low ground
// gets a patchwork of field tones and every quad a slight deterministic jitter, so flat valley
// floor reads as farmland instead of one flat band.
export function terrainColorForHeight(h, slope, t, wx = 0, wy = 0) {
  let r, g, b;
  if (h < 0.8) {
    const shimmer = 6 * Math.sin(t * 2 + h * 3);
    r = 46 + shimmer; g = 110 + shimmer; b = 180;
  } else if (h < 4) { r = 214; g = 190; b = 120; }
  else if (h < 28) { r = 86; g = 160; b = 74; }
  else if (h < 60) { r = 64; g = 140; b = 66; }
  else if (h < 105) { r = 38; g = 104; b = 58; }
  else if (h < 150) { r = 128; g = 114; b = 96; }
  else { r = 236; g = 242; b = 246; }
  if (h >= 4 && h < 60 && (Math.floor(wx / 180) + Math.floor(wy / 180)) % 2 === 0) {
    r += 16; g += 12; b -= 8;
  }
  const jitterHash = Math.abs(Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453) % 1;
  const light = Math.max(0.68, Math.min(1.12, (1.04 - slope * 0.02) * (0.95 + jitterHash * 0.1)));
  return `rgb(${Math.round(r * light)},${Math.round(g * light)},${Math.round(b * light)})`;
}
