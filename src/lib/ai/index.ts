import { db } from "@/db";
import { aiGenerations, type ChatDraftState } from "@/db/schema";
import type { ProviderImage } from "@/lib/ai/providers";
import { runWithStoredKeys, type AiRunResult } from "@/lib/services/ai-keys";
import { AiUnavailableError, extractJson, getAiProvider } from "./provider";

export const DEFAULT_REPORT_STYLE = `Gaya report yang diinginkan tutor:
- Ditulis dalam Bahasa Indonesia, bentuk paragraf mengalir (bukan bullet), sepanjang 2–3 paragraf pendek.
- Nada hangat, sopan, dan personal, seperti pesan tutor kepada orang tua. Sapa dengan "Bapak/Ibu" tanpa menyebut nama orang tua secara spesifik.
- Paragraf 1: kegiatan belajar hari itu — materi dan aktivitas yang dilakukan anak, ditulis natural.
- Paragraf 2: catatan penting dari sesi dan hal yang masih perlu dilatih, disampaikan dengan cara yang membangun dan tidak menghakimi.
- Paragraf 3 (opsional, maksimal dua kalimat): rencana atau saran latihan berikutnya di rumah.
- Gunakan nama panggilan anak secara natural, jangan berulang-ulang.
- Hindari bahasa kaku/laporan formal, hindari bullet, hindari emoji, hindari istilah teknis berlebihan.
- Jangan mengarang fakta yang tidak ada di poin-poin yang diberikan.`;

export type LessonReportInput = {
  studentName: string;
  programName: string;
  dateLabel: string;
  timeLabel: string;
  focusLabel?: string | null;
  topicLabel?: string | null;
  material?: string | null;
  activities?: string | null;
  notes?: string | null;
  styleOverride?: string | null;
  extraInstructions?: string | null;
};

export type ParentUpdateInput = {
  studentName: string;
  periodLabel: string;
  programNames: string[];
  sessionCount: number;
  attendedCount: number;
  topics: string[];
  assignmentResults: { title: string; score: number; maxScore: number }[];
  latestNotes: string[];
  styleOverride?: string | null;
};

export type GeneratedQuestion = {
  type: "multiple_choice" | "short_answer" | "essay";
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  explanation?: string;
};

type LogArgs = {
  userId: number;
  kind: string;
  promptChars: number;
  outputChars: number;
  ok: boolean;
  errorMessage?: string;
  provider: string;
  model: string | null;
};

async function logGeneration(args: LogArgs): Promise<void> {
  try {
    await db.insert(aiGenerations).values({
      userId: args.userId,
      kind: args.kind,
      provider: args.provider,
      model: args.model,
      ok: args.ok,
      errorMessage: args.errorMessage?.slice(0, 2000) ?? null,
      promptChars: args.promptChars,
      outputChars: args.outputChars,
    });
  } catch {
    // logging tidak boleh menggagalkan alur utama
  }
}

