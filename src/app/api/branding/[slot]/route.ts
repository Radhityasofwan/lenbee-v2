import { NextResponse } from "next/server";
import { BRANDING_SLOTS, getBrandingAsset, type BrandingSlot } from "@/lib/services/settings";
import { getStorage } from "@/lib/storage";

/**
 * Publik & tanpa login — logo/favicon/ikon PWA harus tetap tampil di halaman login,
 * tab browser, dan saat aplikasi di-install, sebelum ada sesi sama sekali.
 */
export async function GET(_request: Request, props: RouteContext<"/api/branding/[slot]">) {
  const { slot } = await props.params;
  if (!BRANDING_SLOTS.includes(slot as BrandingSlot)) {
    return NextResponse.json({ error: "Aset tidak dikenali." }, { status: 404 });
  }

  const asset = await getBrandingAsset(slot as BrandingSlot);
  if (!asset) return NextResponse.json({ error: "Belum diunggah." }, { status: 404 });

  let body: Buffer;
  try {
    body = await getStorage().get(asset.key);
  } catch {
    return NextResponse.json({ error: "Berkas tidak tersedia." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
