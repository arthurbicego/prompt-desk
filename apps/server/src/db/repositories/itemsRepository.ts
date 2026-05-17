import crypto from "node:crypto";
import type Database from "better-sqlite3";
import type { CodexItem, ItemType, PromptDeskTab, SessionState } from "@prompt-desk/shared";
import { getDb } from "../connection.js";
import { parseJson, toJson } from "../json.js";
import { nowIso } from "../../util/time.js";
import type { ItemClassification } from "../../domain/items/itemPolicy.js";

export interface ItemUpsertInput extends ItemClassification {
  hash: string | null;
  size: number | null;
  mtimeMs: number | null;
}

export interface ItemListOptions {
  tab: PromptDeskTab;
  query?: string;
  scopes: string[];
  sessionState: SessionState;
  limit: number;
  offset: number;
  sort: "updatedAt" | "name" | "type" | "origin";
  direction: "asc" | "desc";
  itemIds?: string[];
}

export interface CountScope {
  scope: string;
  label: string;
  count: number;
}

type ItemRow = {
  id: string;
  type: ItemType;
  origin: CodexItem["origin"];
  name: string;
  absolute_path: string;
  relative_path: string;
  project_id: string | null;
  project_name: string | null;
  plugin_name: string | null;
  editability: CodexItem["editability"];
  status: CodexItem["status"];
  hash: string | null;
  size: number | null;
  created_at: string;
  detected_at: string;
  updated_at: string;
  last_version_at: string | null;
  blocked_reason: string | null;
  metadata_json: string;
};

const SORT_COLUMNS = {
  updatedAt: "updated_at",
  name: "name",
  type: "type",
  origin: "origin"
} as const;

export class ItemsRepository {
  constructor(private readonly db: Database.Database = getDb()) {}

  upsertDetectedItem(input: ItemUpsertInput): CodexItem {
    const existing = this.findByAbsolutePath(input.absolutePath);
    const timestamp = nowIso();
    const id = existing?.id ?? createItemId(input.absolutePath);
    const createdAt = existing?.createdAt ?? timestamp;
    const detectedAt = existing?.detectedAt ?? timestamp;
    const updatedAt = input.mtimeMs ? new Date(input.mtimeMs).toISOString() : timestamp;

    this.db
      .prepare(
        `INSERT INTO codex_items (
          id, type, origin, name, absolute_path, relative_path, project_id, project_name, plugin_name,
          editability, status, hash, size, created_at, detected_at, updated_at, last_version_at,
          blocked_reason, metadata_json
        ) VALUES (
          @id, @type, @origin, @name, @absolutePath, @relativePath, @projectId, @projectName, @pluginName,
          @editability, @status, @hash, @size, @createdAt, @detectedAt, @updatedAt, @lastVersionAt,
          @blockedReason, @metadataJson
        )
        ON CONFLICT(absolute_path) DO UPDATE SET
          type = excluded.type,
          origin = excluded.origin,
          name = excluded.name,
          relative_path = excluded.relative_path,
          project_id = excluded.project_id,
          project_name = excluded.project_name,
          plugin_name = excluded.plugin_name,
          editability = excluded.editability,
          status = excluded.status,
          hash = excluded.hash,
          size = excluded.size,
          detected_at = excluded.detected_at,
          updated_at = excluded.updated_at,
          blocked_reason = excluded.blocked_reason,
          metadata_json = excluded.metadata_json`
      )
      .run({
        id,
        type: input.type,
        origin: input.origin,
        name: input.name,
        absolutePath: input.absolutePath,
        relativePath: input.relativePath,
        projectId: input.projectId,
        projectName: input.projectName,
        pluginName: input.pluginName,
        editability: input.editability,
        status: input.status,
        hash: input.hash,
        size: input.size,
        createdAt,
        detectedAt,
        updatedAt,
        lastVersionAt: existing?.lastVersionAt ?? null,
        blockedReason: input.blockedReason,
        metadataJson: toJson(input.metadata)
      });

    const item = this.findById(id);
    if (!item) throw new Error("Failed to load upserted item");
    return item;
  }

  findById(id: string): CodexItem | null {
    const row = this.db.prepare("SELECT * FROM codex_items WHERE id = ?").get(id) as ItemRow | undefined;
    return row ? mapItem(row) : null;
  }

  findByAbsolutePath(absolutePath: string): CodexItem | null {
    const row = this.db.prepare("SELECT * FROM codex_items WHERE absolute_path = ?").get(absolutePath) as
      | ItemRow
      | undefined;
    return row ? mapItem(row) : null;
  }

