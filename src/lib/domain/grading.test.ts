import { describe, expect, it } from "vitest";
import { acceptedAnswers, gradeAnswer, gradeAttempt, normalizeAnswer, type GradableQuestion } from "./grading";

function question(overrides: Partial<GradableQuestion> = {}): GradableQuestion {
  return {
    id: 1,
    type: "multiple_choice",
    prompt: "2 + 2 = ?",
    options: ["3", "4", "5"],
    correctAnswer: "4",
    points: 1,
    ...overrides,
  };
}

describe("normalizeAnswer", () => {
  it("menyeragamkan huruf besar/kecil, tanda baca, dan spasi berlebih", () => {
    expect(normalizeAnswer("  Jakarta,  Indonesia! ")).toBe("jakarta indonesia");
  });
});

describe("acceptedAnswers", () => {
  it("memecah alternatif jawaban yang dipisah tanda pipa", () => {
    expect(acceptedAnswers("4|empat")).toEqual(["4", "empat"]);
  });

  it("membuang bagian kosong", () => {
    expect(acceptedAnswers("4|| ")).toEqual(["4"]);
  });
});

describe("gradeAnswer — pilihan ganda", () => {
  it("memberi poin penuh untuk jawaban benar tanpa peduli kapitalisasi", () => {
    const result = gradeAnswer(question(), "4");
    expect(result).toMatchObject({ isCorrect: true, pointsAwarded: 1, maxPoints: 1, feedback: null });
  });

  it("memberi nol poin dan menampilkan kunci saat jawaban salah", () => {
    const result = gradeAnswer(question(), "5");
    expect(result).toMatchObject({ isCorrect: false, pointsAwarded: 0, feedback: "Jawaban benar: 4" });
  });

  it("memakai poin pertanyaan, bukan nilai tetap", () => {
    expect(gradeAnswer(question({ points: 5 }), "4").pointsAwarded).toBe(5);
  });

  it("menandai salah saat tidak dijawab", () => {
    expect(gradeAnswer(question(), "")).toMatchObject({ isCorrect: false, pointsAwarded: 0, feedback: "Tidak dijawab" });
    expect(gradeAnswer(question(), null)).toMatchObject({ isCorrect: false });
  });

  it("meminta penilaian manual bila kunci jawaban belum diisi", () => {
    expect(gradeAnswer(question({ correctAnswer: null }), "4")).toMatchObject({ isCorrect: null, pointsAwarded: 0 });
  });
});

describe("gradeAnswer — jawaban singkat", () => {
  it("menerima salah satu alternatif jawaban", () => {
    expect(gradeAnswer(question({ type: "short_answer", correctAnswer: "4|empat" }), "Empat.").isCorrect).toBe(true);
  });

  it("mencocokkan angka yang ekuivalen meski penulisannya berbeda", () => {
    const q = question({ type: "short_answer", correctAnswer: "1500" });
    expect(gradeAnswer(q, "1500").isCorrect).toBe(true);
    expect(gradeAnswer(q, "01500").isCorrect).toBe(true);
    expect(gradeAnswer(q, " 1500 ").isCorrect).toBe(true);
    expect(gradeAnswer(q, "1501").isCorrect).toBe(false);
  });
});

describe("gradeAnswer — uraian", () => {
  it("selalu butuh penilaian manual meski jawabannya terisi", () => {
    const result = gradeAnswer(question({ type: "essay", correctAnswer: null }), "Karena gravitasi.");
    expect(result).toMatchObject({ isCorrect: null, pointsAwarded: 0, feedback: "Perlu penilaian manual" });
  });

  it("uraian kosong tetap tidak dihitung benar", () => {
    expect(gradeAnswer(question({ type: "essay", correctAnswer: null }), "")).toMatchObject({ isCorrect: null, feedback: "Tidak dijawab" });
  });
});

describe("gradeAttempt", () => {
  it("menjumlahkan skor dan menandai adanya koreksi manual", () => {
    const questions = [
      question({ id: 1, correctAnswer: "4", points: 1 }),
      question({ id: 2, type: "short_answer", correctAnswer: "Jakarta", points: 3 }),
      question({ id: 3, type: "essay", correctAnswer: null, points: 6 }),
    ];

    const grade = gradeAttempt(questions, { 1: "4", 2: "bandung", 3: "Jawaban panjang" });

    expect(grade.score).toBe(1);
    expect(grade.maxScore).toBe(10);
    expect(grade.needsManualReview).toBe(true);
    expect(grade.results).toHaveLength(3);
  });

  it("tidak butuh koreksi manual bila semua soal objektif dan benar", () => {
    const grade = gradeAttempt([question({ id: 1 }), question({ id: 2, correctAnswer: "3" })], { 1: "4", 2: "3" });

    expect(grade.score).toBe(2);
    expect(grade.maxScore).toBe(2);
    expect(grade.needsManualReview).toBe(false);
  });

  it("pertanyaan tanpa jawaban dianggap salah, bukan manual", () => {
    const grade = gradeAttempt([question({ id: 9 })], {});
    expect(grade.needsManualReview).toBe(false);
    expect(grade.score).toBe(0);
  });
});
