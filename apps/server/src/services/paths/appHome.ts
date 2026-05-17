import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PromptDeskPaths } from "@prompt-desk/shared";

function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolvePromptDeskPaths(): PromptDeskPaths {
  const home =
    process.env.PROMPT_DESK_HOME && path.isAbsolute(process.env.PROMPT_DESK_HOME)
      ? process.env.PROMPT_DESK_HOME
      : path.join(os.homedir(), "Library", "Application Support", "PromptDesk");

  const promptDeskHome = ensureDir(home);
  const dataDir = ensureDir(path.join(promptDeskHome, "data"));
  const trashDir = ensureDir(path.join(promptDeskHome, "trash"));
  const tempDir = ensureDir(path.join(promptDeskHome, "temp"));
  const logsDir = ensureDir(path.join(promptDeskHome, "logs"));

  ensureDir(path.join(trashDir, "items"));
  ensureDir(path.join(tempDir, "versions"));
  ensureDir(path.join(tempDir, "diffs"));

  return { promptDeskHome, dataDir, trashDir, tempDir, logsDir };
}
