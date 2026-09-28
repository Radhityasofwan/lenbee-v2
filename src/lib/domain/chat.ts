import type { ChatDraftQuestion } from "@/db/schema";

/**
 * Permintaan mekanis (kunci jawaban, ekspor Word) diselesaikan langsung dari draf
 * yang tersimpan — tidak perlu panggilan AI, jadi selalu akurat dan tidak bisa "salah paham".
 */
export function isAnswerKeyRequest(message: string): boolean {
  return /kunci\s*jawab|jawaban\s*kunci|answer\s*key/i.test(message);
}

export function isWordExportRequest(message: string): boolean {
  return /\bword\b|\.docx|dokumen\s*word|export\s*word|unduh\s*word/i.test(message);
}

/** "Buat latihan tambahan" — dijawab dengan soal baru, disusun dari materi yang masih sering salah. */
export function isPracticeRequest(message: string): boolean {
  return /latihan\s*tambahan|latihan\s*ekstra|latihan\s*susulan/i.test(message);
}

/** Pertanyaan progres murni informasi — tidak mengubah draf apa pun. */
export function isProgressRequest(message: string): boolean {
  return /(cek|lihat|bagaimana)\s*(progress|progres|perkembangan)|materi\s*(yang\s*)?(masih\s*)?(kurang|lemah)/i.test(
    message,
  );
}

/** "Buat laporan/rangkuman perkembangan" — beda alur total dari pembuatan soal. */
export function isReportRequest(message: string): boolean {
  return /buat(kan)?\s*(laporan|rangkuman)(\s*perkembangan)?|rangkuman\s*perkembangan/i.test(message);
}

const TYPE_LABEL: Record<ChatDraftQuestion["type"], string> = {
  multiple_choice: "PG",
  short_answer: "Isian",
  essay: "Uraian",
};

export function renderAnswerKey(questions: ChatDraftQuestion[]): string {
  if (questions.length === 0) return "Belum ada soal untuk dibuatkan kunci jawaban.";

  const lines = questions.map((question, index) => {
    const label = TYPE_LABEL[question.type];
    if (question.type === "multiple_choice" && question.options?.length) {
      const letter = question.correctAnswer
        ? String.fromCharCode(65 + question.options.findIndex((o) => o === question.correctAnswer))
        : "?";
      return `${index + 1}. [${label}] ${letter} — ${question.correctAnswer ?? "(belum ada kunci)"}`;
    }
    return `${index + 1}. [${label}] ${question.correctAnswer?.trim() || "(dinilai manual)"}`;
  });

  return `Kunci jawaban:\n${lines.join("\n")}`;
}

/** Ringkasan progres murni dari data tersimpan — tidak lewat AI, jadi tidak bisa mengarang. */
export function renderProgressSummary(input: {
  periodLabel: string;
  topics: string[];
  weakMaterials: { material: string; wrongCount: number; answeredCount: number }[];
  assignmentResults: { title: string; score: number; maxScore: number }[];
}): string {
  const lines: string[] = [`Progres periode ${input.periodLabel}:`];

  lines.push(
    input.topics.length > 0
      ? `Materi yang sudah dipelajari: ${input.topics.join(", ")}.`
      : "Belum ada catatan materi yang dipelajari pada periode ini.",
  );

  lines.push(
    input.weakMaterials.length > 0
      ? `Materi yang masih sering salah: ${input.weakMaterials
          .map((w) => `${w.material} (salah ${w.wrongCount}/${w.answeredCount} soal)`)
          .join(", ")}.`
      : "Belum ada materi yang menonjol sering salah.",
  );

  if (input.assignmentResults.length > 0) {
    lines.push(
      `Hasil latihan terakhir: ${input.assignmentResults
        .slice(0, 5)
        .map((r) => `${r.title} ${r.score}/${r.maxScore}`)
        .join(", ")}.`,
    );
  }

  return lines.join("\n");
}
