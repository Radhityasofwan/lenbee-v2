"use server";

import { revalidatePath } from "next/cache";
import { getTutorOrThrow } from "@/lib/auth";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import {
  DocumentError,
  createDocument,
  deleteDocument,
  updateDocument,
  type DocumentCategory,
} from "@/lib/services/documents";
import { documentMetaSchema } from "@/lib/validation";

function revalidateDocuments(studentId?: number | null, documentId?: number) {
  revalidatePath("/documents");
  revalidatePath("/home");
  if (studentId) revalidatePath(`/students/${studentId}`);
  if (documentId) revalidatePath(`/documents/${documentId}`);
}

function readFile(formData: FormData): File | null {
  const value = formData.get("file");
  return value instanceof File && value.size > 0 ? value : null;
}

export async function createDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(documentMetaSchema, formData);
  if (!parsed.success) return parsed.state;

  const file = readFile(formData);
  if (!file) return fail("Pilih berkas yang ingin diunggah.", { file: "Berkas wajib dipilih." });

  const studentId = parsed.data.studentId ? Number(parsed.data.studentId) : null;

  try {
    const tutor = await getTutorOrThrow();
    await createDocument(
      tutor.id,
      {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        studentId,
        programId: parsed.data.programId ? Number(parsed.data.programId) : null,
        lessonId: parsed.data.lessonId ? Number(parsed.data.lessonId) : null,
        materialTag: parsed.data.materialTag ?? null,
        category: parsed.data.category as DocumentCategory,
      },
      file,
    );
    revalidateDocuments(studentId);
  } catch (error) {
    if (error instanceof DocumentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal mengunggah dokumen."));
  }

  return okay("Dokumen diunggah.");
}

export async function updateDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(documentMetaSchema, formData);
  if (!parsed.success) return parsed.state;

  const documentId = Number(formData.get("documentId"));
  if (!Number.isInteger(documentId) || documentId <= 0) return fail("Dokumen tidak ditemukan.");

  const studentId = parsed.data.studentId ? Number(parsed.data.studentId) : null;

  try {
    const tutor = await getTutorOrThrow();
    await updateDocument(tutor.id, documentId, {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      studentId,
      programId: parsed.data.programId ? Number(parsed.data.programId) : null,
      lessonId: parsed.data.lessonId ? Number(parsed.data.lessonId) : null,
      materialTag: parsed.data.materialTag ?? null,
      category: parsed.data.category as DocumentCategory,
    });
    revalidateDocuments(studentId, documentId);
  } catch (error) {
    if (error instanceof DocumentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal memperbarui dokumen."));
  }

  return okay("Dokumen diperbarui.");
}

export async function deleteDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const documentId = Number(formData.get("documentId"));
  if (!Number.isInteger(documentId) || documentId <= 0) return fail("Dokumen tidak ditemukan.");

  try {
    const tutor = await getTutorOrThrow();
    await deleteDocument(tutor.id, documentId);
    revalidateDocuments(null, documentId);
  } catch (error) {
    if (error instanceof DocumentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menghapus dokumen."));
  }

  return okay("Dokumen dihapus.");
}
