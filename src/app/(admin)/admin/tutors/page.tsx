import type { Metadata } from "next";
import { Users } from "lucide-react";
import { TutorAccountDialog } from "@/components/admin/tutor-account-dialog";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ToggleActiveButton } from "@/components/admin/toggle-active-button";
import { listTutors } from "@/lib/services/admin-accounts";
import { pluralize } from "@/lib/datetime";

export const metadata: Metadata = { title: "Akun Tutor" };

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminTutorsPage() {
  const tutors = await listTutors();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Akun Tutor"
        description={`${pluralize(tutors.length, "akun")} tutor terdaftar.`}
        action={<TutorAccountDialog />}
      />

      {tutors.length === 0 ? (
        <EmptyState icon={Users} title="Belum ada akun tutor" description="Tambahkan akun tutor pertama." />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-0.5 p-1.5">
            {tutors.map((tutor) => {
              const expired = tutor.isExpired;
              return (
                <div key={tutor.id} className="flex items-center gap-3 rounded-lg p-2.5">
                  <StudentAvatar name={tutor.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">{tutor.name}</span>
                      {!tutor.isActive ? (
                        <Badge variant="destructive">Nonaktif</Badge>
                      ) : expired ? (
                        <Badge variant="warning">Masa aktif habis</Badge>
                      ) : (
                        <Badge variant="success">Aktif</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{tutor.email}</p>
                    {tutor.activeUntil ? (
                      <p className="text-[11px] text-muted-foreground">Sampai {formatDate(tutor.activeUntil)}</p>
                    ) : null}
                  </div>
                  <ToggleActiveButton accountId={tutor.id} isActive={tutor.isActive} />
                  <TutorAccountDialog tutor={tutor} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
