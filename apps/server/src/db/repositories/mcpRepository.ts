import type Database from "better-sqlite3";
import type { McpInspectionState, McpServer, McpTool } from "@prompt-desk/shared";
import { getDb } from "../connection.js";
import { parseJson, toJson } from "../json.js";
import { nowIso } from "../../util/time.js";

interface McpServerRow {
  id: string;
  config_item_id: string | null;
  name: string;
  transport: "stdio" | "streamable-http";
  disabled: 0 | 1;
  command: string | null;
  args_json: string;
  url: string | null;
  cwd: string | null;
  env_json: string;
  headers_json: string;
  enabled_tools_json: string;
  disabled_tools_json: string;
  status: McpInspectionState;
  error: string | null;
  last_inspected_at: string | null;
  updated_at: string;
}

interface McpToolRow {
  id: string;
  server_id: string;
  name: string;
  description: string | null;
  input_schema_json: string | null;
  output_schema_json: string | null;
  inspected_at: string;
}

interface ConfigItemRow {
  id: string;
  absolute_path: string;
  origin: string;
  project_id: string | null;
}

export interface PersistMcpServerInput {
  id: string;
  configItemId: string | null;
  name: string;
  transport: McpServer["transport"];
  disabled: boolean;
  command: string | null;
  args: string[];
  url: string | null;
  cwd: string | null;
  env: Record<string, string>;
  headers: Record<string, string>;
  enabledTools: string[];
  disabledTools: string[];
}

export interface PersistMcpToolInput {
  id: string;
  serverId: string;
  name: string;
  description: string | null;
  inputSchema: Record<string, unknown> | null;
  outputSchema: Record<string, unknown> | null;
  inspectedAt: string;
}

export interface McpInspectionRecord {
  id: string;
  serverId: string | null;
  status: McpInspectionState;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

function mapServer(row: McpServerRow): McpServer {
  return {
    id: row.id,
    configItemId: row.config_item_id,
    name: row.name,
    transport: row.transport,
    disabled: row.disabled === 1,
    command: row.command,
    args: parseJson<string[]>(row.args_json, []),
    url: row.url,
    cwd: row.cwd,
    env: parseJson<Record<string, string>>(row.env_json, {}),
    headers: parseJson<Record<string, string>>(row.headers_json, {}),
    enabledTools: parseJson<string[]>(row.enabled_tools_json, []),
    disabledTools: parseJson<string[]>(row.disabled_tools_json, []),
    lastInspectedAt: row.last_inspected_at,
    status: row.status,
    error: row.error
  };
}

function mapTool(row: McpToolRow): McpTool {
  return {
    id: row.id,
    serverId: row.server_id,
    name: row.name,
    description: row.description,
    inputSchema: parseJson<Record<string, unknown> | null>(row.input_schema_json, null),
    outputSchema: parseJson<Record<string, unknown> | null>(row.output_schema_json, null),
    inspectedAt: row.inspected_at
  };
}

export class McpRepository {
  private readonly db: Database.Database;

  constructor(db = getDb()) {
    this.db = db;
  }

  listServers(): McpServer[] {
    const rows = this.db
      .prepare("SELECT * FROM mcp_servers ORDER BY name COLLATE NOCASE ASC")
      .all() as McpServerRow[];
    return rows.map(mapServer);
  }

  listServersByConfigItem(configItemId: string): McpServer[] {
    const rows = this.db
      .prepare("SELECT * FROM mcp_servers WHERE config_item_id = ? ORDER BY name COLLATE NOCASE ASC")
      .all(configItemId) as McpServerRow[];
    return rows.map(mapServer);
  }

  getServer(id: string): McpServer | null {
    const row = this.db.prepare("SELECT * FROM mcp_servers WHERE id = ?").get(id) as
      | McpServerRow
      | undefined;
    return row ? mapServer(row) : null;
  }

  getConfigItemForServer(serverId: string): ConfigItemRow | null {
    const row = this.db
      .prepare(
        `SELECT ci.id, ci.absolute_path, ci.origin, ci.project_id
         FROM mcp_servers ms
         JOIN codex_items ci ON ci.id = ms.config_item_id
         WHERE ms.id = ?`
      )
      .get(serverId) as ConfigItemRow | undefined;
    return row ?? null;
  }

  listConfigItems(): ConfigItemRow[] {
    return this.db
      .prepare(
        `SELECT id, absolute_path, origin, project_id
         FROM codex_items
         WHERE type = 'config'
           AND status = 'current'
           AND name = 'config.toml'
         ORDER BY absolute_path ASC`
      )
      .all() as ConfigItemRow[];
  }

