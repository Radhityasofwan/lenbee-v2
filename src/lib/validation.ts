import { z } from "zod";

export const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_KEY = /^([01]\d|2[0-3]):[0-5]\d$/;

const dateKey = (label = "Tanggal") =>
  z
    .string()
    .trim()
    .regex(DATE_KEY, `${label} harus berformat YYYY-MM-DD.`);

const timeKey = (label = "Waktu") =>
  z
    .string()
    .trim()
    .regex(TIME_KEY, `${label} harus berformat HH:MM.`);

const optionalText = (max = 5000) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const optionalDateKey = () =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || DATE_KEY.test(v), "Format tanggal harus YYYY-MM-DD.")
    .optional();

/** Field warna: FormData mengirim string kosong saat pilihan direset. */
const colorField = (fallback: string) =>
  z
    .string()
    .trim()
    .max(20)
    .default(fallback)
    .transform((value) => (value === "" ? fallback : value));

const money = (label = "Nominal") =>
  z.coerce
    .number({ error: `${label} harus berupa angka.` })
    .int(`${label} harus bilangan bulat.`)
    .min(0, `${label} tidak boleh negatif.`)
    .max(2_000_000_000, `${label} terlalu besar.`);

/** Checkbox HTML: hadir sebagai "on" saat dicentang, dan tidak ada saat tidak dicentang. */
export const flag = () =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return false;
    if (typeof value === "boolean") return value;
    return ["1", "true", "on", "yes"].includes(String(value).toLowerCase());
  }, z.boolean());

/** Field FormData yang membawa struktur kompleks sebagai JSON. */
export const jsonField = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }, schema);

const id = z.string().trim().min(1, "ID wajib diisi.").max(64);

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email wajib diisi.")
  .max(190, "Email terlalu panjang.")
  .pipe(z.email("Format email tidak valid."));

export const passwordField = z
  .string()
  .min(8, "Password minimal 8 karakter.")
  .max(200, "Password maksimal 200 karakter.");

const phoneField = z
  .string()
  .trim()
  .max(32, "Nomor telepon terlalu panjang.")
  .regex(/^[+\d][\d\s()-]*$/, "Nomor telepon hanya boleh berisi angka dan simbol + - ( ).")
  .optional()
  .transform((v) => (v === "" ? undefined : v));

/* ---------------------------------- Auth ---------------------------------- */

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password wajib diisi."),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120, "Nama maksimal 120 karakter."),
    email: emailField,
    phone: phoneField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"],
  });

export const acceptInviteSchema = z
  .object({
    token: z.string().trim().min(10, "Token undangan tidak valid.").max(128),
    name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120),
    phone: phoneField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"],
  });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120),
  phone: phoneField,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi."),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"],
  });

/* -------------------------------- Students -------------------------------- */

export const studentSchema = z
  .object({
    name: z.string().trim().min(2, "Nama murid minimal 2 karakter.").max(120),
    nickname: optionalText(60),
    birthDate: optionalDateKey(),
    school: optionalText(160),
    grade: optionalText(40),
    color: colorField("violet"),
    parentName: optionalText(120),
    parentPhone: phoneField,
    parentEmail: z
      .union([z.literal(""), emailField])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    notes: optionalText(2000),
    isActive: flag(),
    reportFormat: z.enum(["narrative", "checklist"]).default("narrative"),
    periodStart: optionalDateKey(),
    periodEnd: optionalDateKey(),
  })
  .superRefine((data, ctx) => {
    if (data.periodStart && data.periodEnd && data.periodStart > data.periodEnd) {
      ctx.addIssue({
        code: "custom",
        error: "Awal periode tidak boleh melebihi akhir periode.",
        path: ["periodEnd"],
      });
    }
  });

/** Undangan akun orang tua: dibuat pengajar, dipakai orang tua di /invite/[token]. */
export const parentInviteSchema = z.object({
  studentId: id,
  name: z.string().trim().min(2, "Nama orang tua minimal 2 karakter.").max(120),
  email: emailField,
  phone: phoneField,
});

