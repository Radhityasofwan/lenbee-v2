/** Konversi & turunan warna tema — dipakai untuk tema aplikasi yang bebas dipilih super admin. */

export type ThemeConfig = {
  primary: string;
  /** Pakai gradasi 2 warna untuk permukaan brand utama (logo, tombol utama, dst). */
  gradient: boolean;
  /** Warna kedua gradasi. `null` = diturunkan otomatis dari `primary`. */
  secondary: string | null;
};

export type ThemeTokens = {
  primary: string;
  primaryForeground: string;
  ring: string;
  accent: string;
  accentForeground: string;
  gradientFrom: string;
  gradientTo: string;
};
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

/** Ganti lightness di ruang HSL, pertahankan hue & saturation — dipakai untuk turunan tint/wash. */
function withLightness(hex: string, l: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h, s, Math.max(0, Math.min(1, l)));
  return rgbToHex(nr, ng, nb);
}

/** Putar hue di ruang HSL — dipakai untuk menyarankan warna kedua gradasi dari satu warna primary. */
export function rotateHue(hex: string, degrees: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const nh = ((h + degrees) % 360 + 360) % 360;
  const [nr, ng, nb] = hslToRgb(nh, s, l);
  return rgbToHex(nr, ng, nb);
}

/** Saran warna kedua gradasi bila admin belum memilih sendiri. */
export function suggestGradientPartner(hex: string): string {
  return rotateHue(hex, 35);
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

/**
 * Turunkan token light/dark lengkap dari satu konfigurasi tema.
 * `ring` & `gradientFrom` disamakan dengan `primary`. `accent` diturunkan dari hue primary (wash
 * terang di mode terang, wash gelap di mode gelap) supaya chip/badge aksen tetap senada — bukan
 * lagi warna ungu tetap yang lepas dari warna brand yang dipilih. Warna semantik (destructive,
 * success, warning, info) sengaja tidak diturunkan dari primary agar maknanya tetap konsisten.
 */
export function deriveThemeTokens(config: ThemeConfig): ThemeVariants {
  const primary = config.primary.trim();
  const darkPrimary = deriveDarkVariant(primary);

  const gradientToLight = config.gradient ? (config.secondary?.trim() || suggestGradientPartner(primary)) : primary;
  const gradientToDark = config.gradient ? deriveDarkVariant(gradientToLight) : darkPrimary;

  return {
    light: {
      primary,
      primaryForeground: contrastTextColor(primary),
      ring: primary,
      accent: withLightness(primary, 0.93),
      accentForeground: withLightness(primary, 0.32),
      gradientFrom: primary,
      gradientTo: gradientToLight,
    },
    dark: {
      primary: darkPrimary,
      primaryForeground: contrastTextColor(darkPrimary),
      ring: darkPrimary,
      accent: withLightness(darkPrimary, 0.32),
      accentForeground: withLightness(darkPrimary, 0.88),
      gradientFrom: darkPrimary,
      gradientTo: gradientToDark,
    },
  };
}
