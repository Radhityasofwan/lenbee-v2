import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { inArray } from "drizzle-orm";
import { db, pool } from "./index";
import {
  aiGenerations,
  assignmentAttempts,
  assignments,
  attemptAnswers,
  authSessions,
  documents,
  invoiceItems,
  invoices,
  lessonAttachments,
  lessonSessions,
  loginAttempts,
  notifications,
  parentInvites,
  parentStudents,
  parentUpdates,
  programs,
  questions,
  schedules,
  settings,
  students,
  users,
} from "./schema";
import { getStorage } from "../lib/storage";
import { expandAll, type ScheduleTemplate } from "../lib/domain/schedule";
import { buildInvoiceDraft, invoiceNumberFor, type BillableLesson } from "../lib/domain/invoice";
import { gradeAttempt, type GradableQuestion } from "../lib/domain/grading";

const DEMO_PASSWORD = "Lenbee123!";
const TUTOR_EMAIL = "tutor@lenbee.id";
const PARENT_EMAIL = "orangtua@lenbee.id";

/* ------------------------------- util tanggal ------------------------------ */

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const timeKey = (time: string) => (time.length === 5 ? `${time}:00` : time);

function at(date: string, time: string): Date {
  return new Date(`${date}T${timeKey(time)}`);
}

/* ---------------------------------- data ---------------------------------- */

type ProgramSeed = {
  key: string;
  student: number;
  name: string;
  subject: string;
  color: string;
  rate: number;
  rateUnit: "per_session" | "per_hour";
  duration: number;
  sessionsPerMonth: number;
  topics: string[];
};

const STUDENTS = [
  {
    name: "Aisyah Putri Ramadhani",
    nickname: "Aisyah",
    birthDate: "2016-04-12",
    school: "SDN 01 Menteng",
    grade: "Kelas 5",
    color: "violet",
    parentName: "Ibu Sari Ramadhani",
    parentPhone: "081234567801",
    parentEmail: "sari.ramadhani@example.com",
    notes: "Semangat tinggi, perlu penguatan pada pecahan dan soal cerita.",
  },
  {
    name: "Bima Adi Nugroho",
    nickname: "Bima",
    birthDate: "2012-09-03",
    school: "SMPN 5 Bandung",
    grade: "Kelas 8",
    color: "sky",
    parentName: "Bapak Adi Nugroho",
    parentPhone: "081234567802",
    parentEmail: "adi.nugroho@example.com",
    notes: "Fokus pada aljabar dan persiapan ulangan harian.",
  },
  {
    name: "Citra Kirana Dewi",
    nickname: "Citra",
    birthDate: "2009-01-28",
    school: "SMAN 3 Yogyakarta",
    grade: "Kelas 11",
    color: "emerald",
    parentName: "Ibu Dewi Lestari",
    parentPhone: "081234567803",
    parentEmail: "dewi.lestari@example.com",
    notes: "Persiapan UTBK, butuh latihan intensif fisika.",
  },
  {
    name: "Dimas Prasetyo",
    nickname: "Dimas",
    birthDate: "2018-06-20",
    school: "SD Islam Al-Azhar",
    grade: "Kelas 3",
    color: "amber",
    parentName: "Ibu Rina Prasetyo",
    parentPhone: "081234567804",
    parentEmail: "rina.prasetyo@example.com",
    notes: "Masih perlu pendampingan calistung dan pengenalan angka.",
  },
];

