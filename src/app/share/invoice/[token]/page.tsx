import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PrintButton } from "@/components/invoice/print-button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateShort } from "@/lib/datetime";
import { INVOICE_STATUS_LABELS, labelOf } from "@/lib/domain/labels";
import { getInvoiceByToken } from "@/lib/services/invoices";
import type { Invoice } from "@/db/schema";

export const metadata: Metadata = { title: "Invoice" };

function statusTone(status: Invoice["status"]): "secondary" | "info" | "success" | "warning" {
  if (status === "paid") return "success";
  if (status === "partial") return "info";
  if (status === "void") return "secondary";
  return "warning";
}

export default async function SharedInvoicePage(props: PageProps<"/share/invoice/[token]">) {
  const params = await props.params;
  const token = params.token;
  if (!token) notFound();

  const data = await getInvoiceByToken(token);
  if (!data) notFound();

  const { invoice, studentName, studentNickname, items } = data;
  const remaining = Math.max(0, invoice.total - invoice.paidAmount);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 safe-bottom">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-tight text-foreground">Lenbee</p>
          <p className="text-xs text-muted-foreground">Tagihan les privat</p>
        </div>
        <PrintButton />
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-foreground">
              {invoice.invoiceNumber}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Terbit {formatDateShort(invoice.issueDate)}
              {invoice.dueDate ? ` · jatuh tempo ${formatDateShort(invoice.dueDate)}` : ""}
            </p>
          </div>
          <Badge variant={statusTone(invoice.status)}>
            {labelOf(INVOICE_STATUS_LABELS, invoice.status)}
          </Badge>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Untuk</p>
          <p className="text-sm font-semibold text-foreground">{studentNickname || studentName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Periode {formatDateShort(invoice.periodStart)} – {formatDateShort(invoice.periodEnd)}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{item.description}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 ? (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">Diskon</span>
              <span>-{formatCurrency(invoice.discount)}</span>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-bold text-foreground">{formatCurrency(invoice.total)}</span>
          </div>
          {invoice.paidAmount > 0 ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Sudah dibayar</span>
                <span>{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Sisa</span>
                <span className="font-medium text-foreground">{formatCurrency(remaining)}</span>
              </div>
            </>
          ) : null}
        </div>

        {invoice.notes ? (
          <p className="rounded-lg bg-muted/50 p-3 text-xs whitespace-pre-wrap text-muted-foreground">
            {invoice.notes}
          </p>
        ) : null}
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Invoice ini dibuat otomatis oleh Lenbee.
      </p>
    </main>
  );
}