async function runCompletion(params: {
  userId: number;
  kind: string;
  system: string;
  prompt: string;
  images?: ProviderImage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const stored = await runStoredCompletion(params);
  if (stored !== null) return stored;

  const provider = getAiProvider();
  if (!provider) throw new AiUnavailableError();
  try {
    const output = await provider.complete({
      system: params.system,
      prompt: params.prompt,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
    });
    if (!output) throw new AiUnavailableError("AI mengembalikan respons kosong");
    await logGeneration({
      userId: params.userId,
      kind: params.kind,
      provider: provider.name,
      model: provider.model,
      ok: true,
      promptChars: params.prompt.length,
      outputChars: output.length,
    });
    return output;
  } catch (error) {
    await logGeneration({
      userId: params.userId,
      kind: params.kind,
      provider: provider.name,
      model: provider.model,
      ok: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      promptChars: params.prompt.length,
      outputChars: 0,
    });
    throw error;
  }
}

/**
 * Tries the key pool stored in the database first. Returns null whenever the
 * pool can't produce an answer — no key configured, every key exhausted, or an
 * empty response — so the caller always falls through to the environment-based
 * provider instead of failing the whole request on a pool-only outage.
 */
async function runStoredCompletion(params: {
  userId: number;
  kind: string;
  system: string;
  prompt: string;
  images?: ProviderImage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string | null> {
  let result: AiRunResult | null;
  try {
    result = await runWithStoredKeys({
      system: params.system,
      prompt: params.prompt,
      images: params.images,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
    });
  } catch (error) {
    await logGeneration({
      userId: params.userId,
      kind: params.kind,
      provider: "key-pool",
      model: null,
      ok: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      promptChars: params.prompt.length,
      outputChars: 0,
    });
    return null;
  }

  if (!result) return null;
  if (!result.text.trim()) {
    await logGeneration({
      userId: params.userId,
      kind: params.kind,
      provider: result.provider,
      model: result.model,
      ok: false,
      errorMessage: "AI mengembalikan respons kosong",
      promptChars: params.prompt.length,
      outputChars: 0,
    });
    return null;
  }

  await logGeneration({
    userId: params.userId,
    kind: params.kind,
    provider: result.provider,
    model: result.model,
    ok: true,
    promptChars: params.prompt.length,
    outputChars: result.text.length,
  });
  return result.text;
}

const EMPTY = "-";

function bullet(label: string, value?: string | null): string {
  const clean = (value ?? "").trim();
  return `${label}: ${clean.length > 0 ? clean : EMPTY}`;
}

export async function generateLessonReport(
  userId: number,
  input: LessonReportInput,
): Promise<{ text: string; usedAi: boolean }> {
  const style = (input.styleOverride ?? "").trim() || DEFAULT_REPORT_STYLE;
  const prompt = [
    `Buat report perkembangan untuk orang tua dari satu sesi les berikut.`,
    ``,
    `Anak: ${input.studentName}`,
    `Program: ${input.programName}`,
    `Waktu: ${input.dateLabel}, ${input.timeLabel}`,
    input.focusLabel ? `Fokus pertemuan: ${input.focusLabel}` : null,
    input.topicLabel ? `Mata pelajaran/topik: ${input.topicLabel}` : null,
    ``,
    `Poin-poin dari tutor:`,
    bullet("Materi", input.material),
    bullet("Kegiatan", input.activities),
    bullet("Catatan", input.notes),
    ``,
    style,
    input.extraInstructions ? `\nInstruksi tambahan: ${input.extraInstructions}` : null,
    ``,
    `Tulis hanya isi report-nya saja, tanpa judul, tanpa salam pembuka panjang, tanpa bullet.`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  try {
    const text = await runCompletion({
      userId,
      kind: "lesson_report",
      system:
        "Kamu adalah asisten yang membantu tutor les privat menulis report perkembangan siswa untuk orang tua. Kamu menulis dengan hangat, jelas, dan tidak berlebihan.",
      prompt,
      temperature: 0.6,
    });
    return { text, usedAi: true };
  } catch {
    return { text: fallbackLessonReport(input), usedAi: false };
  }
}

export function fallbackLessonReport(input: LessonReportInput): string {
  const parts: string[] = [];
  const material = (input.material ?? "").trim();
  const activities = (input.activities ?? "").trim();
  const notes = (input.notes ?? "").trim();

  const opening = `Pada sesi ${input.programName} ${input.dateLabel} (${input.timeLabel}), ${
    input.studentName
  } belajar${input.topicLabel ? ` ${input.topicLabel}` : ""}${
    input.focusLabel ? ` dengan fokus ${input.focusLabel.toLowerCase()}` : ""
  }.`;

  parts.push(
    [opening, material ? `Materi yang dibahas: ${material}.` : "", activities ? `Kegiatan: ${activities}.` : ""]
      .filter(Boolean)
      .join(" "),
  );

  if (notes) parts.push(`${sentenceCase(notes)}`);

  if (parts.length === 1 && !material && !activities && !notes) {
    parts.push("Catatan detail sesi belum diisi.");
  }

  return parts.join("\n\n");
}

function sentenceCase(text: string): string {
  const trimmed = text.trim();
  const withPeriod = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  return withPeriod.charAt(0).toUpperCase() + withPeriod.slice(1);
}

export async function generateParentUpdate(
  userId: number,
  input: ParentUpdateInput,
): Promise<{ text: string; usedAi: boolean }> {
  const style = (input.styleOverride ?? "").trim() || DEFAULT_REPORT_STYLE;
  const prompt = [
    `Buat rangkuman perkembangan bulanan untuk orang tua.`,
    ``,
    `Anak: ${input.studentName}`,
    `Periode: ${input.periodLabel}`,
    `Program: ${input.programNames.join(", ") || EMPTY}`,
    `Jumlah pertemuan tercatat: ${input.sessionCount} (hadir ${input.attendedCount})`,
    ``,
    `Materi yang sudah dipelajari: ${input.topics.length ? input.topics.join("; ") : EMPTY}`,
    `Hasil latihan: ${
      input.assignmentResults.length
        ? input.assignmentResults.map((r) => `${r.title} ${r.score}/${r.maxScore}`).join("; ")
        : EMPTY
    }`,
    `Catatan sesi terakhir: ${input.latestNotes.length ? input.latestNotes.join(" | ") : EMPTY}`,
    ``,
    `Struktur yang diinginkan (pakai heading markdown sederhana):`,
    `- **Materi yang sudah dipelajari** — paragraf singkat`,
    `- **Perkembangan** — paragraf singkat`,
    `- **Hasil latihan** — paragraf singkat (lewati bila tidak ada data)`,
    `- **Rencana pembelajaran berikutnya** — paragraf singkat`,
    ``,
    style,
    ``,
    `Tulis hanya isi rangkumannya, tanpa salam pembuka.`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  try {
    const text = await runCompletion({
      userId,
      kind: "parent_update",
      system:
        "Kamu membantu tutor les privat menyusun rangkuman perkembangan siswa untuk orang tua. Bahasa Indonesia, hangat, jelas, tidak berlebihan.",
      prompt,
      temperature: 0.6,
      maxTokens: 2500,
    });
    return { text, usedAi: true };
  } catch {
    return { text: fallbackParentUpdate(input), usedAi: false };
  }
}

export function fallbackParentUpdate(input: ParentUpdateInput): string {
  const lines: string[] = [];
  lines.push(`**Materi yang sudah dipelajari**`);
  lines.push(
    input.topics.length
      ? `Selama ${input.periodLabel}, ${input.studentName} mempelajari ${input.topics.join(", ")}.`
      : `Belum ada materi tercatat pada ${input.periodLabel}.`,
  );
  lines.push("");
  lines.push(`**Perkembangan**`);
  lines.push(
    `Tercatat ${input.sessionCount} pertemuan dengan kehadiran ${input.attendedCount} pertemuan. ${
      input.latestNotes[0] ? sentenceCase(input.latestNotes[0]) : ""
    }`.trim(),
  );
  lines.push("");
  if (input.assignmentResults.length > 0) {
    lines.push("");
    lines.push(`**Hasil latihan**`);
    lines.push(
      input.assignmentResults.map((r) => `${r.title}: ${r.score}/${r.maxScore}`).join("; ") + ".",
    );
  }
  lines.push("");
  lines.push(`**Rencana pembelajaran berikutnya**`);
  lines.push("Melanjutkan materi berikutnya sesuai program belajar.");
  return lines.join("\n");
}

export type QuestionGenInput = {
  studentName: string;
  level: string;
  programName: string;
  material: string;
  count: number;
  types: ("multiple_choice" | "short_answer" | "essay")[];
  difficulty: "easy" | "medium" | "hard";
  extraInstructions?: string | null;
  /** Foto soal/buku atau PDF yang dilampirkan sebagai konteks tambahan. */
  images?: ProviderImage[];
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "mudah",
  medium: "sedang",
  hard: "sulit",
};

export async function generateQuestions(
  userId: number,
  input: QuestionGenInput,
): Promise<{ questions: GeneratedQuestion[]; usedAi: boolean }> {
  const prompt = [
    `Buat ${input.count} soal latihan untuk siswa les privat.`,
    ``,
    `Siswa: ${input.studentName}${input.level ? ` (${input.level})` : ""}`,
    `Program/mata pelajaran: ${input.programName}`,
    `Materi: ${input.material}`,
    `Tingkat kesulitan: ${DIFFICULTY_LABEL[input.difficulty] ?? input.difficulty}`,
    `Jenis soal yang diizinkan: ${input.types.join(", ")}`,
    input.extraInstructions ? `Instruksi tambahan: ${input.extraInstructions}` : null,
    input.images?.length ? `Ada ${input.images.length} lampiran (foto/dokumen) yang berisi materi atau contoh soal — jadikan itu sumber utama, bukan materi umum.` : null,
    ``,
    `Balas HANYA dengan JSON array valid, tanpa penjelasan, dengan bentuk:`,
    `[{"type":"multiple_choice","prompt":"...","options":["A","B","C","D"],"correctAnswer":"A","points":1,"explanation":"..."}]`,
    `Aturan:`,
    `- "type" harus salah satu dari: ${input.types.join(", ")}.`,
    `- Untuk multiple_choice: isi "options" 4 pilihan tanpa prefix huruf, dan "correctAnswer" harus persis sama dengan salah satu isi options.`,
    `- Untuk short_answer: isi "correctAnswer" berupa jawaban singkat yang pasti.`,
    `- Untuk essay: "correctAnswer" berisi poin-poin kunci penilaian, dan "points" lebih besar (mis. 5).`,
    `- Gunakan Bahasa Indonesia yang sesuai untuk anak sekolah.`,
    `- Jangan mengarang konteks di luar materi yang diberikan.`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  try {
    const raw = await runCompletion({
      userId,
      kind: "question_generation",
      system:
        "Kamu membantu tutor les privat membuat soal latihan. Output harus JSON valid tanpa teks tambahan.",
      prompt,
      images: input.images,
      temperature: 0.7,
      maxTokens: 4000,
    });
    const parsed = extractJson<unknown>(raw);
    const questions = normalizeGeneratedQuestions(parsed, input.types);
    return { questions, usedAi: questions.length > 0 };
  } catch {
    return { questions: [], usedAi: false };
  }
}

export type QuestionVariantInput = {
  subject: string;
  material: string;
  base: GeneratedQuestion;
  count: number;
};

/** Buat N soal baru dengan konsep & tipe sama seperti soal acuan, tapi angka/konteks berbeda. */
export async function generateQuestionVariants(
  userId: number,
  input: QuestionVariantInput,
): Promise<{ questions: GeneratedQuestion[]; usedAi: boolean }> {
  const base = input.base;
  const prompt = [
    `Buat ${input.count} soal baru dengan konsep dan tingkat kesulitan yang SAMA seperti soal acuan berikut, tapi ubah angka/konteks/kalimatnya supaya tidak identik.`,
    ``,
    `Mata pelajaran: ${input.subject}`,
    `Materi: ${input.material}`,
    `Tipe soal acuan: ${base.type}`,
    `Pertanyaan acuan: ${base.prompt}`,
    base.options?.length ? `Pilihan acuan: ${base.options.join(" | ")}` : null,
    base.correctAnswer ? `Kunci acuan: ${base.correctAnswer}` : null,
    ``,
    `Balas HANYA dengan JSON array valid, dengan bentuk yang sama persis seperti soal acuan:`,
    `[{"type":"${base.type}","prompt":"...","options":${base.type === "multiple_choice" ? '["A","B","C","D"]' : "null"},"correctAnswer":"...","points":${base.points},"explanation":"..."}]`,
    `Aturan:`,
    `- Semua soal harus bertipe ${base.type}.`,
    `- Jangan menyalin ulang soal acuan kata demi kata — ubah angka/nama/konteksnya.`,
    `- Gunakan Bahasa Indonesia yang sesuai untuk anak sekolah.`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  try {
    const raw = await runCompletion({
      userId,
      kind: "question_variant",
      system:
        "Kamu membantu tutor les privat membuat variasi baru dari soal yang sudah ada. Output harus JSON valid tanpa teks tambahan.",
      prompt,
      temperature: 0.8,
      maxTokens: 3000,
    });
    const parsed = extractJson<unknown>(raw);
    const questions = normalizeGeneratedQuestions(parsed, [base.type]);
    return { questions, usedAi: questions.length > 0 };
  } catch {
    return { questions: [], usedAi: false };
  }
}

/** Sinonim yang kadang dipakai model walau sudah diminta field bahasa Inggris — lintas provider/model hasilnya tidak selalu seragam. */
const TYPE_SYNONYMS: Record<string, GeneratedQuestion["type"]> = {
  multiple_choice: "multiple_choice",
  pilihan_ganda: "multiple_choice",
  pilihanganda: "multiple_choice",
  pg: "multiple_choice",
  short_answer: "short_answer",
  isian_singkat: "short_answer",
  isian: "short_answer",
  isiansingkat: "short_answer",
  essay: "essay",
  uraian: "essay",
};

function firstString(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function firstValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return undefined;
}

/** Options bisa datang sebagai array ATAU objek berkunci huruf ({"A":"...","B":"..."}). */
function normalizeOptions(value: unknown): { texts: string[]; byKey: Record<string, string> } | undefined {
  if (Array.isArray(value)) {
    const texts = value.map((o) => String(o).trim()).filter(Boolean).slice(0, 6);
    if (texts.length === 0) return undefined;
    const byKey: Record<string, string> = {};
    texts.forEach((text, index) => (byKey[String.fromCharCode(65 + index)] = text));
    return { texts, byKey };
  }
  if (value && typeof value === "object") {
    const byKey: Record<string, string> = {};
    const texts: string[] = [];
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      const text = String(raw).trim();
      if (!text) continue;
      texts.push(text);
      byKey[key.trim().toUpperCase()] = text;
    }
    return texts.length > 0 ? { texts: texts.slice(0, 6), byKey } : undefined;
  }
  return undefined;
}

export function normalizeGeneratedQuestions(
  parsed: unknown,
  allowedTypes: ("multiple_choice" | "short_answer" | "essay")[],
): GeneratedQuestion[] {
  if (!Array.isArray(parsed)) return [];
  const result: GeneratedQuestion[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;

    const typeKey = String(row.type ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const type = TYPE_SYNONYMS[typeKey];
    if (!type || !allowedTypes.includes(type)) continue;

    const prompt = firstString(row, ["prompt", "question", "pertanyaan", "soal"]);
    if (!prompt) continue;

    const optionsInfo = normalizeOptions(firstValue(row, ["options", "choices", "pilihan", "jawaban_pilihan"]));
    const options = optionsInfo?.texts;
    let correctAnswer = firstString(row, ["correctAnswer", "answer", "jawaban", "kunci", "kunciJawaban", "kunci_jawaban"]);

    if (type === "multiple_choice") {
      if (!options || options.length < 2) continue;
      const byKey = correctAnswer ? optionsInfo?.byKey[correctAnswer.toUpperCase()] : undefined;
      const byText = correctAnswer ? options.find((o) => o.toLowerCase() === correctAnswer!.toLowerCase()) : undefined;
      correctAnswer = byKey ?? byText ?? options[0];
    }

    const pointsRaw = firstValue(row, ["points", "poin", "skor", "bobot"]);
    const points = Number.isFinite(Number(pointsRaw)) ? Math.max(1, Math.min(20, Number(pointsRaw))) : type === "essay" ? 5 : 1;

    result.push({
      type,
      prompt,
      options: type === "multiple_choice" ? options : undefined,
      correctAnswer,
      points,
      explanation: firstString(row, ["explanation", "penjelasan", "pembahasan"]),
    });
  }
  return result;
}

/* --------------------------------- Asisten AI (chat) --------------------------------- */

export type ChatTurnInput = {
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
  state: ChatDraftState;
  styleNotes?: string | null;
  images?: ProviderImage[];
};

export type ChatTurnResult = {
  reply: string;
  state: ChatDraftState;
  styleNote: string | null;
  usedAi: boolean;
};

const CHAT_QUESTION_TYPES: GeneratedQuestion["type"][] = ["multiple_choice", "short_answer", "essay"];

/**
 * Satu giliran obrolan = satu panggilan AI yang membaca draf soal saat ini + riwayat
 * singkat, lalu membalas dengan JSON terstruktur (bukan tool-calling asli, supaya tetap
 * jalan konsisten di semua provider yang dipakai lewat key pool).
 */
export async function runChatTurn(userId: number, input: ChatTurnInput): Promise<ChatTurnResult> {
  const transcript = input.history
    .slice(-10)
    .map((m) => `${m.role === "user" ? "Tutor" : "Asisten"}: ${m.content}`)
    .join("\n");

  const currentDraft = {
    subject: input.state.subject ?? null,
    grade: input.state.grade ?? null,
    material: input.state.material ?? null,
    questions: input.state.questions,
  };

  const prompt = [
    `Kamu Asisten AI untuk tutor les privat, membantu menyusun soal ujian/latihan lewat obrolan santai — tutor tidak mengisi form, cukup ngobrol.`,
    input.styleNotes ? `Gaya soal favorit tutor ini, selalu ikuti kecuali diminta lain: ${input.styleNotes}` : null,
    ``,
    `Riwayat percakapan terakhir:`,
    transcript || "(belum ada percakapan sebelumnya)",
    ``,
    `Draf soal saat ini (JSON, mungkin kosong bila belum ada soal):`,
    JSON.stringify(currentDraft),
    ``,
    `Pesan baru dari tutor: "${input.userMessage}"`,
    input.images?.length
      ? `Ada ${input.images.length} lampiran (rangkuman/soal SH/foto buku/PDF) — jadikan sumber utama saat diminta buat soal, cek kelengkapan materi, atau revisi.`
      : null,
    ``,
    `Balas HANYA dengan satu objek JSON valid (tanpa markdown fence, tanpa teks lain di luar JSON). Ikuti PERSIS nama field dan tipe data pada contoh ini (jangan ganti nama field, jangan ubah "options" jadi objek):`,
    `{"reply":"Ini 2 soalnya.","meta":{"subject":"Matematika","grade":"3","material":"Perkalian"},"questions":[{"type":"multiple_choice","prompt":"Hasil dari 4 x 3 adalah ...","options":["10","12","14","16"],"correctAnswer":"12","points":1,"explanation":"4 x 3 = 12"},{"type":"short_answer","prompt":"Hasil dari 7 x 4 adalah ...","correctAnswer":"28","points":1,"explanation":"7 x 4 = 28"}],"coverageNotes":null,"styleNote":null}`,
    `Aturan:`,
    `- "reply": Bahasa Indonesia, MAKSIMAL 1-2 kalimat pendek. Langsung ke inti, tanpa basa-basi pembuka ("Baik, berikut...", "Tentu, saya akan...") dan tanpa menutup dengan tawaran generik. JANGAN mengulang isi soal/daftar di "reply" — soal sudah tampil terpisah di panel draf, cukup konfirmasi singkat (mis. "Sudah, 10 soal perkalian siap." atau "Sudah direvisi sesuai catatan."). Kalau perlu menjelaskan sesuatu di luar draf (mis. hasil cek materi, jawaban pertanyaan tutor), tetap padat dan hanya info yang relevan — tanpa pengulangan, tanpa filler.`,
    `- "questions": isi array LENGKAP soal hasil akhir (bukan cuma yang berubah) kalau tutor minta buat/tambah/ubah/revisi soal. "type" wajib salah satu dari "multiple_choice"/"short_answer"/"essay" (bukan istilah lain), "options" wajib array string (bukan objek), "correctAnswer" wajib berisi TEKS jawaban lengkap (bukan cuma huruf "A"/"B"). Kalau tidak ada perubahan soal pada giliran ini, isi null — JANGAN mengulang draf lama di sini.`,
    `- "meta": subject/grade/material terbaru; pertahankan nilai lama kalau tutor tidak menyebut ulang.`,
    `- "coverageNotes": isi kalau tutor minta cek apakah semua materi dari lampiran sudah masuk ke soal — sebutkan materi yang sudah dan yang masih kurang. Selain itu null.`,
    `- "styleNote": kalau tutor menyebut preferensi format/gaya yang harus diingat untuk seterusnya (mis. "opsi jangan pakai E", "bahasa formal terus"), ringkas satu kalimat. Selain itu null.`,
    `- Jangan mengarang materi di luar apa yang diberikan tutor/lampiran.`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  try {
    const raw = await runCompletion({
      userId,
      kind: "chat_turn",
      system:
        "Kamu asisten pembuat soal untuk tutor les privat. Selalu balas dengan JSON valid sesuai kontrak yang diberikan, tanpa teks lain di luar JSON. Hemat token: padat, langsung ke inti, tanpa basa-basi — tapi data soal/meta yang kamu hasilkan tetap harus lengkap dan akurat, jangan dipotong demi ringkas.",
      prompt,
      images: input.images,
      temperature: 0.6,
      maxTokens: 4000,
    });

    const parsed = extractJson<Record<string, unknown>>(raw);
    if (!parsed || typeof parsed !== "object") {
      return {
        reply: raw.trim() || "Maaf, saya belum bisa memproses permintaan itu. Coba ulangi dengan kalimat lain.",
        state: input.state,
        styleNote: null,
        usedAi: true,
      };
    }

    const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : "Baik.";
    const metaRaw = (parsed.meta ?? {}) as Record<string, unknown>;
    const textOr = (value: unknown, fallback: string | undefined) =>
      typeof value === "string" && value.trim() ? value.trim() : fallback;

    const nextState: ChatDraftState = {
      ...input.state,
      subject: textOr(metaRaw.subject, input.state.subject),
      grade: textOr(metaRaw.grade, input.state.grade),
      material: textOr(metaRaw.material, input.state.material),
      coverageNotes: textOr(parsed.coverageNotes, input.state.coverageNotes),
    };

    if (Array.isArray(parsed.questions)) {
      const normalized = normalizeGeneratedQuestions(parsed.questions, CHAT_QUESTION_TYPES);
      if (normalized.length > 0) nextState.questions = normalized;
    }

    const styleNote = typeof parsed.styleNote === "string" && parsed.styleNote.trim() ? parsed.styleNote.trim() : null;

    return { reply, state: nextState, styleNote, usedAi: true };
  } catch {
    return {
      reply: "AI sedang tidak bisa diakses. Coba lagi sebentar lagi, atau buat/ubah soal manual dulu di halaman Tugas.",
      state: input.state,
      styleNote: null,
      usedAi: false,
    };
  }
}
