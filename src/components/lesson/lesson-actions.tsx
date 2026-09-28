"use client";

import { CalendarClock, RotateCcw, Trash2, XCircle } from "lucide-react";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { cancelLessonAction, deleteLessonAction, reopenLessonAction, rescheduleLessonAction } from "@/app/actions/lessons";
import { CANCEL_REASON_LABELS } from "@/lib/domain/labels";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";

export function LessonActions({
  lessonId,
  date,
  startTime,
  status,
  cancelReason,
}: {
  lessonId: number;
  date: string;
  startTime: string;
  status: string;
  cancelReason?: string | null;
}) {
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState<"reopen" | "cancel" | "reschedule" | "delete" | null>(null);

  const [reopenState, reopenFormAction] = useActionState(reopenLessonAction, idleState);
  const [cancelState, cancelFormAction] = useActionState(cancelLessonAction, idleState);
  const [rescheduleState, rescheduleFormAction] = useActionState(rescheduleLessonAction, idleState);
  const [deleteState, deleteFormAction] = useActionState(deleteLessonAction, idleState);

  useActionToast(reopenState, () => {
    setOpenDialog(null);
    router.refresh();
  });

  useActionToast(cancelState, () => setOpenDialog(null));

  useActionToast(rescheduleState, () => {
    setOpenDialog(null);
    router.refresh();
  });

  useActionToast(deleteState, () => router.push("/schedule"));

  const cancelErrors = cancelState.fieldErrors ?? {};
  const rescheduleErrors = rescheduleState.fieldErrors ?? {};
  const cancelled = status === "cancelled" || status === "moved";
  // Cuma hasil "Selesai Mengajar" (completed, atau tidak hadir) yang boleh dibalikkan —
  // pembatalan eksplisit lewat dialog "Batalkan" alasannya beda dan bukan salah pilih jadwal.
  const reopenable = status === "completed" || (status === "cancelled" && cancelReason === "student_absent");

  return (
    <div className="flex flex-wrap gap-2">
      {reopenable ? (
        <Dialog open={openDialog === "reopen"} onOpenChange={(open) => setOpenDialog(open ? "reopen" : null)}>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpenDialog("reopen")}>
            <RotateCcw />
            Balikkan ke terjadwal
          </Button>
          <DialogContent>
            <form action={reopenFormAction}>
              <input type="hidden" name="lessonId" value={lessonId} />
              <DialogHeader>
                <DialogTitle>Balikkan ke terjadwal?</DialogTitle>
                <DialogDescription>
                  Status, kehadiran, dan laporan pertemuan ini akan dikosongkan lagi seperti belum diajar. Gunakan ini
                  kalau salah pilih pertemuan saat menandai selesai.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                {reopenState.message && !reopenState.ok ? <FormAlert tone="error">{reopenState.message}</FormAlert> : null}
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpenDialog(null)}>
                  Batal
                </Button>
                <SubmitButton pendingLabel="Membalikkan…">Balikkan ke terjadwal</SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      <Dialog open={openDialog === "cancel"} onOpenChange={(open) => setOpenDialog(open ? "cancel" : null)}>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpenDialog("cancel")}>
          <XCircle />
          Batalkan
        </Button>
        <DialogContent>
          <form action={cancelFormAction}>
            <input type="hidden" name="lessonId" value={lessonId} />
            <DialogHeader>
              <DialogTitle>Batalkan pertemuan</DialogTitle>
              <DialogDescription>
                Pertemuan ini tidak akan dihitung ke tagihan. Orang tua tetap melihat status pembatalannya.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4">
              {cancelState.message && !cancelState.ok ? <FormAlert tone="error">{cancelState.message}</FormAlert> : null}

              <Field label="Alasan" htmlFor="cancelReason" error={cancelErrors.cancelReason} required>
                <Select name="cancelReason" defaultValue="cancelled">
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih alasan" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CANCEL_REASON_LABELS).map(([value, text]) => (
                      <SelectItem key={value} value={value}>
                        {text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Catatan" htmlFor="cancelNotes" error={cancelErrors.notes}>
                <Textarea id="cancelNotes" name="notes" rows={3} placeholder="Keterangan tambahan (opsional)…" />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpenDialog(null)}>
                Batal
              </Button>
              <SubmitButton variant="destructive" pendingLabel="Membatalkan…">
                Batalkan pertemuan
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {!cancelled ? (
        <>
          <Dialog open={openDialog === "reschedule"} onOpenChange={(open) => setOpenDialog(open ? "reschedule" : null)}>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpenDialog("reschedule")}>
              <CalendarClock />
              Pindahkan
            </Button>
            <DialogContent>
              <form action={rescheduleFormAction}>
                <input type="hidden" name="lessonId" value={lessonId} />
                <DialogHeader>
                  <DialogTitle>Pindahkan pertemuan</DialogTitle>
                  <DialogDescription>Pertemuan lama ditandai dipindahkan dan dibuat jadwal baru dengan durasi yang sama.</DialogDescription>
                </DialogHeader>
                <DialogBody className="flex flex-col gap-4">
                  {rescheduleState.message && !rescheduleState.ok ? (
                    <FormAlert tone="error">{rescheduleState.message}</FormAlert>
                  ) : null}

                  <Field label="Tanggal baru" htmlFor="date" error={rescheduleErrors.date} required>
                    <Input id="date" name="date" type="date" defaultValue={date} required />
                  </Field>

                  <Field label="Jam mulai" htmlFor="startTime" error={rescheduleErrors.startTime} required>
                    <Input id="startTime" name="startTime" type="time" defaultValue={startTime.slice(0, 5)} required />
                  </Field>
                </DialogBody>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpenDialog(null)}>
                    Batal
                  </Button>
                  <SubmitButton pendingLabel="Memindahkan…">Pindahkan</SubmitButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={openDialog === "delete"} onOpenChange={(open) => setOpenDialog(open ? "delete" : null)}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => setOpenDialog("delete")}
            >
              <Trash2 />
              Hapus
            </Button>
            <DialogContent>
              <form action={deleteFormAction}>
                <input type="hidden" name="lessonId" value={lessonId} />
                <DialogHeader>
                  <DialogTitle>Hapus pertemuan ini?</DialogTitle>
                  <DialogDescription>
                    Pertemuan akan hilang dari jadwal dan riwayat. Tindakan ini tidak bisa dibatalkan.
                  </DialogDescription>
                </DialogHeader>
                <DialogBody>
                  {deleteState.message && !deleteState.ok ? <FormAlert tone="error">{deleteState.message}</FormAlert> : null}
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
        </>
      ) : null}
    </div>
  );
}
