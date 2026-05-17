import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CodexHomeResolution } from "@prompt-desk/shared";

function readableDirectory(candidate: string): boolean {
  try {
    const stat = fs.statSync(candidate);
    fs.accessSync(candidate, fs.constants.R_OK);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export function resolveCodexHome(savedPreference?: string | null): CodexHomeResolution {
  const candidates: Array<{ path: string; source: CodexHomeResolution["source"] }> = [];
  if (savedPreference) candidates.push({ path: savedPreference, source: "preference" });
  if (process.env.CODEX_HOME) candidates.push({ path: process.env.CODEX_HOME, source: "CODEX_HOME" });
  candidates.push({ path: path.join(os.homedir(), ".codex"), source: "default" });

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate.path) && readableDirectory(candidate.path)) {
      return { path: candidate.path, source: candidate.source, valid: true };
    }
  }

  const preferred = candidates[0];
  return {
    path: preferred?.path ?? null,
    source: "invalid",
    valid: false,
    error: "Codex Home was not found or is not readable."
  };
}