  upsertServer(server: PersistMcpServerInput): McpServer {
    const existing = this.getServer(server.id);
    const now = nowIso();
    this.db
      .prepare(
        `INSERT INTO mcp_servers (
          id, config_item_id, name, transport, disabled, command, args_json, url, cwd,
          env_json, headers_json, enabled_tools_json, disabled_tools_json, status, error,
          last_inspected_at, updated_at
        ) VALUES (
          @id, @configItemId, @name, @transport, @disabled, @command, @argsJson, @url, @cwd,
          @envJson, @headersJson, @enabledToolsJson, @disabledToolsJson, @status, @error,
          @lastInspectedAt, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          config_item_id = excluded.config_item_id,
          name = excluded.name,
          transport = excluded.transport,
          disabled = excluded.disabled,
          command = excluded.command,
          args_json = excluded.args_json,
          url = excluded.url,
          cwd = excluded.cwd,
          env_json = excluded.env_json,
          headers_json = excluded.headers_json,
          enabled_tools_json = excluded.enabled_tools_json,
          disabled_tools_json = excluded.disabled_tools_json,
          status = CASE
            WHEN excluded.disabled = 1 THEN 'disabled'
            WHEN mcp_servers.status = 'disabled' THEN 'pending'
            ELSE mcp_servers.status
          END,
          error = CASE
            WHEN excluded.disabled = 1 THEN NULL
            WHEN mcp_servers.status = 'disabled' THEN NULL
            ELSE mcp_servers.error
          END,
          updated_at = excluded.updated_at`
      )
      .run({
        id: server.id,
        configItemId: server.configItemId,
        name: server.name,
        transport: server.transport,
        disabled: server.disabled ? 1 : 0,
        command: server.command,
        argsJson: toJson(server.args),
        url: server.url,
        cwd: server.cwd,
        envJson: toJson(server.env),
        headersJson: toJson(server.headers),
        enabledToolsJson: toJson(server.enabledTools),
        disabledToolsJson: toJson(server.disabledTools),
        status: server.disabled ? "disabled" : (existing?.status ?? "pending"),
        error: existing?.error ?? null,
        lastInspectedAt: existing?.lastInspectedAt ?? null,
        updatedAt: now
      });

    return this.getServer(server.id) as McpServer;
  }

  replaceServersForConfigItem(configItemId: string, servers: PersistMcpServerInput[]): McpServer[] {
    const transaction = this.db.transaction(() => {
      const nextIds = new Set(servers.map((server) => server.id));
      const existing = this.listServersByConfigItem(configItemId);
      for (const server of servers) {
        this.upsertServer(server);
      }
      for (const server of existing) {
        if (!nextIds.has(server.id)) {
          this.db.prepare("DELETE FROM mcp_servers WHERE id = ?").run(server.id);
        }
      }
    });
    transaction();
    return this.listServersByConfigItem(configItemId);
  }

  listTools(serverId?: string): McpTool[] {
    const rows = serverId
      ? (this.db
          .prepare("SELECT * FROM mcp_tools WHERE server_id = ? ORDER BY name COLLATE NOCASE ASC")
          .all(serverId) as McpToolRow[])
      : (this.db
          .prepare("SELECT * FROM mcp_tools ORDER BY server_id ASC, name COLLATE NOCASE ASC")
          .all() as McpToolRow[]);
    return rows.map(mapTool);
  }

  replaceTools(serverId: string, tools: PersistMcpToolInput[], inspectedAt: string): void {
    const transaction = this.db.transaction(() => {
      this.db.prepare("DELETE FROM mcp_tools WHERE server_id = ?").run(serverId);
      const insert = this.db.prepare(
        `INSERT INTO mcp_tools (
          id, server_id, name, description, input_schema_json, output_schema_json, inspected_at
        ) VALUES (
          @id, @serverId, @name, @description, @inputSchemaJson, @outputSchemaJson, @inspectedAt
        )`
      );
      for (const tool of tools) {
        insert.run({
          id: tool.id,
          serverId: tool.serverId,
          name: tool.name,
          description: tool.description,
          inputSchemaJson: tool.inputSchema ? toJson(tool.inputSchema) : null,
          outputSchemaJson: tool.outputSchema ? toJson(tool.outputSchema) : null,
          inspectedAt
        });
      }
    });
    transaction();
  }

  createInspection(id: string, serverId: string | null, status: McpInspectionState): void {
    this.db
      .prepare(
        `INSERT INTO mcp_inspections (id, server_id, status, error, started_at, finished_at)
         VALUES (?, ?, ?, NULL, ?, NULL)`
      )
      .run(id, serverId, status, nowIso());
  }

  finishInspection(id: string, status: McpInspectionState, error: string | null): void {
    const finishedAt = nowIso();
    this.db
      .prepare("UPDATE mcp_inspections SET status = ?, error = ?, finished_at = ? WHERE id = ?")
      .run(status, error, finishedAt, id);
  }

  updateServerInspectionState(
    serverId: string,
    status: McpInspectionState,
    inspectedAt: string | null,
    error: string | null
  ): void {
    this.db
      .prepare(
        `UPDATE mcp_servers
         SET status = ?, error = ?, last_inspected_at = COALESCE(?, last_inspected_at), updated_at = ?
         WHERE id = ?`
      )
      .run(status, error, inspectedAt, nowIso(), serverId);
  }

  clearInspectionCache(serverId?: string): number {
    const transaction = this.db.transaction(() => {
      const toolResult = serverId
        ? this.db.prepare("DELETE FROM mcp_tools WHERE server_id = ?").run(serverId)
        : this.db.prepare("DELETE FROM mcp_tools").run();
      if (serverId) {
        this.db.prepare("DELETE FROM mcp_inspections WHERE server_id = ?").run(serverId);
        this.db
          .prepare(
            "UPDATE mcp_servers SET status = CASE disabled WHEN 1 THEN 'disabled' ELSE 'pending' END, error = NULL, last_inspected_at = NULL, updated_at = ? WHERE id = ?"
          )
          .run(nowIso(), serverId);
      } else {
        this.db.prepare("DELETE FROM mcp_inspections").run();
        this.db
          .prepare(
            "UPDATE mcp_servers SET status = CASE disabled WHEN 1 THEN 'disabled' ELSE 'pending' END, error = NULL, last_inspected_at = NULL, updated_at = ?"
          )
          .run(nowIso());
      }
      return Number(toolResult.changes);
    });
    return transaction();
  }
}
