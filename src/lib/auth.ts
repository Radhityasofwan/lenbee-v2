import "server-only";
import crypto from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, loginAttempts, users, type User } from "@/db/schema";
import { env } from "./env";
import { ROLE_HOME } from "./role-home";

const BCRYPT_ROUNDS = 12;

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "avatarPath" | "isActive" | "activeUntil">;

export { ROLE_HOME };

function isExpired(activeUntil: Date | null): boolean {
  return activeUntil !== null && activeUntil.getTime() < Date.now();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.sessionTtlDays * 86_400_000);

  const headerList = await headers();
  await db.insert(authSessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    userAgent: headerList.get("user-agent")?.slice(0, 500) ?? null,
    ip: clientIpFromHeaders(headerList),
  });

  const cookieStore = await cookies();
  cookieStore.set(env.sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.sessionCookieName)?.value;
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.id, hashToken(token)));
  }
  cookieStore.delete(env.sessionCookieName);
}

export async function destroyAllSessionsForUser(userId: number): Promise<void> {
  await db.delete(authSessions).where(eq(authSessions.userId, userId));
}

function clientIpFromHeaders(headerList: Headers): string | null {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64);
  return headerList.get("x-real-ip")?.slice(0, 64) ?? null;
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.sessionCookieName)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      avatarPath: users.avatarPath,
      isActive: users.isActive,
      activeUntil: users.activeUntil,
    })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .where(and(eq(authSessions.id, hashToken(token)), gt(authSessions.expiresAt, new Date())))
    .limit(1);

  const user = rows[0];
  if (!user || !user.isActive || isExpired(user.activeUntil)) return null;
  return user;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireTutor(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "tutor") redirect(ROLE_HOME[user.role]);
  return user;
}

export async function requireParent(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "parent") redirect(ROLE_HOME[user.role]);
  return user;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "super_admin") redirect(ROLE_HOME[user.role]);
  return user;
}

/** Untuk route handler / server action: melempar error alih-alih redirect. */
export async function getSessionUserOrThrow(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function getTutorOrThrow(): Promise<SessionUser> {
  const user = await getSessionUserOrThrow();
  if (user.role !== "tutor") throw new Error("FORBIDDEN");
  return user;
}

export async function getSuperAdminOrThrow(): Promise<SessionUser> {
  const user = await getSessionUserOrThrow();
  if (user.role !== "super_admin") throw new Error("FORBIDDEN");
  return user;
}

/* --------------------------- Login rate limiting --------------------------- */

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

export async function isLoginThrottled(identifier: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const rows = await db
    .select({ id: loginAttempts.id })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.identifier, identifier.slice(0, 191)), eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since)));
  return rows.length >= MAX_ATTEMPTS;
}

export async function recordLoginAttempt(identifier: string, success: boolean): Promise<void> {
  await db
    .insert(loginAttempts)
    .values({ identifier: identifier.slice(0, 191), success })
    .catch(() => undefined);
}

export async function pruneStaleAuthData(): Promise<void> {
  await db.delete(authSessions).where(lt(authSessions.expiresAt, new Date()));
  await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
}
