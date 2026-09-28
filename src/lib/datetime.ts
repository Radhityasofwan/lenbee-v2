/**
 * Semua tanggal domain direpresentasikan sebagai string `YYYY-MM-DD` dan jam sebagai
 * `HH:MM` (tanpa zona waktu) supaya tidak ada pergeseran hari antara MySQL DATE/TIME
 * dan objek Date di JavaScript.
 */

export const DAY_NAMES_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;
export const DAY_SHORT_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;
export const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function addMonths(key: string, months: number): string {
  const d = parseDateKey(key);
  d.setMonth(d.getMonth() + months);
  return toDateKey(d);
}

export function dayOfWeek(key: string): number {
  return parseDateKey(key).getDay();
}

export function diffDays(a: string, b: string): number {
  const ms = parseDateKey(a).getTime() - parseDateKey(b).getTime();
  return Math.round(ms / 86_400_000);
}

/** Senin sebagai hari pertama. */
export function startOfWeek(key: string): string {
  const dow = dayOfWeek(key);
  const delta = dow === 0 ? -6 : 1 - dow;
  return addDays(key, delta);
}

export function endOfWeek(key: string): string {
  return addDays(startOfWeek(key), 6);
}

export function startOfMonth(key: string): string {
  const d = parseDateKey(key);
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(key: string): string {
  const d = parseDateKey(key);
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/**
 * Periode belajar anak berulang tiap bulan, dijangkarkan ke tanggal mulai les (`anchor`) —
 * bukan tanggal 1 kalender. Contoh: anchor 25 Agustus → periode berjalan 25 Agu–24 Sep,
 * lalu 25 Sep–24 Okt, dst. Dipakai untuk hitungan pertemuan & invoice per anak.
 * `anchor` null (anak lama tanpa tanggal mulai) → jatuh balik ke bulan kalender.
 */
export function currentPeriodFor(anchor: string | null, today: string = todayKey()): { periodStart: string; periodEnd: string } {
  if (!anchor) return { periodStart: startOfMonth(today), periodEnd: endOfMonth(today) };

  const anchorDate = parseDateKey(anchor);
  if (anchorDate > parseDateKey(today)) {
    return { periodStart: anchor, periodEnd: addDays(addMonths(anchor, 1), -1) };
  }

  const anchorDay = anchorDate.getDate();
  const clampToMonth = (year: number, month: number, day: number): Date => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDay));
  };

  const t = parseDateKey(today);
  let start = clampToMonth(t.getFullYear(), t.getMonth(), anchorDay);
  if (start > t) start = clampToMonth(t.getFullYear(), t.getMonth() - 1, anchorDay);
  if (start < anchorDate) start = anchorDate;

  const startKey = toDateKey(start);
  const nextStart = clampToMonth(start.getFullYear(), start.getMonth() + 1, anchorDay);
  return { periodStart: startKey, periodEnd: addDays(toDateKey(nextStart), -1) };
}

export function formatDateLong(key: string): string {
  const d = parseDateKey(key);
  return `${DAY_NAMES_ID[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(key: string): string {
  const d = parseDateKey(key);
  return `${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()].slice(0, 3)}`;
}

export function formatDateNumeric(key: string): string {
  const d = parseDateKey(key);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function formatMonthYear(key: string): string {
  const d = parseDateKey(key);
  return `${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/** Sapaan berdasarkan jam saat ini (waktu lokal perangkat). */
export function greetingForHour(hour: number = new Date().getHours()): string {
  if (hour < 4) return "Selamat malam";
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

export function relativeDayLabel(key: string, today = todayKey()): string {
  const delta = diffDays(key, today);
  if (delta === 0) return "Hari ini";
  if (delta === 1) return "Besok";
  if (delta === -1) return "Kemarin";
  if (delta > 1 && delta < 7) return DAY_NAMES_ID[dayOfWeek(key)];
  return formatDateShort(key);
}

/* ----------------------------- Time helpers ----------------------------- */

/** Menerima `HH:MM` atau `HH:MM:SS`, mengembalikan `HH:MM`. */
export function normalizeTime(value: string): string {
  const parts = value.split(":");
  return `${(parts[0] ?? "00").padStart(2, "0")}:${(parts[1] ?? "00").padStart(2, "0")}`;
}

/** Menerima `HH:MM` atau `HH:MM:SS`, mengembalikan `HH:MM:SS`. */
export function toSqlTime(value: string): string {
  const normalized = normalizeTime(value);
  return `${normalized}:00`;
}

export function addMinutesToTime(value: string, minutes: number): string {
  const [h, m] = normalizeTime(value).split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(((total % 1440) + 1440) % 1440 / 60)).padStart(2, "0");
  const mm = String(((total % 60) + 60) % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function timeRangeLabel(start: string, end: string): string {
  return `${normalizeTime(start)}–${normalizeTime(end)}`;
}

export function nowSqlTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
}

/* ----------------------------- Formatting ----------------------------- */

export function formatCurrency(value: number): string {
  return `Rp${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;
}

export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1).replace(".0", "")}jt`;
  if (Math.abs(value) >= 1_000) return `Rp${(value / 1_000).toFixed(0)}rb`;
  return `Rp${value}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} jam` : `${h} jam ${m} menit`;
}

export function pluralize(count: number, word: string): string {
  return `${count} ${word}`;
}
