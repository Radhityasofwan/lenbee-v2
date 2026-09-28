import type { z } from "zod";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Nilai yang dikembalikan server untuk dipakai ulang oleh form (mis. id baris baru). */
  data?: Record<string, unknown>;
};

export const idleState: ActionState = { ok: false };

export function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, message, fieldErrors };
}

export function okay(message?: string, data?: Record<string, unknown>): ActionState {
  return { ok: true, message, data };
}

export function formToObject(formData: FormData, arrayFields: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const forced = new Set(arrayFields);

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    const current = out[key];
    if (current === undefined) {
      out[key] = forced.has(key) ? [value] : value;
    } else if (Array.isArray(current)) {
      current.push(value);
    } else {
      out[key] = [current, value];
    }
  }

  for (const key of forced) {
    const current = out[key];
    if (current === undefined) out[key] = [];
    else if (!Array.isArray(current)) out[key] = [current];
  }

  return out;
}

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

type Parsed<T> = { success: true; data: T } | { success: false; state: ActionState };

export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
  options: { arrayFields?: string[] } = {},
): Parsed<z.output<T>> {
  const raw = formToObject(formData, options.arrayFields);
  const result = schema.safeParse(raw);

  if (!result.success) {
    const fieldErrors = zodFieldErrors(result.error);
    const first = result.error.issues[0]?.message ?? "Data yang dikirim tidak valid.";
    return { success: false, state: fail(first, fieldErrors) };
  }

  return { success: true, data: result.data };
}

export function parseJson<T extends z.ZodType>(schema: T, value: unknown): Parsed<z.output<T>> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fieldErrors = zodFieldErrors(result.error);
    const first = result.error.issues[0]?.message ?? "Data yang dikirim tidak valid.";
    return { success: false, state: fail(first, fieldErrors) };
  }
  return { success: true, data: result.data };
}

export function errorMessage(error: unknown, fallback = "Terjadi kesalahan. Coba lagi."): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
