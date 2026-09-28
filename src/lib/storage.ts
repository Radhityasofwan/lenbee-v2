import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "./env";

export type StoredFile = {
  /** Key relatif yang disimpan di database. */
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export interface StorageProvider {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Public URL bila driver mendukung; null berarti harus lewat route terproteksi. */
  publicUrl(key: string): string | null;
}

const KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,480}$/;

export function assertSafeKey(key: string): string {
  const normalized = path.posix.normalize(key.replace(/\\/g, "/"));
  if (
    normalized.startsWith("/") ||
    normalized.includes("..") ||
    normalized.includes("\0") ||
    !KEY_PATTERN.test(normalized)
  ) {
    throw new Error("Invalid storage key");
  }
  return normalized;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

export const ALLOWED_MIME_TYPES = new Set(Object.keys(EXTENSION_BY_MIME));

export function safeExtension(mimeType: string, originalName: string): string {
  const fromMime = EXTENSION_BY_MIME[mimeType];
  if (fromMime) return fromMime;
  const ext = path.extname(originalName).replace(".", "").toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin";
}

class LocalStorageProvider implements StorageProvider {
  constructor(private rootDir: string) {}

  private resolve(key: string): string {
    const safe = assertSafeKey(key);
    const full = path.join(this.rootDir, safe);
    const rootResolved = path.resolve(this.rootDir);
    if (!path.resolve(full).startsWith(rootResolved + path.sep)) {
      throw new Error("Path escape detected");
    }
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data, { mode: 0o640 });
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  publicUrl(): string | null {
    // File selalu disajikan lewat /api/files dengan pemeriksaan otorisasi.
    return null;
  }
}

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (provider) return provider;
  if (env.storageDriver === "s3") {
    throw new Error(
      "STORAGE_DRIVER=s3 belum dikonfigurasi. Implementasikan S3StorageProvider di src/lib/storage.ts.",
    );
  }
  const root = process.env.STORAGE_LOCAL_DIR ?? path.join(process.cwd(), "storage", "uploads");
  provider = new LocalStorageProvider(root);
  return provider;
}

export function buildStorageKey(prefix: string, originalName: string, mimeType: string): string {
  const id = crypto.randomUUID();
  return `${prefix.replace(/\/+$/, "")}/${id}.${safeExtension(mimeType, originalName)}`;
}

/** Magic-byte check sederhana supaya ekstensi/MIME yang dipalsukan tidak lolos. */
export function looksLikeDeclaredType(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;
  const hex = buffer.subarray(0, 12).toString("hex").toLowerCase();
  switch (mimeType) {
    case "image/jpeg":
      return hex.startsWith("ffd8ff");
    case "image/png":
      return hex.startsWith("89504e47");
    case "image/gif":
      return hex.startsWith("676966");
    case "image/webp":
      return hex.startsWith("52494646") && buffer.subarray(8, 12).toString() === "WEBP";
    case "application/pdf":
      return hex.startsWith("25504446");
    default:
      // Office/zip-based formats + text: hanya tolak yang jelas-jelas executable.
      return !hex.startsWith("7f454c46") && !hex.startsWith("4d5a");
  }
}
