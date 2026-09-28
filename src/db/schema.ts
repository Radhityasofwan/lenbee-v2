import {
  mysqlTable,
  mysqlEnum,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  time,
  json,
  bigint,
  index,
  uniqueIndex,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 191 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    name: varchar("name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    role: mysqlEnum("role", ["tutor", "parent"]).notNull(),
    avatarPath: varchar("avatar_path", { length: 500 }),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at"),
    /** Catatan gaya/format soal favorit tutor — dipakai ulang oleh Asisten AI di setiap percakapan baru. */
    aiStyleNotes: text("ai_style_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), index("users_role_idx").on(t.role)],
);

export const authSessions = mysqlTable(
  "auth_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    userAgent: varchar("user_agent", { length: 500 }),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("auth_sessions_user_idx").on(t.userId), index("auth_sessions_exp_idx").on(t.expiresAt)],
);

export const loginAttempts = mysqlTable(
  "login_attempts",
  {
    id: int("id").autoincrement().primaryKey(),
    identifier: varchar("identifier", { length: 191 }).notNull(),
    success: boolean("success").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("login_attempts_ident_idx").on(t.identifier, t.createdAt)],
);

export const parentInvites = mysqlTable(
  "parent_invites",
  {
    id: int("id").autoincrement().primaryKey(),
    token: varchar("token", { length: 64 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    studentIds: json("student_ids").$type<number[]>().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    createdByUserId: int("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("parent_invites_token_uq").on(t.token)],
);

/* ------------------------------------------------------------------ */
/* Students & Programs                                                 */
/* ------------------------------------------------------------------ */

export const students = mysqlTable(
  "students",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    nickname: varchar("nickname", { length: 60 }),
    birthDate: date("birth_date", { mode: "string" }),
    school: varchar("school", { length: 160 }),
    grade: varchar("grade", { length: 60 }),
    notes: text("notes"),
    avatarPath: varchar("avatar_path", { length: 500 }),
    color: varchar("color", { length: 20 }).notNull().default("violet"),
    isActive: boolean("is_active").notNull().default(true),
    /** Format laporan default anak ini. Bisa ditimpa per laporan. */
    reportFormat: mysqlEnum("report_format", ["narrative", "checklist"]).notNull().default("narrative"),
    /** Periode belajar anak. Menjadi default tanggal jadwal dan periode rangkuman. */
    periodStart: date("period_start", { mode: "string" }),
    periodEnd: date("period_end", { mode: "string" }),
    // Kontak orang tua (untuk yang belum punya akun)
    parentName: varchar("parent_name", { length: 120 }),
    parentPhone: varchar("parent_phone", { length: 32 }),
    parentEmail: varchar("parent_email", { length: 191 }),
    tutorId: int("tutor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index("students_tutor_idx").on(t.tutorId), index("students_name_idx").on(t.name)],
);

export const parentStudents = mysqlTable(
  "parent_students",
  {
    id: int("id").autoincrement().primaryKey(),
    parentUserId: int("parent_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    relation: varchar("relation", { length: 40 }).notNull().default("orang tua"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("parent_students_uq").on(t.parentUserId, t.studentId)],
);

export const programs = mysqlTable(
  "programs",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    subject: varchar("subject", { length: 120 }),
    color: varchar("color", { length: 20 }).notNull().default("sky"),
    rate: int("rate").notNull().default(0),
    rateUnit: mysqlEnum("rate_unit", ["per_session", "per_hour"]).notNull().default("per_session"),
    defaultDurationMinutes: int("default_duration_minutes").notNull().default(60),
    sessionsPerMonth: int("sessions_per_month"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index("programs_student_idx").on(t.studentId)],
);

/* ------------------------------------------------------------------ */
/* Recurring schedule                                                  */
/* ------------------------------------------------------------------ */

export const schedules = mysqlTable(
  "schedules",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    programId: int("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    dayOfWeek: int("day_of_week").notNull(), // 0=Minggu .. 6=Sabtu
    startTime: time("start_time").notNull(),
    durationMinutes: int("duration_minutes").notNull().default(60),
    frequency: mysqlEnum("frequency", ["weekly", "biweekly"]).notNull().default("weekly"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    location: varchar("location", { length: 160 }),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("schedules_student_idx").on(t.studentId),
    index("schedules_program_idx").on(t.programId),
    index("schedules_dow_idx").on(t.dayOfWeek),
  ],
);

/* ------------------------------------------------------------------ */
/* Lesson sessions = source of truth                                   */
/* ------------------------------------------------------------------ */

export const lessonSessions = mysqlTable(
  "lesson_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    programId: int("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "restrict" }),
    scheduleId: int("schedule_id").references(() => schedules.id, { onDelete: "set null" }),
    tutorId: int("tutor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    durationMinutes: int("duration_minutes").notNull().default(60),
    status: mysqlEnum("status", ["scheduled", "completed", "cancelled", "moved"]).notNull().default("scheduled"),
    attendance: mysqlEnum("attendance", ["present", "absent"]).notNull().default("present"),
    cancelReason: mysqlEnum("cancel_reason", ["cancelled", "student_absent", "tutor_absent", "holiday"]),
    isBillable: boolean("is_billable").notNull().default(true),
    focus: mysqlEnum("focus", ["routine", "review", "exam_prep", "homework", "remedial", "other"])
      .notNull()
      .default("routine"),
    topicLabel: varchar("topic_label", { length: 160 }),
    material: text("material"),
    activities: text("activities"),
    notes: text("notes"),
    reportText: text("report_text"),
    reportStatus: mysqlEnum("report_status", ["none", "draft", "final"]).notNull().default("none"),
    reportGeneratedBy: mysqlEnum("report_generated_by", ["manual", "ai"]),
    completedAt: timestamp("completed_at"),
    invoiceId: int("invoice_id").references((): AnyMySqlColumn => invoices.id, { onDelete: "set null" }),
    movedFromId: int("moved_from_id").references((): AnyMySqlColumn => lessonSessions.id, {
      onDelete: "set null",
    }),
    movedToId: int("moved_to_id").references((): AnyMySqlColumn => lessonSessions.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("ls_student_date_idx").on(t.studentId, t.date),
    index("ls_tutor_date_idx").on(t.tutorId, t.date),
    index("ls_status_idx").on(t.status),
    index("ls_invoice_idx").on(t.invoiceId),
    index("ls_program_idx").on(t.programId),
    uniqueIndex("ls_schedule_slot_uq").on(t.scheduleId, t.date, t.startTime),
  ],
);

export const lessonAttachments = mysqlTable(
  "lesson_attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    lessonId: int("lesson_id")
      .notNull()
      .references(() => lessonSessions.id, { onDelete: "cascade" }),
    storageKey: varchar("storage_key", { length: 500 }).notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    kind: mysqlEnum("kind", ["image", "document"]).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("lesson_attachments_lesson_idx").on(t.lessonId)],
);

/* ------------------------------------------------------------------ */
/* Assignments / question engine                                       */
/* ------------------------------------------------------------------ */

export const assignments = mysqlTable(
  "assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    programId: int("program_id").references(() => programs.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull(),
    material: varchar("material", { length: 200 }),
    instructions: text("instructions"),
    status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
    difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull().default("medium"),
    aiGenerated: boolean("ai_generated").notNull().default(false),
    publicToken: varchar("public_token", { length: 64 }).notNull(),
    createdByUserId: int("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("assignments_student_idx").on(t.studentId),
    index("assignments_status_idx").on(t.status),
    uniqueIndex("assignments_token_uq").on(t.publicToken),
  ],
);

export const questions = mysqlTable(
  "questions",
  {
    id: int("id").autoincrement().primaryKey(),
    assignmentId: int("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    orderIndex: int("order_index").notNull().default(0),
    type: mysqlEnum("type", ["multiple_choice", "short_answer", "essay"]).notNull(),
    prompt: text("prompt").notNull(),
    options: json("options").$type<string[]>(),
    correctAnswer: text("correct_answer"),
    points: int("points").notNull().default(1),
    explanation: text("explanation"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("questions_assignment_idx").on(t.assignmentId)],
);

/** Soal tersimpan lepas dari tugas tertentu — dicari & dipakai ulang lintas tugas. */
export const bankQuestions = mysqlTable(
  "bank_questions",
  {
    id: int("id").autoincrement().primaryKey(),
    tutorId: int("tutor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: varchar("subject", { length: 120 }).notNull(),
    grade: varchar("grade", { length: 60 }),
    material: varchar("material", { length: 200 }).notNull(),
    type: mysqlEnum("type", ["multiple_choice", "short_answer", "essay"]).notNull(),
    prompt: text("prompt").notNull(),
    options: json("options").$type<string[]>(),
    correctAnswer: text("correct_answer"),
    points: int("points").notNull().default(1),
    explanation: text("explanation"),
    difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull().default("medium"),
    usageCount: int("usage_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("bank_questions_tutor_subject_idx").on(t.tutorId, t.subject),
    index("bank_questions_tutor_material_idx").on(t.tutorId, t.material),
    index("bank_questions_tutor_grade_idx").on(t.tutorId, t.grade),
  ],
);

export const assignmentAttempts = mysqlTable(
  "assignment_attempts",
  {
    id: int("id").autoincrement().primaryKey(),
    assignmentId: int("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["in_progress", "submitted", "graded"]).notNull().default("in_progress"),
    score: int("score"),
    maxScore: int("max_score").notNull().default(0),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    submittedAt: timestamp("submitted_at"),
    gradedAt: timestamp("graded_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("attempts_assignment_idx").on(t.assignmentId),
    index("attempts_student_idx").on(t.studentId),
  ],
);

export const attemptAnswers = mysqlTable(
  "attempt_answers",
  {
    id: int("id").autoincrement().primaryKey(),
    attemptId: int("attempt_id")
      .notNull()
      .references(() => assignmentAttempts.id, { onDelete: "cascade" }),
    questionId: int("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    answer: text("answer"),
    isCorrect: boolean("is_correct"),
    pointsAwarded: int("points_awarded").notNull().default(0),
    feedback: text("feedback"),
  },
  (t) => [
    uniqueIndex("attempt_answers_uq").on(t.attemptId, t.questionId),
    index("attempt_answers_question_idx").on(t.questionId),
  ],
);

/* ------------------------------------------------------------------ */
/* Documents / material bank                                           */
/* ------------------------------------------------------------------ */

export const documents = mysqlTable(
  "documents",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    studentId: int("student_id").references(() => students.id, { onDelete: "set null" }),
    programId: int("program_id").references(() => programs.id, { onDelete: "set null" }),
    lessonId: int("lesson_id").references(() => lessonSessions.id, { onDelete: "set null" }),
    materialTag: varchar("material_tag", { length: 160 }),
    category: mysqlEnum("category", ["worksheet", "exercise", "summary", "material", "school", "other"])
      .notNull()
      .default("other"),
    storageKey: varchar("storage_key", { length: 500 }).notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    uploadedByUserId: int("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("documents_student_idx").on(t.studentId),
    index("documents_program_idx").on(t.programId),
    index("documents_category_idx").on(t.category),
  ],
);

/* ------------------------------------------------------------------ */
/* Invoices                                                            */
/* ------------------------------------------------------------------ */

export const invoices = mysqlTable(
  "invoices",
  {
    id: int("id").autoincrement().primaryKey(),
    invoiceNumber: varchar("invoice_number", { length: 40 }).notNull(),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    issueDate: date("issue_date", { mode: "string" }).notNull(),
    dueDate: date("due_date", { mode: "string" }),
    status: mysqlEnum("status", ["unpaid", "partial", "paid", "void"]).notNull().default("unpaid"),
    subtotal: int("subtotal").notNull().default(0),
    discount: int("discount").notNull().default(0),
    total: int("total").notNull().default(0),
    paidAmount: int("paid_amount").notNull().default(0),
    paidAt: timestamp("paid_at"),
    notes: text("notes"),
    publicToken: varchar("public_token", { length: 64 }).notNull(),
    createdByUserId: int("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex("invoices_number_uq").on(t.invoiceNumber),
    uniqueIndex("invoices_token_uq").on(t.publicToken),
    index("invoices_student_idx").on(t.studentId),
    index("invoices_status_idx").on(t.status),
  ],
);

export const invoiceItems = mysqlTable(
  "invoice_items",
  {
    id: int("id").autoincrement().primaryKey(),
    invoiceId: int("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    lessonId: int("lesson_id").references(() => lessonSessions.id, { onDelete: "set null" }),
    programId: int("program_id").references(() => programs.id, { onDelete: "set null" }),
    description: varchar("description", { length: 255 }).notNull(),
    quantity: int("quantity").notNull().default(1),
    unitPrice: int("unit_price").notNull().default(0),
    amount: int("amount").notNull().default(0),
  },
  (t) => [index("invoice_items_invoice_idx").on(t.invoiceId), index("invoice_items_lesson_idx").on(t.lessonId)],
);

/* ------------------------------------------------------------------ */
/* Parent updates & notifications                                      */
/* ------------------------------------------------------------------ */

export const parentUpdates = mysqlTable(
  "parent_updates",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    body: text("body").notNull(),
    kind: mysqlEnum("kind", ["weekly", "monthly", "brief", "daily", "custom"]).notNull().default("weekly"),
    /** Format laporan ini. Disimpan per laporan agar riwayat tetap akurat walau format anak berubah. */
    format: mysqlEnum("format", ["narrative", "checklist"]).notNull().default("narrative"),
    status: mysqlEnum("status", ["draft", "final", "sent"]).notNull().default("draft"),
    aiGenerated: boolean("ai_generated").notNull().default(false),
    sentAt: timestamp("sent_at"),
    createdByUserId: int("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index("parent_updates_student_idx").on(t.studentId), index("parent_updates_status_idx").on(t.status)],
);

/** Baris checklist untuk laporan format "checklist". */
export const reportCheckItems = mysqlTable(
  "report_check_items",
  {
    id: int("id").autoincrement().primaryKey(),
    updateId: int("update_id")
      .notNull()
      .references(() => parentUpdates.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 160 }).notNull(),
    checked: boolean("checked").notNull().default(false),
    /** Wajib diisi saat checked = false. */
    reason: mysqlEnum("reason", ["sudah_mampu", "dengan_bantuan", "perlu_dilatih"]),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("report_check_items_update_idx").on(t.updateId)],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["lesson_today", "report_pending", "invoice_unpaid", "assignment_submitted", "info"])
      .notNull()
      .default("info"),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    link: varchar("link", { length: 300 }),
    dedupeKey: varchar("dedupe_key", { length: 191 }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId, t.isRead),
    uniqueIndex("notifications_dedupe_uq").on(t.userId, t.dedupeKey),
  ],
);

/** Satu baris per perangkat/browser yang mengizinkan notifikasi push. */
export const pushSubscriptions = mysqlTable(
  "push_subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: varchar("endpoint", { length: 500 }).notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: varchar("user_agent", { length: 300 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex("push_subscriptions_endpoint_uq").on(t.endpoint),
    index("push_subscriptions_user_idx").on(t.userId),
  ],
);

/* ------------------------------------------------------------------ */
/* AI log & settings                                                   */
/* ------------------------------------------------------------------ */

export const aiGenerations = mysqlTable(
  "ai_generations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 60 }).notNull(),
    provider: varchar("provider", { length: 60 }).notNull(),
    model: varchar("model", { length: 120 }),
    ok: boolean("ok").notNull().default(true),
    errorMessage: text("error_message"),
    promptChars: int("prompt_chars").notNull().default(0),
    outputChars: int("output_chars").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("ai_generations_user_idx").on(t.userId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Asisten AI (chat multi-turn)                                        */
/* ------------------------------------------------------------------ */

export type ChatDraftQuestion = {
  type: "multiple_choice" | "short_answer" | "essay";
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  explanation?: string;
};

export type ChatReportDraft = {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  body: string;
};

export type ChatDraftState = {
  subject?: string;
  grade?: string;
  material?: string;
  questions: ChatDraftQuestion[];
  coverageNotes?: string;
  /** Dokumen yang terakhir dilampirkan — dipakai ulang otomatis di giliran berikutnya (mis. "cek materi", "revisi"). */
  activeDocumentIds: number[];
  /** Draf laporan orang tua terakhir yang dibuat lewat chat — siap disimpan sebagai laporan sungguhan. */
  reportDraft?: ChatReportDraft | null;
};

export const aiChatSessions = mysqlTable(
  "ai_chat_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    tutorId: int("tutor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: int("student_id").references(() => students.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull().default("Percakapan baru"),
    state: json("state").$type<ChatDraftState>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index("ai_chat_sessions_tutor_idx").on(t.tutorId, t.updatedAt)],
);

export const aiChatMessages = mysqlTable(
  "ai_chat_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("session_id")
      .notNull()
      .references(() => aiChatSessions.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["user", "assistant"]).notNull(),
    content: text("content").notNull(),
    attachmentDocumentIds: json("attachment_document_ids").$type<number[]>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("ai_chat_messages_session_idx").on(t.sessionId, t.createdAt)],
);

export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 120 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

/* ------------------------------------------------------------------ */
/* AI provider keys & synced models                                    */
/* ------------------------------------------------------------------ */

export const aiApiKeys = mysqlTable(
  "ai_api_keys",
  {
    id: int("id").autoincrement().primaryKey(),
    alias: varchar("alias", { length: 120 }).notNull(),
    provider: mysqlEnum("provider", ["9router", "google", "openrouter"]).notNull(),
    apiKeyEncrypted: text("api_key_encrypted").notNull(),
    keyHint: varchar("key_hint", { length: 16 }),
    baseUrl: varchar("base_url", { length: 300 }),
    modelAllowed: json("model_allowed").$type<string[]>(),
    priority: int("priority").notNull().default(100),
    isActive: boolean("is_active").notNull().default(true),
    healthStatus: mysqlEnum("health_status", ["healthy", "cooldown", "disabled"])
      .notNull()
      .default("healthy"),
    cooldownUntil: timestamp("cooldown_until"),
    lastHealthCheck: timestamp("last_health_check"),
    lastErrorMessage: text("last_error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index("ai_api_keys_route_idx").on(t.provider, t.isActive, t.priority)],
);

export const aiModels = mysqlTable(
  "ai_models",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: mysqlEnum("provider", ["9router", "google", "openrouter"]).notNull(),
    modelId: varchar("model_id", { length: 191 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ai_models_provider_model_uq").on(t.provider, t.modelId)],
);

export type User = typeof users.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type LessonSession = typeof lessonSessions.$inferSelect;
export type LessonAttachment = typeof lessonAttachments.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type BankQuestion = typeof bankQuestions.$inferSelect;
export type AiChatSession = typeof aiChatSessions.$inferSelect;
export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type ParentUpdate = typeof parentUpdates.$inferSelect;
export type ReportCheckItem = typeof reportCheckItems.$inferSelect;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type AiApiKey = typeof aiApiKeys.$inferSelect;
export type AiModel = typeof aiModels.$inferSelect;
export type AiProviderId = AiApiKey["provider"];
export type AiHealthStatus = AiApiKey["healthStatus"];
