"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { parentInvites, parentStudents, users } from "@/db/schema";
import {
  ROLE_HOME,
  createSession,
  destroySession,
  isLoginThrottled,
  recordLoginAttempt,
  verifyPassword,
  hashPassword,
} from "@/lib/auth";
import { errorMessage, fail, parseForm, type ActionState } from "@/lib/form";
import { acceptInviteSchema, loginSchema } from "@/lib/validation";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.success) return parsed.state;

  const { email, password } = parsed.data;
  let destination = "/home";

  try {
    if (await isLoginThrottled(email)) {
      return fail("Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.");
    }

    const rows = await db
      .select({
        id: users.id,
        role: users.role,
        passwordHash: users.passwordHash,
        isActive: users.isActive,
        activeUntil: users.activeUntil,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = rows[0];
    const valid = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !valid) {
      await recordLoginAttempt(email, false);
      return fail("Email atau password salah.", { email: " ", password: " " });
    }

    if (!user.isActive) {
      await recordLoginAttempt(email, false);
      return fail("Akun ini sedang dinonaktifkan. Hubungi admin.");
    }

    if (user.activeUntil && user.activeUntil.getTime() < Date.now()) {
      await recordLoginAttempt(email, false);
      return fail("Masa aktif akun ini sudah berakhir. Hubungi admin.");
    }

    await recordLoginAttempt(email, true);
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await createSession(user.id);

    destination = ROLE_HOME[user.role];
  } catch (error) {
    return fail(errorMessage(error, "Gagal masuk. Periksa koneksi database."));
  }

  redirect(destination);
}

export async function acceptInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(acceptInviteSchema, formData);
  if (!parsed.success) return parsed.state;

  const { token, name, phone, password } = parsed.data;

  try {
    const rows = await db.select().from(parentInvites).where(eq(parentInvites.token, token)).limit(1);
    const invite = rows[0];

    if (!invite) return fail("Undangan tidak ditemukan atau sudah tidak berlaku.");
    if (invite.acceptedAt) return fail("Undangan ini sudah pernah digunakan. Silakan masuk dengan akun Anda.");
    if (invite.expiresAt.getTime() < Date.now()) return fail("Undangan sudah kedaluwarsa. Minta undangan baru.");

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, invite.email)).limit(1);
    if (existing.length > 0) {
      return fail("Email undangan ini sudah punya akun. Silakan masuk.");
    }

    const inserted = await db
      .insert(users)
      .values({
        email: invite.email,
        name: name || invite.name,
        phone: phone ?? invite.phone ?? null,
        passwordHash: await hashPassword(password),
        role: "parent",
      })
      .$returningId();

    const userId = inserted[0]?.id;
    if (!userId) return fail("Gagal membuat akun. Coba lagi.");

    const studentIds = (invite.studentIds ?? []).filter((value) => Number.isInteger(value));
    if (studentIds.length > 0) {
      await db
        .insert(parentStudents)
        .values(studentIds.map((studentId) => ({ parentUserId: userId, studentId })))
        .onDuplicateKeyUpdate({ set: { relation: "orang tua" } });
    }

    await db.update(parentInvites).set({ acceptedAt: new Date() }).where(eq(parentInvites.id, invite.id));
    await createSession(userId);
  } catch (error) {
    return fail(errorMessage(error, "Gagal menerima undangan."));
  }

  redirect("/parent");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
