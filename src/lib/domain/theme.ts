/** Konversi & turunan warna tema — dipakai untuk warna primary bebas pilih dari super admin. */

export type ThemeTokens = { primary: string; primaryForeground: string; ring: string };
export type ThemeVariants = { light: ThemeTokens; dark: ThemeTokens };

const HEX_PATTERN = /^#([0-9a-fA-F]{6})$/;

export function isValidHex(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

function hexToRgb(hex: string): [number, number, number] {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) return [0, 0, 0];
  const int = parseInt(match[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hn = h / 360;
  return [hue2rgb(p, q, hn + 1 / 3) * 255, hue2rgb(p, q, hn) * 255, hue2rgb(p, q, hn - 1 / 3) * 255];
}

/** Naikkan lightness di ruang HSL — dipakai untuk turunan varian dark mode. */
export function deriveDarkVariant(hex: string, lightenBy = 0.1): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h, s, Math.min(0.92, l + lightenBy));
  return rgbToHex(nr, ng, nb);
}

/** Relative luminance (WCAG) untuk memilih teks hitam/putih paling kebaca di atas warna ini. */
export function contrastTextColor(hex: string): "#000000" | "#ffffff" {
  const [r, g, b] = hexToRgb(hex);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/** Turunkan token light/dark dari satu warna primary yang dipilih admin. `ring` disamakan dengan `primary`, mengikuti relasi token bawaan di globals.css. */
export function deriveThemeTokens(hex: string): ThemeVariants {
  const primary = hex.trim();
  const darkPrimary = deriveDarkVariant(primary);

  return {
    light: { primary, primaryForeground: contrastTextColor(primary), ring: primary },
    dark: { primary: darkPrimary, primaryForeground: contrastTextColor(darkPrimary), ring: darkPrimary },
  };
}
