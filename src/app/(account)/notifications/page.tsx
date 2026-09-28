import type { Metadata } from "next";
import { MarkAllButton, NotificationList } from "./notification-list";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { listNotifications, syncParentNotifications, syncTutorNotifications } from "@/lib/services/notifications";

export const metadata: Metadata = { title: "Notifikasi" };

export default async function NotificationsPage() {
  const user = await requireUser();

  await (user.role === "tutor" ? syncTutorNotifications(user.id) : syncParentNotifications(user.id)).catch(() => {});

  const rows = await listNotifications(user.id, 50);
  const items = rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    isRead: row.isRead,
    createdAt: row.createdAt.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  const unread = items.filter((item) => !item.isRead).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Notifikasi"
        description={unread > 0 ? `${unread} notifikasi belum dibaca.` : "Semua notifikasi sudah dibaca."}
        action={unread > 0 ? <MarkAllButton disabled={false} /> : null}
      />
      <NotificationList items={items} />
    </div>
  );
}
