import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { env } from "@/lib/env";

const VERSION = "v1";
const SALT = "lenbee-ai-key-v1";

let cachedKey: Buffer | null = null;

function encryptionKey(): Buffer {
  if (!cachedKey) {
    cachedKey = scryptSync(env.ai.keySecret || env.databaseUrl, SALT, 32);
  }
  return cachedKey;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !data) {
    throw new Error("Format kunci tersimpan tidak dikenali.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Non-sensitive fingerprint safe to render in the UI. */
export function keyHint(plain: string): string {
  const tail = plain.trim().slice(-4);
  return tail.length === 4 ? `••••${tail}` : "••••";
}
