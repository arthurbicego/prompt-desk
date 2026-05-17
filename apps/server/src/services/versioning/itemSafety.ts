import fs from "node:fs/promises";
import path from "node:path";
import type { CodexItem } from "@prompt-desk/shared";
import { AppError } from "../../util/errors.js";
import { sha256 } from "./hash.js";

export interface SafeTextContent {
  content: string;
  hash: string;
  size: number;
}

const SENSITIVE_BASENAMES = new Set([
  "auth.json",
  ".env",
  ".env.local",
  ".env.production",
  ".npmrc",
  ".netrc"
]);

const SENSITIVE_EXTENSIONS = new Set([".pem", ".key", ".p12", ".pfx"]);

export function isSensitivePath(filePath: string): boolean {
  const basename = path.basename(filePath).toLowerCase();
  if (SENSITIVE_BASENAMES.has(basename)) return true;
  if (SENSITIVE_EXTENSIONS.has(path.extname(basename))) return true;
  return /(^|[._-])(secret|token|credential|password|private-key)([._-]|$)/i.test(basename);
}

export function assertSafeEditableItem(item: CodexItem, action: string): void {
  if (item.status === "deleted" || item.editability === "deleted") {
    throw new AppError(409, "ITEM_DELETED", `Cannot ${action} a deleted item`);
  }

  if (item.status === "missing") {
    throw new AppError(404, "ITEM_MISSING", `Cannot ${action} a missing item`);
  }

  if (item.status === "blocked" || item.editability === "blocked") {
    throw new AppError(403, "ITEM_BLOCKED", item.blockedReason ?? `Cannot ${action} a blocked item`);
  }

  if (item.editability !== "editable") {
    throw new AppError(403, "ITEM_READ_ONLY", `Cannot ${action} a read-only item`);
  }

  if (isSensitivePath(item.absolutePath)) {
    throw new AppError(403, "SENSITIVE_ITEM", `Cannot ${action} a sensitive item`);
  }
}

export async function readSafeTextFile(filePath: string): Promise<SafeTextContent> {
  if (!path.isAbsolute(filePath) || isSensitivePath(filePath)) {
    throw new AppError(403, "UNSAFE_PATH", "File path is not safe for this action");
  }

  const buffer = await fs.readFile(filePath);
  if (buffer.includes(0)) {
    throw new AppError(415, "BINARY_FILE", "Binary files cannot be versioned or edited");
  }

  const content = buffer.toString("utf8");
  return {
    content,
    hash: sha256(buffer),
    size: buffer.byteLength
  };
}

export function safeTempFilename(sourcePath: string): string {
  return path.basename(sourcePath).replace(/[^a-zA-Z0-9._-]/g, "_") || "version.txt";
}
