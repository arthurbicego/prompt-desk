import fs from "node:fs/promises";
import path from "node:path";

export type TextContentType = "markdown" | "toml" | "yaml" | "json" | "jsonl" | "text" | "unknown";

export interface FileSafetyResult {
  exists: boolean;
  isFile: boolean;
  isSymlink: boolean;
  isBinary: boolean;
  isText: boolean;
  contentType: TextContentType;
  size: number | null;
  mtimeMs: number | null;
  blockedReason: string | null;
}

const SENSITIVE_BASENAMES = new Set([
  "auth.json",
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".npmrc",
  ".netrc"
]);

const SENSITIVE_NAME_PATTERN = /(^|[-_.])(secret|secrets|token|tokens|credential|credentials|password|passwd|private-key|apikey|api-key)([-_.]|$)/i;
const RAW_SECRET_PATTERN =
  /(?:api[_-]?key|token|secret|password|passwd|authorization|bearer)\s*[:=]\s*["']?(?!\$?\{?[A-Z0-9_]+\}?["']?$)[A-Za-z0-9_./+=:@-]{16,}/i;

export function contentTypeForPath(filePath: string): TextContentType {
  const basename = path.basename(filePath);
  const extension = path.extname(basename).toLowerCase();
  if (basename === "AGENTS.md" || extension === ".md" || extension === ".markdown") return "markdown";
  if (extension === ".toml") return "toml";
  if (extension === ".yaml" || extension === ".yml") return "yaml";
  if (extension === ".json") return "json";
  if (extension === ".jsonl") return "jsonl";
  if (extension === ".txt" || extension === ".text" || extension === ".log" || extension === ".conf" || extension === ".ini") {
    return "text";
  }
  return "unknown";
}

export function isSensitivePath(filePath: string): string | null {
  const basename = path.basename(filePath);
  if (SENSITIVE_BASENAMES.has(basename)) return `${basename} is sensitive`;
  if (SENSITIVE_NAME_PATTERN.test(basename)) return "File name indicates secret or credential content";
  return null;
}

export function containsRawSecret(content: string): boolean {
  return RAW_SECRET_PATTERN.test(content);
}

export async function inspectFileSafety(filePath: string): Promise<FileSafetyResult> {
  try {
    const stat = await fs.lstat(filePath);
    const isSymlink = stat.isSymbolicLink();
    const isFile = stat.isFile();
    const contentType = contentTypeForPath(filePath);
    const sensitiveReason = isSensitivePath(filePath);

    if (isSymlink) {
      return result(false, isFile, isSymlink, false, contentType, stat.size, stat.mtimeMs, "Symbolic links are not followed");
    }

    if (!isFile) {
      return result(false, isFile, isSymlink, false, contentType, stat.size, stat.mtimeMs, "Path is not a regular file");
    }

    if (sensitiveReason) {
      return result(true, isFile, isSymlink, false, contentType, stat.size, stat.mtimeMs, sensitiveReason);
    }

    const sample = await readSample(filePath);
    const binary = isBinarySample(sample);
    const knownText = contentType !== "unknown";
    const utf8Text = sample.toString("utf8");
    const text = !binary && (knownText || looksLikeText(utf8Text));
    const blockedReason = text ? null : "File is binary or not recognized as safe text";
    return result(true, isFile, isSymlink, binary, contentType, stat.size, stat.mtimeMs, blockedReason);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "UNKNOWN";
    return {
      exists: code !== "ENOENT",
      isFile: false,
      isSymlink: false,
      isBinary: false,
      isText: false,
      contentType: contentTypeForPath(filePath),
      size: null,
      mtimeMs: null,
      blockedReason: code === "ENOENT" ? "File does not exist" : "File cannot be read"
    };
  }
}

export async function readSafeTextFile(filePath: string): Promise<string> {
  const safety = await inspectFileSafety(filePath);
  if (!safety.exists || !safety.isFile || !safety.isText || safety.blockedReason) {
    throw new Error(safety.blockedReason ?? "File is not safe to read");
  }
  const content = await fs.readFile(filePath, "utf8");
  if (containsRawSecret(content)) {
    throw new Error("File content appears to contain raw secrets");
  }
  return content;
}

async function readSample(filePath: string): Promise<Buffer> {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(8192);
    const read = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, read.bytesRead);
  } finally {
    await handle.close();
  }
}

function isBinarySample(buffer: Buffer): boolean {
  if (buffer.length === 0) return false;
  if (buffer.includes(0)) return true;
  const text = buffer.toString("utf8");
  let replacementCount = 0;
  for (const char of text) {
    if (char === "\uFFFD") replacementCount += 1;
  }
  return replacementCount / Math.max(text.length, 1) > 0.05;
}

function looksLikeText(value: string): boolean {
  if (value.length === 0) return true;
  let controlCount = 0;
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 32 && char !== "\n" && char !== "\r" && char !== "\t") controlCount += 1;
  }
  return controlCount / value.length < 0.02;
}

function result(
  exists: boolean,
  isFile: boolean,
  isSymlink: boolean,
  isBinary: boolean,
  contentType: TextContentType,
  size: number | null,
  mtimeMs: number | null,
  blockedReason: string | null
): FileSafetyResult {
  return {
    exists,
    isFile,
    isSymlink,
    isBinary,
    isText: exists && isFile && !isSymlink && !isBinary && !blockedReason,
    contentType,
    size,
    mtimeMs,
    blockedReason
  };
}
