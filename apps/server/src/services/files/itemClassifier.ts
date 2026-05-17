import path from "node:path";
import type { ItemType } from "@prompt-desk/shared";
import {
  getPluginNameFromPath,
  isHiddenInternalPath,
  isIgnoredRelativePath,
  isPluginCachePath,
  isWithinRoot,
  splitRelativePath,
  toRelativePath,
  type ClassificationContext,
  type ItemClassification
} from "../../domain/items/itemPolicy.js";
import { inspectFileSafety, type FileSafetyResult } from "./fileSafety.js";

export interface ClassifyItemOptions {
  safety?: FileSafetyResult;
}

const GLOBAL_READ_ONLY_PREFIXES = [
  "sessions/",
  "archived_sessions/",
  "cache/",
  "vendor_imports/",
  "skills/.system/",
  "sqlite/",
  "log/",
  "tmp/",
  ".tmp/"
];

const PROJECT_SKILL_ROOTS = [".codex/skills/", ".agents/skills/"];

export async function classifyItemPath(
  absolutePathInput: string,
  context: ClassificationContext,
  options: ClassifyItemOptions = {}
): Promise<ItemClassification | null> {
  const absolutePath = path.resolve(absolutePathInput);
  const rootPath = path.resolve(context.rootPath);
  if (!isWithinRoot(rootPath, absolutePath)) return null;

  const relativePath = toRelativePath(rootPath, absolutePath);
  if (isIgnoredRelativePath(relativePath, context.scope)) return null;

  const safety = options.safety ?? (await inspectFileSafety(absolutePath));
  const base = path.basename(absolutePath);
  const segments = splitRelativePath(relativePath);
  const type = classifyType(relativePath, context.scope);
  if (!type) return null;

  const origin = getOrigin(relativePath, context.scope);
  const pluginName = origin === "plugin" ? getPluginNameFromPath(relativePath) : null;
  const readOnlyReason = getReadOnlyReason(relativePath, context.scope, type);
  const blockedReason = getBlockedReason(relativePath, safety, readOnlyReason);
  const editability = blockedReason ? "blocked" : readOnlyReason ? "read-only" : "editable";
  const status = blockedReason ? "blocked" : "current";
  const safeToRead = !blockedReason && safety.isText;
  const safeToIndex = safeToRead && !isNeverIndexed(relativePath);
  const safeToVersion = safeToRead && editability === "editable";

  return {
    type,
    origin,
    name: displayNameForItem(base, relativePath, type, segments),
    absolutePath,
    relativePath,
    projectId: context.scope === "project" ? (context.projectId ?? null) : null,
    projectName: context.scope === "project" ? (context.projectName ?? null) : null,
    pluginName,
    editability,
    status,
    blockedReason,
    metadata: {
      contentType: safety.contentType,
      scanScope: context.scope,
      readOnlyReason,
      safeToIndex,
      safeToPreview: safeToRead,
      safeToVersion
    },
    safeToRead,
    safeToIndex,
    safeToPreview: safeToRead,
    safeToVersion
  };
}

export function classifyType(relativePath: string, scope: "global" | "project"): ItemType | null {
  const normalized = relativePath.replaceAll("\\", "/");
  const base = path.posix.basename(normalized);

  if (base === "AGENTS.md") return "agents";
  if (base === "SKILL.md" && isSkillPath(normalized, scope)) return "skill";
  if (isAgentPath(normalized, scope)) return "agent";
  if (isPluginPath(normalized, scope)) return "plugin";
  if (isHookPath(normalized, scope)) return "hook";
  if (isConfigPath(normalized, scope)) return "config";
  if (isMemoryPath(normalized, scope)) return "memory";
  if (isAutomationPath(normalized, scope)) return "automation";
  if (isSessionPath(normalized)) return "session";
  if (normalized === "history.jsonl") return "activity";
  return null;
}

export function isPathCandidate(relativePath: string, scope: "global" | "project"): boolean {
  return classifyType(relativePath, scope) !== null || isKnownBlockedPath(relativePath, scope);
}

function getOrigin(relativePath: string, scope: "global" | "project") {
  if (scope === "project") return "project";
  return isPluginCachePath(relativePath) ? "plugin" : "global";
}

