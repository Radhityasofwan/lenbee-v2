import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { errorMessage } from "@/lib/form";
import { sendPushToUser } from "@/lib/services/push";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });

    await sendPushToUser(user.id, {
      title: "Notifikasi Lenbee aktif 🎉",
      body: "Kalau ini muncul, notifikasi push di perangkat ini sudah berhasil.",
      url: user.role === "tutor" ? "/home" : "/parent",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Gagal mengirim notifikasi uji coba.") }, { status: 500 });
  }
}
