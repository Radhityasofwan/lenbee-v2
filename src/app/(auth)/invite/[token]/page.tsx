import type { Metadata } from "next";
import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StudentAvatar } from "@/components/student-avatar";
import { db } from "@/db";
import { parentInvites, students } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formatDateLong } from "@/lib/datetime";
import { InviteForm } from "./invite-form";
import { UserX } from "lucide-react";

export const metadata: Metadata = { title: "Undangan Orang Tua" };

type Invite = typeof parentInvites.$inferSelect;

function inviteUsable(invite: Invite): boolean {
  return !invite.acceptedAt && invite.expiresAt.getTime() > Date.now();
}

export default async function InvitePage(props: PageProps<"/invite/[token]">) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "parent" ? "/parent" : "/home");

  const { token } = await props.params;

  const rows = await db.select().from(parentInvites).where(eq(parentInvites.token, token)).limit(1);
  const invite = rows[0];

  if (!invite || !inviteUsable(invite)) {
    return (
      <EmptyState
        icon={UserX}
        title={invite ? "Undangan tidak berlaku lagi" : "Undangan tidak ditemukan"}
        description={
          invite?.acceptedAt
            ? "Undangan ini sudah dipakai. Silakan masuk dengan akun Anda."
            : "Minta pengajar mengirim ulang undangan baru untuk Anda."
        }
      />
    );
  }

  const studentIds = (invite.studentIds ?? []).filter((value) => Number.isInteger(value));
  const linked =
    studentIds.length > 0
      ? await db
          .select({ id: students.id, name: students.name, color: students.color })
          .from(students)
          .where(inArray(students.id, studentIds))
      : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Halo, {invite.name}</CardTitle>
        <CardDescription>
          Anda diundang untuk memantau perkembangan belajar anak Anda di Lenbee. Undangan berlaku sampai{" "}
          {formatDateLong(invite.expiresAt.toISOString().slice(0, 10))}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {linked.length > 0 ? (
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Akun anak Anda</p>
            <ul className="flex flex-col gap-2">
              {linked.map((child) => (
                <li key={child.id} className="flex items-center gap-2.5">
                  <StudentAvatar name={child.name} color={child.color} size="sm" />
                  <span className="text-sm font-medium">{child.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <InviteForm token={token} defaultName={invite.name} defaultPhone={invite.phone ?? ""} />
      </CardContent>
    </Card>
  );
}