const PROGRAMS: ProgramSeed[] = [
  {
    key: "aisy-mat",
    student: 0,
    name: "Matematika SD",
    subject: "Matematika",
    color: "violet",
    rate: 75_000,
    rateUnit: "per_session",
    duration: 60,
    sessionsPerMonth: 4,
    topics: ["Pecahan senilai", "Penjumlahan pecahan", "Soal cerita pecahan", "Pengukuran waktu", "Bangun datar"],
  },
  {
    key: "aisy-eng",
    student: 0,
    name: "Bahasa Inggris Anak",
    subject: "Bahasa Inggris",
    color: "rose",
    rate: 100_000,
    rateUnit: "per_hour",
    duration: 60,
    sessionsPerMonth: 4,
    topics: ["Daily activities", "Simple present tense", "Vocabulary: family", "Reading aloud", "Numbers & time"],
  },
  {
    key: "bima-mat",
    student: 1,
    name: "Matematika SMP",
    subject: "Matematika",
    color: "sky",
    rate: 85_000,
    rateUnit: "per_session",
    duration: 90,
    sessionsPerMonth: 4,
    topics: ["Bentuk aljabar", "Operasi aljabar", "Persamaan linear dua variabel", "Teorema Pythagoras", "Statistika dasar"],
  },
  {
    key: "citra-mat",
    student: 2,
    name: "Matematika SMA",
    subject: "Matematika",
    color: "emerald",
    rate: 120_000,
    rateUnit: "per_hour",
    duration: 90,
    sessionsPerMonth: 4,
    topics: ["Limit fungsi", "Turunan dasar", "Aplikasi turunan", "Barisan aritmetika", "Peluang"],
  },
  {
    key: "citra-fis",
    student: 2,
    name: "Fisika SMA",
    subject: "Fisika",
    color: "indigo",
    rate: 130_000,
    rateUnit: "per_hour",
    duration: 90,
    sessionsPerMonth: 4,
    topics: ["Hukum Newton", "Usaha dan energi", "Momentum", "Gerak harmonik", "Listrik statis"],
  },
  {
    key: "dimas-cal",
    student: 3,
    name: "Calistung",
    subject: "Calistung",
    color: "amber",
    rate: 100_000,
    rateUnit: "per_session",
    duration: 60,
    sessionsPerMonth: 4,
    topics: ["Membaca suku kata", "Menulis huruf sambung", "Berhitung 1-20", "Mengenal uang", "Cerita bergambar"],
  },
];

const SCHEDULES: Array<{ program: string; dayOfWeek: number; startTime: string; location: string | null }> = [
  { program: "aisy-mat", dayOfWeek: 1, startTime: "16:00", location: "Rumah murid" },
  { program: "aisy-eng", dayOfWeek: 3, startTime: "16:00", location: "Online (Google Meet)" },
  { program: "bima-mat", dayOfWeek: 2, startTime: "17:00", location: "Rumah murid" },
  { program: "citra-mat", dayOfWeek: 6, startTime: "09:00", location: "Online (Zoom)" },
  { program: "citra-fis", dayOfWeek: 0, startTime: "09:00", location: "Online (Zoom)" },
  { program: "dimas-cal", dayOfWeek: 4, startTime: "15:30", location: "Rumah murid" },
];

/** Sesi lampau yang dibatalkan, dihitung dari sesi terakhir jadwal tersebut (0 = paling baru). */
const CANCELLED_DATES: Record<number, { offset: number; reason: "cancelled" | "student_absent" | "tutor_absent" | "holiday"; note: string }> =
  {
    4: { offset: 0, reason: "holiday", note: "Libur nasional, sesi dipindahkan minggu berikutnya." },
    5: { offset: 1, reason: "student_absent", note: "Murid sakit, sesi tidak dihitung." },
  };

