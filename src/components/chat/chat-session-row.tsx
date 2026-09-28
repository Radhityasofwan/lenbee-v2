"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { FcSms } from "react-icons/fc";
import { useActionState, useState } from "react";
import { deleteChatSessionAction } from "@/app/actions/ai-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";

export type ChatSessionSummary = {
  id: number;
  title: string;
  studentLabel: string | null;
  questionCount: number;
  updatedAt: string;
};

export function ChatSessionRow({ session }: { session: ChatSessionSummary }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteState, deleteAction] = useActionState(deleteChatSessionAction, idleState);
  useActionToast(deleteState, () => setConfirmDelete(false));

  const updated = new Date(session.updatedAt).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <FcSms className="size-4" />
      </div>
      <Link href={`/asisten/${session.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{session.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {session.studentLabel ? <span>{session.studentLabel}</span> : null}
          {session.questionCount > 0 ? (
            <Badge variant="outline" className="text-[10px]">
              {session.questionCount} soal
            </Badge>
          ) : null}
          <span>{updated}</span>
        </p>
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Hapus ${session.title}`}
        onClick={() => setConfirmDelete(true)}
      >
        <Trash2 />
      </Button>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <form action={deleteAction}>
            <input type="hidden" name="sessionId" value={session.id} />
            <DialogHeader>
              <DialogTitle>Hapus percakapan ini?</DialogTitle>
              <DialogDescription>Semua pesan dan draf soal di percakapan ini akan hilang.</DialogDescription>
            </DialogHeader>
            <DialogBody />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Batal
              </Button>
              <SubmitButton variant="destructive" pendingLabel="Menghapus…">
                Hapus
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
