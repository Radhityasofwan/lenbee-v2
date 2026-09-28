"use client";

import { Archive, Pencil, Play, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
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
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteAssignmentAction, setAssignmentStatusAction } from "@/app/actions/assignments";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";

type DialogKind = "publish" | "archive" | "delete" | null;

export function AssignmentActions({
  assignmentId,
  status,
  questionCount,
}: {
  assignmentId: number;
  status: string;
  questionCount: number;
}) {
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState<DialogKind>(null);

  const [publishState, publishAction] = useActionState(setAssignmentStatusAction, idleState);
  const [archiveState, archiveAction] = useActionState(setAssignmentStatusAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteAssignmentAction, idleState);

  useActionToast(publishState, () => {
    setOpenDialog(null);
    router.refresh();
  });

  useActionToast(archiveState, () => {
    setOpenDialog(null);
    router.refresh();
  });

  useActionToast(deleteState, () => {
    setOpenDialog(null);
    router.push("/assignments");
  });

  const published = status === "published";
  const archived = status === "archived";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {published ? (
          <Button asChild variant="outline" size="sm" className="h-9 text-xs">
            <Link href={`/assignments/${assignmentId}/attempt`}>
              <Play />
              Kerjakan
            </Link>
          </Button>
        ) : null}

        {published ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={() => setOpenDialog("archive")}
          >
            <Archive />
            Arsipkan
          </Button>
        ) : (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-9 text-xs"
            onClick={() => setOpenDialog("publish")}
            disabled={questionCount === 0}
          >
            <Send />
            {archived ? "Terbitkan lagi" : "Terbitkan"}
          </Button>
        )}

        <Button asChild variant="outline" size="sm" className="h-9 text-xs">
          <Link href={`/assignments/${assignmentId}/edit`}>
            <Pencil />
            Ubah
          </Link>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => setOpenDialog("delete")}
        >
          <Trash2 />
          Hapus
        </Button>
      </div>

      {questionCount === 0 && !published ? (
        <p className="text-[11px] text-muted-foreground">Tambahkan minimal satu soal sebelum menerbitkan tugas.</p>
      ) : null}

      <Dialog open={openDialog === "publish"} onOpenChange={(open) => setOpenDialog(open ? "publish" : null)}>
        <DialogContent>
          <form action={publishAction}>
            <input type="hidden" name="assignmentId" value={assignmentId} />
            <input type="hidden" name="status" value="published" />
            <DialogHeader>
              <DialogTitle>Terbitkan tugas?</DialogTitle>
              <DialogDescription>
                Tugas akan terlihat oleh orang tua dan siap dikerjakan murid.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              {publishState.message && !publishState.ok ? (
                <FormAlert tone="error">{publishState.message}</FormAlert>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Tugas berisi {questionCount} soal. Setelah terbit, Anda masih bisa mengubah isinya.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpenDialog(null)}>
                Batal
              </Button>
              <SubmitButton pendingLabel="Menerbitkan…">Terbitkan</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "archive"} onOpenChange={(open) => setOpenDialog(open ? "archive" : null)}>
        <DialogContent>
          <form action={archiveAction}>
            <input type="hidden" name="assignmentId" value={assignmentId} />
            <input type="hidden" name="status" value="archived" />
            <DialogHeader>
              <DialogTitle>Arsipkan tugas?</DialogTitle>
              <DialogDescription>
                Tugas tidak lagi muncul untuk orang tua, tetapi riwayat pengerjaannya tetap tersimpan.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              {archiveState.message && !archiveState.ok ? (
                <FormAlert tone="error">{archiveState.message}</FormAlert>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpenDialog(null)}>
                Batal
              </Button>
              <SubmitButton pendingLabel="Mengarsipkan…">Arsipkan</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "delete"} onOpenChange={(open) => setOpenDialog(open ? "delete" : null)}>
        <DialogContent>
          <form action={deleteAction}>
            <input type="hidden" name="assignmentId" value={assignmentId} />
            <DialogHeader>
              <DialogTitle>Hapus tugas?</DialogTitle>
              <DialogDescription>
                Tugas, seluruh soal, dan riwayat pengerjaannya akan dihapus permanen. Tindakan ini tidak bisa
                dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              {deleteState.message && !deleteState.ok ? (
                <FormAlert tone="error">{deleteState.message}</FormAlert>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpenDialog(null)}>
                Batal
              </Button>
              <SubmitButton variant="destructive" pendingLabel="Menghapus…">
                Hapus permanen
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