const DOCUMENTS = [
  {
    student: 0,
    program: "aisy-mat",
    title: "Worksheet pecahan senilai",
    category: "worksheet" as const,
    tag: "Pecahan",
    fileName: "worksheet-pecahan-senilai.txt",
    body: "Latihan pecahan senilai\n\n1) 1/2 = .../4\n2) 2/3 = .../9\n3) 3/4 = .../8\n\nKunci: 2, 6, 6\n",
  },
  {
    student: 1,
    program: "bima-mat",
    title: "Ringkasan bentuk aljabar",
    category: "summary" as const,
    tag: "Aljabar",
    fileName: "ringkasan-bentuk-aljabar.txt",
    body: "Ringkasan aljabar\n\n- Suku sejenis dapat dijumlahkan.\n- 3x + 2x = 5x\n- 2(x + 3) = 2x + 6\n",
  },
  {
    student: 2,
    program: "citra-fis",
    title: "Latihan hukum Newton",
    category: "exercise" as const,
    tag: "Hukum Newton",
    fileName: "latihan-hukum-newton.txt",
    body: "Latihan Hukum Newton\n\n1) F = m . a. Hitung a bila F = 20 N dan m = 4 kg.\n2) Jelaskan pasangan aksi-reaksi pada berjalan kaki.\n",
  },
];

/* ------------------------------ hapus data lama ----------------------------- */

async function resetData() {
  // Urutan penting: tabel anak dihapus lebih dulu agar foreign key tidak menghalangi.
  const order = [
    attemptAnswers,
    assignmentAttempts,
    questions,
    assignments,
    lessonAttachments,
    documents,
    invoiceItems,
    lessonSessions,
    invoices,
    parentUpdates,
    notifications,
    schedules,
    programs,
    parentStudents,
    parentInvites,
    students,
    authSessions,
    loginAttempts,
    aiGenerations,
    settings,
    users,
  ];
  for (const table of order) {
    await db.delete(table);
  }
}

/* ---------------------------------- main ---------------------------------- */

