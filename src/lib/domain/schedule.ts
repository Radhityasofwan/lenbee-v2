import { addDays, addMinutesToTime, dayOfWeek, diffDays, parseDateKey, toSqlTime } from "@/lib/datetime";

export type ScheduleTemplate = {
  id: number;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  frequency: "weekly" | "biweekly";
  startDate: string;
  endDate: string | null;
  isActive: boolean;
};

export type GeneratedOccurrence = {
  scheduleId: number;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

const MAX_RANGE_DAYS = 400;

/**
 * Memperluas jadwal rutin menjadi daftar pertemuan konkret dalam rentang tanggal.
 * Murni & deterministik supaya bisa diuji dan idempotent saat dipanggil berulang.
 */
export function expandSchedule(
  template: ScheduleTemplate,
  rangeStart: string,
  rangeEnd: string,
): GeneratedOccurrence[] {
  if (!template.isActive) return [];

  const from = rangeStart > template.startDate ? rangeStart : template.startDate;
  const to = template.endDate && template.endDate < rangeEnd ? template.endDate : rangeEnd;
  if (from > to) return [];

  const span = diffDays(to, from);
  if (span > MAX_RANGE_DAYS) {
    throw new Error(`Rentang generate jadwal terlalu besar (${span} hari)`);
  }

  const occurrences: GeneratedOccurrence[] = [];
  let cursor = from;
  // Geser ke hari yang cocok pertama.
  const firstDelta = (template.dayOfWeek - dayOfWeek(cursor) + 7) % 7;
  cursor = addDays(cursor, firstDelta);

  while (cursor <= to) {
    if (isActiveWeek(template, cursor)) {
      occurrences.push({
        scheduleId: template.id,
        date: cursor,
        startTime: toSqlTime(template.startTime),
        endTime: addMinutesToTime(template.startTime, template.durationMinutes) + ":00",
        durationMinutes: template.durationMinutes,
      });
    }
    cursor = addDays(cursor, 7);
  }
  return occurrences;
}

function isActiveWeek(template: ScheduleTemplate, date: string): boolean {
  if (template.frequency === "weekly") return true;
  const weeks = Math.floor(diffDays(date, template.startDate) / 7);
  return weeks % 2 === 0;
}

export function expandAll(
  templates: ScheduleTemplate[],
  rangeStart: string,
  rangeEnd: string,
): GeneratedOccurrence[] {
  return templates.flatMap((t) => expandSchedule(t, rangeStart, rangeEnd));
}

/** Jadwal mundur untuk kalender (tanggal → occurrence). */
export function groupByDate(occurrences: GeneratedOccurrence[]): Map<string, GeneratedOccurrence[]> {
  const map = new Map<string, GeneratedOccurrence[]>();
  for (const occ of occurrences) {
    const list = map.get(occ.date);
    if (list) list.push(occ);
    else map.set(occ.date, [occ]);
  }
  for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return map;
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDateKey(value);
  return !Number.isNaN(date.getTime());
}
