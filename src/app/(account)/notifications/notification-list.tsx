"use client";

import { Bell, Check, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/actions/account";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export function MarkAllButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [state, action] = useActionState(markAllNotificationsReadAction, idleState);

  useActionToast(state, () => router.refresh());

  return (
    <form action={action}>
      <SubmitButton variant="outline" size="sm" pendingLabel="Menandai…" disabled={disabled}>
        <CheckCheck />
        Tandai semua
      </SubmitButton>
    </form>
  );
}

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [state, action] = useActionState(markNotificationReadAction, idleState);

  useActionToast(state, () => router.refresh());

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Belum ada notifikasi"
        description="Pengingat jadwal, laporan, dan tagihan akan muncul di sini."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const content = (
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start gap-2">
              <p className={cn("min-w-0 flex-1 text-sm", item.isRead ? "font-medium" : "font-semibold")}>{item.title}</p>
              {!item.isRead ? <Badge variant="destructive">Baru</Badge> : null}
            </div>
            {item.body ? <p className="text-xs leading-snug text-muted-foreground">{item.body}</p> : null}
            <p className="text-[11px] text-muted-foreground">{item.createdAt}</p>
          </div>
        );

        return (
          <li
            key={item.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3.5",
              item.isRead ? "border-border bg-card" : "border-primary/30 bg-primary/5",
            )}
          >
            {item.link ? (
              <Link href={item.link} className="flex min-w-0 flex-1 items-start gap-3">
                {content}
              </Link>
            ) : (
              content
            )}

            {!item.isRead ? (
              <form action={action} className="shrink-0">
                <input type="hidden" name="notificationId" value={item.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  aria-label={`Tandai dibaca: ${item.title}`}
                >
                  <Check />
                </Button>
              </form>
            ) : null}
          </li>
        );
      })}
      {state.message && !state.ok ? <li className="text-xs text-destructive">{state.message}</li> : null}
    </ul>
  );
}
