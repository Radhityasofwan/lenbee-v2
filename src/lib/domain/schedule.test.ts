import { describe, expect, it } from "vitest";
import { expandAll, expandSchedule, groupByDate, isValidDateKey, type ScheduleTemplate } from "./schedule";

function template(overrides: Partial<ScheduleTemplate> = {}): ScheduleTemplate {
  return {
    id: 1,
    dayOfWeek: 1, // Senin
    startTime: "16:00",
    durationMinutes: 60,
    frequency: "weekly",
    startDate: "2026-01-01",
    endDate: null,
    isActive: true,
    ...overrides,
  };
}

describe("expandSchedule", () => {
  it("menghasilkan satu pertemuan per minggu pada hari yang cocok", () => {
    // 2026-03-02 adalah Senin.
    const result = expandSchedule(template(), "2026-03-01", "2026-03-31");

    expect(result.map((occ) => occ.date)).toEqual(["2026-03-02", "2026-03-09", "2026-03-16", "2026-03-23", "2026-03-30"]);
    expect(result.every((occ) => occ.startTime === "16:00:00")).toBe(true);
    expect(result.every((occ) => occ.endTime === "17:00:00")).toBe(true);
  });

  it("memotong rentang pada startDate dan endDate jadwal", () => {
    const result = expandSchedule(
      template({ startDate: "2026-03-10", endDate: "2026-03-20" }),
      "2026-03-01",
      "2026-03-31",
    );

    expect(result.map((occ) => occ.date)).toEqual(["2026-03-16"]);
  });

  it("mengembalikan daftar kosong untuk jadwal nonaktif", () => {
    expect(expandSchedule(template({ isActive: false }), "2026-03-01", "2026-03-31")).toEqual([]);
  });

  it("mengembalikan daftar kosong bila rentang tidak beririsan", () => {
    expect(expandSchedule(template({ startDate: "2026-05-01" }), "2026-03-01", "2026-03-31")).toEqual([]);
  });

  it("menghormati frekuensi dua mingguan", () => {
    const result = expandSchedule(template({ frequency: "biweekly" }), "2026-03-01", "2026-03-31");

    expect(result.map((occ) => occ.date)).toEqual(["2026-03-02", "2026-03-16", "2026-03-30"]);
  });

  it("menghitung endTime dari durasi dan menormalkan jam tanpa menit", () => {
    const [occ] = expandSchedule(template({ startTime: "16", durationMinutes: 90 }), "2026-03-02", "2026-03-02");
    expect(occ.startTime).toBe("16:00:00");
    expect(occ.endTime).toBe("17:30:00");
  });

  it("melempar error untuk rentang lebih dari 400 hari", () => {
    expect(() => expandSchedule(template(), "2026-01-01", "2028-01-01")).toThrow(/terlalu besar/);
  });

  it("idempotent: dipanggil dua kali menghasilkan daftar identik", () => {
    const first = expandSchedule(template(), "2026-03-01", "2026-03-31");
    const second = expandSchedule(template(), "2026-03-01", "2026-03-31");
    expect(second).toEqual(first);
  });
});

describe("expandAll", () => {
  it("menggabungkan occurrence dari beberapa jadwal", () => {
    const result = expandAll(
      [template({ id: 1, dayOfWeek: 1 }), template({ id: 2, dayOfWeek: 3, startTime: "10:00" })],
      "2026-03-02",
      "2026-03-08",
    );

    expect(result).toHaveLength(2);
    expect(result.map((occ) => occ.scheduleId)).toEqual([1, 2]);
  });
});

describe("groupByDate", () => {
  it("mengelompokkan per tanggal dan mengurutkan berdasarkan jam mulai", () => {
    const grouped = groupByDate([
      { scheduleId: 1, date: "2026-03-02", startTime: "16:00:00", endTime: "17:00:00", durationMinutes: 60 },
      { scheduleId: 2, date: "2026-03-02", startTime: "09:00:00", endTime: "10:00:00", durationMinutes: 60 },
      { scheduleId: 3, date: "2026-03-03", startTime: "13:00:00", endTime: "14:00:00", durationMinutes: 60 },
    ]);

    expect([...grouped.keys()]).toEqual(["2026-03-02", "2026-03-03"]);
    expect(grouped.get("2026-03-02")?.map((occ) => occ.scheduleId)).toEqual([2, 1]);
  });
});

describe("isValidDateKey", () => {
  it("menerima format YYYY-MM-DD yang valid", () => {
    expect(isValidDateKey("2026-03-02")).toBe(true);
  });

  it("menolak format lain dan tanggal tidak masuk akal", () => {
    expect(isValidDateKey("02-03-2026")).toBe(false);
    expect(isValidDateKey("2026-3-2")).toBe(false);
    expect(isValidDateKey("")).toBe(false);
  });
});
