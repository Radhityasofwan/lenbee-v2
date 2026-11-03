import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appFeedback, users } from "@/db/schema";

export type AppFeedbackRow = {
  id: number;
  message: string;
  status: "new" | "reviewed";
  createdAt: Date;
  userId: number;
  userName: string;
  userRole: "tutor" | "parent" | "super_admin";
};

export async function submitFeedback(userId: number, message: string): Promise<void> {
  await db.insert(appFeedback).values({ userId, message });
}

export async function listFeedback(): Promise<AppFeedbackRow[]> {
  return db
    .select({
      id: appFeedback.id,
      message: appFeedback.message,
      status: appFeedback.status,
      createdAt: appFeedback.createdAt,
      userId: appFeedback.userId,
      userName: users.name,
      userRole: users.role,
    })
    .from(appFeedback)
    .innerJoin(users, eq(users.id, appFeedback.userId))
    .orderBy(desc(appFeedback.createdAt));
}

export async function setFeedbackStatus(id: number, status: "new" | "reviewed"): Promise<void> {
  await db.update(appFeedback).set({ status }).where(eq(appFeedback.id, id));
}
