import { ArrowLeft } from "lucide-react";
import { FcPaid } from "react-icons/fc";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { InvoiceActions } from "@/components/invoice/invoice-actions";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import { formatCurrency, formatDateShort } from "@/lib/datetime";
import { INVOICE_STATUS_LABELS, labelOf } from "@/lib/domain/labels";
import { InvoiceError, getOwnedInvoice, invoiceItemsFor } from "@/lib/services/invoices";
import type { Invoice } from "@/db/schema";

export const metadata: Metadata = { title: "Detail Invoice" };

function statusTone(status: Invoice["status"]): "secondary" | "info" | "success" | "warning" {
  if (status === "paid") return "success";
  if (status === "partial") return "info";
  if (status === "void") return "secondary";
  return "warning";
}

export default async function InvoiceDetailPage(props: PageProps<"/invoices/[id]">) {
  const user = await requireTutor();
  const params = await props.params;
  const invoiceId = Number(params.id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) notFound();

  const row = await getOwnedInvoice(user.id, invoiceId).catch((error: unknown) => {
    if (error instanceof InvoiceError) return null;
    throw error;
  });
  if (!row) notFound();

  const { invoice, studentName, studentNickname, studentColor } = row;
  const items = await invoiceItemsFor(invoice.id);
  const remaining = Math.max(0, invoice.total - invoice.paidAmount);

  return (
    <div className="flex flex-col gap-4">
      <Button asChild size="sm" variant="ghost" className="self-start text-muted-foreground">
        <Link href="/invoices">
          <ArrowLeft />
          Semua invoice
        </Link>
      </Button>

      <PageHeader
        title={invoice.invoiceNumber}
        description={`Terbit ${formatDateShort(invoice.issueDate)}${
          invoice.dueDate ? ` · jatuh tempo ${formatDateShort(invoice.dueDate)}` : ""
        }`}
        action={
          <InvoiceActions
            invoiceId={invoice.id}
            total={invoice.total}
            paidAmount={invoice.paidAmount}
            status={invoice.status}
            publicToken={invoice.publicToken}
          />
        }
      />

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
        <StudentAvatar name={studentName} color={studentColor} size="md" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/students/${String(invoice.studentId)}`}
            className="truncate text-sm font-semibold text-foreground hover:underline"
          >
            {studentNickname || studentName}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Periode {formatDateShort(invoice.periodStart)} – {formatDateShort(invoice.periodEnd)}
          </p>
        </div>
        <Badge variant={statusTone(invoice.status)} className="shrink-0">
          {labelOf(INVOICE_STATUS_LABELS, invoice.status)}
        </Badge>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FcPaid className="size-4" />
          Rincian
        </h2>

        <div className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{item.description}</p>
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

      <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Tautan untuk orang tua</h2>
        <p className="text-xs text-muted-foreground">
          Bagikan tautan ini agar orang tua bisa melihat rincian tanpa perlu masuk.
        </p>
        <code className="truncate rounded-lg bg-muted/60 px-3 py-2 font-mono text-xs text-muted-foreground">
          /share/invoice/{invoice.publicToken}
        </code>
        {invoice.paidAt ? (
          <p className="text-xs text-muted-foreground">
            Lunas pada{" "}
            {invoice.paidAt.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        ) : null}
      </section>
    </div>
  );
}
