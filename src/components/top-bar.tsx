"use client";

import { Bell, LogOut, Moon, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState, useSyncExternalStore } from "react";
import { logoutAction } from "@/app/actions/auth";
import { SearchPalette } from "@/components/search/search-palette";
import { StudentAvatar } from "@/components/student-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/role-home";
import { cn } from "@/lib/utils";

function subscribeNoop() {
  return () => {};
}

export function TopBar({ user, unread, logoUrl }: { user: SessionUser; unread: number; logoUrl?: string | null }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [scrolled, setScrolled] = useState(false);

  const dark = mounted && resolvedTheme === "dark";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "safe-top sticky top-0 z-40 transition-[background-color,box-shadow,border-radius] duration-300 motion-reduce:transition-none",
        scrolled
          ? "rounded-b-[28px] border-b border-border/50 bg-primary/35 shadow-md shadow-black/[0.08] backdrop-blur-md supports-[backdrop-filter]:bg-primary/20 dark:shadow-black/30"
          : "rounded-b-none bg-primary/15",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-2 px-4">
        <Link href={ROLE_HOME[user.role]} className="flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo diunggah tutor, dimensi tidak diketahui saat build.
            <img src={logoUrl} alt="Lenbee" className="size-7 rounded-lg object-contain" />
          ) : (
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
              L
            </span>
          )}
          <span className="text-base font-bold tracking-tight">Lenbee</span>
        </Link>

        <div className="flex items-center gap-0.5">
          {user.role === "tutor" ? <SearchPalette /> : null}

          <Link
            href="/notifications"
            aria-label="Notifikasi"
            className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="size-5" />
            {unread > 0 ? (
              <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Menu akun"
              className="ml-0.5 rounded-full transition-opacity active:opacity-70"
            >
              <StudentAvatar name={user.name} src={user.avatarPath ? `/api/files/${user.avatarPath}` : null} size="sm" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
                <span className="text-sm font-semibold text-foreground">{user.name}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user.role !== "super_admin" ? (
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <UserRound />
                    Profil &amp; Pengaturan
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={() => setTheme(dark ? "light" : "dark")}>
                {dark ? <Sun /> : <Moon />}
                {dark ? "Mode terang" : "Mode gelap"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={logoutAction}>
                <DropdownMenuItem asChild variant="destructive">
                  <button type="submit" className="w-full">
                    <LogOut />
                    Keluar
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
