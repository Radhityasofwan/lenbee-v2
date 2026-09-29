"use client";

import {
  CalendarDays,
  ClipboardList,
  House,
  Palette,
  Receipt,
  Settings2,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof House; match?: string[] };

/**
 * Menu utama sengaja dibatasi 4 yang paling sering dipakai — Beranda / Anak / Jadwal / Latihan.
 * Invoice, Dokumen, Bank Soal, dan Laporan ada sebagai pintasan di halaman Beranda.
 */
const TUTOR_NAV: NavItem[] = [
  { href: "/home", label: "Beranda", icon: House },
  { href: "/students", label: "Anak", icon: Users },
  { href: "/schedule", label: "Jadwal", icon: CalendarDays },
  { href: "/assignments", label: "Latihan", icon: ClipboardList },
];

const PARENT_NAV: NavItem[] = [
  { href: "/parent", label: "Beranda", icon: House },
  { href: "/parent/schedule", label: "Jadwal", icon: CalendarDays },
  { href: "/parent/reports", label: "Laporan", icon: Receipt },
  { href: "/parent/invoices", label: "Tagihan", icon: Wallet },
  { href: "/settings", label: "Akun", icon: Settings2 },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/tutors", label: "Tutor", icon: Users },
  { href: "/admin/parents", label: "Orang Tua", icon: UserRound },
  { href: "/admin/theme", label: "Tema", icon: Palette },
];

/** Halaman percakapan Asisten AI sembunyikan nav supaya kolom chat bisa nempel pas di bawah layar. */
const FOCUSED_PREFIXES = ["/asisten/"];

export function BottomNav({ role }: { role: "tutor" | "parent" | "super_admin" }) {
  const pathname = usePathname();
  const items = role === "tutor" ? TUTOR_NAV : role === "parent" ? PARENT_NAV : ADMIN_NAV;
  const isParent = role === "parent";

  if (FOCUSED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <nav className="safe-bottom-gap fixed inset-x-0 bottom-0 z-40 px-3">
      <ul className="mx-auto flex w-full max-w-2xl items-stretch gap-0.5 rounded-full border border-border/70 bg-card/80 px-1.5 py-1.5 shadow-lg shadow-black/[0.08] backdrop-blur-md supports-[backdrop-filter]:bg-card/65 dark:shadow-black/30">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/home" && item.href !== "/parent" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-full px-1 pt-2 pb-1.5 text-[10px] font-medium transition-colors",
                  active ? "bg-primary/12 text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn(isParent ? "size-6" : "size-5", active && "stroke-[2.4]")} />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
