import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { AppEvent } from "@prompt-desk/shared";
import { AppEventsService } from "./appEvents.js";

export interface CodexHistoryEntry {
  id: string;
  source: "codex-history";
  line: number;
  entry: unknown;
}

export interface ActivityFeed {
  codexHistory: {
    path: string;
    readOnly: true;
    entries: CodexHistoryEntry[];
    parseErrors: Array<{ line: number; message: string }>;
  };
  appEvents: AppEvent[];
}

function entryId(filePath: string, line: number, content: string): string {
  return `history_${crypto.createHash("sha256").update(`${filePath}:${line}:${content}`).digest("hex").slice(0, 24)}`;
}

export class CodexHistoryService {
  constructor(private readonly appEvents = new AppEventsService()) {}

  readHistory(codexHome: string, limit = 200): ActivityFeed["codexHistory"] {
    const historyPath = path.join(codexHome, "history.jsonl");
    const entries: CodexHistoryEntry[] = [];
    const parseErrors: Array<{ line: number; message: string }> = [];

    if (!fs.existsSync(historyPath)) {
      return { path: historyPath, readOnly: true, entries, parseErrors };
    }

    const lines = fs.readFileSync(historyPath, "utf8").split(/\r?\n/);
    const start = Math.max(0, lines.length - limit);
    lines.slice(start).forEach((line, index) => {
      const lineNumber = start + index + 1;
      if (!line.trim()) return;
      try {
        entries.push({
          id: entryId(historyPath, lineNumber, line),
          source: "codex-history",
          line: lineNumber,
          entry: JSON.parse(line)
        });
      } catch (error) {
        parseErrors.push({
          line: lineNumber,
          message: error instanceof Error ? error.message : "Invalid JSONL entry."
        });
      }
    });

    return { path: historyPath, readOnly: true, entries: entries.reverse(), parseErrors };
  }

  getActivityFeed(codexHome: string, limit = 100): ActivityFeed {
    return {
      codexHistory: this.readHistory(codexHome, limit),
      appEvents: this.appEvents.list(limit, 0)
    };
  }
}
