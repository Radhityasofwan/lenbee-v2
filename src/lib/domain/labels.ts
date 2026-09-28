export const FOCUS_LABELS: Record<string, string> = {
  routine: "Materi rutin",
  review: "Review",
  exam_prep: "Persiapan ulangan",
  homework: "Tugas/PR",
  remedial: "Remedial",
  other: "Lainnya",
};

export const CANCEL_REASON_LABELS: Record<string, string> = {
  cancelled: "Batalkan",
  student_absent: "Anak berhalangan",
  tutor_absent: "Tutor berhalangan",
  holiday: "Libur",
};

export const STATUS_LABELS: Record<string, string> = {
  scheduled: "Terjadwal",
  completed: "Selesai",
  cancelled: "Batal",
  moved: "Dipindahkan",
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  none: "Belum ada",
  draft: "Draft",
  final: "Final",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  unpaid: "Belum dibayar",
  partial: "Dibayar sebagian",
  paid: "Sudah dibayar",
  void: "Dibatalkan",
};

export const ATTENDANCE_LABELS: Record<string, string> = {
  present: "Hadir",
  absent: "Tidak hadir",
};

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  worksheet: "Worksheet",
  exercise: "Soal",
  summary: "Rangkuman",
  material: "Bahan ajar",
  school: "Dokumen sekolah",
  other: "Lainnya",
};

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Aktif",
  archived: "Arsip",
};

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Pilihan ganda",
  short_answer: "Jawaban singkat",
  essay: "Uraian",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Mudah",
  medium: "Sedang",
  hard: "Sulit",
};

export const RATE_UNIT_LABELS: Record<string, string> = {
  per_session: "per pertemuan",
  per_hour: "per jam",
};

export const UPDATE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  final: "Final",
  sent: "Terkirim",
};

export const UPDATE_KIND_LABELS: Record<string, string> = {
  weekly: "Rekap mingguan",
  monthly: "Rekap bulanan",
  brief: "Update singkat",
  daily: "Rekap harian",
  custom: "Periode khusus",
};

export const REPORT_FORMAT_LABELS: Record<string, string> = {
  narrative: "Uraian",
  checklist: "Check/Checklist",
};

export const REPORT_CHECK_REASON_LABELS: Record<string, string> = {
  sudah_mampu: "Sudah mampu",
  dengan_bantuan: "Dengan bantuan",
  perlu_dilatih: "Perlu dilatih",
};

export function labelOf(map: Record<string, string>, key: string | null | undefined, fallback = "—"): string {
  if (!key) return fallback;
  return map[key] ?? fallback;
}
