"use server";

import { revalidatePath } from "next/cache";
import {
  cancelLessonSchema,
  completeLessonSchema,
  extraSessionSchema,
  lessonReportSchema,
  reopenLessonSchema,
  rescheduleLessonSchema,
} from "@/lib/validation";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import { getTutorOrThrow } from "@/lib/auth";
import {
  LessonError,
  cancelLesson,
  completeLesson,
  createExtraSession,
  deleteScheduledLesson,
  reopenLesson,
  rescheduleLesson,
  updateLessonReport,
} from "@/lib/services/sessions";
import {
  AttachmentError,
  addLessonAttachment,
  deleteLessonAttachment,
} from "@/lib/services/attachments";
import {
  notifyReportPublished,
  syncParentNotifications,
  syncTutorNotifications,
} from "@/lib/services/notifications";

function revalidateLessons(lessonId?: number) {
  revalidatePath("/home");
  revalidatePath("/schedule");
  revalidatePath("/students");
  revalidatePath("/invoices");
  revalidatePath("/notifications");
  if (lessonId) revalidatePath(`/lessons/${lessonId}`);
}

export async function completeLessonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(completeLessonSchema, formData);
  if (!parsed.success) return parsed.state;

  const data = parsed.data;
  let lessonId: number | undefined;

  try {
    const tutor = await getTutorOrThrow();
    const lesson = await completeLesson(tutor.id, {
      lessonId: Number(data.lessonId),
      attendance: data.attendance,
      focus: data.focus,
      topicLabel: data.topicLabel ?? null,
      material: data.material ?? null,
      activities: data.activities ?? null,
      notes: data.notes ?? null,
      reportText: data.reportText ?? null,
      actualDurationMinutes: data.durationMinutes,
      isBillable: data.isBillable,
    });

    lessonId = lesson.id;
    await syncTutorNotifications(tutor.id);
  } catch (error) {
    if (error instanceof LessonError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyimpan pertemuan."));
  }

  revalidateLessons(lessonId);
  return okay("Pertemuan disimpan. Laporan, progres, dan tagihan sudah diperbarui.");
}

export async function reopenLessonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(reopenLessonSchema, formData);
  if (!parsed.success) return parsed.state;

  const lessonId = Number(parsed.data.lessonId);

  try {
    const tutor = await getTutorOrThrow();
    await reopenLesson(tutor.id, lessonId);
    await syncTutorNotifications(tutor.id);
  } catch (error) {
    if (error instanceof LessonError) return fail(error.message);
    return fail(errorMessage(error, "Gagal membalikkan status pertemuan."));
  }

  revalidateLessons(lessonId);
  return okay("Pertemuan dibalikkan ke terjadwal.");
}

export async function cancelLessonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(cancelLessonSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const tutor = await getTutorOrThrow();
    await cancelLesson(tutor.id, Number(parsed.data.lessonId), parsed.data.cancelReason, parsed.data.notes ?? undefined);
    await syncTutorNotifications(tutor.id);
  } catch (error) {
    if (error instanceof LessonError) return fail(error.message);
    return fail(errorMessage(error, "Gagal membatalkan pertemuan."));
  }

  revalidateLessons();
  return okay("Pertemuan dibatalkan.");
}

export async function rescheduleLessonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(rescheduleLessonSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const tutor = await getTutorOrThrow();
    await rescheduleLesson(tutor.id, Number(parsed.data.lessonId), parsed.data.date, parsed.data.startTime);
    await syncTutorNotifications(tutor.id);
  } catch (error) {
    if (error instanceof LessonError) return fail(error.message);
    return fail(errorMessage(error, "Gagal memindahkan pertemuan."));
  }

  revalidateLessons();
  return okay("Pertemuan dipindahkan ke jadwal baru.");
}

export async function extraSessionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(extraSessionSchema, formData);
  if (!parsed.success) return parsed.state;

  const data = parsed.data;

  try {
    const tutor = await getTutorOrThrow();
    if (!data.programId) return fail("Pilih program terlebih dahulu.", { programId: "Program wajib dipilih." });

    await createExtraSession(tutor.id, {
      studentId: Number(data.studentId),
      programId: Number(data.programId),
      date: data.date,
      startTime: data.startTime,
      durationMinutes: data.durationMinutes,
      notes: data.notes ?? null,
    });
  } catch (error) {
    return fail(errorMessage(error, "Gagal menambah pertemuan."));
  }

  revalidateLessons();
  return okay("Pertemuan tambahan dibuat.");
}

export async function deleteLessonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const lessonId = Number(formData.get("lessonId"));
  if (!Number.isInteger(lessonId) || lessonId <= 0) return fail("Pertemuan tidak valid.");

  try {
    const tutor = await getTutorOrThrow();
    await deleteScheduledLesson(tutor.id, lessonId);
  } catch (error) {
    if (error instanceof LessonError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menghapus pertemuan."));
  }

  revalidateLessons();
  return okay("Pertemuan dihapus.");
}

/** Dipakai sheet orang tua saat menandai laporan sebagai dibaca. */
export async function refreshParentNotificationsAction(): Promise<void> {
  const { getSessionUserOrThrow } = await import("@/lib/auth");
  const user = await getSessionUserOrThrow();
  if (user.role === "parent") await syncParentNotifications(user.id);
}

export async function saveLessonReportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(lessonReportSchema, formData);
  if (!parsed.success) return parsed.state;

  const data = parsed.data;
  const lessonId = Number(data.lessonId);

  try {
    const tutor = await getTutorOrThrow();
    const lesson = await updateLessonReport(tutor.id, {
      lessonId,
      focus: data.focus,
      topicLabel: data.topicLabel ?? null,
      material: data.material ?? null,
      activities: data.activities ?? null,
      notes: data.notes ?? null,
      reportText: data.reportText ?? null,
      reportStatus: data.reportStatus,
      reportGeneratedBy: formData.get("reportGeneratedBy") === "ai" ? "ai" : "manual",
    });

    await syncTutorNotifications(tutor.id);
    if (lesson.reportStatus === "final" && lesson.attendance === "present") {
      await notifyReportPublished(lesson.id);
    }

    revalidateLessons(lesson.id);
    return okay(
      lesson.reportStatus === "final"
        ? "Laporan tersimpan dan sudah bisa dilihat orang tua."
        : "Draf laporan tersimpan.",
    );
  } catch (error) {
    if (error instanceof LessonError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyimpan laporan."));
  }
}

export async function uploadLessonAttachmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const lessonId = Number(formData.get("lessonId"));
  if (!Number.isInteger(lessonId) || lessonId <= 0) return fail("Pertemuan tidak valid.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Pilih berkas terlebih dahulu.", { file: "Berkas wajib dipilih." });

  try {
    const tutor = await getTutorOrThrow();
    await addLessonAttachment(tutor.id, lessonId, file);
  } catch (error) {
    if (error instanceof AttachmentError) return fail(error.message, { file: error.message });
    return fail(errorMessage(error, "Gagal mengunggah berkas."));
  }

  revalidateLessons(lessonId);
  return okay("Berkas terlampir pada pertemuan ini.");
}

export async function deleteLessonAttachmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const attachmentId = Number(formData.get("attachmentId"));
  if (!Number.isInteger(attachmentId) || attachmentId <= 0) return fail("Lampiran tidak valid.");

  try {
    const tutor = await getTutorOrThrow();
    await deleteLessonAttachment(tutor.id, attachmentId);
  } catch (error) {
    if (error instanceof AttachmentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menghapus lampiran."));
  }

  revalidatePath("/lessons", "layout");
  return okay("Lampiran dihapus.");
}
