import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { formatDateShort } from "@/lib/datetime";
import { errorMessage } from "@/lib/form";
import { searchEverything } from "@/lib/services/search";

/** Dipakai oleh SearchPalette (spotlight) — hasil pencarian instan tiap ketikan, bukan navigasi halaman. */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
    if (user.role !== "tutor") {
      return NextResponse.json({ error: "Hanya pengajar yang bisa memakai pencarian ini." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim().slice(0, 120);

    const results = await searchEverything(user.id, query);
    const hits = results.hits.map((hit) =>
      hit.group === "lessons" && hit.meta ? { ...hit, meta: formatDateShort(hit.meta) } : hit,
    );

    return NextResponse.json({ query, hits });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Gagal mencari.") }, { status: 500 });
  }
}
