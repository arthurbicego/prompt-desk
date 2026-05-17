import type { Database } from "better-sqlite3";
import type { ItemOrigin, ItemType, TrashItem } from "@prompt-desk/shared";
import { getDb } from "../connection.js";
import { parseJson, toJson } from "../json.js";
import { nowIso } from "../../util/time.js";

interface TrashItemRow {
  id: string;
  item_id: string | null;
  original_path: string;
  basename: string;
  trash_path: string;
  item_type: ItemType;
  origin: ItemOrigin;
  hash: string | null;
  size: number | null;
  metadata_json: string;
  created_at: string;
}

export interface CreateTrashItemInput {
  id: string;
  itemId: string | null;
  originalPath: string;
  basename: string;
  trashPath: string;
  itemType: ItemType;
  origin: ItemOrigin;
  hash: string | null;
  size: number | null;
  metadata: Record<string, unknown>;
}

function mapTrashItem(row: TrashItemRow): TrashItem {
  return {
    id: row.id,
    itemId: row.item_id,
    originalPath: row.original_path,
    basename: row.basename,
    trashPath: row.trash_path,
    itemType: row.item_type,
    origin: row.origin,
    hash: row.hash,
    size: row.size,
    metadata: parseJson<Record<string, unknown>>(row.metadata_json, {}),
    createdAt: row.created_at
  };
}

export class TrashRepository {
  constructor(private readonly db: Database = getDb()) {}

  list(): TrashItem[] {
    const rows = this.db.prepare("SELECT * FROM trash_items ORDER BY created_at DESC").all() as TrashItemRow[];
    return rows.map(mapTrashItem);
  }

  get(trashId: string): TrashItem | null {
    const row = this.db.prepare("SELECT * FROM trash_items WHERE id = ?").get(trashId) as TrashItemRow | undefined;
    return row ? mapTrashItem(row) : null;
  }

  create(input: CreateTrashItemInput): TrashItem {
    const createdAt = nowIso();
    this.db
      .prepare(
        `INSERT INTO trash_items
          (id, item_id, original_path, basename, trash_path, item_type, origin, hash, size, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.itemId,
        input.originalPath,
        input.basename,
        input.trashPath,
        input.itemType,
        input.origin,
        input.hash,
        input.size,
        toJson(input.metadata),
        createdAt
      );

    const created = this.get(input.id);
    if (!created) {
      throw new Error("Trash item was not persisted");
    }
    return created;
  }

  delete(trashId: string): void {
    this.db.prepare("DELETE FROM trash_items WHERE id = ?").run(trashId);
  }
}
