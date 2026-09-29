import { describe, expect, it } from "vitest";
import { AccessDeniedError, assertStudentAccess, getStudentForUser, studentScopeCondition } from "./authz";
import type { SessionUser } from "./auth";

function user(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 1,
    email: "tutor@lenbee.id",
    name: "Tutor",
    role: "tutor",
    avatarPath: null,
    isActive: true,
    activeUntil: null,
    ...overrides,
  };
}

describe("AccessDeniedError", () => {
  it("memakai pesan default dan nama kelas yang bisa dikenali UI", () => {
    const error = new AccessDeniedError();
    expect(error.message).toBe("Akses ditolak");
    expect(error.name).toBe("AccessDeniedError");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("assertStudentAccess", () => {
  it("menolak id yang bukan bilangan bulat positif tanpa menyentuh database", async () => {
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(assertStudentAccess(user(), bad)).rejects.toBeInstanceOf(AccessDeniedError);
    }
  });
});

describe("getStudentForUser", () => {
  it("menolak id tidak valid sebelum query dijalankan", async () => {
    await expect(getStudentForUser(user(), -5)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(getStudentForUser(user({ role: "parent" }), 0)).rejects.toThrow(/Akses ditolak/);
  });
});

describe("studentScopeCondition", () => {
  it("mengembalikan kondisi SQL untuk daftar id yang terisi maupun kosong", () => {
    expect(studentScopeCondition(studentScopeColumn(), [1, 2])).toBeDefined();
    // Daftar kosong harus tetap menghasilkan kondisi yang valid, bukan tanpa filter.
    expect(studentScopeCondition(studentScopeColumn(), [])).toBeDefined();
  });
});

function studentScopeColumn() {
  // Kolom tiruan; hanya bentuknya yang dibutuhkan oleh inArray.
  return { name: "student_id", table: {} } as unknown as Parameters<typeof studentScopeCondition>[0];
}
