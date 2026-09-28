import type { MetadataRoute } from "next";
import { brandingUrl, getBrandingAsset } from "@/lib/services/settings";

// Query DB tiap request supaya ikon PWA yang baru diunggah langsung terpakai.
export const revalidate = 0;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const pwaIcon = await getBrandingAsset("pwaIcon");
  const pwaIconUrl = brandingUrl("pwaIcon", pwaIcon);

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
    theme_color: "#c9761f",
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
