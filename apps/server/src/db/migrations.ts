import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "./connection.js";
import { nowIso } from "../util/time.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations(): void {
  const db = getDb();
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const migrationId = "001_baseline";
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  const applied = db
    .prepare("SELECT id FROM migrations WHERE id = ?")
    .get(migrationId) as { id: string } | undefined;

  if (!applied) {
    db.exec(schema);
    db.prepare("INSERT INTO migrations (id, applied_at) VALUES (?, ?)").run(migrationId, nowIso());
    return;
  }

  db.exec(schema);
}
