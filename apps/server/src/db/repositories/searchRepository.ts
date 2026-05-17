import type Database from "better-sqlite3";
import type { CodexItem } from "@prompt-desk/shared";
import { getDb } from "../connection.js";
import { nowIso } from "../../util/time.js";

export interface SearchIndexInput {
  item: CodexItem;
  content: string;
  scope: string;
}

export interface SearchOptions {
  query: string;
  limit: number;
  offset: number;
  tab?: string;
  scopes?: string[];
}

export interface SearchHit {
  itemId: string;
  rank: number;
}

export class SearchRepository {
  constructor(private readonly db: Database.Database = getDb()) {}

  upsert(input: SearchIndexInput): void {
    this.remove(input.item.id);
    this.db
      .prepare(
        `INSERT INTO search_index (
          item_id, name, relative_path, absolute_path, content, type, origin, scope, indexed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.item.id,
        input.item.name,
        input.item.relativePath,
        input.item.absolutePath,
        input.content,
        input.item.type,
        input.item.origin,
        input.scope,
        nowIso()
      );
  }

  remove(itemId: string): void {
    this.db.prepare("DELETE FROM search_index WHERE item_id = ?").run(itemId);
  }

  clear(): void {
    this.db.prepare("DELETE FROM search_index").run();
  }

  search(options: SearchOptions): SearchHit[] {
    const match = toFtsMatch(options.query);
    if (!match) return [];

    const clauses = ["search_index MATCH @match"];
    const params: Record<string, unknown> = {
      match,
      limit: options.limit,
      offset: options.offset
    };

    if (options.tab && options.tab !== "all") {
      clauses.push("type = @type");
      params.type = options.tab;
    }

    const scopeClauses = buildScopeClauses(options.scopes ?? ["global"], params);
    if (scopeClauses.length > 0) clauses.push(`(${scopeClauses.join(" OR ")})`);

    const rows = this.db
      .prepare(
        `SELECT item_id AS itemId, bm25(search_index) AS rank
         FROM search_index
         WHERE ${clauses.join(" AND ")}
         ORDER BY rank ASC
         LIMIT @limit OFFSET @offset`
      )
      .all(params) as SearchHit[];

    return rows;
  }
}

export function toFtsMatch(query: string): string | null {
  const terms = query
    .trim()
    .split(/\s+/)
    .map((term) => term.replace(/"/g, "").replace(/[^A-Za-z0-9_./-]/g, ""))
    .filter(Boolean)
    .slice(0, 12);

  if (terms.length === 0) return null;
  return terms.map((term) => `"${term}"`).join(" ");
}

function buildScopeClauses(scopes: string[], params: Record<string, unknown>): string[] {
  if (scopes.length === 0) return ["1 = 0"];

  const clauses: string[] = [];
  const projectScopes: string[] = [];

  for (const scope of scopes) {
    if (scope === "global") clauses.push("origin IN ('global', 'plugin')");
    else if (scope === "plugin") clauses.push("origin = 'plugin'");
    else if (scope === "all-projects") clauses.push("origin = 'project'");
    else if (scope.startsWith("project:")) projectScopes.push(scope);
    else if (scope) projectScopes.push(`project:${scope}`);
  }

  if (projectScopes.length > 0) {
    const placeholders = projectScopes.map((scope, index) => {
      const key = `scope${index}`;
      params[key] = scope;
      return `@${key}`;
    });
    clauses.push(`scope IN (${placeholders.join(", ")})`);
  }

  return clauses;
}