async function main() {
  console.log("[SEED] Menghapus data lama...");
  await resetData();

  const today = new Date();
  const todayDate = dateKey(today);
  const year = today.getFullYear();
  const month = today.getMonth();
  const rangeStart = dateKey(new Date(year, month - 1, 1));
  const rangeEnd = dateKey(new Date(year, month + 2, 0));
  const scheduleStart = dateKey(new Date(year, month - 2, 1));
  const prevPeriodStart = dateKey(new Date(year, month - 1, 1));
  const prevPeriodEnd = dateKey(new Date(year, month, 0));
  const currentPeriodStart = dateKey(new Date(year, month, 1));
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  console.log("[SEED] Membuat user...");
  const [tutor] = await db
    .insert(users)
    .values({
      email: TUTOR_EMAIL,
      passwordHash,
      name: "Budi Santoso",
      phone: "081234567890",
      role: "tutor",
      lastLoginAt: new Date(),
    })
    .$returningId();

  const [parent] = await db
    .insert(users)
    .values({
      email: PARENT_EMAIL,
      passwordHash,
      name: "Ibu Sari Ramadhani",
      phone: "081234567801",
      role: "parent",
      lastLoginAt: new Date(),
    })
    .$returningId();

  const [parentTwo] = await db
    .insert(users)
    .values({
      email: "orangtua.bima@lenbee.id",
      passwordHash,
      name: "Bapak Adi Nugroho",
      phone: "081234567802",
      role: "parent",
    })
    .$returningId();

  console.log("[SEED] Membuat murid dan program...");
  const studentIds: number[] = [];
  for (const student of STUDENTS) {
    const [row] = await db
      .insert(students)
      .values({ ...student, tutorId: tutor.id })
      .$returningId();
    studentIds.push(row.id);
  }

  await db.insert(parentStudents).values([
    { parentUserId: parent.id, studentId: studentIds[0], relation: "ibu" },
    { parentUserId: parentTwo.id, studentId: studentIds[1], relation: "ayah" },
  ]);

  const programIds = new Map<string, number>();
  for (const program of PROGRAMS) {
    const [row] = await db
      .insert(programs)
      .values({
        studentId: studentIds[program.student],
        name: program.name,
        subject: program.subject,
        color: program.color,
        rate: program.rate,
        rateUnit: program.rateUnit,
        defaultDurationMinutes: program.duration,
        sessionsPerMonth: program.sessionsPerMonth,
        description: `Program ${program.subject} untuk ${STUDENTS[program.student].nickname}.`,
      })
      .$returningId();
    programIds.set(program.key, row.id);
  }

  const programByKey = new Map(PROGRAMS.map((program) => [program.key, program]));

  console.log("[SEED] Membuat jadwal rutin...");
  const scheduleRows = SCHEDULES.map((schedule) => {
    const program = programByKey.get(schedule.program);
    if (!program) throw new Error(`Program ${schedule.program} tidak ditemukan`);
    return {
      studentId: studentIds[program.student],
      programId: programIds.get(schedule.program) as number,
      dayOfWeek: schedule.dayOfWeek,
      startTime: timeKey(schedule.startTime),
      durationMinutes: program.duration,
      frequency: "weekly" as const,
      startDate: scheduleStart,
      location: schedule.location,
      notes: null,
    };
  });
  const scheduleIds = (await db.insert(schedules).values(scheduleRows).$returningId()).map((row) => row.id);

  console.log("[SEED] Membuat sesi pelajaran...");
  const templates: ScheduleTemplate[] = scheduleRows.map((row, index) => ({
    id: scheduleIds[index],
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    durationMinutes: row.durationMinutes,
    frequency: row.frequency,
    startDate: row.startDate,
    endDate: null,
    isActive: true,
  }));

  const occurrences = expandAll(templates, rangeStart, rangeEnd);
  const topicCursor = new Map<string, number>();

  // Sesi lampau per jadwal, diurutkan dari yang paling baru — dasar penentuan sesi batal.
  const pastBySchedule = new Map<number, number[]>();
  occurrences.forEach((occurrence, index) => {
    if (occurrence.date > todayDate) return;
    const list = pastBySchedule.get(occurrence.scheduleId) ?? [];
    list.push(index);
    pastBySchedule.set(occurrence.scheduleId, list);
  });
  const cancelledIndexes = new Map<number, (typeof CANCELLED_DATES)[number]>();
  for (const [scheduleId, indexes] of pastBySchedule) {
    const scheduleIndex = scheduleIds.indexOf(scheduleId);
    const plan = CANCELLED_DATES[scheduleIndex];
    if (!plan) continue;
    const ordered = [...indexes].sort((a, b) => {
      const left = occurrences[a];
      const right = occurrences[b];
      return `${right.date}${right.startTime}`.localeCompare(`${left.date}${left.startTime}`);
    });
    const target = ordered[plan.offset];
    if (target !== undefined) cancelledIndexes.set(target, plan);
  }

  const lessonValues = occurrences.map((occurrence, index) => {
    const scheduleIndex = scheduleIds.indexOf(occurrence.scheduleId);
    const scheduleSeed = SCHEDULES[scheduleIndex];
    const program = programByKey.get(scheduleSeed.program) as ProgramSeed;
    const upcoming = occurrence.date > todayDate;
    const cancellation = cancelledIndexes.get(index);
    const cursor = topicCursor.get(program.key) ?? 0;
    const topic = program.topics[cursor % program.topics.length];
    if (!upcoming && !cancellation) topicCursor.set(program.key, cursor + 1);
    const nickname = STUDENTS[program.student].nickname;

    return {
      studentId: studentIds[program.student],
      programId: programIds.get(program.key) as number,
      scheduleId: occurrence.scheduleId,
      tutorId: tutor.id,
      date: occurrence.date,
      startTime: occurrence.startTime,
      endTime: occurrence.endTime,
      durationMinutes: occurrence.durationMinutes,
      status: upcoming ? ("scheduled" as const) : cancellation ? ("cancelled" as const) : ("completed" as const),
      attendance: "present" as const,
      cancelReason: cancellation?.reason ?? null,
      isBillable: !cancellation,
      focus: "routine" as const,
      topicLabel: upcoming ? null : topic,
      material: upcoming ? null : `${program.subject}: ${topic}`,
      activities: upcoming ? null : `Pembahasan konsep, latihan terbimbing, dan pengecekan pemahaman ${nickname}.`,
      notes: cancellation ? cancellation.note : null,
      reportText: upcoming || cancellation ? null : `Sesi ${program.name} membahas ${topic}.`,
      reportStatus: upcoming || cancellation ? ("none" as const) : ("final" as const),
      reportGeneratedBy: upcoming || cancellation ? null : ("manual" as const),
      completedAt: upcoming || cancellation ? null : at(occurrence.date, occurrence.endTime),
    };
  });

  await db.insert(lessonSessions).values(lessonValues);

  const lessonRows = await db
    .select({
      id: lessonSessions.id,
      studentId: lessonSessions.studentId,
      programId: lessonSessions.programId,
      date: lessonSessions.date,
      durationMinutes: lessonSessions.durationMinutes,
      status: lessonSessions.status,
      isBillable: lessonSessions.isBillable,
      invoiceId: lessonSessions.invoiceId,
    })
    .from(lessonSessions);

  console.log("[SEED] Membuat tugas dan percobaan pengerjaan...");
  const assignmentSeeds = [
    {
      student: 1,
      program: "bima-mat",
      title: "Latihan Bentuk Aljabar",
      material: "Bentuk aljabar",
      status: "published" as const,
      difficulty: "medium" as const,
      questions: [
        {
          type: "multiple_choice" as const,
          prompt: "Sederhanakan 3x + 5x.",
          options: ["8x", "15x", "8", "2x"],
          correctAnswer: "8x",
          points: 2,
          explanation: "Suku sejenis dijumlahkan koefisiennya.",
        },
        {
          type: "multiple_choice" as const,
          prompt: "Nilai x dari 2x + 4 = 10 adalah ...",
          options: ["2", "3", "4", "7"],
          correctAnswer: "3",
          points: 2,
          explanation: "2x = 6 sehingga x = 3.",
        },
        {
          type: "short_answer" as const,
          prompt: "Jabarkan 2(x + 3).",
          options: null,
          correctAnswer: "2x + 6|2x+6",
          points: 3,
          explanation: "Gunakan sifat distributif.",
        },
        {
          type: "essay" as const,
          prompt: "Jelaskan langkah menyelesaikan 3x - 5 = 10.",
          options: null,
          correctAnswer: null,
          points: 5,
          explanation: null,
        },
      ],
    },
    {
      student: 0,
      program: "aisy-mat",
      title: "Pecahan Senilai",
      material: "Pecahan",
      status: "published" as const,
      difficulty: "easy" as const,
      questions: [
        {
          type: "multiple_choice" as const,
          prompt: "1/2 sama dengan ...",
          options: ["1/4", "2/4", "3/4", "2/3"],
          correctAnswer: "2/4",
          points: 1,
          explanation: "Kalikan pembilang dan penyebut dengan 2.",
        },
        {
          type: "short_answer" as const,
          prompt: "Isi titik: 3/4 = .../8",
          options: null,
          correctAnswer: "6|enam",
          points: 2,
          explanation: "3/4 = 6/8.",
        },
      ],
    },
  ];

  for (const seed of assignmentSeeds) {
    const [assignment] = await db
      .insert(assignments)
      .values({
        studentId: studentIds[seed.student],
        programId: programIds.get(seed.program) as number,
        title: seed.title,
        material: seed.material,
        instructions: "Kerjakan semua soal. Tulis langkah pengerjaan pada soal uraian.",
        status: seed.status,
        difficulty: seed.difficulty,
        publicToken: randomBytes(24).toString("base64url"),
        createdByUserId: tutor.id,
      })
      .$returningId();

    const questionIds = (
      await db
        .insert(questions)
        .values(
          seed.questions.map((question, order) => ({
            assignmentId: assignment.id,
            orderIndex: order,
            type: question.type,
            prompt: question.prompt,
            options: question.options,
            correctAnswer: question.correctAnswer,
            points: question.points,
            explanation: question.explanation,
          })),
        )
        .$returningId()
    ).map((row) => row.id);

    // Percobaan pertama sudah dikumpulkan dan dinilai untuk memberi contoh hasil.
    const answers: Record<number, string> = {};
    const gradable: GradableQuestion[] = seed.questions.map((question, order) => {
      answers[questionIds[order]] =
        question.type === "multiple_choice"
          ? order === 0
            ? (question.correctAnswer as string)
            : "15x"
          : question.type === "short_answer"
            ? (question.correctAnswer as string).split("|")[0]
            : "Kedua ruas ditambah 5, lalu dibagi 3 sehingga x = 5.";
      return {
        id: questionIds[order],
        type: question.type,
        prompt: question.prompt,
        options: question.options,
        correctAnswer: question.correctAnswer,
        points: question.points,
      };
    });

    const attemptSeed = seed.student === 1;
    if (!attemptSeed) continue;

    const grade = gradeAttempt(gradable, answers);
    const submittedAt = new Date();
    const [attempt] = await db
      .insert(assignmentAttempts)
      .values({
        assignmentId: assignment.id,
        studentId: studentIds[seed.student],
        status: "graded",
        score: grade.score,
        maxScore: grade.maxScore,
        submittedAt,
        gradedAt: submittedAt,
      })
      .$returningId();

    await db.insert(attemptAnswers).values(
      grade.results.map((result) => ({
        attemptId: attempt.id,
        questionId: result.questionId,
        answer: answers[result.questionId],
        isCorrect: result.isCorrect,
        pointsAwarded: result.pointsAwarded,
        feedback: result.feedback,
      })),
    );
  }

  console.log("[SEED] Membuat bank materi...");
  const storage = getStorage();
  const documentValues: Array<typeof documents.$inferInsert> = [];
  for (const [index, document] of DOCUMENTS.entries()) {
    const key = `documents/demo-${index + 1}-${document.fileName}`;
    const buffer = Buffer.from(document.body, "utf8");
    await storage.put(key, buffer);
    documentValues.push({
      title: document.title,
      description: `Materi ${document.tag} untuk ${STUDENTS[document.student].nickname}.`,
      studentId: studentIds[document.student],
      programId: programIds.get(document.program) as number,
      materialTag: document.tag,
      category: document.category,
      storageKey: key,
      originalName: document.fileName,
      mimeType: "text/plain",
      size: buffer.byteLength,
      uploadedByUserId: tutor.id,
    });
  }
  await db.insert(documents).values(documentValues);

  console.log("[SEED] Melampirkan foto aktivitas belajar...");
  const photoLesson = lessonRows.find(
    (row) => row.studentId === studentIds[0] && row.status === "completed",
  );
  if (photoLesson) {
    const photoKey = "lessons/aktivitas-belajar-demo.png";
    // PNG 1×1 — cukup untuk membuktikan alur unggah, simpan, dan tampil foto kegiatan.
    const photoBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
      "base64",
    );
    await storage.put(photoKey, photoBuffer);
    await db.insert(lessonAttachments).values({
      lessonId: photoLesson.id,
      storageKey: photoKey,
      originalName: "aktivitas-belajar.png",
      mimeType: "image/png",
      size: photoBuffer.byteLength,
      kind: "image",
    });
  }

  console.log("[SEED] Membuat invoice...");
  const tutorId = tutor.id;
  const invoicePlan = [
    { student: 0, periodStart: prevPeriodStart, periodEnd: prevPeriodEnd, discount: 50_000, paidRatio: 1, dueInDays: -20 },
    { student: 1, periodStart: currentPeriodStart, periodEnd: todayDate, discount: 0, paidRatio: 0.5, dueInDays: 7 },
  ];

  for (const plan of invoicePlan) {
    const billable = lessonRows.filter(
      (row) =>
        row.studentId === studentIds[plan.student] &&
        row.status === "completed" &&
        row.isBillable &&
        row.invoiceId === null &&
        row.date >= plan.periodStart &&
        row.date <= plan.periodEnd,
    );
    if (billable.length === 0) continue;

    const lessons: BillableLesson[] = billable.map((row) => {
      const program = PROGRAMS.find((item) => programIds.get(item.key) === row.programId) as ProgramSeed;
      return {
        lessonId: row.id,
        programId: row.programId,
        programName: program.name,
        date: row.date,
        durationMinutes: row.durationMinutes,
        rate: program.rate,
        rateUnit: program.rateUnit,
      };
    });

    const draft = buildInvoiceDraft(lessons, plan.discount);
    const paidAmount = Math.round(draft.total * plan.paidRatio);
    const status = paidAmount >= draft.total ? ("paid" as const) : paidAmount > 0 ? ("partial" as const) : ("unpaid" as const);
    const issueDate = plan.periodEnd;
    const dueDate = dateKey(new Date(new Date(`${issueDate}T00:00:00`).getTime() + plan.dueInDays * 86_400_000));

    const [invoice] = await db
      .insert(invoices)
      .values({
        invoiceNumber: invoiceNumberFor(1 + plan.student, new Date(`${issueDate}T00:00:00`)),
        studentId: studentIds[plan.student],
        periodStart: plan.periodStart,
        periodEnd: plan.periodEnd,
        issueDate,
        dueDate,
        status,
        subtotal: draft.subtotal,
        discount: draft.subtotal - draft.total,
        total: draft.total,
        paidAmount,
        paidAt: paidAmount > 0 ? new Date() : null,
        notes: plan.discount > 0 ? "Diskon paket bulanan." : null,
        publicToken: randomBytes(24).toString("base64url"),
        createdByUserId: tutorId,
      })
      .$returningId();

    await db.insert(invoiceItems).values(
      draft.items.flatMap((item) =>
        item.lessonIds.map((lessonId) => ({
          invoiceId: invoice.id,
          lessonId,
          programId: item.programId,
          description: item.description,
          quantity: 1,
          unitPrice: item.unitPrice,
          amount: item.unitPrice,
        })),
      ),
    );

    await db
      .update(lessonSessions)
      .set({ invoiceId: invoice.id })
      .where(inArray(lessonSessions.id, draft.items.flatMap((item) => item.lessonIds)));

    for (const row of lessonRows) {
      if (draft.items.some((item) => item.lessonIds.includes(row.id))) row.invoiceId = invoice.id;
    }
  }

  console.log("[SEED] Membuat laporan untuk orang tua...");
  await db.insert(parentUpdates).values([
    {
      studentId: studentIds[0],
      title: "Laporan perkembangan Aisyah — bulan lalu",
      periodStart: prevPeriodStart,
      periodEnd: prevPeriodEnd,
      body:
        "Assalamualaikum Ibu Sari,\n\n" +
        "Selama periode ini Aisyah mengikuti sesi Matematika dan Bahasa Inggris dengan baik. " +
        "Kemampuan pecahan senilai sudah kuat, sedangkan soal cerita masih perlu latihan tambahan. " +
        "Kosakata bahasa Inggris bertambah dan Aisyah mulai percaya diri membaca nyaring.\n\n" +
        "Rekomendasi: latihan 10 menit setiap hari untuk soal cerita pecahan.\n\nTerima kasih,\nBudi Santoso",
      kind: "monthly",
      status: "sent",
      sentAt: new Date(),
      createdByUserId: tutor.id,
    },
    {
      studentId: studentIds[0],
      title: "Laporan perkembangan Aisyah — periode berjalan",
      periodStart: currentPeriodStart,
      periodEnd: todayDate,
      body:
        "Ibu Sari yang baik,\n\n" +
        "Progress Aisyah pada periode berjalan: penguasaan operasi pecahan meningkat dan " +
        "pengerjaan soal cerita lebih runtut. Kami akan lanjut ke pengukuran waktu dan bangun datar.\n\nTerima kasih,\nBudi Santoso",
      kind: "weekly",
      status: "final",
      createdByUserId: tutor.id,
    },
    {
      studentId: studentIds[1],
      title: "Laporan perkembangan Bima — periode berjalan",
      periodStart: currentPeriodStart,
      periodEnd: todayDate,
      body:
        "Bapak Adi yang terhormat,\n\n" +
        "Bima sudah menguasai operasi bentuk aljabar dasar. Latihan mandiri masih terhenti pada " +
        "soal persamaan dua variabel, sehingga sesi berikutnya akan difokuskan ke sana.\n\n" +
        "Tugas \"Latihan Bentuk Aljabar\" sudah dikumpulkan dan dinilai; ada satu soal uraian yang " +
        "menunggu penilaian manual.\n\nTerima kasih,\nBudi Santoso",
      kind: "brief",
      status: "draft",
      createdByUserId: tutor.id,
    },
  ]);

  console.log("[SEED] Membuat notifikasi dan undangan...");
  await db.insert(notifications).values([
    {
      userId: tutor.id,
      type: "lesson_today",
      title: "Ada sesi mengajar hari ini",
      body: "Cek jadwal harian sebelum berangkat mengajar.",
      link: "/schedule",
      dedupeKey: `lesson_today:${todayDate}`,
    },
    {
      userId: tutor.id,
      type: "report_pending",
      title: "Laporan menunggu diselesaikan",
      body: "Satu laporan orang tua masih berstatus draft.",
      link: "/reports",
      dedupeKey: `report_pending:${todayDate}`,
    },
    {
      userId: parent.id,
      type: "invoice_unpaid",
      title: "Tagihan baru untuk Aisyah",
      body: "Invoice periode lalu sudah diterbitkan.",
      link: "/parent/invoices",
      dedupeKey: `invoice:${todayDate}`,
    },
    {
      userId: parentTwo.id,
      type: "assignment_submitted",
      title: "Bima mengumpulkan tugas",
      body: "Latihan Bentuk Aljabar sudah dikumpulkan dan dinilai.",
      link: "/parent",
      dedupeKey: `assignment:${todayDate}`,
    },
  ]);

  await db.insert(parentInvites).values({
    token: randomUUID().replace(/-/g, ""),
    email: "dewi.lestari@example.com",
    name: "Ibu Dewi Lestari",
    phone: "081234567803",
    studentIds: [studentIds[2]],
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
    createdByUserId: tutor.id,
  });

  await db.insert(aiGenerations).values([
    {
      userId: tutor.id,
      kind: "lesson_report",
      provider: "anthropic",
      model: "claude-sonnet-5",
      ok: true,
      promptChars: 820,
      outputChars: 640,
    },
    {
      userId: tutor.id,
      kind: "parent_update",
      provider: "openai",
      model: "gpt-4o-mini",
      ok: false,
      errorMessage: "Provider tidak dikonfigurasi pada saat percobaan.",
      promptChars: 410,
      outputChars: 0,
    },
  ]);

  const completedCount = lessonValues.filter((lesson) => lesson.status === "completed").length;
  const scheduledCount = lessonValues.filter((lesson) => lesson.status === "scheduled").length;
  const cancelledCount = lessonValues.filter((lesson) => lesson.status === "cancelled").length;

  console.log(
    `[DONE] Seed selesai: ${lessonValues.length} sesi (${completedCount} selesai, ${scheduledCount} terjadwal, ${cancelledCount} batal).`,
  );
  console.log(`[DONE] Login tutor    : ${TUTOR_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`[DONE] Login orang tua: ${PARENT_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[FIX] Seed gagal:", error);
    await pool.end();
    process.exit(1);
  });
