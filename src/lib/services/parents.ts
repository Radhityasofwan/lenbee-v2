import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { parentInvites, parentStudents, students, users } from "@/db/schema";

export class ParentInviteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParentInviteError";
  }
}

/** Masa berlaku link undangan. Cukup longgar untuk dikirim lewat WhatsApp, cukup pendek agar tidak menggantung. */
const INVITE_TTL_DAYS = 14;

export type ParentInvite = typeof parentInvites.$inferSelect;

export type CreateInviteResult =
  | { status: "invited"; invite: ParentInvite }
  | { status: "linked"; studentName: string }
  | { status: "reused"; invite: ParentInvite };

export type InviteInput = {
  studentId: number;
  name: string;
  email: string;
  phone?: string;
};

async function getOwnedStudentName(tutorId: number, studentId: number): Promise<string> {
  const [row] = await db
    .select({ name: students.name })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.tutorId, tutorId)))
    .limit(1);
  if (!row) throw new ParentInviteError("Murid tidak ditemukan.");
  return row.name;
}

/**
 * Membuat link undangan akun orang tua untuk satu murid.
 * Bila email sudah punya akun Lenbee, undangan dilewati dan akun itu langsung disambungkan.
 * Bila sudah ada undangan aktif untuk murid + email yang sama, link lama dipakai ulang
 * supaya "kirim ulang" tidak menumpuk baris undangan.
 */
export async function createParentInvite(tutorId: number, input: InviteInput): Promise<CreateInviteResult> {
  const studentName = await getOwnedStudentName(tutorId, input.studentId);

  const [existingParent] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, input.email), eq(users.role, "parent")))
    .limit(1);

  if (existingParent) {
    const [linked] = await db
      .select({ id: parentStudents.id })
      .from(parentStudents)
      .where(and(eq(parentStudents.parentUserId, existingParent.id), eq(parentStudents.studentId, input.studentId)))
      .limit(1);
    if (linked) throw new ParentInviteError("Email ini sudah tersambung ke murid tersebut.");

    await db
      .insert(parentStudents)
      .values({ parentUserId: existingParent.id, studentId: input.studentId })
      .onDuplicateKeyUpdate({ set: { relation: "orang tua" } });

    return { status: "linked", studentName };
  }

  const pending = await listPendingInvites(tutorId, input.studentId);
  const reusable = pending.find((invite) => invite.email.toLowerCase() === input.email.toLowerCase());
  if (reusable) return { status: "reused", invite: reusable };

  const [created] = await db
    .insert(parentInvites)
    .values({
      token: randomBytes(32).toString("base64url"),
      email: input.email,
      name: input.name,
      phone: input.phone ?? null,
      studentIds: [input.studentId],
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      createdByUserId: tutorId,
    })
    .$returningId();

  const [invite] = await db.select().from(parentInvites).where(eq(parentInvites.id, created.id)).limit(1);
  if (!invite) throw new ParentInviteError("Gagal membuat undangan. Coba lagi.");
  return { status: "invited", invite };
}

/** Undangan yang masih bisa dipakai dan belum kedaluwarsa. */
export async function listPendingInvites(tutorId: number, studentId?: number): Promise<ParentInvite[]> {
  const rows = await db
    .select()
    .from(parentInvites)
    .where(
      and(
        eq(parentInvites.createdByUserId, tutorId),
        isNull(parentInvites.acceptedAt),
        gt(parentInvites.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(parentInvites.createdAt));

  if (studentId === undefined) return rows;
  return rows.filter((row) => row.studentIds.includes(studentId));
}

export async function revokeParentInvite(tutorId: number, inviteId: number): Promise<void> {
  const [invite] = await db
    .select()
    .from(parentInvites)
    .where(and(eq(parentInvites.id, inviteId), eq(parentInvites.createdByUserId, tutorId)))
    .limit(1);
  if (!invite) throw new ParentInviteError("Undangan tidak ditemukan.");
  if (invite.acceptedAt) throw new ParentInviteError("Undangan ini sudah dipakai dan tidak bisa dibatalkan.");

  await db.delete(parentInvites).where(eq(parentInvites.id, inviteId));
}

export type ParentAccessStatus = "connected" | "pending" | "ready" | "no_email";

export type ParentAccessRow = {
  studentId: number;
  studentName: string;
  status: ParentAccessStatus;
  parentCount: number;
  pendingCount: number;
};

/** Ringkasan status akses orang tua untuk seluruh murid aktif — dipakai daftar di halaman pengaturan. */
export async function parentAccessOverview(tutorId: number): Promise<ParentAccessRow[]> {
  const roster = await db
    .select({ id: students.id, name: students.name, parentEmail: students.parentEmail })
    .from(students)
    .where(and(eq(students.tutorId, tutorId), eq(students.isActive, true)))
    .orderBy(asc(students.name));

  if (roster.length === 0) return [];

  const ids = roster.map((row) => row.id);
  const [linked, pending] = await Promise.all([
    db
      .select({ studentId: parentStudents.studentId })
      .from(parentStudents)
      .where(inArray(parentStudents.studentId, ids)),
    listPendingInvites(tutorId),
  ]);

  const countBy = (studentIds: number[]) => {
    const map = new Map<number, number>();
    for (const id of studentIds) map.set(id, (map.get(id) ?? 0) + 1);
    return map;
  };

  const linkedCount = countBy(linked.map((row) => row.studentId));
  const pendingCount = countBy(pending.flatMap((invite) => invite.studentIds));

  return roster.map((student) => {
    const parents = linkedCount.get(student.id) ?? 0;
    const waiting = pendingCount.get(student.id) ?? 0;
    const status: ParentAccessStatus =
      parents > 0 ? "connected" : waiting > 0 ? "pending" : student.parentEmail ? "ready" : "no_email";
    return {
      studentId: student.id,
      studentName: student.name,
      status,
      parentCount: parents,
      pendingCount: waiting,
    };
  });
}