export const programSchema = z.object({
  studentId: id,
  name: z.string().trim().min(2, "Nama program minimal 2 karakter.").max(120),
  subject: z.string().trim().min(1, "Mata pelajaran wajib diisi.").max(80),
  color: colorField("sky"),
  rate: money("Tarif"),
  rateUnit: z.enum(["per_session", "per_hour"]).default("per_session"),
  defaultDurationMinutes: z.coerce
    .number()
    .int()
    .min(5, "Durasi minimal 5 menit.")
    .max(600, "Durasi maksimal 600 menit.")
    .default(60),
  sessionsPerMonth: z.preprocess(
    (value) => (value === undefined || value === null || value === "" ? undefined : value),
    z.coerce.number().int().min(0, "Minimal 0 sesi.").max(60, "Maksimal 60 sesi.").optional(),
  ),
  description: optionalText(1000),
  isActive: flag(),
});

export const scheduleSchema = z.object({
  studentId: id,
  programId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  dayOfWeek: z.coerce.number().int().min(0, "Hari tidak valid.").max(6, "Hari tidak valid."),
  startTime: timeKey("Jam mulai"),
  durationMinutes: z.coerce.number().int().min(5, "Durasi minimal 5 menit.").max(600, "Durasi maksimal 600 menit."),
  frequency: z.enum(["weekly", "biweekly"]).default("weekly"),
  startDate: dateKey("Tanggal mulai"),
  endDate: optionalDateKey(),
  location: optionalText(160),
  notes: optionalText(500),
  isActive: flag(),
});

/* -------------------------------- Sessions -------------------------------- */

export const completeLessonSchema = z
  .object({
    lessonId: id,
    attendance: z.enum(["present", "absent"], { error: "Kehadiran wajib dipilih." }),
    durationMinutes: z.coerce
      .number({ error: "Durasi harus berupa angka." })
      .int()
      .min(5, "Durasi minimal 5 menit.")
      .max(600, "Durasi maksimal 600 menit."),
    focus: z.enum(["routine", "review", "exam_prep", "homework", "remedial", "other"]).default("routine"),
    topicLabel: optionalText(160),
    material: optionalText(2000),
    activities: optionalText(2000),
    notes: optionalText(2000),
    reportText: optionalText(6000),
    isBillable: flag(),
  })
  .refine((data) => data.attendance !== "absent" || Boolean(data.reportText), {
    error: "Alasan tidak hadir wajib diisi.",
    path: ["reportText"],
  });

export const reopenLessonSchema = z.object({
  lessonId: id,
});

export const cancelLessonSchema = z.object({
  lessonId: id,
  cancelReason: z.enum(["cancelled", "student_absent", "tutor_absent", "holiday"], {
    error: "Alasan pembatalan wajib dipilih.",
  }),
  notes: optionalText(1000),
  isBillable: flag(),
});

export const rescheduleLessonSchema = z.object({
  lessonId: id,
  date: dateKey("Tanggal baru"),
  startTime: timeKey("Jam baru"),
  durationMinutes: z.coerce.number().int().min(5).max(600).default(60),
  notes: optionalText(1000),
});

export const extraSessionSchema = z.object({
  studentId: id,
  programId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  date: dateKey("Tanggal"),
  startTime: timeKey("Jam mulai"),
  durationMinutes: z.coerce.number().int().min(5, "Durasi minimal 5 menit.").max(600).default(60),
  notes: optionalText(500),
});

export const lessonReportSchema = z.object({
  lessonId: id,
  focus: z.enum(["routine", "review", "exam_prep", "homework", "remedial", "other"]),
  topicLabel: optionalText(160),
  material: optionalText(2000),
  activities: optionalText(2000),
  notes: optionalText(2000),
  reportText: optionalText(6000),
  reportStatus: z.enum(["none", "draft", "final"]).default("draft"),
});

/* ------------------------------- Assignments ------------------------------- */