function getReadOnlyReason(relativePath: string, scope: "global" | "project", type: ItemType): string | null {
  const normalized = relativePath.replaceAll("\\", "/");
  if (type === "session") return "Sessions are read-only in V1";
  if (type === "activity") return "Codex activity is read-only in V1";
  if (type === "plugin") return "Plugin files are read-only in V1";

  if (scope === "global") {
    if (normalized === "session_index.jsonl") return "Session index is read-only in V1";
    if (normalized === "auth.json") return "auth.json is sensitive";
    if (GLOBAL_READ_ONLY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
      return "Codex cache, state, system, or session path is read-only";
    }
    if (/^(logs_|state_).*\.sqlite/.test(normalized)) return "Codex SQLite state/log files are read-only";
  }

  if (scope === "project" && normalized.startsWith(".codex/plugins/")) {
    return "Project plugin files are read-only in V1";
  }

  return null;
}

function getBlockedReason(relativePath: string, safety: FileSafetyResult, readOnlyReason: string | null): string | null {
  const normalized = relativePath.replaceAll("\\", "/");
  if (normalized === "auth.json") return "auth.json is sensitive and blocked";
  if (!safety.exists) return "File is missing";
  if (!safety.isFile) return safety.blockedReason ?? "Path is not a regular file";
  if (safety.isSymlink) return "Symbolic links are blocked";
  if (safety.isBinary) return "Binary files are blocked";
  if (!safety.isText) return safety.blockedReason ?? "File is not safe text";
  if (safety.blockedReason && !readOnlyReason) return safety.blockedReason;
  if (safety.blockedReason && readOnlyReason?.includes("sensitive")) return safety.blockedReason;
  return null;
}

function isNeverIndexed(relativePath: string): boolean {
  const normalized = relativePath.replaceAll("\\", "/");
  return normalized === "auth.json" || normalized.endsWith("/auth.json") || isHiddenInternalPath(normalized);
}

function isSkillPath(relativePath: string, scope: "global" | "project"): boolean {
  if (scope === "global") return relativePath.startsWith("skills/");
  return PROJECT_SKILL_ROOTS.some((root) => relativePath.startsWith(root));
}

function isAgentPath(relativePath: string, scope: "global" | "project"): boolean {
  const normalized = relativePath.replaceAll("\\", "/");
  if (!normalized.endsWith(".yaml") && !normalized.endsWith(".yml")) return false;
  if (scope === "global") {
    return normalized.startsWith("skills/") && normalized.includes("/agents/");
  }
  return PROJECT_SKILL_ROOTS.some((root) => normalized.startsWith(root) && normalized.includes("/agents/"));
}

function isPluginPath(relativePath: string, scope: "global" | "project"): boolean {
  const normalized = relativePath.replaceAll("\\", "/");
  if (scope === "global") return normalized.startsWith("plugins/") && !normalized.startsWith("plugins/cache/");
  return normalized.startsWith(".codex/plugins/");
}

function isConfigPath(relativePath: string, scope: "global" | "project"): boolean {
  const normalized = relativePath.replaceAll("\\", "/");
  if (scope === "global") {
    return normalized === "config.toml" || normalized === "auth.json";
  }
  return normalized === ".codex/config.toml";
}

function isHookPath(relativePath: string, scope: "global" | "project"): boolean {
  const normalized = relativePath.replaceAll("\\", "/");
  if (scope === "global") return normalized === "hooks.json";
  return normalized === ".codex/hooks.json";
}

function isMemoryPath(relativePath: string, scope: "global" | "project"): boolean {
  return scope === "global" && relativePath.startsWith("memories/");
}

function isAutomationPath(relativePath: string, scope: "global" | "project"): boolean {
  const normalized = relativePath.replaceAll("\\", "/");
  if (scope === "global") return normalized.startsWith("automations/");
  return normalized.startsWith(".codex/automations/");
}

function isSessionPath(relativePath: string): boolean {
  const normalized = relativePath.replaceAll("\\", "/");
  return (
    normalized.startsWith("sessions/") ||
    normalized.startsWith("archived_sessions/") ||
    normalized === "session_index.jsonl"
  );
}

function isKnownBlockedPath(relativePath: string, scope: "global" | "project"): boolean {
  const normalized = relativePath.replaceAll("\\", "/");
  if (scope === "global") {
    return (
      normalized === "auth.json" ||
      normalized.startsWith("cache/") ||
      normalized.startsWith("vendor_imports/") ||
      normalized.startsWith("sqlite/") ||
      normalized.startsWith("log/") ||
      normalized.startsWith("tmp/") ||
      normalized.startsWith(".tmp/") ||
      /^(logs_|state_).*\.sqlite/.test(normalized)
    );
  }
  return false;
}

function displayNameForItem(base: string, relativePath: string, type: ItemType, segments: string[]): string {
  if (type === "skill" && segments.length >= 3) return segments.at(-2) ?? base;
  if (type === "plugin") return getPluginNameFromPath(relativePath) ?? base;
  return base;
}
