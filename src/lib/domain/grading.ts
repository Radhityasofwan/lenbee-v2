export type GradableQuestion = {
  id: number;
  type: "multiple_choice" | "short_answer" | "essay";
  prompt: string;
  options?: string[] | null;
  correctAnswer?: string | null;
  points: number;
};

export type GradeResult = {
  questionId: number;
  /** null = perlu penilaian manual (uraian). */
  isCorrect: boolean | null;
  pointsAwarded: number;
  maxPoints: number;
  feedback: string | null;
};

const PUNCTUATION = /[.,!?;:"'“”‘’()[\]{}]/g;

export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(PUNCTUATION, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Beberapa jawaban benar dipisah dengan `|`. */
export function acceptedAnswers(correctAnswer: string): string[] {
  return correctAnswer
    .split("|")
    .map((part) => normalizeAnswer(part))
    .filter(Boolean);
}

export function gradeAnswer(question: GradableQuestion, rawAnswer: string | null | undefined): GradeResult {
  const answer = (rawAnswer ?? "").trim();
  const base: GradeResult = {
    questionId: question.id,
    isCorrect: null,
    pointsAwarded: 0,
    maxPoints: question.points,
    feedback: null,
  };

  if (answer.length === 0) {
    return { ...base, isCorrect: question.type === "essay" ? null : false, feedback: "Tidak dijawab" };
  }

  if (question.type === "essay") {
    return { ...base, isCorrect: null, feedback: "Perlu penilaian manual" };
  }

  const correct = (question.correctAnswer ?? "").trim();
  if (!correct) {
    return { ...base, isCorrect: null, feedback: "Kunci jawaban belum diisi" };
  }

  const normalized = normalizeAnswer(answer);

  if (question.type === "multiple_choice") {
    const isCorrect = acceptedAnswers(correct).includes(normalized);
    return {
      ...base,
      isCorrect,
      pointsAwarded: isCorrect ? question.points : 0,
      feedback: isCorrect ? null : `Jawaban benar: ${correct}`,
    };
  }

  const accepted = acceptedAnswers(correct);
  const isCorrect =
    accepted.includes(normalized) ||
    (accepted.length > 0 && accepted.some((a) => a.length >= 3 && normalized === a)) ||
    numericMatch(normalized, accepted);

  return {
    ...base,
    isCorrect,
    pointsAwarded: isCorrect ? question.points : 0,
    feedback: isCorrect ? null : `Jawaban benar: ${correct}`,
  };
}

function numericMatch(answer: string, accepted: string[]): boolean {
  const answerNum = parseNumber(answer);
  if (answerNum === null) return false;
  return accepted.some((candidate) => parseNumber(candidate) === answerNum);
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const match = cleaned.match(/^-?\d+(\.\d+)?$/);
  return match ? Number(cleaned) : null;
}

export type AttemptGrade = {
  results: GradeResult[];
  score: number;
  maxScore: number;
  needsManualReview: boolean;
};

export function gradeAttempt(
  questions: GradableQuestion[],
  answers: Record<number, string | null | undefined>,
): AttemptGrade {
  const results = questions.map((question) => gradeAnswer(question, answers[question.id]));
  const score = results.reduce((sum, r) => sum + r.pointsAwarded, 0);
  const maxScore = results.reduce((sum, r) => sum + r.maxPoints, 0);
  return {
    results,
    score,
    maxScore,
    needsManualReview: results.some((r) => r.isCorrect === null),
  };
}
