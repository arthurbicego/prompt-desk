import type { Database } from "better-sqlite3";
import type { AppEventType, CodexItem, FileVersion, VersionOrigin } from "@prompt-desk/shared";
import { getDb } from "../connection.js";
import { parseJson, toJson } from "../json.js";
import { nowIso } from "../../util/time.js";
import { createId } from "../../services/versioning/hash.js";

interface CodexItemRow {
  id: string;
  type: CodexItem["type"];
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
}

interface FileVersionRow {
  id: string;
  item_id: string;
  path: string;
  content: string;
  hash: string;
  size: number;
  origin: VersionOrigin;
  protected: number;
  created_at: string;
}

export interface FileVersionWithContent extends FileVersion {
  content: string;
}

export interface CreateVersionInput {
  itemId: string;
  path: string;
  content: string;
  hash: string;
  size: number;
  origin: VersionOrigin;
  protected?: boolean;
}

function mapItem(row: CodexItemRow): CodexItem {
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

function mapVersion(row: FileVersionRow): FileVersionWithContent {
  return {
    id: row.id,
    itemId: row.item_id,
    path: row.path,
    content: row.content,
    hash: row.hash,
    size: row.size,
    origin: row.origin,
    createdAt: row.created_at,
    protected: row.protected === 1
  };
}

export class VersionsRepository {
  constructor(private readonly db: Database = getDb()) {}

  getItem(itemId: string): CodexItem | null {
    const row = this.db
      .prepare("SELECT * FROM codex_items WHERE id = ?")
      .get(itemId) as CodexItemRow | undefined;
    return row ? mapItem(row) : null;
  }

  listForItem(itemId: string): FileVersion[] {
    const rows = this.db
      .prepare("SELECT * FROM file_versions WHERE item_id = ? ORDER BY created_at DESC")
      .all(itemId) as FileVersionRow[];
    return rows.map(mapVersion).map(({ content: _content, ...version }) => version);
  }

  getVersion(versionId: string, itemId?: string): FileVersionWithContent | null {
    const row = this.db
      .prepare(
        itemId
          ? "SELECT * FROM file_versions WHERE id = ? AND item_id = ?"
          : "SELECT * FROM file_versions WHERE id = ?"
      )
      .get(...(itemId ? [versionId, itemId] : [versionId])) as FileVersionRow | undefined;
    return row ? mapVersion(row) : null;
  }

  createVersion(input: CreateVersionInput, retention: number): FileVersionWithContent {
    const existing = this.db
      .prepare("SELECT * FROM file_versions WHERE item_id = ? AND hash = ? ORDER BY created_at DESC LIMIT 1")
      .get(input.itemId, input.hash) as FileVersionRow | undefined;

    if (existing) {
      this.db
        .prepare("UPDATE codex_items SET hash = ?, size = ?, updated_at = ?, last_version_at = ? WHERE id = ?")
        .run(input.hash, input.size, nowIso(), existing.created_at, input.itemId);
      return mapVersion(existing);
    }

    const createdAt = nowIso();
    const version: FileVersionWithContent = {
      id: createId("version"),
      itemId: input.itemId,
      path: input.path,
      content: input.content,
      hash: input.hash,
      size: input.size,
      origin: input.origin,
      createdAt,
      protected: input.protected ?? false
    };

    const transaction = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO file_versions
            (id, item_id, path, content, hash, size, origin, protected, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          version.id,
          version.itemId,
          version.path,
          version.content,
          version.hash,
          version.size,
          version.origin,
          version.protected ? 1 : 0,
          version.createdAt
        );

      this.db
        .prepare("UPDATE codex_items SET hash = ?, size = ?, updated_at = ?, last_version_at = ? WHERE id = ?")
        .run(version.hash, version.size, createdAt, createdAt, version.itemId);

      this.pruneForItem(version.itemId, retention);
    });

    transaction();
    return version;
  }

  updateItemCurrent(itemId: string, hash: string | null, size: number | null, status: CodexItem["status"]): void {
    this.db
      .prepare("UPDATE codex_items SET hash = ?, size = ?, status = ?, editability = ?, updated_at = ? WHERE id = ?")
      .run(hash, size, status, status === "deleted" ? "deleted" : "editable", nowIso(), itemId);
  }

  updateItemPath(itemId: string, absolutePath: string, relativePath: string, name: string): void {
    this.db
      .prepare(
        "UPDATE codex_items SET absolute_path = ?, relative_path = ?, name = ?, status = 'current', editability = 'editable', updated_at = ? WHERE id = ?"
      )
      .run(absolutePath, relativePath, name, nowIso(), itemId);
  }

  replaceSearchIndex(item: CodexItem, content: string): void {
    this.db.prepare("DELETE FROM search_index WHERE item_id = ?").run(item.id);
    this.db
      .prepare(
        `INSERT INTO search_index
          (item_id, name, relative_path, absolute_path, content, type, origin, scope, indexed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        item.id,
        item.name,
        item.relativePath,
        item.absolutePath,
        content,
        item.type,
        item.origin,
        item.projectId ?? item.origin,
        nowIso()
      );
  }

  removeSearchIndex(itemId: string): void {
    this.db.prepare("DELETE FROM search_index WHERE item_id = ?").run(itemId);
  }

  insertEvent(type: AppEventType, entityType: string | null, entityId: string | null, message: string, metadata: unknown): void {
    this.db
      .prepare(
        `INSERT INTO app_events
          (id, type, entity_type, entity_id, message, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(createId("event"), type, entityType, entityId, message, toJson(metadata), nowIso());
  }

  private pruneForItem(itemId: string, retention: number): void {
    const keep = Math.max(1, retention);
    const rows = this.db
      .prepare(
        `SELECT id FROM file_versions
         WHERE item_id = ? AND protected = 0
         ORDER BY created_at DESC
         LIMIT -1 OFFSET ?`
      )
      .all(itemId, keep) as Array<{ id: string }>;

    for (const row of rows) {
      this.db.prepare("DELETE FROM file_versions WHERE id = ? AND protected = 0").run(row.id);
    }
  }
}
