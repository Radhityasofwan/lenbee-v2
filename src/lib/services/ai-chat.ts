import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  aiChatMessages,
  aiChatSessions,
  students,
  users,
  type AiChatMessage,
  type AiChatSession,
  type Assignment,
  type ChatDraftState,
  type ParentUpdate,
} from "@/db/schema";
import { createAssignment, getOwnedAssignment, replaceQuestions } from "@/lib/services/assignments";
import { createParentUpdate, getOwnedParentUpdate } from "@/lib/services/reports";

export class ChatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatError";
  }
}

const EMPTY_STATE: ChatDraftState = { questions: [], activeDocumentIds: [] };
const MAX_STYLE_NOTES_CHARS = 2000;

async function assertOwnedSession(tutorId: number, sessionId: number): Promise<AiChatSession> {
  const rows = await db
    .select()
    .from(aiChatSessions)
    .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.tutorId, tutorId)))
    .limit(1);
  const session = rows[0];
  if (!session) throw new ChatError("Percakapan tidak ditemukan.");
  return session;
}

export async function getOwnedChatSession(tutorId: number, sessionId: number): Promise<AiChatSession> {
  return assertOwnedSession(tutorId, sessionId);
}

export async function listChatSessions(tutorId: number): Promise<AiChatSession[]> {
  return db
    .select()
    .from(aiChatSessions)
    .where(eq(aiChatSessions.tutorId, tutorId))
    .orderBy(desc(aiChatSessions.updatedAt))
    .limit(100);
}

export async function createChatSession(tutorId: number, studentId: number): Promise<AiChatSession> {
  const rows = await db
    .select({ grade: students.grade })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.tutorId, tutorId)))
    .limit(1);
  if (!rows[0]) throw new ChatError("Murid tidak ditemukan.");

  const ids = await db
    .insert(aiChatSessions)
    .values({
      tutorId,
      studentId,
      title: "Percakapan baru",
      state: { ...EMPTY_STATE, grade: rows[0].grade ?? undefined },
    })
    .$returningId();
  const created = ids[0];
  if (!created) throw new ChatError("Gagal membuat percakapan.");
  return assertOwnedSession(tutorId, created.id);
}

export async function deleteChatSession(tutorId: number, sessionId: number): Promise<void> {
  await assertOwnedSession(tutorId, sessionId);
  await db.delete(aiChatSessions).where(eq(aiChatSessions.id, sessionId));
}

export async function messagesForSession(tutorId: number, sessionId: number): Promise<AiChatMessage[]> {
  await assertOwnedSession(tutorId, sessionId);
  return db
    .select()
    .from(aiChatMessages)
    .where(eq(aiChatMessages.sessionId, sessionId))
    .orderBy(asc(aiChatMessages.createdAt));
}

export async function appendMessage(
  sessionId: number,
  role: "user" | "assistant",
  content: string,
  attachmentDocumentIds?: number[],
): Promise<void> {
  await db.insert(aiChatMessages).values({
    sessionId,
    role,
    content,
    attachmentDocumentIds: attachmentDocumentIds?.length ? attachmentDocumentIds : null,
  });
}

/** Judul otomatis dari pesan pertama tutor — hanya dipasang selagi masih judul bawaan. */
export async function titleSessionFromFirstMessage(sessionId: number, message: string): Promise<void> {
  const title = message.trim().slice(0, 80) || "Percakapan baru";
  await db
    .update(aiChatSessions)
    .set({ title })
    .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.title, "Percakapan baru")));
}

export async function updateSessionState(sessionId: number, state: ChatDraftState): Promise<void> {
  await db.update(aiChatSessions).set({ state }).where(eq(aiChatSessions.id, sessionId));
}

export async function tutorStyleNotes(tutorId: number): Promise<string | null> {
  const rows = await db.select({ aiStyleNotes: users.aiStyleNotes }).from(users).where(eq(users.id, tutorId)).limit(1);
  return rows[0]?.aiStyleNotes ?? null;
}

/** Ditambahkan (bukan ditimpa) supaya preferensi lama tidak hilang; dipotong dari yang terlama bila kepanjangan. */
export async function appendTutorStyleNote(tutorId: number, note: string): Promise<void> {
  const existing = await tutorStyleNotes(tutorId);
  const combined = existing ? `${existing}\n- ${note}` : `- ${note}`;
  const trimmed = combined.length > MAX_STYLE_NOTES_CHARS ? combined.slice(combined.length - MAX_STYLE_NOTES_CHARS) : combined;
  await db.update(users).set({ aiStyleNotes: trimmed }).where(eq(users.id, tutorId));
}

export async function clearTutorStyleNotes(tutorId: number): Promise<void> {
  await db.update(users).set({ aiStyleNotes: null }).where(eq(users.id, tutorId));
}

/** Menerbitkan draf soal percakapan jadi Tugas sungguhan — tutor tetap meninjau sebelum diterbitkan (draft). */
export async function publishSessionAsAssignment(
  tutorId: number,
  sessionId: number,
  studentId: number,
): Promise<Assignment> {
  const session = await assertOwnedSession(tutorId, sessionId);
  if (session.state.questions.length === 0) {
    throw new ChatError("Belum ada soal di percakapan ini.");
  }

  const created = await createAssignment(tutorId, {
    studentId,
    title: session.state.subject ? `${session.state.subject}${session.state.material ? ` · ${session.state.material}` : ""}` : session.title,
    material: session.state.material ?? null,
    instructions: "Dibuat dari percakapan dengan Asisten AI.",
    difficulty: "medium",
    status: "draft",
  });

  await replaceQuestions(
    tutorId,
    created.id,
    session.state.questions.map((q) => ({
      type: q.type,
      prompt: q.prompt,
      options: q.type === "multiple_choice" ? q.options : undefined,
      correctAnswer: q.correctAnswer ?? null,
      points: q.points,
      explanation: q.explanation ?? null,
    })),
    true,
  );

  return getOwnedAssignment(tutorId, created.id);
}

/** Menyimpan draf laporan percakapan jadi laporan orang tua sungguhan (status draft, tutor tetap meninjau). */
export async function publishSessionAsReport(
  tutorId: number,
  sessionId: number,
  studentId: number,
): Promise<ParentUpdate> {
  const session = await assertOwnedSession(tutorId, sessionId);
  const draft = session.state.reportDraft;
  if (!draft) {
    throw new ChatError("Belum ada draf laporan di percakapan ini.");
  }

  const created = await createParentUpdate(
    tutorId,
    {
      studentId,
      title: `Rangkuman perkembangan · ${draft.periodLabel}`,
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
      body: draft.body,
      kind: "monthly",
      format: "narrative",
      checkItems: [],
      status: "draft",
    },
    true,
  );

  return getOwnedParentUpdate(tutorId, created.id);
}
