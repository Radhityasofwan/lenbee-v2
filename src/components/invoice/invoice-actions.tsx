"use client";

import { Ban, Check, Link2, Trash2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, startTransition } from "react";
import { toast } from "sonner";
import { deleteInvoiceAction, recordPaymentAction, voidInvoiceAction } from "@/app/actions/invoices";
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
import { SubmitButton } from "@/components/ui/submit-button";
import { formatCurrency } from "@/lib/datetime";
import { idleState } from "@/lib/form";

export function InvoiceActions({
  invoiceId,
  total,
  paidAmount,
  status,
  publicToken,
}: {
  invoiceId: number;
  total: number;
  paidAmount: number;
  status: string;
  publicToken: string;
}) {
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState<"payment" | "delete" | null>(null);
  const [paymentState, paymentAction] = useActionState(recordPaymentAction, idleState);
  const [voidState, voidAction] = useActionState(voidInvoiceAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteInvoiceAction, idleState);
  const [copied, setCopied] = useState(false);

  const remaining = Math.max(0, total - paidAmount);

  useEffect(() => {
    if (!paymentState.message) return;
    if (paymentState.ok) {
      toast.success(paymentState.message);
      startTransition(() => setOpenDialog(null));
      router.refresh();
    } else {
      toast.error(paymentState.message);
    }
  }, [paymentState, router]);

  useEffect(() => {
    if (!voidState.message) return;
    if (voidState.ok) {
      toast.success(voidState.message);
      router.refresh();
    } else {
      toast.error(voidState.message);
    }
  }, [voidState, router]);

  useEffect(() => {
    if (!deleteState.message) return;
    if (deleteState.ok) {
      toast.success(deleteState.message);
      startTransition(() => setOpenDialog(null));
      router.push("/invoices");
    } else {
      toast.error(deleteState.message);
    }
  }, [deleteState, router]);

  const paymentErrors = paymentState.fieldErrors ?? {};

  async function copyLink() {
    const url = `${window.location.origin}/share/invoice/${publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Tautan invoice disalin.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin tautan otomatis. Salin dari kolom tautan pada halaman ini.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={status === "paid" || status === "void" || remaining <= 0}
        onClick={() => setOpenDialog("payment")}
      >
        <Wallet />
        Catat pembayaran
      </Button>

      {status !== "void" ? (
        <form action={voidAction}>
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <SubmitButton size="sm" variant="outline" pendingLabel="Membatalkan…">
            <Ban />
            Batalkan invoice
          </SubmitButton>
        </form>
      ) : null}

      <Button type="button" size="sm" variant="outline" onClick={copyLink}>
        {copied ? <Check /> : <Link2 />}
        {copied ? "Tersalin" : "Salin tautan"}
      </Button>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        aria-label="Hapus invoice"
        onClick={() => setOpenDialog("delete")}
      >
        <Trash2 />
      </Button>

      <Dialog open={openDialog === "payment"} onOpenChange={(open) => setOpenDialog(open ? "payment" : null)}>
        <DialogContent>
          <form action={paymentAction} className="flex min-h-0 flex-1 flex-col">
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <DialogHeader>
              <DialogTitle>Catat pembayaran</DialogTitle>
              <DialogDescription>Sisa tagihan {formatCurrency(remaining)}.</DialogDescription>
            </DialogHeader>

            <DialogBody className="flex flex-col gap-4">
              {paymentState.message && !paymentState.ok ? (
                <FormAlert tone="error">{paymentState.message}</FormAlert>
              ) : null}

              <FieldGroup>
                <Field label="Nominal (Rp)" htmlFor="payment-amount" error={paymentErrors.amount} required>
                  <Input
                    id="payment-amount"
                    name="amount"
                    inputMode="numeric"
                    defaultValue={String(remaining)}
                    required
                  />
                </Field>
              </FieldGroup>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpenDialog(null)}>
                Batal
              </Button>
              <SubmitButton pendingLabel="Menyimpan…">Simpan pembayaran</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "delete"} onOpenChange={(open) => setOpenDialog(open ? "delete" : null)}>
        <DialogContent>
          <form action={deleteAction} className="flex min-h-0 flex-1 flex-col">
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <DialogHeader>
              <DialogTitle>Hapus invoice?</DialogTitle>
              <DialogDescription>
                Pertemuan yang tertagih di invoice ini akan kembali bisa ditagih. Tindakan ini tidak bisa
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
                Hapus invoice
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