export const assignmentSchema = z.object({
  studentId: id,
  programId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  title: z.string().trim().min(2, "Judul tugas minimal 2 karakter.").max(160),
  material: optionalText(160),
  instructions: optionalText(4000),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export const questionSchema = z.object({
  type: z.enum(["multiple_choice", "short_answer", "essay"]),
  prompt: z.string().trim().min(2, "Pertanyaan minimal 2 karakter.").max(2000),
  options: z.array(z.string().trim().min(1).max(500)).max(8).optional(),
  correctAnswer: optionalText(1000),
  points: z.coerce.number().int().min(1, "Poin minimal 1.").max(100).default(1),
  explanation: optionalText(2000),
});

export const assignmentQuestionsSchema = z.object({
  assignmentId: id,
  questions: jsonField(z.array(questionSchema).min(1, "Minimal satu pertanyaan.").max(100)),
});

export const saveToBankSchema = z.object({
  subject: z.string().trim().min(1, "Mata pelajaran wajib diisi.").max(120),
  grade: optionalText(60),
  material: z.string().trim().min(1, "Materi/bab wajib diisi.").max(200),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  questions: jsonField(z.array(questionSchema).min(1, "Pilih minimal satu soal.").max(100)),
});

export const bankQuestionIdSchema = z.object({ id });

export const bankQuestionSearchSchema = z.object({
  subject: optionalText(120),
  grade: optionalText(60),
  material: optionalText(200),
  type: z.enum(["multiple_choice", "short_answer", "essay"]).optional(),
  search: optionalText(200),
});

export const bankVariantSchema = z.object({
  id,
  count: z.coerce.number().int().min(1, "Minimal 1 soal.").max(10, "Maksimal 10 soal.").default(3),
});

export const attemptSubmitSchema = z.object({
  attemptId: id,
  answers: jsonField(
    z
      .array(
        z.object({
          questionId: id,
          answer: z.string().max(5000).default(""),
        }),
      )
      .max(200),
  ),
});

export const publicAssignmentTokenSchema = z.object({
  token: z.string().trim().min(1, "Link tidak valid."),
});

export const publicAttemptSubmitSchema = z.object({
  token: z.string().trim().min(1, "Link tidak valid."),
  attemptId: id,
  answers: jsonField(
    z
      .array(
        z.object({
          questionId: id,
          answer: z.string().max(5000).default(""),
        }),
      )
      .max(200),
  ),
});

export const attemptGradeSchema = z.object({
  attemptId: id,
  answers: jsonField(
    z
      .array(
        z.object({
          questionId: id,
          isCorrect: z.union([z.literal("true"), z.literal("false"), z.literal("")]).optional(),
          pointsAwarded: z.coerce.number().int().min(0).max(100).optional(),
          feedback: optionalText(1000),
        }),
      )
      .max(200),
  ),
});

/* -------------------------------- Documents -------------------------------- */

export const documentMetaSchema = z.object({
  title: z.string().trim().min(2, "Judul dokumen minimal 2 karakter.").max(160),
  description: optionalText(1000),
  studentId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  programId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  lessonId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  materialTag: optionalText(80),
  category: z.enum(["worksheet", "exercise", "summary", "material", "school", "other"]).default("worksheet"),
});

/* --------------------------------- Invoices -------------------------------- */

export const invoiceGenerateSchema = z
  .object({
    studentId: id,
    periodStart: dateKey("Awal periode"),
    periodEnd: dateKey("Akhir periode"),
    dueDate: optionalDateKey(),
    discount: money("Diskon").default(0),
    notes: optionalText(1000),
  })
  .refine((data) => data.periodStart <= data.periodEnd, {
    error: "Awal periode tidak boleh melebihi akhir periode.",
    path: ["periodEnd"],
  });

export const invoicePaymentSchema = z.object({
  invoiceId: id,
  amount: money("Nominal pembayaran").refine((v) => v > 0, "Nominal pembayaran harus lebih dari 0."),
  paidAt: optionalDateKey(),
  notes: optionalText(1000),
});

export const invoiceVoidSchema = z.object({
  invoiceId: id,
});

/* ----------------------------- Parent updates ----------------------------- */

export const REPORT_CHECK_REASONS = ["sudah_mampu", "dengan_bantuan", "perlu_dilatih"] as const;

export const reportCheckItemSchema = z.object({
  label: z.string().trim().min(1, "Nama item wajib diisi.").max(160),
  checked: z.boolean().default(false),
  reason: z.enum(REPORT_CHECK_REASONS).nullable().optional(),
});

export const parentUpdateSchema = z
  .object({
    studentId: id,
    title: z.string().trim().min(2, "Judul laporan minimal 2 karakter.").max(160),
    periodStart: dateKey("Awal periode"),
    periodEnd: dateKey("Akhir periode"),
    body: z.string().trim().max(12000).default(""),
    kind: z.enum(["weekly", "monthly", "brief", "daily", "custom"]).default("weekly"),
    format: z.enum(["narrative", "checklist"]).default("narrative"),
    checkItems: jsonField(z.array(reportCheckItemSchema).max(100).default([])),
    status: z.enum(["draft", "final", "sent"]).default("draft"),
  })
  .superRefine((data, ctx) => {
    if (data.periodStart > data.periodEnd) {
      ctx.addIssue({
        code: "custom",
        error: "Awal periode tidak boleh melebihi akhir periode.",
        path: ["periodEnd"],
      });
    }

    if (data.format === "checklist") {
      if (data.checkItems.length === 0) {
        ctx.addIssue({ code: "custom", error: "Tambahkan minimal satu item checklist.", path: ["checkItems"] });
        return;
      }
      data.checkItems.forEach((item, index) => {
        if (!item.checked && !item.reason) {
          ctx.addIssue({
            code: "custom",
            error: `Pilih alasan untuk "${item.label}".`,
            path: ["checkItems", index, "reason"],
          });
        }
      });
      return;
    }

    if (data.body.length < 20) {
      ctx.addIssue({ code: "custom", error: "Isi laporan minimal 20 karakter.", path: ["body"] });
    }
  });

/* --------------------------------- Invites -------------------------------- */

export const inviteSchema = z.object({
  email: emailField,
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120),
  phone: phoneField,
  studentIds: z.array(id).max(50).default([]),
});

/* ---------------------------------- Misc ---------------------------------- */

export const searchSchema = z.object({
  q: z.string().trim().min(1, "Kata kunci wajib diisi.").max(120),
});

export const aiReportSchema = z.object({
  lessonId: id,
  tone: z.enum(["ringkas", "ramah", "formal"]).default("ramah"),
});

export const aiParentUpdateSchema = z.object({
  studentId: id,
  periodStart: dateKey("Awal periode"),
  periodEnd: dateKey("Akhir periode"),
});

export const aiAssignmentSchema = z.object({
  studentId: id,
  subject: z.string().trim().min(1, "Mata pelajaran wajib diisi.").max(80),
  topic: z.string().trim().min(2, "Topik minimal 2 karakter.").max(160),
  count: z.coerce.number().int().min(1, "Minimal 1 soal.").max(20, "Maksimal 20 soal.").default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  documentId: z
    .string()
    .trim()
    .transform((v) => (v === "" || v === "none" ? undefined : v))
    .optional(),
});

export const generatePracticeSchema = z.object({
  studentId: id,
});

/* -------------------------------- Asisten AI chat -------------------------------- */

export const chatSessionCreateSchema = z.object({
  studentId: id,
});

export const chatSessionIdSchema = z.object({ sessionId: id });

export const chatMessageSchema = z.object({
  sessionId: id,
  message: z.string().trim().min(1, "Tulis pesan dulu.").max(4000),
  documentIds: jsonField(z.array(z.coerce.number().int().positive()).max(3, "Maksimal 3 lampiran per pesan.")).default([]),
});

export const chatPublishSchema = z.object({
  sessionId: id,
  studentId: id,
});

/* ------------------------------- AI key pool ------------------------------ */

export const AI_PROVIDER_IDS = ["9router", "google", "openrouter"] as const;

/** `apiKey` kosong saat edit berarti key lama dipertahankan. */
export const aiKeySchema = z
  .object({
    id: z.string().trim().max(64).optional().default(""),
    alias: z.string().trim().min(2, "Nama key minimal 2 karakter.").max(120, "Nama key maksimal 120 karakter."),
    provider: z.enum(AI_PROVIDER_IDS, { error: "Provider wajib dipilih." }),
    apiKey: z.string().trim().max(400, "API key terlalu panjang.").optional().default(""),
    baseUrl: z.string().trim().max(300, "URL terlalu panjang.").optional().default(""),
    priority: z.preprocess(
      (value) => (value === undefined || value === null || value === "" ? undefined : value),
      z.coerce
        .number({ error: "Prioritas harus berupa angka." })
        .int("Prioritas harus bilangan bulat.")
        .min(1, "Prioritas minimal 1.")
        .max(999, "Prioritas maksimal 999.")
        .default(100),
    ),
    modelAllowed: jsonField(z.array(z.string().trim().min(1).max(191)).max(500)).optional(),
    isActive: flag().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.id === "" && data.apiKey.length < 8) {
      ctx.addIssue({ code: "custom", error: "API key wajib diisi (minimal 8 karakter).", path: ["apiKey"] });
    }
  });

export const aiKeyIdSchema = z.object({ id });

export const aiModelSyncSchema = z.object({
  provider: z.enum(AI_PROVIDER_IDS).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type StudentInput = z.infer<typeof studentSchema>;
export type ProgramInput = z.infer<typeof programSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type CompleteLessonInput = z.infer<typeof completeLessonSchema>;
export type InvoiceGenerateInput = z.infer<typeof invoiceGenerateSchema>;
export type ParentUpdateInput = z.infer<typeof parentUpdateSchema>;
