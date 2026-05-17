import crypto from "node:crypto";

export function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
