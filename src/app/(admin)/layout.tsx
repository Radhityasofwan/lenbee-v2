import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { requireSuperAdmin } from "@/lib/auth";
import { unreadCount } from "@/lib/services/notifications";
import { brandingUrl, getBrandingAsset } from "@/lib/services/settings";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireSuperAdmin();
  const [unread, logo] = await Promise.all([unreadCount(user.id), getBrandingAsset("logo")]);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar user={user} unread={unread} logoUrl={brandingUrl("logo", logo)} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-24">{children}</main>
      <BottomNav role="super_admin" />
    </div>
  );
}
