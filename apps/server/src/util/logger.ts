import fs from "node:fs";
import path from "node:path";
import { resolvePromptDeskPaths } from "../services/paths/appHome.js";
import { nowIso } from "./time.js";

type LogLevel = "info" | "warn" | "error";

const paths = resolvePromptDeskPaths();
const logFile = path.join(paths.logsDir, "promptdesk.log");

function write(level: LogLevel, message: string, metadata?: unknown): void {
  const line = JSON.stringify({ at: nowIso(), level, message, metadata }) + "\n";
  fs.appendFile(logFile, line, () => undefined);
  if (level === "error") {
    console.error(message, metadata ?? "");
  } else if (level === "warn") {
    console.warn(message, metadata ?? "");
  } else {
    console.log(message, metadata ?? "");
  }
}

export const logger = {
  info: (message: string, metadata?: unknown) => write("info", message, metadata),
  warn: (message: string, metadata?: unknown) => write("warn", message, metadata),
  error: (message: string, metadata?: unknown) => write("error", message, metadata)
};
