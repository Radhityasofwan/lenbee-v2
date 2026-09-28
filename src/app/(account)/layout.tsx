import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { requireUser } from "@/lib/auth";
import { unreadCount } from "@/lib/services/notifications";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await unreadCount(user.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar user={user} unread={unread} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-24">{children}</main>
      <BottomNav role={user.role} />
    </div>
  );
}
