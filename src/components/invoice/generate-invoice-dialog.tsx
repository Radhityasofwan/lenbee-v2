"use client";

import { FilePlus2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, startTransition } from "react";
import { toast } from "sonner";
import { generateInvoiceAction } from "@/app/actions/invoices";
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
import { Field, FieldGroup } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { addDays, currentPeriodFor, formatCurrency, todayKey } from "@/lib/datetime";
import { idleState } from "@/lib/form";

export type InvoiceFormStudent = { id: number; name: string; nickname: string | null; periodStart: string | null };

type PreviewItem = { description: string; quantity: number; unitPrice: number; amount: number };
type Preview = { lessonCount: number; subtotal: number; total: number; items: PreviewItem[] };

export function GenerateInvoiceDialog({ students }: { students: InvoiceFormStudent[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(generateInvoiceAction, idleState);

  const [studentId, setStudentId] = useState(String(students[0]?.id ?? ""));
  const initialPeriod = currentPeriodFor(students[0]?.periodStart ?? null);
  const [periodStart, setPeriodStart] = useState(initialPeriod.periodStart);
  const [periodEnd, setPeriodEnd] = useState(initialPeriod.periodEnd);
  // Ganti murid → periode default ikut periode berjalan anak itu. Disesuaikan saat render
  // (bukan lewat effect) supaya tidak ada render antara sebelum tanggal ikut ter-update.
  const [syncedStudentId, setSyncedStudentId] = useState(studentId);
  if (syncedStudentId !== studentId) {
    setSyncedStudentId(studentId);
    const student = students.find((s) => String(s.id) === studentId);
    const period = currentPeriodFor(student?.periodStart ?? null);
    setPeriodStart(period.periodStart);
    setPeriodEnd(period.periodEnd);
  }
  const [dueDate, setDueDate] = useState(addDays(todayKey(), 14));
  const [discount, setDiscount] = useState("0");
  const [preview, setPreview] = useState<{ key: string; data: Preview } | null>(null);
  const [loading, setLoading] = useState(false);

  const discountValue = useMemo(() => {
    const parsed = Number(discount);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  }, [discount]);

  const previewKey = `${studentId}|${periodStart}|${periodEnd}|${String(discountValue)}`;
  const activePreview = preview?.key === previewKey ? preview.data : null;

  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      startTransition(() => setOpen(false));
      router.refresh();
      router.push(`/invoices/${String(state.data?.invoiceId ?? "")}`);
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  useEffect(() => {
    if (!open || !studentId || periodStart > periodEnd) return;

    let cancelled = false;
    const key = previewKey;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/invoices/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: Number(studentId), periodStart, periodEnd, discount: discountValue }),
        });
        const payload = (await response.json()) as Preview & { error?: string };
        if (cancelled) return;
        setPreview(response.ok && !payload.error ? { key, data: payload } : null);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, studentId, periodStart, periodEnd, discountValue, previewKey]);

  return (
    <div className="flex shrink-0 items-center">
      <Button type="button" size="sm" onClick={() => setOpen(true)} disabled={students.length === 0}>
        <FilePlus2 />
        Buat invoice
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <form action={action} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader>
              <DialogTitle>Buat invoice</DialogTitle>
              <DialogDescription>
                Invoice dihitung dari pertemuan yang sudah selesai dan belum pernah ditagih.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="flex flex-col gap-4">
              {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

              <FieldGroup>
                <Field label="Murid" htmlFor="invoice-student">
                  <Select name="studentId" value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger id="invoice-student">
                      <SelectValue placeholder="Pilih murid" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={String(student.id)}>
                          {student.nickname || student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Awal periode" htmlFor="invoice-period-start" error={errors.periodStart}>
                    <Input
                      id="invoice-period-start"
                      name="periodStart"
                      type="date"
                      value={periodStart}
                      onChange={(event) => setPeriodStart(event.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Akhir periode" htmlFor="invoice-period-end" error={errors.periodEnd}>
                    <Input
                      id="invoice-period-end"
                      name="periodEnd"
                      type="date"
                      value={periodEnd}
                      onChange={(event) => setPeriodEnd(event.target.value)}
                      required
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Jatuh tempo" htmlFor="invoice-due-date" error={errors.dueDate}>
                    <Input
                      id="invoice-due-date"
                      name="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  </Field>
                  <Field label="Diskon (Rp)" htmlFor="invoice-discount" error={errors.discount}>
                    <Input
                      id="invoice-discount"
                      name="discount"
                      inputMode="numeric"
                      value={discount}
                      onChange={(event) => setDiscount(event.target.value.replace(/[^\d]/g, ""))}
                    />
                  </Field>
                </div>

                <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
                  {loading ? (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Menghitung tagihan…
                    </p>
                  ) : activePreview && activePreview.lessonCount > 0 ? (
                    <div className="flex flex-col gap-2">
                      {activePreview.items.map((item) => (
                        <div key={item.description} className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                            {item.description}
                            <span className="text-foreground"> · {item.quantity}×</span>
                          </span>
                          <span className="text-xs font-medium">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                        <span className="text-xs text-muted-foreground">
                          {activePreview.lessonCount} pertemuan · subtotal {formatCurrency(activePreview.subtotal)}
                        </span>
                        <span className="text-sm font-bold">{formatCurrency(activePreview.total)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Belum ada pertemuan selesai yang bisa ditagih pada periode ini.
                    </p>
                  )}
                </div>

                <Field label="Catatan" htmlFor="invoice-notes" hint="Opsional, tampil di invoice.">
                  <Textarea id="invoice-notes" name="notes" rows={2} placeholder="Mis. pembayaran via transfer BCA" />
                </Field>
              </FieldGroup>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <SubmitButton pendingLabel="Membuat…" disabled={!activePreview || activePreview.lessonCount === 0}>
                Buat invoice
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
