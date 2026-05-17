import Database from "better-sqlite3";
import path from "node:path";
import { resolvePromptDeskPaths } from "../services/paths/appHome.js";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const paths = resolvePromptDeskPaths();
    db = new Database(path.join(paths.dataDir, "promptdesk.sqlite"));
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
  }
  return db;
}
