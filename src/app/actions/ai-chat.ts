"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateParentUpdate, runChatTurn } from "@/lib/ai";
import { getTutorOrThrow } from "@/lib/auth";
import { startOfMonth, todayKey } from "@/lib/datetime";
import {
  isAnswerKeyRequest,
  isPracticeRequest,
  isProgressRequest,
  isReportRequest,
  renderAnswerKey,
  renderProgressSummary,
  isWordExportRequest,
} from "@/lib/domain/chat";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import {
  ChatError,
  appendMessage,
  appendTutorStyleNote,
  createChatSession,
  deleteChatSession,
  getOwnedChatSession,
  messagesForSession,
  publishSessionAsAssignment,
  publishSessionAsReport,
  titleSessionFromFirstMessage,
  tutorStyleNotes,
  updateSessionState,
} from "@/lib/services/ai-chat";
import { weakMaterialsForStudent } from "@/lib/services/assignments";
import { documentAsAiAttachment } from "@/lib/services/documents";
import { parentUpdateSource } from "@/lib/services/reports";
import { chatMessageSchema, chatPublishSchema, chatSessionCreateSchema, chatSessionIdSchema } from "@/lib/validation";

function revalidateChat(sessionId?: number) {
  revalidatePath("/asisten");
  if (sessionId) revalidatePath(`/asisten/${sessionId}`);
}

export async function createChatSessionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(chatSessionCreateSchema, formData);
  if (!parsed.success) return parsed.state;

  let createdId: number;
  try {
    const tutor = await getTutorOrThrow();
    const session = await createChatSession(tutor.id, Number(parsed.data.studentId));
    createdId = session.id;
    revalidateChat();
  } catch (error) {
    if (error instanceof ChatError) return fail(error.message);
    return fail(errorMessage(error, "Gagal membuat percakapan."));
  }

  redirect(`/asisten/${createdId}`);
}

export async function deleteChatSessionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(chatSessionIdSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const tutor = await getTutorOrThrow();
    await deleteChatSession(tutor.id, Number(parsed.data.sessionId));
    revalidateChat();
  } catch (error) {
    if (error instanceof ChatError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menghapus percakapan."));
  }

  return okay("Percakapan dihapus.");
}

