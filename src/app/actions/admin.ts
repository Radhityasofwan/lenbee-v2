"use server";

import { revalidatePath } from "next/cache";
import { getSuperAdminOrThrow } from "@/lib/auth";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import {
  AdminAccountError,
  createParent,
  createTutor,
  deleteAccount,
  setAccountActive,
  updateAccount,
  updateParentStudentLinks,
} from "@/lib/services/admin-accounts";
import { createAccountSchema, deleteAccountSchema, updateAccountSchema } from "@/lib/validation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

function toActiveUntil(value: string | undefined): Date | null {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function toStudentIds(values: string[]): number[] {
  return values.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
}

function revalidateAdmin() {
  revalidatePath("/admin/tutors");
  revalidatePath("/admin/parents");
}

async function findAccountOrFail(accountId: number): Promise<{ id: number; email: string } | null> {
  const [account] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, accountId)).limit(1);
  return account ?? null;
}

export async function createTutorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(createAccountSchema, formData, { arrayFields: ["studentIds"] });
  if (!parsed.success) return parsed.state;

  try {
    await getSuperAdminOrThrow();
    await createTutor({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      password: parsed.data.password,
      activeUntil: toActiveUntil(parsed.data.activeUntil),
    });
  } catch (error) {
    if (error instanceof AdminAccountError) return fail(error.message, { email: error.message });
    return fail(errorMessage(error, "Gagal membuat akun tutor."));
  }

  revalidateAdmin();
  return okay("Akun tutor dibuat.");
}

export async function createParentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(createAccountSchema, formData, { arrayFields: ["studentIds"] });
  if (!parsed.success) return parsed.state;

  try {
    await getSuperAdminOrThrow();
    await createParent({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      password: parsed.data.password,
      activeUntil: toActiveUntil(parsed.data.activeUntil),
      studentIds: toStudentIds(parsed.data.studentIds),
    });
  } catch (error) {
    if (error instanceof AdminAccountError) return fail(error.message, { email: error.message });
    return fail(errorMessage(error, "Gagal membuat akun orang tua."));
  }

  revalidateAdmin();
  return okay("Akun orang tua dibuat.");
}

async function updateAccountAction(
  formData: FormData,
  options: { isParent: boolean },
): Promise<ActionState> {
  const parsed = parseForm(updateAccountSchema, formData, { arrayFields: ["studentIds"] });
  if (!parsed.success) return parsed.state;

  const accountId = Number(formData.get("accountId"));
  if (!Number.isInteger(accountId) || accountId <= 0) return fail("Akun tidak ditemukan.");

  try {
    await getSuperAdminOrThrow();
    await updateAccount(accountId, {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      activeUntil: toActiveUntil(parsed.data.activeUntil),
    });
    if (options.isParent) {
      await updateParentStudentLinks(accountId, toStudentIds(parsed.data.studentIds));
    }
  } catch (error) {
    if (error instanceof AdminAccountError) return fail(error.message, { email: error.message });
    return fail(errorMessage(error, "Gagal menyimpan akun."));
  }

  revalidateAdmin();
  return okay("Akun diperbarui.");
}

export async function updateTutorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return updateAccountAction(formData, { isParent: false });
}

export async function updateParentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return updateAccountAction(formData, { isParent: true });
}

export async function toggleAccountActiveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const accountId = Number(formData.get("accountId"));
  const isActive = formData.get("isActive") === "true";
  if (!Number.isInteger(accountId) || accountId <= 0) return fail("Akun tidak ditemukan.");

  try {
    await getSuperAdminOrThrow();
    await setAccountActive(accountId, isActive);
  } catch (error) {
    return fail(errorMessage(error, "Gagal mengubah status akun."));
  }

  revalidateAdmin();
  return okay(isActive ? "Akun diaktifkan." : "Akun dinonaktifkan.");
}

export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(deleteAccountSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    await getSuperAdminOrThrow();
    const account = await findAccountOrFail(parsed.data.accountId);
    if (!account) return fail("Akun tidak ditemukan.");
    if (account.email.toLowerCase() !== parsed.data.confirmEmail.toLowerCase()) {
      return fail("Email konfirmasi tidak cocok.", { confirmEmail: "Ketik ulang email akun dengan persis." });
    }
    await deleteAccount(account.id);
  } catch (error) {
    return fail(errorMessage(error, "Gagal menghapus akun."));
  }

  revalidateAdmin();
  return okay("Akun dihapus permanen.");
}
