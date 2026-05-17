import crypto from "node:crypto";
import type { AppEvent, AppEventType } from "@prompt-desk/shared";
import { getDb } from "../../db/connection.js";
import { parseJson, toJson } from "../../db/json.js";
import { nowIso } from "../../util/time.js";

interface AppEventRow {
  id: string;
  type: AppEventType;
  entity_type: string | null;
  entity_id: string | null;
  message: string;
  metadata_json: string;
  created_at: string;
}

export interface RecordAppEventInput {
  type: AppEventType;
  entityType?: string | null;
  entityId?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
}

function mapEvent(row: AppEventRow): AppEvent {
  return {
    id: row.id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    message: row.message,
    metadata: parseJson<Record<string, unknown>>(row.metadata_json, {}),
    createdAt: row.created_at
  };
}

export class AppEventsService {
  record(input: RecordAppEventInput): AppEvent {
    const db = getDb();
    const id = `event_${crypto.randomUUID().replaceAll("-", "")}`;
    const createdAt = nowIso();
    db.prepare(
      `INSERT INTO app_events (
        id, type, entity_type, entity_id, message, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.type,
      input.entityType ?? null,
      input.entityId ?? null,
      input.message,
      toJson(input.metadata ?? {}),
      createdAt
    );

    return {
      id,
      type: input.type,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      message: input.message,
      metadata: input.metadata ?? {},
      createdAt
    };
  }

  list(limit = 100, offset = 0): AppEvent[] {
    const rows = getDb()
      .prepare("SELECT * FROM app_events ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .all(limit, offset) as AppEventRow[];
    return rows.map(mapEvent);
  }

  clearOlderThan(createdBefore: string): number {
    const result = getDb().prepare("DELETE FROM app_events WHERE created_at < ?").run(createdBefore);
    return Number(result.changes);
  }
}
