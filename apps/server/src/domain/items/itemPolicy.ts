import path from "node:path";
import type { EditabilityState, ItemOrigin, ItemType } from "@prompt-desk/shared";

export type ScanScope = "global" | "project";

export interface ClassificationContext {
  scope: ScanScope;
  rootPath: string;
  projectId?: string | null;
  projectName?: string | null;
}

export interface ItemClassification {
  type: ItemType;
  origin: ItemOrigin;
  name: string;
  absolutePath: string;
  relativePath: string;
  projectId: string | null;
  projectName: string | null;
  pluginName: string | null;
  editability: EditabilityState;
  status: "current" | "blocked";
  blockedReason: string | null;
  metadata: Record<string, unknown>;
  safeToRead: boolean;
  safeToIndex: boolean;
  safeToPreview: boolean;
  safeToVersion: boolean;
}

export const IGNORED_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "target",
  "coverage",
  ".next",
  ".nuxt",
  ".venv",
  "venv",
  ".idea",
  ".DS_Store"
]);

export const GLOBAL_IGNORED_ROOTS = new Set([".tmp", "tmp", "worktrees", "cache", "vendor_imports", "sqlite", "log"]);

export function normalizePathForPolicy(value: string): string {
  return path.resolve(value);
}

export function toRelativePath(rootPath: string, absolutePath: string): string {
  const relative = path.relative(rootPath, absolutePath);
  return relative === "" ? path.basename(absolutePath) : relative.split(path.sep).join("/");
}

export function splitRelativePath(relativePath: string): string[] {
  return relativePath.split("/").filter(Boolean);
}

export function hasIgnoredPathSegment(absolutePath: string): boolean {
  return splitRelativePath(absolutePath).some((segment) => IGNORED_NAMES.has(segment));
}

export function isIgnoredRelativePath(relativePath: string, scope?: ScanScope): boolean {
  const segments = splitRelativePath(relativePath);
  if (segments.some((segment) => IGNORED_NAMES.has(segment))) return true;
  return scope === "global" && segments[0] ? GLOBAL_IGNORED_ROOTS.has(segments[0]) : false;
}

export function isWithinRoot(rootPath: string, absolutePath: string): boolean {
  const relative = path.relative(rootPath, absolutePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function isHiddenInternalPath(relativePath: string): boolean {
  const segments = splitRelativePath(relativePath);
  return segments.includes("cache") || segments.includes("vendor_imports");
}

export function isPluginCachePath(relativePath: string): boolean {
  const segments = splitRelativePath(relativePath);
  return segments[0] === "plugins" && segments[1] === "cache";
}

export function getPluginNameFromPath(relativePath: string): string | null {
  const segments = splitRelativePath(relativePath);
  if (segments[0] === "plugins" && segments[1] === "cache" && segments[2]) return segments[2];
  if (segments.includes("plugins")) {
    const pluginIndex = segments.indexOf("plugins");
    return segments[pluginIndex + 1] ?? null;
  }
  return null;
}
