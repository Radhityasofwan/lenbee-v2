"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronRight, History, Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FcCalendar,
  FcComments,
  FcConferenceCall,
  FcDocument,
  FcGraduationCap,
  FcPaid,
  FcReading,
} from "react-icons/fc";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SearchHit, SearchResultGroup } from "@/lib/services/search";

const GROUPS_ORDER: SearchResultGroup[] = [
  "students",
  "programs",
  "schedules",
  "lessons",
  "reports",
  "invoices",
  "attempts",
  "documents",
];

const GROUP_LABELS: Record<SearchResultGroup, string> = {
  students: "Profil",
  programs: "Program belajar",
  schedules: "Jadwal",
  lessons: "Riwayat",
  reports: "Laporan",
  invoices: "Invoice",
  attempts: "Hasil latihan",
  documents: "Dokumen",
};

const GROUP_ICONS: Record<SearchResultGroup, ComponentType<{ className?: string }>> = {
  students: FcConferenceCall,
  programs: FcReading,
  schedules: FcCalendar,
  lessons: History,
  reports: FcComments,
  invoices: FcPaid,
  attempts: FcGraduationCap,
  documents: FcDocument,
};

const DEBOUNCE_MS = 250;

/** Search ala spotlight — trigger ikon di navbar + Cmd/Ctrl+K dari mana saja, hasil live sambil mengetik. */
export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || !trimmed) return;

    setLoading(true);
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data: { hits?: SearchHit[] }) => {
          if (requestId !== requestIdRef.current) return;
          setHits(data.hits ?? []);
          setActiveIndex(0);
        })
        .catch(() => {
          if (requestId === requestIdRef.current) setHits([]);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, open]);

  function updateQuery(value: string) {
    setQuery(value);
    setActiveIndex(0);
    if (!value.trim()) {
      setHits([]);
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setQuery("");
    setHits([]);
  }

  function go(href: string) {
    close();
    router.push(href);
  }

  const groups = useMemo(
    () =>
      GROUPS_ORDER.map((group) => ({ group, hits: hits.filter((hit) => hit.group === group) })).filter(
        (entry) => entry.hits.length > 0,
      ),
    [hits],
  );

  const trimmedQuery = query.trim();

  return (
    <>
      <button
        type="button"
        aria-label="Cari"
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Search className="size-5" />
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              inputRef.current?.focus();
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && hits.length > 0) {
                event.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, hits.length - 1));
              } else if (event.key === "ArrowUp" && hits.length > 0) {
                event.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (event.key === "Enter") {
                const target = hits[activeIndex];
                if (target) {
                  event.preventDefault();
                  go(target.href);
                }
              }
            }}
            className={cn(
              "fixed top-[12vh] left-1/2 z-50 flex max-h-[72vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            )}
          >
            <DialogPrimitive.Title className="sr-only">Cari</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Cari anak, program, jadwal, riwayat, laporan, invoice, hasil latihan, dan dokumen.
            </DialogPrimitive.Description>

            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari anak, materi, jadwal, invoice…"
                maxLength={120}
                className="h-6 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" /> : null}
              <DialogPrimitive.Close
                aria-label="Tutup"
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {!trimmedQuery ? (
                <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
                  <Search className="size-6 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Mulai mengetik untuk mencari</p>
                  <p className="text-xs text-muted-foreground">
                    Anak, program, jadwal, laporan, invoice, hasil latihan, dokumen.
                  </p>
                </div>
              ) : !loading && hits.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
                  <Search className="size-6 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Tidak ada hasil untuk &ldquo;{trimmedQuery}&rdquo;</p>
                  <p className="text-xs text-muted-foreground">Coba kata kunci atau ejaan lain.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {groups.map(({ group, hits: groupHits }) => {
                    const Icon = GROUP_ICONS[group];
                    return (
                      <div key={group} className="flex flex-col gap-0.5">
                        <p className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                          <Icon className="size-3.5" />
                          {GROUP_LABELS[group]}
                        </p>
                        {groupHits.map((hit) => {
                          const globalIndex = hits.indexOf(hit);
                          const active = globalIndex === activeIndex;
                          return (
                            <Link
                              key={`${hit.group}-${hit.id}`}
                              href={hit.href}
                              onClick={close}
                              onMouseEnter={() => setActiveIndex(globalIndex)}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
                                active ? "bg-muted" : "hover:bg-muted",
                              )}
                            >
                              {hit.studentName ? (
                                <StudentAvatar name={hit.studentName} color={hit.studentColor} size="sm" />
                              ) : (
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                  <Icon className="size-4" />
                                </span>
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{hit.title}</span>
                                {hit.subtitle ? (
                                  <span className="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>
                                ) : null}
                              </span>
                              {hit.meta ? (
                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                  {hit.meta}
                                </Badge>
                              ) : null}
                              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              <span>↑↓ navigasi · Enter buka · Esc tutup</span>
              <span className="font-medium">⌘K</span>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
