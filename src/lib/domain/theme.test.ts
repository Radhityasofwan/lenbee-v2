import { describe, expect, it } from "vitest";
import { contrastTextColor, deriveDarkVariant, deriveThemeTokens, isValidHex } from "./theme";

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

describe("deriveThemeTokens", () => {
  it("menyamakan ring dengan primary di tiap mode", () => {
    const tokens = deriveThemeTokens("#2f8fd6");
    expect(tokens.light.ring).toBe(tokens.light.primary);
    expect(tokens.dark.ring).toBe(tokens.dark.primary);
  });

  it("varian dark tetap warna hex valid", () => {
    const tokens = deriveThemeTokens("#d05364");
    expect(isValidHex(tokens.dark.primary)).toBe(true);
  });
});
