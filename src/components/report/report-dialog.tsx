"use client";

import { Check, CirclePlus, Loader2, MessageCircle, Pencil, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  createParentUpdateAction,
  deleteParentUpdateAction,
  latestChecklistLabelsAction,
  sendParentUpdateAction,
  updateParentUpdateAction,
} from "@/app/actions/reports";
import { endOfMonth, endOfWeek, formatDateShort, formatMonthYear, startOfMonth, startOfWeek, todayKey } from "@/lib/datetime";
import { REPORT_CHECK_REASON_LABELS, REPORT_FORMAT_LABELS, UPDATE_KIND_LABELS, UPDATE_STATUS_LABELS } from "@/lib/domain/labels";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { useOrigin } from "@/lib/hooks/use-origin";
import { cn } from "@/lib/utils";
import { whatsappHref } from "@/lib/whatsapp";

export type ReportFormStudent = {
  id: number;
  name: string;
  nickname: string | null;
  reportFormat: string;
  periodStart: string | null;
  periodEnd: string | null;
  parentPhone: string | null;
};

export type EditableReport = {
  id: number;
  title: string;
  studentId: number;
  periodStart: string;
  periodEnd: string;
  body: string;
  kind: string;
  format: string;
  status: string;
  aiGenerated: boolean;
  checkItems: { label: string; checked: boolean; reason: string | null }[];
};

/** Baris checklist yang sedang diedit di dialog. */
type CheckRow = { key: string; label: string; checked: boolean; reason: string };

let rowSeq = 0;
const newRow = (label = ""): CheckRow => ({ key: `row-${(rowSeq += 1)}`, label, checked: false, reason: "" });

/** Periode yang masuk akal untuk tiap jenis rangkuman. */
export function periodForKind(kind: string, today = todayKey()): { periodStart: string; periodEnd: string } {
  if (kind === "monthly") return { periodStart: startOfMonth(today), periodEnd: endOfMonth(today) };
  if (kind === "brief" || kind === "daily") return { periodStart: today, periodEnd: today };
  if (kind === "custom") return { periodStart: today, periodEnd: today };
  return { periodStart: startOfWeek(today), periodEnd: endOfWeek(today) };
}

/** Periode dari data anak, hanya bila keduanya terisi. */
export function studentPeriod(student?: ReportFormStudent): { periodStart: string; periodEnd: string } | null {
  if (!student?.periodStart || !student.periodEnd) return null;
  return { periodStart: student.periodStart, periodEnd: student.periodEnd };
}

function autoTitleFor(kind: string, studentLabel: string, periodStart: string, periodEnd: string): string {
  if (!studentLabel || !periodStart || !periodEnd) return "";
  if (kind === "monthly") return `Rangkuman bulanan ${studentLabel} · ${formatMonthYear(periodStart)}`;
  if (kind === "brief") return `Update singkat ${studentLabel} · ${formatDateShort(periodStart)} – ${formatDateShort(periodEnd)}`;
  if (kind === "daily") return `Laporan harian ${studentLabel} · ${formatDateShort(periodStart)}`;
  if (kind === "custom")
    return `Laporan ${studentLabel} · ${formatDateShort(periodStart)} – ${formatDateShort(periodEnd)}`;
  return `Rangkuman mingguan ${studentLabel} · ${formatDateShort(periodStart)} – ${formatDateShort(periodEnd)}`;
}

