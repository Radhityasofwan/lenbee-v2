import type { MetadataRoute } from "next";
import { deriveThemeTokens } from "@/lib/domain/theme";
import { brandingUrl, getBrandingAsset, getThemeConfig } from "@/lib/services/settings";

// Query DB tiap request supaya ikon PWA & warna tema yang baru diubah langsung terpakai.
export const revalidate = 0;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [pwaIcon, themeConfig] = await Promise.all([getBrandingAsset("pwaIcon"), getThemeConfig()]);
  const pwaIconUrl = brandingUrl("pwaIcon", pwaIcon);
  const themeColor = themeConfig ? deriveThemeTokens(themeConfig).light.primary : "#c9761f";

  return {
    name: "Lenbee — Manajemen Les Privat",
    short_name: "Lenbee",
    description:
      "Kelola murid, jadwal, laporan belajar, progres, tagihan, dan komunikasi orang tua dalam satu aplikasi.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f4",
    theme_color: themeColor,
    lang: "id",
    categories: ["education", "productivity"],
    icons: pwaIconUrl && pwaIcon
      ? [{ src: pwaIconUrl, sizes: "any", type: pwaIcon.mimeType, purpose: "any" }]
      : [
          { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
  };
}