export async function sendChatMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(chatMessageSchema, formData);
  if (!parsed.success) return parsed.state;

  const sessionId = Number(parsed.data.sessionId);
  const message = parsed.data.message;

  try {
    const tutor = await getTutorOrThrow();
    const session = await getOwnedChatSession(tutor.id, sessionId);

    // Riwayat SEBELUM pesan baru ini disisipkan, supaya tidak dobel saat dikirim ke AI.
    const priorHistory = await messagesForSession(tutor.id, sessionId);

    await titleSessionFromFirstMessage(sessionId, message);
    await appendMessage(sessionId, "user", message, parsed.data.documentIds.length > 0 ? parsed.data.documentIds : undefined);

    // Permintaan mekanis (kunci jawaban, ekspor Word) diselesaikan dari draf tersimpan — tidak perlu AI.
    if (isAnswerKeyRequest(message)) {
      await appendMessage(sessionId, "assistant", renderAnswerKey(session.state.questions));
      revalidateChat(sessionId);
      return okay("Terkirim.");
    }
    if (isWordExportRequest(message)) {
      const reply =
        session.state.questions.length > 0
          ? `File Word siap. Unduh di sini: /api/ai/chat/${sessionId}/export-word`
          : 'Belum ada soal untuk dijadikan file Word. Buat soal dulu, misalnya: "Buatkan 10 soal pecahan kelas 3."';
      await appendMessage(sessionId, "assistant", reply);
      revalidateChat(sessionId);
      return okay("Terkirim.");
    }

    // Pertanyaan progres murni baca data tersimpan — tidak perlu AI, tidak bisa mengarang.
    if (isProgressRequest(message)) {
      const reply = !session.studentId
        ? "Percakapan ini belum terhubung ke murid tertentu."
        : await (async () => {
            const periodEnd = todayKey();
            const periodStart = startOfMonth(periodEnd);
            const [weak, source] = await Promise.all([
              weakMaterialsForStudent(tutor.id, session.studentId!, 5),
              parentUpdateSource(tutor.id, session.studentId!, periodStart, periodEnd),
            ]);
            return renderProgressSummary({
              periodLabel: source.periodLabel,
              topics: source.topics,
              weakMaterials: weak,
              assignmentResults: source.assignmentResults,
            });
          })();
      await appendMessage(sessionId, "assistant", reply);
      revalidateChat(sessionId);
      return okay("Terkirim.");
    }

    // "Buat laporan/rangkuman perkembangan" — beda konten total dari draf soal, jadi jalurnya terpisah.
    if (isReportRequest(message)) {
      if (!session.studentId) {
        await appendMessage(sessionId, "assistant", "Percakapan ini belum terhubung ke murid tertentu.");
        revalidateChat(sessionId);
        return okay("Terkirim.");
      }
      const periodEnd = todayKey();
      const periodStart = startOfMonth(periodEnd);
      const source = await parentUpdateSource(tutor.id, session.studentId, periodStart, periodEnd);
      const result = await generateParentUpdate(tutor.id, source);
      await updateSessionState(sessionId, {
        ...session.state,
        reportDraft: { periodStart, periodEnd, periodLabel: source.periodLabel, body: result.text },
      });
      const reply = `${result.text}\n\n(Draf laporan periode ${source.periodLabel} — simpan lewat tombol di atas kalau sudah pas.)`;
      await appendMessage(sessionId, "assistant", reply);
      revalidateChat(sessionId);
      return okay(result.usedAi ? "Terkirim." : "AI belum tersedia, coba lagi nanti.");
    }

    // "Buat latihan tambahan" memakai jalur pembuatan soal biasa, hanya pesannya diperkaya
    // dengan materi yang masih sering salah supaya AI tahu harus fokus ke mana.
    let aiUserMessage = message;
    if (isPracticeRequest(message) && session.studentId) {
      const weak = await weakMaterialsForStudent(tutor.id, session.studentId, 3);
      if (weak.length === 0) {
        await appendMessage(
          sessionId,
          "assistant",
          "Belum ada jawaban salah yang tercatat, jadi belum bisa dibuatkan latihan tambahan yang terarah. Coba minta soal biasa dulu, misalnya \"Buatkan 10 soal pecahan kelas 3.\"",
        );
        revalidateChat(sessionId);
        return okay("Terkirim.");
      }
      aiUserMessage = `Buatkan 10 soal latihan tambahan (campuran pilihan ganda dan isian singkat) yang fokus ke materi yang masih sering salah: ${weak
        .map((w) => `${w.material} (salah ${w.wrongCount} dari ${w.answeredCount} soal)`)
        .join("; ")}.`;
    }

    // Lampiran baru menggantikan yang lama; kalau tidak melampirkan apa pun di pesan ini,
    // lampiran aktif sebelumnya dipakai ulang otomatis (mis. lanjutan "cek materi", "revisi").
    const activeDocumentIds = parsed.data.documentIds.length > 0 ? parsed.data.documentIds : session.state.activeDocumentIds;
    const images: { mimeType: string; base64: string }[] = [];
    for (const documentId of activeDocumentIds.slice(0, 3)) {
      try {
        images.push(await documentAsAiAttachment(tutor.id, documentId));
      } catch {
        // dokumen mungkin sudah dihapus — lewati saja, jangan gagalkan seluruh giliran
      }
    }

    const styleNotes = await tutorStyleNotes(tutor.id);
    const result = await runChatTurn(tutor.id, {
      history: priorHistory.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      userMessage: aiUserMessage,
      state: { ...session.state, activeDocumentIds },
      styleNotes,
      images: images.length > 0 ? images : undefined,
    });

    await updateSessionState(sessionId, result.state);

    let reply = result.reply;
    if (result.styleNote) {
      await appendTutorStyleNote(tutor.id, result.styleNote);
      reply += `\n\n(Dicatat sebagai gaya default untuk percakapan berikutnya: "${result.styleNote}")`;
    }
    await appendMessage(sessionId, "assistant", reply);

    revalidateChat(sessionId);
    return okay(result.usedAi ? "Terkirim." : "AI belum tersedia, coba lagi nanti.");
  } catch (error) {
    if (error instanceof ChatError) return fail(error.message);
    return fail(errorMessage(error, "Gagal mengirim pesan."));
  }
}

export async function publishChatAsAssignmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(chatPublishSchema, formData);
  if (!parsed.success) return parsed.state;

  let assignmentId: number;
  try {
    const tutor = await getTutorOrThrow();
    const created = await publishSessionAsAssignment(tutor.id, Number(parsed.data.sessionId), Number(parsed.data.studentId));
    assignmentId = created.id;
  } catch (error) {
    if (error instanceof ChatError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menerbitkan sebagai tugas."));
  }

  redirect(`/assignments/${assignmentId}`);
}

export async function publishChatReportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(chatPublishSchema, formData);
  if (!parsed.success) return parsed.state;

  let reportId: number;
  try {
    const tutor = await getTutorOrThrow();
    const created = await publishSessionAsReport(tutor.id, Number(parsed.data.sessionId), Number(parsed.data.studentId));
    reportId = created.id;
  } catch (error) {
    if (error instanceof ChatError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyimpan laporan."));
  }

  redirect(`/reports/${reportId}`);
}
