import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, parentStudents, students } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { attachmentByKey, canReadAttachment } from "@/lib/services/attachments";
import { assertSafeKey, getStorage } from "@/lib/storage";

const INLINE_TYPES = /^image\/(jpeg|png|webp|gif|heic)$|^application\/pdf$/;

async function canReadDocument(userId: number, studentId: number | null, uploadedBy: number): Promise<boolean> {
  if (uploadedBy === userId) return true;
  if (studentId === null) return false;

  const owners = await db.select({ tutorId: students.tutorId }).from(students).where(eq(students.id, studentId)).limit(1);
  if (owners[0]?.tutorId === userId) return true;

  const links = await db
    .select({ studentId: parentStudents.studentId })
    .from(parentStudents)
    .where(and(eq(parentStudents.parentUserId, userId), eq(parentStudents.studentId, studentId)))
    .limit(1);
  return links.length > 0;
}

export async function GET(_request: Request, props: RouteContext<"/api/files/[...key]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });

  const { key: segments } = await props.params;

  let key: string;
  try {
    key = assertSafeKey(segments.map((segment) => decodeURIComponent(segment)).join("/"));
  } catch {
    return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
  }

  let mimeType: string;
  let originalName: string;

  const attachment = await attachmentByKey(key);
  if (attachment) {
    if (!(await canReadAttachment(user.id, attachment))) {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
    }
    mimeType = attachment.mimeType;
    originalName = attachment.originalName;
  } else {
    const rows = await db
      .select({
        mimeType: documents.mimeType,
        originalName: documents.originalName,
        studentId: documents.studentId,
        uploadedByUserId: documents.uploadedByUserId,
      })
      .from(documents)
      .where(eq(documents.storageKey, key))
      .limit(1);
    const document = rows[0];
    if (!document || !(await canReadDocument(user.id, document.studentId, document.uploadedByUserId))) {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
    }
    mimeType = document.mimeType;
    originalName = document.originalName;
  }

  let body: Buffer;
  try {
    body = await getStorage().get(key);
  } catch {
    return NextResponse.json({ error: "Berkas tidak tersedia." }, { status: 404 });
  }

  const disposition = INLINE_TYPES.test(mimeType) ? "inline" : "attachment";
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(body.length),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(originalName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}
