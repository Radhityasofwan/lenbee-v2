import type { Metadata } from "next";
import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { StudentAvatar } from "@/components/student-avatar";
import { db } from "@/db";
import { parentInvites, students } from "@/db/schema";
import { getCurrentUser, ROLE_HOME } from "@/lib/auth";
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
  if (user) redirect(ROLE_HOME[user.role]);

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
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Halo, {invite.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Anda diundang untuk memantau perkembangan belajar anak Anda di Lenbee. Undangan berlaku sampai{" "}
          {formatDateLong(invite.expiresAt.toISOString().slice(0, 10))}.
        </p>
      </div>

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
    </div>
  );
}
