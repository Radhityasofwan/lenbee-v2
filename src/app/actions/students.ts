"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  programSchema,
  scheduleSchema,
  studentSchema,
  updateProfileSchema,
} from "@/lib/validation";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import { getSessionUserOrThrow, getTutorOrThrow, hashPassword, verifyPassword } from "@/lib/auth";
import { ensureSessionsAround, pruneStaleSessions } from "@/lib/services/sessions";
import {
  StudentError,
  createProgram,
  createSchedule,
  createStudent,
  deleteProgram,
  deleteSchedule,
  setStudentActive,
  updateProgram,
  updateSchedule,
  updateStudent,
} from "@/lib/services/students";

function revalidateStudents(studentId?: number) {
  revalidatePath("/home");
  revalidatePath("/students");
  revalidatePath("/schedule");
  if (studentId) {
    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/students/${studentId}/edit`);
  }
}

export async function createStudentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(studentSchema, formData);
  if (!parsed.success) return parsed.state;

  let created: { id: number } | null = null;
  try {
    const tutor = await getTutorOrThrow();
    created = await createStudent(tutor.id, parsed.data);
  } catch (error) {
    if (error instanceof StudentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyimpan murid."));
  }

  if (!created) return fail("Gagal menyimpan murid.");

  revalidateStudents(created.id);
  redirect(`/students/${created.id}`);
}

export async function updateStudentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));
  const parsed = parseForm(studentSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const tutor = await getTutorOrThrow();
    await updateStudent(tutor.id, studentId, parsed.data);
  } catch (error) {
    if (error instanceof StudentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal memperbarui murid."));
  }

  revalidateStudents(studentId);
  return okay("Data murid diperbarui.");
}

export async function toggleStudentActiveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));
  const isActive = formData.get("isActive") === "true";

  try {
    const tutor = await getTutorOrThrow();
    await setStudentActive(tutor.id, studentId, isActive);
  } catch (error) {
    if (error instanceof StudentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal mengubah status murid."));
  }

  revalidateStudents(studentId);
  return okay(isActive ? "Murid diaktifkan kembali." : "Murid dinonaktifkan.");
}

/* -------------------------------- Programs -------------------------------- */

export async function createProgramAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(programSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const tutor = await getTutorOrThrow();
    await createProgram(tutor.id, parsed.data);
  } catch (error) {
    if (error instanceof StudentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyimpan program."));
  }

  revalidateStudents(Number(parsed.data.studentId));
  return okay("Program ditambahkan.");
}

export async function updateProgramAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const programId = Number(formData.get("programId"));
  const parsed = parseForm(programSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const tutor = await getTutorOrThrow();
    await updateProgram(tutor.id, programId, parsed.data);
  } catch (error) {
    if (error instanceof StudentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal memperbarui program."));
  }

  revalidateStudents(Number(parsed.data.studentId));
  return okay("Program diperbarui.");
}

export async function deleteProgramAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const programId = Number(formData.get("programId"));
  const studentId = Number(formData.get("studentId"));

  try {
    const tutor = await getTutorOrThrow();
    await deleteProgram(tutor.id, programId);
  } catch (error) {
    if (error instanceof StudentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menghapus program."));
  }

  revalidateStudents(studentId);
  return okay("Program dihapus.");
}

/* -------------------------------- Schedules ------------------------------- */

export async function createScheduleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(scheduleSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const tutor = await getTutorOrThrow();
    await createSchedule(tutor.id, parsed.data);
    await ensureSessionsAround(tutor.id, 60);
  } catch (error) {
    if (error instanceof StudentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyimpan jadwal."));
  }

  revalidateStudents(Number(parsed.data.studentId));
  return okay("Jadwal ditambahkan dan pertemuan mendatang sudah dibuat.");
}

export async function updateScheduleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const scheduleId = Number(formData.get("scheduleId"));
  const parsed = parseForm(scheduleSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const tutor = await getTutorOrThrow();
    await updateSchedule(tutor.id, scheduleId, parsed.data);
    await pruneStaleSessions(scheduleId);
    await ensureSessionsAround(tutor.id, 60);
  } catch (error) {
    if (error instanceof StudentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal memperbarui jadwal."));
  }

  revalidateStudents(Number(parsed.data.studentId));
  return okay("Jadwal diperbarui dan pertemuan mendatang disesuaikan.");
}

export async function deleteScheduleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const scheduleId = Number(formData.get("scheduleId"));
  const studentId = Number(formData.get("studentId"));

  try {
    const tutor = await getTutorOrThrow();
    await deleteSchedule(tutor.id, scheduleId);
  } catch (error) {
    if (error instanceof StudentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menghapus jadwal."));
  }

  revalidateStudents(studentId);
  return okay("Jadwal dihapus.");
}

/* ------------------------------- Own profile ------------------------------- */

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(updateProfileSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const user = await getSessionUserOrThrow();
    await db
      .update(users)
      .set({ name: parsed.data.name, phone: parsed.data.phone ?? null })
      .where(eq(users.id, user.id));
  } catch (error) {
    return fail(errorMessage(error, "Gagal memperbarui profil."));
  }

  revalidatePath("/settings");
  revalidatePath("/home");
  return okay("Profil diperbarui.");
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) return fail("Password baru minimal 8 karakter.", { newPassword: "Minimal 8 karakter." });
  if (newPassword !== confirmPassword) {
    return fail("Konfirmasi password tidak sama.", { confirmPassword: "Konfirmasi tidak sama." });
  }

  try {
    const session = await getSessionUserOrThrow();
    const [row] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1);

    if (!(await verifyPassword(currentPassword, row?.passwordHash ?? null))) {
      return fail("Password saat ini salah.", { currentPassword: "Password salah." });
    }

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(newPassword) })
      .where(eq(users.id, session.id));
  } catch (error) {
    return fail(errorMessage(error, "Gagal mengubah password."));
  }

  revalidatePath("/settings");
  return okay("Password diperbarui.");
}
