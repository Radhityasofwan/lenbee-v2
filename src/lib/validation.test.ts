import { describe, expect, it } from "vitest";
import {
  completeLessonSchema,
  invoiceGenerateSchema,
  loginSchema,
  registerSchema,
  scheduleSchema,
  studentSchema,
} from "./validation";

describe("loginSchema", () => {
  it("menerima email dan password yang terisi", () => {
    expect(loginSchema.safeParse({ email: "tutor@lenbee.id", password: "rahasia" }).success).toBe(true);
  });

  it("menolak email tidak valid dan password kosong", () => {
    const result = loginSchema.safeParse({ email: "bukan-email", password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual(["email", "password"]);
  });
});

describe("registerSchema", () => {
  const base = { name: "Tutor Lenbee", email: "tutor@lenbee.id", phone: "081234567890", password: "Rahasia123" };

  it("menolak konfirmasi password yang berbeda dan menandai field-nya", () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: "Rahasia999" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["confirmPassword"]);
  });

  it("menolak password yang terlalu pendek", () => {
    const result = registerSchema.safeParse({ ...base, password: "abc", confirmPassword: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("studentSchema", () => {
  it("mengisi nilai default dan mengubah field kosong menjadi undefined", () => {
    const result = studentSchema.safeParse({
      name: "  Aisyah  ",
      nickname: "",
      parentPhone: "081234567890",
      parentEmail: "",
      color: "",
    });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Aisyah");
    expect(result.data?.nickname).toBeUndefined();
    expect(result.data?.parentEmail).toBeUndefined();
    expect(result.data?.color).toBe("violet");
  });

  it("menonaktifkan murid saat checkbox tidak dikirim", () => {
    const result = studentSchema.safeParse({ name: "Aisyah", parentPhone: "081234567890" });
    expect(result.data?.isActive).toBe(false);
  });

  it("menyalakan murid saat checkbox hadir sebagai \"on\"", () => {
    const result = studentSchema.safeParse({ name: "Aisyah", parentPhone: "081234567890", isActive: "on" });
    expect(result.data?.isActive).toBe(true);
  });

  it("menolak nama yang kurang dari 2 karakter", () => {
    expect(studentSchema.safeParse({ name: "A", parentPhone: "081234567890" }).success).toBe(false);
  });
});

describe("scheduleSchema", () => {
  it("mengisi default frekuensi mingguan dan menerima jam HH:MM", () => {
    const result = scheduleSchema.safeParse({
      studentId: "3",
      dayOfWeek: "1",
      startTime: "16:00",
      durationMinutes: "60",
      startDate: "2026-03-02",
    });

    expect(result.success).toBe(true);
    expect(result.data?.frequency).toBe("weekly");
    expect(result.data?.studentId).toBe("3");
  });

  it("menolak hari di luar 0-6 dan jam berformat bebas", () => {
    const result = scheduleSchema.safeParse({
      studentId: "3",
      dayOfWeek: "9",
      startTime: "4 sore",
      durationMinutes: "60",
      startDate: "2026-03-02",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual(["dayOfWeek", "startTime"]);
  });
});

describe("completeLessonSchema", () => {
  it("menerima durasi sebagai string dari FormData dan menormalkan flag", () => {
    const result = completeLessonSchema.safeParse({
      lessonId: "12",
      attendance: "present",
      durationMinutes: "90",
      isBillable: "on",
    });

    expect(result.success).toBe(true);
    expect(result.data?.durationMinutes).toBe(90);
    expect(result.data?.isBillable).toBe(true);
    expect(result.data?.focus).toBe("routine");
  });

  it("menolak durasi di luar rentang dan kehadiran tak dikenal", () => {
    const result = completeLessonSchema.safeParse({
      lessonId: "12",
      attendance: "maybe",
      durationMinutes: "1000",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual(["attendance", "durationMinutes"]);
  });
});

describe("invoiceGenerateSchema", () => {
  const base = { studentId: "3", periodStart: "2026-03-01", periodEnd: "2026-03-31" };

  it("mengisi diskon nol dan dueDate undefined bila kosong", () => {
    const result = invoiceGenerateSchema.safeParse({ ...base, dueDate: "" });
    expect(result.success).toBe(true);
    expect(result.data?.discount).toBe(0);
    expect(result.data?.dueDate).toBeUndefined();
  });

  it("menolak periode yang terbalik", () => {
    const result = invoiceGenerateSchema.safeParse({ ...base, periodStart: "2026-03-31", periodEnd: "2026-03-01" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["periodEnd"]);
  });

  it("menolak diskon negatif", () => {
    expect(invoiceGenerateSchema.safeParse({ ...base, discount: "-1" }).success).toBe(false);
  });
});
