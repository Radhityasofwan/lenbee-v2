"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { PublishChatButton } from "@/components/chat/publish-chat-button";
import { Badge } from "@/components/ui/badge";
import { QUESTION_TYPE_LABELS } from "@/lib/domain/labels";
import type { ChatDraftQuestion, ChatReportDraft } from "@/db/schema";

export function ChatDraftPanel({
  subject,
  material,
  questions,
  reportDraft,
  studentId,
  sessionId,
}: {
  subject?: string | null;
  material?: string | null;
  questions: ChatDraftQuestion[];
  reportDraft?: ChatReportDraft | null;
  studentId: number | null;
  sessionId: number;
}) {
  const [questionsExpanded, setQuestionsExpanded] = useState(false);
  const [reportExpanded, setReportExpanded] = useState(false);

  const summary = [subject, material].filter(Boolean).join(" · ");
  if (!summary && questions.length === 0 && !reportDraft) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border/70 pt-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {summary ? <span className="truncate">{summary}</span> : null}

        {questions.length > 0 ? (
          <button
            type="button"
            onClick={() => setQuestionsExpanded((v) => !v)}
            className="inline-flex shrink-0 items-center gap-0.5 font-medium text-foreground"
          >
            {questions.length} soal
            {questionsExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        ) : null}

        {reportDraft ? (
          <button
            type="button"
            onClick={() => setReportExpanded((v) => !v)}
            className="inline-flex shrink-0 items-center gap-0.5 font-medium text-foreground"
          >
            Draf laporan
            {reportExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        ) : null}

        {questions.length > 0 && studentId ? (
          <PublishChatButton kind="assignment" sessionId={sessionId} studentId={studentId} className="ml-auto" />
        ) : null}
        {reportDraft && studentId ? (
          <PublishChatButton
            kind="report"
            sessionId={sessionId}
            studentId={studentId}
            className={questions.length > 0 ? "" : "ml-auto"}
          />
        ) : null}
      </div>

      {questionsExpanded && questions.length > 0 ? (
        <div className="flex flex-col gap-2 pb-1">
          {questions.map((question, index) => (
            <div key={index} className="rounded-lg bg-muted/50 p-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">
                  {index + 1}. {question.prompt}
                </p>
                <Badge variant="outline" className="shrink-0 text-[9px]">
                  {QUESTION_TYPE_LABELS[question.type]}
                </Badge>
              </div>
              {question.options?.length ? (
                <ul className="mt-1.5 flex flex-col gap-0.5 text-muted-foreground">
                  {question.options.map((option, optionIndex) => (
                    <li
                      key={optionIndex}
                      className={option === question.correctAnswer ? "font-semibold text-foreground" : ""}
                    >
                      {String.fromCharCode(65 + optionIndex)}. {option}
                    </li>
                  ))}
                </ul>
              ) : question.correctAnswer ? (
                <p className="mt-1.5 text-muted-foreground">Kunci: {question.correctAnswer}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {reportExpanded && reportDraft ? (
        <div className="rounded-lg bg-muted/50 p-2.5 text-xs whitespace-pre-line text-foreground">
          <p className="mb-1 font-medium text-muted-foreground">Periode {reportDraft.periodLabel}</p>
          {reportDraft.body}
        </div>
      ) : null}
    </div>
  );
}
