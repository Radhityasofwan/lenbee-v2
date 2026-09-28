import "server-only";
import { and, desc, eq, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { documents, programs, students, type DocumentRow } from "@/db/schema";
import { env } from "@/lib/env";
import { ALLOWED_MIME_TYPES, buildStorageKey, getStorage, looksLikeDeclaredType } from "@/lib/storage";
import { getOwnedStudent } from "@/lib/services/students";

export class DocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentError";
  }
}

export type DocumentCategory = "worksheet" | "exercise" | "summary" | "material" | "school" | "other";

export type DocumentInput = {
  title: string;
  description?: string | null;
  studentId?: number | null;
  programId?: number | null;
  lessonId?: number | null;
  materialTag?: string | null;
  category: DocumentCategory;
};

export type DocumentListItem = {
  document: DocumentRow;
  studentName: string | null;
  studentNickname: string | null;
  studentColor: string | null;
  programName: string | null;
};

const MAX_NAME_LENGTH = 200;

function ownedBy(tutorId: number): SQL | undefined {
  return or(eq(documents.uploadedByUserId, tutorId), eq(students.tutorId, tutorId));
}

export async function documentsForTutor(
  tutorId: number,
  filters: { studentId?: number; category?: DocumentCategory; search?: string } = {},
): Promise<DocumentListItem[]> {
  const conditions = [ownedBy(tutorId)];
  if (filters.studentId) conditions.push(eq(documents.studentId, filters.studentId));
  if (filters.category) conditions.push(eq(documents.category, filters.category));

  const rows = await db
    .select({
      document: documents,
      studentName: students.name,
      studentNickname: students.nickname,
      studentColor: students.color,
      programName: programs.name,
    })
    .from(documents)
    .leftJoin(students, eq(students.id, documents.studentId))
    .leftJoin(programs, eq(programs.id, documents.programId))
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt))
    .limit(200);

  const search = filters.search?.trim().toLowerCase();
  if (!search) return rows;

  return rows.filter((row) =>
    [row.document.title, row.document.materialTag, row.document.originalName, row.document.description]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(search)),
  );
}

export async function getOwnedDocument(tutorId: number, documentId: number): Promise<DocumentRow> {
  const rows = await db
    .select({ document: documents })
    .from(documents)
    .leftJoin(students, eq(students.id, documents.studentId))
    .where(and(eq(documents.id, documentId), ownedBy(tutorId)))
    .limit(1);

  const document = rows[0]?.document;
  if (!document) throw new DocumentError("Dokumen tidak ditemukan.");
  return document;
}

/** Dokumen yang tampil di halaman orang tua: milik murid yang tersambung. */
export async function documentsForStudents(studentIds: number[]): Promise<DocumentListItem[]> {
  if (studentIds.length === 0) return [];
  const rows = await db
    .select({
      document: documents,
      studentName: students.name,
      studentNickname: students.nickname,
      studentColor: students.color,
      programName: programs.name,
    })
    .from(documents)
    .innerJoin(students, eq(students.id, documents.studentId))
    .leftJoin(programs, eq(programs.id, documents.programId))
    .where(inArray(documents.studentId, studentIds))
    .orderBy(desc(documents.createdAt))
    .limit(200);
  return rows;
}

async function readUpload(file: File): Promise<{ buffer: Buffer; mimeType: string; originalName: string }> {
  if (file.size <= 0) throw new DocumentError("Berkas kosong tidak bisa diunggah.");
  if (file.size > env.uploads.maxFileSizeBytes) {
    throw new DocumentError(`Ukuran berkas maksimal ${Math.round(env.uploads.maxFileSizeBytes / (1024 * 1024))} MB.`);
  }

  const mimeType = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new DocumentError("Tipe berkas ini tidak diizinkan.");

  const originalName = file.name.replace(/[\\/]/g, "").trim().slice(0, MAX_NAME_LENGTH) || "berkas";
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikeDeclaredType(buffer, mimeType)) {
    throw new DocumentError("Isi berkas tidak cocok dengan tipe yang dinyatakan.");
  }

  return { buffer, mimeType, originalName };
}

async function assertRelationsOwned(tutorId: number, input: DocumentInput): Promise<void> {
  if (input.studentId) await getOwnedStudent(tutorId, input.studentId);
  if (input.programId) {
    const rows = await db
      .select({ id: programs.id })
      .from(programs)
      .innerJoin(students, eq(students.id, programs.studentId))
      .where(and(eq(programs.id, input.programId), eq(students.tutorId, tutorId)))
      .limit(1);
    if (rows.length === 0) throw new DocumentError("Program tidak ditemukan.");
  }
}

export async function createDocument(
  tutorId: number,
  input: DocumentInput,
  file: File,
): Promise<DocumentRow> {
  await assertRelationsOwned(tutorId, input);
  const { buffer, mimeType, originalName } = await readUpload(file);

  const key = buildStorageKey(`documents/${tutorId}`, originalName, mimeType);
  await getStorage().put(key, buffer);

  try {
    const ids = await db
      .insert(documents)
      .values({
        title: input.title,
        description: input.description ?? null,
        studentId: input.studentId ?? null,
        programId: input.programId ?? null,
        lessonId: input.lessonId ?? null,
        materialTag: input.materialTag ?? null,
        category: input.category,
        storageKey: key,
        originalName,
        mimeType,
        size: buffer.length,
        uploadedByUserId: tutorId,
      })
      .$returningId();

    const created = ids[0];
    if (!created) throw new DocumentError("Gagal menyimpan dokumen.");
    return getOwnedDocument(tutorId, created.id);
  } catch (error) {
    await getStorage().delete(key).catch(() => {});
    throw error;
  }
}

export async function updateDocument(
  tutorId: number,
  documentId: number,
  input: DocumentInput,
): Promise<void> {
  await assertRelationsOwned(tutorId, input);
  await getOwnedDocument(tutorId, documentId);

  await db
    .update(documents)
    .set({
      title: input.title,
      description: input.description ?? null,
      studentId: input.studentId ?? null,
      programId: input.programId ?? null,
      lessonId: input.lessonId ?? null,
      materialTag: input.materialTag ?? null,
      category: input.category,
    })
    .where(eq(documents.id, documentId));
}

export async function deleteDocument(tutorId: number, documentId: number): Promise<void> {
  const document = await getOwnedDocument(tutorId, documentId);
  await db.delete(documents).where(eq(documents.id, documentId));
  await getStorage().delete(document.storageKey).catch(() => {});
}

export const AI_ATTACHABLE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "application/pdf",
]);
const MAX_AI_ATTACHMENT_BYTES = 8 * 1024 * 1024;

/** Dokumen sebagai lampiran visual untuk AI (foto soal/buku, PDF) — bukan untuk file office. */
export async function documentAsAiAttachment(
  tutorId: number,
  documentId: number,
): Promise<{ mimeType: string; base64: string }> {
  const document = await getOwnedDocument(tutorId, documentId);
  if (!AI_ATTACHABLE_MIME_TYPES.has(document.mimeType)) {
    throw new DocumentError("Dokumen ini tidak bisa dipakai sebagai lampiran AI (hanya foto atau PDF).");
  }
  if (document.size > MAX_AI_ATTACHMENT_BYTES) {
    throw new DocumentError("Ukuran dokumen terlalu besar untuk dikirim ke AI (maksimal 8MB).");
  }
  const buffer = await getStorage().get(document.storageKey);
  return { mimeType: document.mimeType, base64: buffer.toString("base64") };
}
