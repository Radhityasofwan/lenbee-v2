"use client";

import { FileText, Send } from "lucide-react";
import { useActionState } from "react";
import { publishChatAsAssignmentAction, publishChatReportAction } from "@/app/actions/ai-chat";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { cn } from "@/lib/utils";

export function PublishChatButton({
  kind = "assignment",
  sessionId,
  studentId,
  className,
}: {
  kind?: "assignment" | "report";
  sessionId: number;
  studentId: number;
  className?: string;
}) {
  const isReport = kind === "report";
  const [state, action] = useActionState(isReport ? publishChatReportAction : publishChatAsAssignmentAction, idleState);
  useActionToast(state);

  return (
    <form action={action} className={cn(className)}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="studentId" value={studentId} />
      <SubmitButton size="sm" className="h-7 text-[11px]" pendingLabel={isReport ? "Menyimpan…" : "Menerbitkan…"}>
        {isReport ? <FileText /> : <Send />}
        {isReport ? "Simpan sebagai Laporan" : "Terbitkan sebagai Tugas"}
      </SubmitButton>
    </form>
  );
}