  list(options: ItemListOptions): { items: CodexItem[]; total: number } {
    const where = buildWhere(options);
    const orderColumn = SORT_COLUMNS[options.sort];
    const direction = options.direction.toUpperCase() === "ASC" ? "ASC" : "DESC";
    const rows = this.db
      .prepare(
        `SELECT * FROM codex_items ${where.sql}
         ORDER BY ${orderColumn} ${direction}, name ASC
         LIMIT @limit OFFSET @offset`
      )
      .all(where.params({ limit: options.limit, offset: options.offset })) as ItemRow[];
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM codex_items ${where.sql}`)
      .get(where.params({})) as { total: number };
    return { items: rows.map(mapItem), total: totalRow.total };
  }

  countByTab(scopes: string[]): Record<string, number> {
    const tabs: PromptDeskTab[] = [
      "agents",
      "skill",
      "agent",
      "plugin",
      "config",
      "memory",
      "automation",
      "session",
      "activity",
      "all"
    ];
    const counts: Record<string, number> = {};
    for (const tab of tabs) {
      const where = buildWhere({
        tab,
        scopes,
        sessionState: "all"
      });
      const row = this.db.prepare(`SELECT COUNT(*) AS total FROM codex_items ${where.sql}`).get(where.params({})) as {
        total: number;
      };
      counts[tab] = row.total;
    }
    return counts;
  }

  countByScope(tab: PromptDeskTab): CountScope[] {
    const scopes: CountScope[] = [];
    const globalCount = this.countFor({ tab, scopes: ["global"] });
    scopes.push({ scope: "global", label: "Global", count: globalCount });

    const projectRows = this.db
      .prepare("SELECT id, name FROM projects WHERE status = 'active' ORDER BY name ASC")
      .all() as Array<{ id: string; name: string }>;

    for (const project of projectRows) {
      scopes.push({
        scope: `project:${project.id}`,
        label: project.name,
        count: this.countFor({ tab, scopes: [`project:${project.id}`] })
      });
    }

    return scopes;
  }

  markMissingOutsideSeen(rootPath: string, seenAbsolutePaths: Set<string>, projectId: string | null): number {
    const statement = this.db.prepare(
      projectId
        ? "SELECT id, absolute_path FROM codex_items WHERE project_id = ? AND status != 'deleted'"
        : "SELECT id, absolute_path FROM codex_items WHERE origin IN ('global', 'plugin') AND project_id IS NULL AND status != 'deleted'"
    );
    const rows = (projectId ? statement.all(projectId) : statement.all()) as Array<{ id: string; absolute_path: string }>;

    const missingIds = rows
      .filter((row) => row.absolute_path.startsWith(rootPath) && !seenAbsolutePaths.has(row.absolute_path))
      .map((row) => row.id);
    if (missingIds.length === 0) return 0;

    const update = this.db.prepare(
      "UPDATE codex_items SET status = 'missing', editability = 'deleted', updated_at = ? WHERE id = ?"
    );
    const timestamp = nowIso();
    const transaction = this.db.transaction((ids: string[]) => {
      for (const id of ids) update.run(timestamp, id);
    });
    transaction(missingIds);
    return missingIds.length;
  }

  markMissingByAbsolutePath(absolutePath: string): CodexItem | null {
    const existing = this.findByAbsolutePath(absolutePath);
    if (!existing) return null;
    this.db
      .prepare("UPDATE codex_items SET status = 'missing', editability = 'deleted', updated_at = ? WHERE id = ?")
      .run(nowIso(), existing.id);
    return this.findById(existing.id);
  }

  private countFor(options: { tab: PromptDeskTab; scopes: string[] }): number {
    const where = buildWhere({
      tab: options.tab,
      scopes: options.scopes,
      sessionState: "all"
    });
    const row = this.db.prepare(`SELECT COUNT(*) AS total FROM codex_items ${where.sql}`).get(where.params({})) as {
      total: number;
    };
    return row.total;
  }
}

function createItemId(absolutePath: string): string {
  return `item_${crypto.createHash("sha256").update(absolutePath).digest("hex").slice(0, 24)}`;
}

function buildWhere(options: Pick<ItemListOptions, "tab" | "scopes" | "sessionState" | "itemIds">): {
  sql: string;
  params: (extra: Record<string, unknown>) => Record<string, unknown>;
} {
  const clauses = ["status != 'deleted'"];
  const params: Record<string, unknown> = {};

  if (options.tab !== "all") {
    clauses.push("type = @type");
    params.type = options.tab;
  }

  const scopeClauses = buildScopeClauses(options.scopes, params);
  if (scopeClauses.length > 0) clauses.push(`(${scopeClauses.join(" OR ")})`);

  if (options.sessionState !== "all") {
    clauses.push("json_extract(metadata_json, '$.sessionState') = @sessionState");
    params.sessionState = options.sessionState;
  }

  if (options.itemIds) {
    if (options.itemIds.length === 0) clauses.push("1 = 0");
    else {
      const placeholders = options.itemIds.map((id, index) => {
        const key = `itemId${index}`;
        params[key] = id;
        return `@${key}`;
      });
      clauses.push(`id IN (${placeholders.join(", ")})`);
    }
  }

  const sql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return { sql, params: (extra) => ({ ...params, ...extra }) };
}

function buildScopeClauses(scopes: string[], params: Record<string, unknown>): string[] {
  const normalized = scopes.length > 0 ? scopes : ["global"];
  const clauses: string[] = [];
  const projectIds: string[] = [];

  for (const scope of normalized) {
    if (scope === "global") clauses.push("origin IN ('global', 'plugin')");
    else if (scope === "plugin") clauses.push("origin = 'plugin'");
    else if (scope === "all-projects") clauses.push("origin = 'project'");
    else if (scope.startsWith("project:")) projectIds.push(scope.slice("project:".length));
    else if (scope) projectIds.push(scope);
  }

  if (projectIds.length > 0) {
    const placeholders = projectIds.map((id, index) => {
      const key = `projectId${index}`;
      params[key] = id;
      return `@${key}`;
    });
    clauses.push(`project_id IN (${placeholders.join(", ")})`);
  }

  return clauses;
}

function mapItem(row: ItemRow): CodexItem {
  return {
    id: row.id,
    type: row.type,
    origin: row.origin,
    name: row.name,
    absolutePath: row.absolute_path,
    relativePath: row.relative_path,
    projectId: row.project_id,
    projectName: row.project_name,
    pluginName: row.plugin_name,
    editability: row.editability,
    status: row.status,
    hash: row.hash,
    size: row.size,
    createdAt: row.created_at,
    detectedAt: row.detected_at,
    updatedAt: row.updated_at,
    lastVersionAt: row.last_version_at,
    blockedReason: row.blocked_reason,
    metadata: parseJson<Record<string, unknown>>(row.metadata_json, {})
  };
}
