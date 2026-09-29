import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { parentStudents, students, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

export class AdminAccountError extends Error {}

export type AdminAccountRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  activeUntil: Date | null;
  isExpired: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  linkedStudents: { id: number; name: string }[];
};

const ACCOUNT_COLUMNS = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  isActive: users.isActive,
  activeUntil: users.activeUntil,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
} as const;

function isExpired(activeUntil: Date | null, now: number): boolean {
  return activeUntil !== null && activeUntil.getTime() < now;
}

export async function listTutors(): Promise<AdminAccountRow[]> {
  const now = Date.now();
  const rows = await db
    .select(ACCOUNT_COLUMNS)
    .from(users)
    .where(eq(users.role, "tutor"))
    .orderBy(asc(users.name));
  return rows.map((row) => ({ ...row, isExpired: isExpired(row.activeUntil, now), linkedStudents: [] }));
}

export async function listParents(): Promise<AdminAccountRow[]> {
  const now = Date.now();
  const rows = await db
    .select(ACCOUNT_COLUMNS)
    .from(users)
    .where(eq(users.role, "parent"))
    .orderBy(asc(users.name));

  const links = await db
    .select({ parentUserId: parentStudents.parentUserId, studentId: students.id, studentName: students.name })
    .from(parentStudents)
    .innerJoin(students, eq(students.id, parentStudents.studentId));

  const byParent = new Map<number, { id: number; name: string }[]>();
  for (const link of links) {
    const list = byParent.get(link.parentUserId) ?? [];
    list.push({ id: link.studentId, name: link.studentName });
    byParent.set(link.parentUserId, list);
  }

  return rows.map((row) => ({
    ...row,
    isExpired: isExpired(row.activeUntil, now),
    linkedStudents: byParent.get(row.id) ?? [],
  }));
}

/** Daftar murid lintas tutor untuk dipilih saat menautkan akun orang tua. */
export async function studentOptionsForPicker(): Promise<{ id: number; name: string; tutorName: string }[]> {
  const rows = await db
    .select({ id: students.id, name: students.name, tutorName: users.name })
    .from(students)
    .innerJoin(users, eq(users.id, students.tutorId))
    .orderBy(asc(users.name), asc(students.name));
  return rows;
}

async function assertEmailAvailable(email: string): Promise<void> {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) throw new AdminAccountError("Email ini sudah dipakai akun lain.");
}

export type CreateAccountInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
  activeUntil: Date | null;
};

export async function createTutor(input: CreateAccountInput): Promise<number> {
  await assertEmailAvailable(input.email);
  const inserted = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name,
      phone: input.phone ?? null,
      passwordHash: await hashPassword(input.password),
      role: "tutor",
      activeUntil: input.activeUntil,
    })
    .$returningId();
  const id = inserted[0]?.id;
  if (!id) throw new AdminAccountError("Gagal membuat akun tutor.");
  return id;
}

export async function createParent(input: CreateAccountInput & { studentIds: number[] }): Promise<number> {
  await assertEmailAvailable(input.email);
  const inserted = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name,
      phone: input.phone ?? null,
      passwordHash: await hashPassword(input.password),
      role: "parent",
      activeUntil: input.activeUntil,
    })
    .$returningId();
  const id = inserted[0]?.id;
  if (!id) throw new AdminAccountError("Gagal membuat akun orang tua.");

  if (input.studentIds.length > 0) {
    await db
      .insert(parentStudents)
      .values(input.studentIds.map((studentId) => ({ parentUserId: id, studentId })))
      .onDuplicateKeyUpdate({ set: { relation: "orang tua" } });
  }

  return id;
}

export type UpdateAccountInput = {
  name?: string;
  email?: string;
  phone?: string | null;
  activeUntil?: Date | null;
};

export async function updateAccount(id: number, patch: UpdateAccountInput): Promise<void> {
  if (patch.email) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, patch.email)).limit(1);
    if (existing && existing.id !== id) throw new AdminAccountError("Email ini sudah dipakai akun lain.");
  }

  await db.update(users).set(patch).where(eq(users.id, id));
}

export async function updateParentStudentLinks(parentUserId: number, studentIds: number[]): Promise<void> {
  await db.delete(parentStudents).where(eq(parentStudents.parentUserId, parentUserId));
  if (studentIds.length === 0) return;
  await db
    .insert(parentStudents)
    .values(studentIds.map((studentId) => ({ parentUserId, studentId })))
    .onDuplicateKeyUpdate({ set: { relation: "orang tua" } });
}

export async function setAccountActive(id: number, isActive: boolean): Promise<void> {
  await db.update(users).set({ isActive }).where(eq(users.id, id));
}

export async function deleteAccount(id: number): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}
