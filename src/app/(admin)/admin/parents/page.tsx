import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { ParentAccountDialog } from "@/components/admin/parent-account-dialog";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ToggleActiveButton } from "@/components/admin/toggle-active-button";
import { listParents, studentOptionsForPicker } from "@/lib/services/admin-accounts";
import { pluralize } from "@/lib/datetime";

export const metadata: Metadata = { title: "Akun Orang Tua" };

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminParentsPage() {
  const [parents, studentOptions] = await Promise.all([listParents(), studentOptionsForPicker()]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Akun Orang Tua"
        description={`${pluralize(parents.length, "akun")} orang tua terdaftar.`}
        action={<ParentAccountDialog studentOptions={studentOptions} />}
      />

      {parents.length === 0 ? (
        <EmptyState icon={UserRound} title="Belum ada akun orang tua" description="Tambahkan akun orang tua pertama." />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-0.5 p-1.5">
            {parents.map((parent) => {
              const expired = parent.isExpired;
              return (
                <div key={parent.id} className="flex items-center gap-3 rounded-lg p-2.5">
                  <StudentAvatar name={parent.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">{parent.name}</span>
                      {!parent.isActive ? (
                        <Badge variant="destructive">Nonaktif</Badge>
                      ) : expired ? (
                        <Badge variant="warning">Masa aktif habis</Badge>
                      ) : (
                        <Badge variant="success">Aktif</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{parent.email}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {parent.linkedStudents.length > 0
                        ? parent.linkedStudents.map((s) => s.name).join(", ")
                        : "Belum ada anak tertaut"}
                      {parent.activeUntil ? ` · Sampai ${formatDate(parent.activeUntil)}` : ""}
                    </p>
                  </div>
                  <ToggleActiveButton accountId={parent.id} isActive={parent.isActive} />
                  <ParentAccountDialog parent={parent} studentOptions={studentOptions} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
