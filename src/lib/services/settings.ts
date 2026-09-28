import "server-only";
import { eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { settings } from "@/db/schema";

export type BrandingAsset = { key: string; mimeType: string; originalName: string; updatedAt: string };

const BRANDING_KEYS = {
  logo: "branding.logo",
  favicon: "branding.favicon",
  pwaIcon: "branding.pwa_icon",
} as const;

export type BrandingSlot = keyof typeof BRANDING_KEYS;
export const BRANDING_SLOTS = Object.keys(BRANDING_KEYS) as BrandingSlot[];

function parseAsset(value: string): BrandingAsset | null {
  try {
    const parsed = JSON.parse(value) as Partial<BrandingAsset>;
    if (!parsed.key || !parsed.mimeType) return null;
    return {
      key: parsed.key,
      mimeType: parsed.mimeType,
      originalName: parsed.originalName ?? "",
      updatedAt: parsed.updatedAt ?? "",
    };
  } catch {
    return null;
  }
}

/** Dipanggil di tiap layout (app/auth/parent) dan metadata root — di-cache lintas request supaya tidak query DB tiap navigasi. */
export const getBrandingAsset = unstable_cache(
  async (slot: BrandingSlot): Promise<BrandingAsset | null> => {
    const [row] = await db.select().from(settings).where(eq(settings.key, BRANDING_KEYS[slot])).limit(1);
    return row ? parseAsset(row.value) : null;
  },
  ["branding-asset"],
  { tags: ["branding"] },
);

export async function getBrandingAssets(): Promise<Record<BrandingSlot, BrandingAsset | null>> {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, Object.values(BRANDING_KEYS)));
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  const result = {} as Record<BrandingSlot, BrandingAsset | null>;
  for (const slot of BRANDING_SLOTS) {
    const raw = byKey.get(BRANDING_KEYS[slot]);
    result[slot] = raw ? parseAsset(raw) : null;
  }
  return result;
}

/** URL publik dengan cache-buster supaya browser langsung ambil versi baru setelah diunggah ulang. */
export function brandingUrl(slot: BrandingSlot, asset: BrandingAsset | null): string | null {
  if (!asset) return null;
  return `/api/branding/${slot}?v=${encodeURIComponent(asset.updatedAt || asset.key)}`;
}

export async function setBrandingAsset(
  slot: BrandingSlot,
  asset: Omit<BrandingAsset, "updatedAt"> | null,
): Promise<void> {
  const key = BRANDING_KEYS[slot];
  if (!asset) {
    await db.delete(settings).where(eq(settings.key, key));
    return;
  }
  const value = JSON.stringify({ ...asset, updatedAt: new Date().toISOString() });
  await db
    .insert(settings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });
}
