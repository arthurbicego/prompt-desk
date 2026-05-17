import type { AppEvent, AppEventType } from "@prompt-desk/shared";
import { randomUUID } from "node:crypto";
import { getDb } from "../connection.js";
import { parseJson, toJson } from "../json.js";
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

export interface CreateAppEventInput {
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
    metadata: parseJson(row.metadata_json, {}),
    createdAt: row.created_at
  };
}

export class AppEventsRepository {
  create(input: CreateAppEventInput): AppEvent {
    const event: AppEvent = {
      id: randomUUID(),
      type: input.type,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      message: input.message,
      metadata: input.metadata ?? {},
      createdAt: nowIso()
    };

    getDb()
      .prepare(
        `INSERT INTO app_events (id, type, entity_type, entity_id, message, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.id,
        event.type,
        event.entityType,
        event.entityId,
        event.message,
        toJson(event.metadata),
        event.createdAt
      );

    return event;
  }

  list(limit = 100, before?: string): AppEvent[] {
    const boundedLimit = Math.min(Math.max(limit, 1), 500);
    const rows = before
      ? (getDb()
          .prepare(
            `SELECT id, type, entity_type, entity_id, message, metadata_json, created_at
             FROM app_events
             WHERE created_at < ?
             ORDER BY created_at DESC
             LIMIT ?`
          )
          .all(before, boundedLimit) as AppEventRow[])
      : (getDb()
          .prepare(
            `SELECT id, type, entity_type, entity_id, message, metadata_json, created_at
             FROM app_events
             ORDER BY created_at DESC
             LIMIT ?`
          )
          .all(boundedLimit) as AppEventRow[]);

    return rows.map(mapEvent);
  }
}

export const appEventsRepository = new AppEventsRepository();
