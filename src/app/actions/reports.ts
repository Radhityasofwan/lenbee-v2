"use server";

import { revalidatePath } from "next/cache";
import { getTutorOrThrow } from "@/lib/auth";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import {
  ReportError,
  createParentUpdate,
  deleteParentUpdate,
  latestChecklistLabels,
  markParentUpdateSent,
  updateParentUpdate,
} from "@/lib/services/reports";
import { parentUpdateSchema } from "@/lib/validation";

function revalidateReports(studentId?: number, updateId?: number) {
  revalidatePath("/reports");
  revalidatePath("/home");
  if (studentId) revalidatePath(`/students/${studentId}`);
  if (updateId) revalidatePath(`/reports/${updateId}`);
  revalidatePath("/parent/reports");
}

export async function createParentUpdateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(parentUpdateSchema, formData);
  if (!parsed.success) return parsed.state;

  const studentId = Number(parsed.data.studentId);

  try {
    const tutor = await getTutorOrThrow();
    const created = await createParentUpdate(
      tutor.id,
      {
        studentId,
        title: parsed.data.title,
        periodStart: parsed.data.periodStart,
        periodEnd: parsed.data.periodEnd,
        body: parsed.data.body,
        kind: parsed.data.kind,
        format: parsed.data.format,
        checkItems: parsed.data.checkItems,
        status: parsed.data.status,
      },
      formData.get("aiGenerated") === "true",
    );

    if (parsed.data.status === "sent") await markParentUpdateSent(tutor.id, created.id);
    revalidateReports(studentId, created.id);
  } catch (error) {
    if (error instanceof ReportError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyimpan laporan."));
  }

  return okay("Laporan disimpan.");
}

export async function updateParentUpdateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(parentUpdateSchema, formData);
  if (!parsed.success) return parsed.state;

  const updateId = Number(formData.get("updateId"));
  if (!Number.isInteger(updateId) || updateId <= 0) return fail("Laporan tidak ditemukan.");

  const studentId = Number(parsed.data.studentId);

  try {
    const tutor = await getTutorOrThrow();
    await updateParentUpdate(
      tutor.id,
      updateId,
      {
        title: parsed.data.title,
        periodStart: parsed.data.periodStart,
        periodEnd: parsed.data.periodEnd,
        body: parsed.data.body,
        kind: parsed.data.kind,
        format: parsed.data.format,
        checkItems: parsed.data.checkItems,
        status: parsed.data.status,
      },
      formData.get("aiGenerated") === "true",
    );

    if (parsed.data.status === "sent") await markParentUpdateSent(tutor.id, updateId);
    revalidateReports(studentId, updateId);
  } catch (error) {
    if (error instanceof ReportError) return fail(error.message);
    return fail(errorMessage(error, "Gagal memperbarui laporan."));
  }

  return okay("Laporan diperbarui.");
}

export async function sendParentUpdateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const updateId = Number(formData.get("updateId"));
  if (!Number.isInteger(updateId) || updateId <= 0) return fail("Laporan tidak ditemukan.");

  try {
    const tutor = await getTutorOrThrow();
    const sent = await markParentUpdateSent(tutor.id, updateId);
    revalidateReports(sent.studentId, updateId);
  } catch (error) {
    if (error instanceof ReportError) return fail(error.message);
    return fail(errorMessage(error, "Gagal mengirim laporan."));
  }

  return okay("Laporan dikirim ke orang tua.");
}

/** Prefill item checklist dari laporan checklist terakhir anak ini. */
export async function latestChecklistLabelsAction(studentId: number): Promise<string[]> {
  if (!Number.isInteger(studentId) || studentId <= 0) return [];
  try {
    await getTutorOrThrow();
    return await latestChecklistLabels(studentId);
  } catch {
    return [];
  }
}

export async function deleteParentUpdateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const updateId = Number(formData.get("updateId"));
  if (!Number.isInteger(updateId) || updateId <= 0) return fail("Laporan tidak ditemukan.");

  try {
    const tutor = await getTutorOrThrow();
    await deleteParentUpdate(tutor.id, updateId);
    revalidateReports(undefined, updateId);
  } catch (error) {
    if (error instanceof ReportError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menghapus laporan."));
  }

  return okay("Laporan dihapus.");
}
