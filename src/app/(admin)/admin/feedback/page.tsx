import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { FeedbackStatusButton } from "@/components/admin/feedback-status-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listFeedback } from "@/lib/services/feedback";
import { pluralize } from "@/lib/datetime";

export const metadata: Metadata = { title: "Survei Aplikasi" };

const ROLE_LABEL: Record<string, string> = { tutor: "Tutor", parent: "Orang tua", super_admin: "Admin" };

function formatDateTime(date: Date): string {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminFeedbackPage() {
  const feedback = await listFeedback();
  const newCount = feedback.filter((row) => row.status === "new").length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Survei Aplikasi"
        description={`${pluralize(feedback.length, "masukan")} masuk${newCount > 0 ? ` · ${newCount} belum ditinjau` : ""}.`}
      />

      {feedback.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Belum ada masukan" description="Saran dari tutor & orang tua akan tampil di sini." />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-0.5 p-1.5">
            {feedback.map((row) => (
              <div key={row.id} className="flex items-start gap-3 rounded-lg p-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-foreground">{row.userName}</span>
                    <Badge variant="outline">{ROLE_LABEL[row.userRole] ?? row.userRole}</Badge>
                    {row.status === "new" ? <Badge variant="info">Baru</Badge> : <Badge variant="secondary">Ditinjau</Badge>}
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-foreground/90">{row.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(row.createdAt)}</p>
                </div>
                <FeedbackStatusButton id={row.id} status={row.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