export function ReportDialog({
  students,
  report,
  defaultStudentId,
}: {
  students: ReportFormStudent[];
  report?: EditableReport;
  defaultStudentId?: number;
}) {
  const router = useRouter();
  const isEdit = Boolean(report);

  const [openDialog, setOpenDialog] = useState<"form" | "delete" | null>(null);
  const [createState, createAction] = useActionState(createParentUpdateAction, idleState);
  const [updateState, updateAction] = useActionState(updateParentUpdateAction, idleState);
  const [sendState, sendAction] = useActionState(sendParentUpdateAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteParentUpdateAction, idleState);

  const initialStudentId = report
    ? String(report.studentId)
    : defaultStudentId
      ? String(defaultStudentId)
      : String(students[0]?.id ?? "");
  const initialStudent = students.find((item) => String(item.id) === initialStudentId);
  const initialStudentPeriod = studentPeriod(initialStudent);

  const [studentId, setStudentId] = useState(initialStudentId);
  const [kind, setKind] = useState(report?.kind ?? "weekly");
  const [format, setFormat] = useState(report?.format ?? initialStudent?.reportFormat ?? "narrative");
  const [checkItems, setCheckItems] = useState<CheckRow[]>(
    report?.checkItems.map((item) => ({
      key: `row-${(rowSeq += 1)}`,
      label: item.label,
      checked: item.checked,
      reason: item.reason ?? "",
    })) ?? [],
  );
  const [periodStart, setPeriodStart] = useState(
    report?.periodStart ?? initialStudentPeriod?.periodStart ?? startOfWeek(todayKey()),
  );
  const [periodEnd, setPeriodEnd] = useState(
    report?.periodEnd ?? initialStudentPeriod?.periodEnd ?? endOfWeek(todayKey()),
  );
  const [periodTouched, setPeriodTouched] = useState(Boolean(report));
  /** Sumber periode otomatis: dari data anak atau preset jenis rangkuman. */
  const periodSourceRef = useRef<"student" | "kind">(initialStudentPeriod ? "student" : "kind");
  const [titleOverride, setTitleOverride] = useState<string | null>(report?.title ?? null);
  const [body, setBody] = useState(report?.body ?? "");
  const [usedAi, setUsedAi] = useState(report?.aiGenerated ?? false);
  const [generating, setGenerating] = useState(false);
  const prefillRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const student = students.find((item) => String(item.id) === studentId);
  const studentLabel = student ? student.nickname || student.name : "";
  const autoTitle = autoTitleFor(kind, studentLabel, periodStart, periodEnd);

  const title = titleOverride ?? autoTitle;
  const isChecklist = format === "checklist";

  function handleKindChange(next: string) {
    setKind(next);
    // Periode dari data anak tidak ditimpa preset kalender.
    if (!periodTouched && periodSourceRef.current === "kind") {
      const preset = periodForKind(next);
      setPeriodStart(preset.periodStart);
      setPeriodEnd(preset.periodEnd);
    }
    if (titleOverride) setTitleOverride(autoTitleFor(next, studentLabel, periodStart, periodEnd));
  }

  function handleStudentChange(next: string) {
    setStudentId(next);
    const nextStudent = students.find((item) => String(item.id) === next);
    if (!nextStudent || isEdit) return;

    if (prefillRef.current !== next) setFormat(nextStudent.reportFormat);

    const period = studentPeriod(nextStudent);
    if (period) {
      setPeriodStart(period.periodStart);
      setPeriodEnd(period.periodEnd);
      periodSourceRef.current = "student";
    } else {
      const preset = periodForKind(kind);
      setPeriodStart(preset.periodStart);
      setPeriodEnd(preset.periodEnd);
      periodSourceRef.current = "kind";
    }
    // Murid berganti: periode otomatis dianggap belum diubah manual.
    setPeriodTouched(false);
  }

  function handleFormatChange(next: string) {
    setFormat(next);
    if (next === "checklist" && checkItems.length === 0) void loadLastItems();
  }

  /** Ambil nama item dari laporan checklist terakhir anak ini sebagai titik awal. */
  async function loadLastItems() {
    if (!studentId) return;
    const labels = await latestChecklistLabelsAction(Number(studentId));
    if (labels.length === 0) {
      toast.info("Belum ada laporan checklist sebelumnya untuk anak ini.");
      return;
    }
    setCheckItems(labels.map((label) => newRow(label)));
  }

  // Anak dengan format checklist default: dialog baru langsung terisi item terakhirnya.
  useEffect(() => {
    if (isEdit || format !== "checklist" || !studentId) return;
    if (prefillRef.current === studentId) return;
    prefillRef.current = studentId;
    if (checkItems.length > 0) return;
    void loadLastItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, studentId, isEdit]);

  const updateRow = (key: string, patch: Partial<CheckRow>) => {
    setCheckItems((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const toggleRow = (key: string) => {
    setCheckItems((rows) =>
      rows.map((row) =>
        row.key === key
          ? { ...row, checked: !row.checked, reason: row.checked ? row.reason : "" }
          : row,
      ),
    );
  };

  useActionToast(
    [createState, updateState, sendState, deleteState].find((state) => state.message) ?? idleState,
    () => {
      setOpenDialog(null);
      router.refresh();
    },
  );

  async function handleGenerate() {
    if (!studentId || !periodStart || !periodEnd) {
      toast.error("Pilih murid dan periode terlebih dahulu.");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/ai/parent-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          periodStart,
          periodEnd,
          body: body.trim().length >= 20 ? body : undefined,
        }),
      });
      const payload = (await response.json()) as { text?: string; usedAi?: boolean; error?: string };
      if (!response.ok || !payload.text) {
        toast.error(payload.error ?? "Gagal membuat rangkuman.");
        return;
      }
      setBody(payload.text);
      setUsedAi(Boolean(payload.usedAi));
      toast.success(
        payload.usedAi
          ? "Rangkuman dibuat dengan AI."
          : "Rangkuman disusun dari data les Anda (AI belum dikonfigurasi).",
      );
    } catch {
      toast.error("Gagal menghubungi layanan AI.");
    } finally {
      setGenerating(false);
    }
  }

  const activeState = isEdit ? updateState : createState;
  const errors = activeState.fieldErrors ?? {};
  const action = isEdit ? updateAction : createAction;

  const selectedStudent = students.find((item) => String(item.id) === studentId);
  const origin = useOrigin();
  const parentReportMessage = report
    ? `Halo, ini rangkuman perkembangan ${selectedStudent?.nickname || selectedStudent?.name || ""}:\n\n${report.body}${
        origin ? `\n\nLihat juga di ${origin}/parent/reports/${report.id}` : ""
      }`
    : "";

  /** Zod memakai path bersarang, jadi error baris checklist ada di "checkItems.<index>.reason". */
  const checkItemError = (index: number) =>
    errors[`checkItems.${index}.reason`] ?? errors[`checkItems.${index}.label`];

  return (
    <div className="flex shrink-0 items-center gap-1">
      {isEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => setOpenDialog("form")}
          aria-label={`Ubah ${report?.title}`}
        >
          <Pencil />
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpenDialog("form")}>
          <Plus />
          Buat rangkuman
        </Button>
      )}

      <Dialog open={openDialog === "form"} onOpenChange={(open) => setOpenDialog(open ? "form" : null)}>
        <DialogContent className="sm:max-w-lg">
          <form ref={formRef} action={action} className="flex min-h-0 flex-1 flex-col">
            {isEdit ? <input type="hidden" name="updateId" value={report?.id} /> : null}
            <input type="hidden" name="aiGenerated" value={usedAi ? "true" : "false"} />

            <DialogHeader>
              <DialogTitle>{isEdit ? "Ubah rangkuman" : "Buat rangkuman"}</DialogTitle>
              <DialogDescription>
                Rangkuman diambil dari sesi les yang sudah selesai pada periode ini.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="flex flex-col gap-4">
              {activeState.message && !activeState.ok ? (
                <FormAlert tone="error">{activeState.message}</FormAlert>
              ) : null}

              <FieldGroup>
                <Field label="Murid" htmlFor="report-student">
                  {/* Select disabled tidak ikut terkirim, jadi murid dibawa lewat hidden input saat edit. */}
                  {isEdit ? <input type="hidden" name="studentId" value={studentId} /> : null}
                  <Select value={studentId} onValueChange={handleStudentChange} disabled={isEdit}>
                    <SelectTrigger id="report-student">
                      <SelectValue placeholder="Pilih murid" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.nickname || item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Jenis rangkuman" htmlFor="report-kind">
                  <Select name="kind" value={kind} onValueChange={handleKindChange}>
                    <SelectTrigger id="report-kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UPDATE_KIND_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label="Format laporan"
                  htmlFor="report-format"
                  hint={isChecklist ? "Tandai item yang sudah mampu. Item belum check wajib punya alasan." : "Uraian bebas seperti laporan yang sudah ada."}
                >
                  <Select name="format" value={format} onValueChange={handleFormatChange}>
                    <SelectTrigger id="report-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REPORT_FORMAT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <input
                  type="hidden"
                  name="checkItems"
                  value={JSON.stringify(
                    checkItems.map((row) => ({
                      label: row.label,
                      checked: row.checked,
                      reason: row.checked ? null : row.reason || null,
                    })),
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Awal periode" htmlFor="report-period-start" error={errors.periodStart}>
                    <Input
                      id="report-period-start"
                      name="periodStart"
                      type="date"
                      value={periodStart}
                      onChange={(event) => {
                        setPeriodTouched(true);
                        setPeriodStart(event.target.value);
                      }}
                      required
                    />
                  </Field>
                  <Field label="Akhir periode" htmlFor="report-period-end" error={errors.periodEnd}>
                    <Input
                      id="report-period-end"
                      name="periodEnd"
                      type="date"
                      value={periodEnd}
                      onChange={(event) => {
                        setPeriodTouched(true);
                        setPeriodEnd(event.target.value);
                      }}
                      required
                    />
                  </Field>
                </div>

                <Field label="Judul" htmlFor="report-title" error={errors.title} required>
                  <Input
                    id="report-title"
                    name="title"
                    value={title}
                    onChange={(event) => setTitleOverride(event.target.value)}
                    required
                  />
                </Field>

                <Field
                  label="Isi rangkuman"
                  htmlFor="report-body"
                  hint={isChecklist ? "Opsional. Dipakai sebagai catatan tambahan di atas checklist." : "Bisa ditulis sendiri atau dibuat otomatis dari data les."}
                  error={errors.body}
                  required={!isChecklist}
                >
                  <Textarea
                    id="report-body"
                    name="body"
                    rows={isChecklist ? 4 : 10}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder={isChecklist ? "Catatan singkat (opsional)…" : "Tuliskan perkembangan anak selama periode ini…"}
                    required={!isChecklist}
                  />
                </Field>

                {isChecklist ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">Item checklist</span>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => void loadLastItems()}>
                          <Sparkles />
                          Muat item terakhir
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setCheckItems((rows) => [...rows, newRow()])}>
                          <CirclePlus />
                          Tambah item
                        </Button>
                      </div>
                    </div>

                    {checkItems.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                        Belum ada item. Tambahkan item, atau muat dari laporan checklist terakhir anak ini.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {checkItems.map((row, index) => (
                          <li key={row.key} className="flex flex-col gap-2 rounded-lg border border-border p-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleRow(row.key)}
                                aria-label={row.checked ? `Tandai belum check ${row.label}` : `Tandai sudah mampu ${row.label}`}
                                className={cn(
                                  "flex size-6 shrink-0 items-center justify-center rounded-md border text-xs",
                                  row.checked
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border text-muted-foreground",
                                )}
                              >
                                {row.checked ? <Check /> : null}
                              </button>
                              <Input
                                value={row.label}
                                onChange={(event) => updateRow(row.key, { label: event.target.value })}
                                placeholder="Nama item, mis. Food & Drink"
                                aria-label={`Nama item ${index + 1}`}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => setCheckItems((rows) => rows.filter((item) => item.key !== row.key))}
                                aria-label={`Hapus item ${row.label}`}
                              >
                                <Trash2 />
                              </Button>
                            </div>

                            {!row.checked ? (
                              <div className="flex items-center gap-2 pl-8">
                                <span className="text-xs text-muted-foreground">Alasan</span>
                                <Select
                                  value={row.reason || undefined}
                                  onValueChange={(value) => updateRow(row.key, { reason: value })}
                                >
                                  <SelectTrigger className="h-8 flex-1 text-xs">
                                    <SelectValue placeholder="Pilih alasan" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(REPORT_CHECK_REASON_LABELS).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : null}

                            {checkItemError(index) ? (
                              <p className="pl-8 text-xs text-destructive">{checkItemError(index)}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}

                    {errors.checkItems ? <p className="text-xs text-destructive">{errors.checkItems}</p> : null}
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={handleGenerate} disabled={generating}>
                    {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                    {generating ? "Menyusun…" : body ? "Susun ulang dengan AI" : "Susun dengan AI"}
                  </Button>
                )}

                <Field label="Status" htmlFor="report-status">
                  <Select name="status" defaultValue={report?.status ?? "draft"}>
                    <SelectTrigger id="report-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UPDATE_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </DialogBody>

            <DialogFooter className="flex-wrap">
              {isEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mr-auto text-muted-foreground hover:text-destructive"
                  onClick={() => setOpenDialog("delete")}
                >
                  <Trash2 />
                  Hapus
                </Button>
              ) : null}
              <Button type="button" variant="ghost" onClick={() => setOpenDialog(null)}>
                Batal
              </Button>
              <SubmitButton pendingLabel="Menyimpan…">Simpan</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isEdit ? (
        <form action={sendAction} className="flex">
          <input type="hidden" name="updateId" value={report?.id} />
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label={`Kirim ${report?.title}`}
            disabled={report?.status === "sent"}
          >
            <Send />
          </Button>
        </form>
      ) : null}

      {isEdit ? (
        <Button asChild variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Kirim ${report?.title} lewat WhatsApp`}>
          <a href={whatsappHref(selectedStudent?.parentPhone, parentReportMessage)} target="_blank" rel="noreferrer">
            <MessageCircle />
          </a>
        </Button>
      ) : null}

      {isEdit ? (
        <Dialog open={openDialog === "delete"} onOpenChange={(open) => setOpenDialog(open ? "delete" : null)}>
          <DialogContent>
            <form action={deleteAction} className="flex min-h-0 flex-1 flex-col">
              <input type="hidden" name="updateId" value={report?.id} />
              <DialogHeader>
                <DialogTitle>Hapus rangkuman?</DialogTitle>
                <DialogDescription>
                  Rangkuman ini akan hilang dari halaman orang tua. Tindakan ini tidak bisa dibatalkan.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                {deleteState.message && !deleteState.ok ? (
                  <FormAlert tone="error">{deleteState.message}</FormAlert>
                ) : null}
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpenDialog(null)}>
                  Batal
                </Button>
                <SubmitButton variant="destructive" pendingLabel="Menghapus…">
                  Hapus permanen
                </SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
