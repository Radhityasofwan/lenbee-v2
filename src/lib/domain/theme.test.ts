import { describe, expect, it } from "vitest";
import { contrastTextColor, deriveDarkVariant, deriveThemeTokens, isValidHex, rotateHue } from "./theme";

describe("isValidHex", () => {
  it("menerima hex 6 digit dengan atau tanpa huruf besar", () => {
    expect(isValidHex("#7c5cd6")).toBe(true);
    expect(isValidHex("#ABCDEF")).toBe(true);
  });

  it("menolak format lain", () => {
    expect(isValidHex("7c5cd6")).toBe(false);
    expect(isValidHex("#fff")).toBe(false);
    expect(isValidHex("")).toBe(false);
  });
});

describe("contrastTextColor", () => {
  it("memilih teks gelap untuk warna terang", () => {
    expect(contrastTextColor("#ffffff")).toBe("#000000");
    expect(contrastTextColor("#f5f5f5")).toBe("#000000");
  });

  it("memilih teks putih untuk warna gelap", () => {
    expect(contrastTextColor("#000000")).toBe("#ffffff");
    expect(contrastTextColor("#1a1a2e")).toBe("#ffffff");
  });
});

describe("deriveDarkVariant", () => {
  it("menghasilkan warna yang lebih terang dari aslinya", () => {
    const light = deriveDarkVariant("#7c5cd6");
    // Konversi kasar ke jumlah channel RGB sebagai proxy lightness — varian dark harus lebih terang.
    const sum = (hex: string) =>
      [1, 3, 5].reduce((total, i) => total + parseInt(hex.slice(i, i + 2), 16), 0);
    expect(sum(light)).toBeGreaterThan(sum("#7c5cd6"));
  });
});

describe("rotateHue", () => {
  it("menghasilkan hex valid berbeda dari warna asal", () => {
    const rotated = rotateHue("#2f8fd6", 35);
    expect(isValidHex(rotated)).toBe(true);
    expect(rotated).not.toBe("#2f8fd6");
  });

  it("berputar penuh (360°) kembali ke warna semula", () => {
    expect(rotateHue("#2f8fd6", 360)).toBe("#2f8fd6");
  });
});

describe("deriveThemeTokens", () => {
  it("menyamakan ring dengan primary di tiap mode", () => {
    const tokens = deriveThemeTokens({ primary: "#2f8fd6", gradient: false, secondary: null });
    expect(tokens.light.ring).toBe(tokens.light.primary);
    expect(tokens.dark.ring).toBe(tokens.dark.primary);
  });

  it("tanpa gradasi, gradientFrom & gradientTo sama dengan primary di tiap mode", () => {
    const tokens = deriveThemeTokens({ primary: "#2f8fd6", gradient: false, secondary: null });
    expect(tokens.light.gradientFrom).toBe(tokens.light.primary);
    expect(tokens.light.gradientTo).toBe(tokens.light.primary);
    expect(tokens.dark.gradientFrom).toBe(tokens.dark.primary);
    expect(tokens.dark.gradientTo).toBe(tokens.dark.primary);
  });

  it("dengan gradasi tanpa warna kedua, gradientTo diturunkan otomatis dan berbeda dari primary", () => {
    const tokens = deriveThemeTokens({ primary: "#2f8fd6", gradient: true, secondary: null });
    expect(tokens.light.gradientTo).not.toBe(tokens.light.primary);
    expect(isValidHex(tokens.light.gradientTo)).toBe(true);
  });

  it("dengan gradasi dan warna kedua eksplisit, memakainya sebagai gradientTo", () => {
    const tokens = deriveThemeTokens({ primary: "#2f8fd6", gradient: true, secondary: "#d6508f" });
    expect(tokens.light.gradientTo).toBe("#d6508f");
  });

  it("varian dark tetap warna hex valid", () => {
    const tokens = deriveThemeTokens({ primary: "#d05364", gradient: false, secondary: null });
    expect(isValidHex(tokens.dark.primary)).toBe(true);
  });

  it("accent diturunkan dari hue primary, bukan warna tetap", () => {
    const blue = deriveThemeTokens({ primary: "#2f8fd6", gradient: false, secondary: null });
    const pink = deriveThemeTokens({ primary: "#d6508f", gradient: false, secondary: null });
    expect(blue.light.accent).not.toBe(pink.light.accent);
    expect(isValidHex(blue.light.accent)).toBe(true);
    expect(isValidHex(blue.light.accentForeground)).toBe(true);
  });
});
