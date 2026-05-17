import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { SessionState } from "@prompt-desk/shared";

export interface SessionFileSummary {
  id: string;
  state: Exclude<SessionState, "all">;
  name: string;
  absolutePath: string;
  relativePath: string;
  size: number;
  updatedAt: string;
}

export interface StructuredSessionContent {
  id: string;
  state: Exclude<SessionState, "all">;
  absolutePath: string;
  relativePath: string;
  entries: unknown[];
  parseErrors: Array<{ line: number; message: string }>;
}

function sessionId(filePath: string): string {
  return `session_${crypto.createHash("sha256").update(filePath).digest("hex").slice(0, 24)}`;
}

function walkJsonFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const results: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }
      if (entry.isFile() && (entry.name.endsWith(".json") || entry.name.endsWith(".jsonl"))) {
        results.push(absolutePath);
      }
    }
  }

  return results.sort((a, b) => a.localeCompare(b));
}

function parseStructuredFile(filePath: string): {
  entries: unknown[];
  parseErrors: Array<{ line: number; message: string }>;
} {
  const content = fs.readFileSync(filePath, "utf8");
  if (filePath.endsWith(".json")) {
    try {
      return { entries: [JSON.parse(content)], parseErrors: [] };
    } catch (error) {
      return {
        entries: [],
        parseErrors: [{ line: 1, message: error instanceof Error ? error.message : "Invalid JSON." }]
      };
    }
  }

  const entries: unknown[] = [];
  const parseErrors: Array<{ line: number; message: string }> = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    try {
      entries.push(JSON.parse(line));
    } catch (error) {
      parseErrors.push({
        line: index + 1,
        message: error instanceof Error ? error.message : "Invalid JSONL entry."
      });
    }
  });
  return { entries, parseErrors };
}

export class SessionHistoryService {
  list(codexHome: string, state: SessionState = "all"): SessionFileSummary[] {
    const roots: Array<{ state: Exclude<SessionState, "all">; dir: string }> = [
      { state: "active", dir: path.join(codexHome, "sessions") },
      { state: "archived", dir: path.join(codexHome, "archived_sessions") }
    ];

    return roots
      .filter((root) => state === "all" || root.state === state)
      .flatMap((root) =>
        walkJsonFiles(root.dir).map((filePath) => {
          const stat = fs.statSync(filePath);
          return {
            id: sessionId(filePath),
            state: root.state,
            name: path.basename(filePath),
            absolutePath: filePath,
            relativePath: path.relative(codexHome, filePath),
            size: stat.size,
            updatedAt: stat.mtime.toISOString()
          };
        })
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  read(codexHome: string, filePath: string): StructuredSessionContent {
    const absolutePath = path.resolve(filePath);
    const sessionsRoot = path.join(codexHome, "sessions");
    const archivedRoot = path.join(codexHome, "archived_sessions");
    const relativeToActive = path.relative(sessionsRoot, absolutePath);
    const relativeToArchived = path.relative(archivedRoot, absolutePath);
    const isActive = !relativeToActive.startsWith("..") && !path.isAbsolute(relativeToActive);
    const isArchived = !relativeToArchived.startsWith("..") && !path.isAbsolute(relativeToArchived);

    if (!isActive && !isArchived) {
      throw new Error("Session file must be inside Codex sessions or archived_sessions.");
    }

    const parsed = parseStructuredFile(absolutePath);
    return {
      id: sessionId(absolutePath),
      state: isArchived ? "archived" : "active",
      absolutePath,
      relativePath: path.relative(codexHome, absolutePath),
      entries: parsed.entries,
      parseErrors: parsed.parseErrors
    };
  }
}
