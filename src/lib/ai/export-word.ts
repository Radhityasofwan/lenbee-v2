import "server-only";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { ChatDraftQuestion } from "@/db/schema";

function questionParagraphs(question: ChatDraftQuestion, index: number): Paragraph[] {
  const paragraphs = [
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: `${index + 1}. ${question.prompt}`, bold: true })],
    }),
  ];

  if (question.type === "multiple_choice" && question.options?.length) {
    question.options.forEach((option, optionIndex) => {
      paragraphs.push(
        new Paragraph({
          indent: { left: 360 },
          children: [new TextRun(`${String.fromCharCode(65 + optionIndex)}. ${option}`)],
        }),
      );
    });
  } else {
    paragraphs.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun("Jawaban: ......................................")] }));
  }

  return paragraphs;
}

function answerKeyParagraphs(questions: ChatDraftQuestion[]): Paragraph[] {
  return questions.map((question, index) => {
    const letter =
      question.type === "multiple_choice" && question.options?.length && question.correctAnswer
        ? String.fromCharCode(65 + question.options.findIndex((o) => o === question.correctAnswer))
        : null;
    const answer = letter ? `${letter} — ${question.correctAnswer}` : question.correctAnswer?.trim() || "(dinilai manual)";
    return new Paragraph({ children: [new TextRun(`${index + 1}. ${answer}`)] });
  });
}

export async function buildAssignmentDocx(input: {
  title: string;
  subject?: string | null;
  grade?: string | null;
  material?: string | null;
  questions: ChatDraftQuestion[];
}): Promise<Buffer> {
  const subtitle = [input.subject, input.grade, input.material].filter(Boolean).join(" · ");

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(input.title)] }),
          subtitle ? new Paragraph({ children: [new TextRun({ text: subtitle, italics: true })] }) : new Paragraph({}),
          new Paragraph({ text: "" }),
          ...input.questions.flatMap((question, index) => questionParagraphs(question, index)),
          new Paragraph({ text: "", pageBreakBefore: true }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Kunci Jawaban")] }),
          ...answerKeyParagraphs(input.questions),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
