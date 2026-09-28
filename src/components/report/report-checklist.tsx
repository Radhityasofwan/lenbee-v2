import { Check, CircleCheckBig, Sprout, Square } from "lucide-react";
import { REPORT_CHECK_REASON_LABELS, labelOf } from "@/lib/domain/labels";

export type ReportChecklistItem = {
  label: string;
  checked: boolean;
  reason: string | null;
};

/**
 * Render checklist laporan, dikelompokkan jadi "sudah dikuasai" vs "masih dilatih" supaya orang tua
 * langsung bisa lihat mana yang perlu perhatian tanpa membaca satu-satu. Tanpa state: dipakai sisi tutor maupun orang tua.
 */
export function ReportChecklist({ items }: { items: ReportChecklistItem[] }) {
  if (items.length === 0) return null;

  const mastered = items.filter((item) => item.checked);
  const practicing = items.filter((item) => !item.checked);

  return (
    <div className="flex flex-col gap-3">
      {mastered.length > 0 ? (
        <div className="rounded-2xl border border-success/20 bg-success/[0.06] p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-success uppercase">
            <CircleCheckBig className="size-3.5" />
            Sudah dikuasai · {mastered.length}
          </p>
          <ul className="flex flex-col gap-1.5">
            {mastered.map((item, index) => (
              <li key={`${item.label}-${index}`} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {practicing.length > 0 ? (
        <div className="rounded-2xl border border-warning/25 bg-warning/[0.08] p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-warning-foreground uppercase">
            <Sprout className="size-3.5" />
            Masih dilatih · {practicing.length}
          </p>
          <ul className="flex flex-col gap-2.5">
            {practicing.map((item, index) => (
              <li key={`${item.label}-${index}`} className="flex flex-col gap-0.5">
                <span className="flex items-start gap-2 text-sm font-medium text-foreground">
                  <Square className="mt-0.5 size-3.5 shrink-0 text-warning-foreground/50" />
                  {item.label}
                </span>
                <span className="pl-[1.375rem] text-xs text-muted-foreground">
                  {labelOf(REPORT_CHECK_REASON_LABELS, item.reason, "Belum ada catatan")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
