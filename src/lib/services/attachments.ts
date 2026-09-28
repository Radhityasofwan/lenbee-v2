import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessonAttachments, lessonSessions, parentStudents, type LessonAttachment } from "@/db/schema";
import { env } from "@/lib/env";
import { ALLOWED_MIME_TYPES, assertSafeKey, buildStorageKey, getStorage, looksLikeDeclaredType } from "@/lib/storage";
import { getOwnedLesson } from "@/lib/services/sessions";

export class AttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentError";
  }
}

const MAX_NAME_LENGTH = 200;

export function attachmentsForLesson(lessonId: number): Promise<LessonAttachment[]> {
  return db
    .select()
    .from(lessonAttachments)
    .where(eq(lessonAttachments.lessonId, lessonId))
    .orderBy(asc(lessonAttachments.createdAt), asc(lessonAttachments.id));
}

/** Validasi tipe/ukuran/magic-byte lalu simpan berkas dan catatannya. */
export async function addLessonAttachment(
  tutorId: number,
  lessonId: number,
  file: File,
): Promise<LessonAttachment> {
  const lesson = await getOwnedLesson(tutorId, lessonId);
  if (lesson.status === "cancelled") throw new AttachmentError("Pertemuan yang dibatalkan tidak bisa diberi lampiran.");

  if (file.size <= 0) throw new AttachmentError("Berkas kosong tidak bisa diunggah.");
  if (file.size > env.uploads.maxFileSizeBytes) {
    throw new AttachmentError(`Ukuran berkas maksimal ${Math.round(env.uploads.maxFileSizeBytes / (1024 * 1024))} MB.`);
  }

  const mimeType = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new AttachmentError("Tipe berkas ini tidak diizinkan.");

  const originalName = file.name.replace(/[\\/]/g, "").trim().slice(0, MAX_NAME_LENGTH) || "berkas";

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikeDeclaredType(buffer, mimeType)) {
    throw new AttachmentError("Isi berkas tidak cocok dengan tipe yang dinyatakan.");
  }

  const key = buildStorageKey(`lessons/${lesson.id}`, originalName, mimeType);
  await getStorage().put(key, buffer);

  const [created] = await db
    .insert(lessonAttachments)
    .values({
      lessonId: lesson.id,
      storageKey: key,
      originalName,
      mimeType,
      size: buffer.length,
      kind: mimeType.startsWith("image/") ? "image" : "document",
    })
    .$returningId();

  const rows = await db.select().from(lessonAttachments).where(eq(lessonAttachments.id, created.id)).limit(1);
  return rows[0];
}

export async function deleteLessonAttachment(tutorId: number, attachmentId: number): Promise<void> {
  const [row] = await db
    .select()
    .from(lessonAttachments)
    .where(eq(lessonAttachments.id, attachmentId))
    .limit(1);
  if (!row) throw new AttachmentError("Lampiran tidak ditemukan.");
  await getOwnedLesson(tutorId, row.lessonId);

  await db.delete(lessonAttachments).where(eq(lessonAttachments.id, attachmentId));
  await getStorage().delete(row.storageKey);
}

export async function attachmentByKey(storageKey: string): Promise<LessonAttachment | null> {
  const safe = assertSafeKey(storageKey);
  const rows = await db.select().from(lessonAttachments).where(eq(lessonAttachments.storageKey, safe)).limit(1);
  return rows[0] ?? null;
}

/** Tutor pemilik pertemuan atau orang tua yang tersambung ke muridnya. */
export async function canReadAttachment(userId: number, attachment: LessonAttachment): Promise<boolean> {
  const rows = await db
    .select({ tutorId: lessonSessions.tutorId, studentId: lessonSessions.studentId })
    .from(lessonSessions)
    .where(eq(lessonSessions.id, attachment.lessonId))
    .limit(1);
  const lesson = rows[0];
  if (!lesson) return false;
  if (lesson.tutorId === userId) return true;

  const links = await db
    .select({ studentId: parentStudents.studentId })
    .from(parentStudents)
    .where(and(eq(parentStudents.parentUserId, userId), eq(parentStudents.studentId, lesson.studentId)))
    .limit(1);
  return links.length > 0;
}
