"use server";

import { revalidatePath } from "next/cache";
import { parentInviteSchema } from "@/lib/validation";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import { getTutorOrThrow } from "@/lib/auth";
import { ParentInviteError, createParentInvite, revokeParentInvite } from "@/lib/services/parents";

function revalidateParentAccess(studentId?: number) {
  revalidatePath("/settings");
  revalidatePath("/students");
  if (studentId) revalidatePath(`/students/${studentId}`);
}

/**
 * Membuat link undangan akun orang tua. Token dikembalikan lewat `data.path` supaya
 * antarmuka bisa langsung menampilkan link untuk disalin atau dikirim.
 */
export async function createParentInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(parentInviteSchema, formData);
  if (!parsed.success) return parsed.state;

  const studentId = Number(parsed.data.studentId);
  const email = parsed.data.email;

  try {
    const tutor = await getTutorOrThrow();
    const result = await createParentInvite(tutor.id, {
      studentId,
      name: parsed.data.name,
      email,
      phone: parsed.data.phone,
    });
    revalidateParentAccess(studentId);

    if (result.status === "linked") {
      return okay(`${email} sudah punya akun Lenbee. Akses ke ${result.studentName} langsung tersambung.`);
    }

    const path = `/invite/${result.invite.token}`;
    const linkMessage =
      result.status === "reused"
        ? "Link undangan sebelumnya masih berlaku."
        : "Link undangan siap dikirim.";
    return okay(linkMessage, { path, email, name: result.invite.name, phone: result.invite.phone ?? "" });
  } catch (error) {
    if (error instanceof ParentInviteError) return fail(error.message);
    return fail(errorMessage(error, "Gagal membuat undangan."));
  }
}

export async function revokeParentInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const inviteId = Number(formData.get("inviteId"));
  const studentId = Number(formData.get("studentId"));

  try {
    const tutor = await getTutorOrThrow();
    await revokeParentInvite(tutor.id, inviteId);
  } catch (error) {
    if (error instanceof ParentInviteError) return fail(error.message);
    return fail(errorMessage(error, "Gagal membatalkan undangan."));
  }

  revalidateParentAccess(Number.isInteger(studentId) ? studentId : undefined);
  return okay("Undangan dibatalkan.");
}
