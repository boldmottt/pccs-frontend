/**
 * Lab -> sRGB 변환 (D65 illuminant)
 */
export function labToRgb(L: number, a: number, b: number): string {
  let y = (L + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;

  x = 0.95047 * (x * x * x > 0.008856 ? x * x * x : (x - 16 / 116) / 7.787);
  y = 1.0 * (y * y * y > 0.008856 ? y * y * y : (y - 16 / 116) / 7.787);
  z = 1.08883 * (z * z * z > 0.008856 ? z * z * z : (z - 16 / 116) / 7.787);

  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let bVal = x * 0.0557 + y * -0.204 + z * 1.057;

  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  bVal =
    bVal > 0.0031308
      ? 1.055 * Math.pow(bVal, 1 / 2.4) - 0.055
      : 12.92 * bVal;

  const clamp = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * 255)));
  return `rgb(${clamp(r)},${clamp(g)},${clamp(bVal)})`;
}

/**
 * CIEDE2000 색차 계산
 */
export function deltaE2000(
  L1: number, a1: number, b1: number,
  L2: number, a2: number, b2: number
): number {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cab, 7) / (Math.pow(Cab, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  let h1p = Math.atan2(b1, a1p) * deg;
  if (h1p < 0) h1p += 360;
  let h2p = Math.atan2(b2, a2p) * deg;
  if (h2p < 0) h2p += 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);

  const Lp = (L1 + L2) / 2;
  const Cp = (C1p + C2p) / 2;

  let hp: number;
  if (C1p * C2p === 0) {
    hp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hp = (h1p + h2p + 360) / 2;
  } else {
    hp = (h1p + h2p - 360) / 2;
  }

  const T = 1
    - 0.17 * Math.cos((hp - 30) * rad)
    + 0.24 * Math.cos(2 * hp * rad)
    + 0.32 * Math.cos((3 * hp + 6) * rad)
    - 0.20 * Math.cos((4 * hp - 63) * rad);

  const SL = 1 + (0.015 * Math.pow(Lp - 50, 2)) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
  const SC = 1 + 0.045 * Cp;
  const SH = 1 + 0.015 * Cp * T;

  const RT =
    -2 *
    Math.sqrt(Math.pow(Cp, 7) / (Math.pow(Cp, 7) + Math.pow(25, 7))) *
    Math.sin(60 * rad * Math.exp(-Math.pow((hp - 275) / 25, 2)));

  const result = Math.sqrt(
    Math.pow(dLp / SL, 2) +
    Math.pow(dCp / SC, 2) +
    Math.pow(dHp / SH, 2) +
    RT * (dCp / SC) * (dHp / SH)
  );

  return Math.round(result * 100) / 100;
}
