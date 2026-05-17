import crypto from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpServer, McpTool } from "@prompt-desk/shared";
import { AppError } from "../../util/errors.js";
import { nowIso } from "../../util/time.js";
import { McpRepository } from "../../db/repositories/mcpRepository.js";
import { getRuntimeServerByName, type ParsedMcpServer } from "./configParser.js";

export const MCP_INSPECTION_WARNING =
  "Discovering MCP tools may start the MCP server command configured on disk. This can execute local code, access files, use credentials, or access the network. Continue only if you trust this configuration.";

export interface McpInspectionRequest {
  confirmed: boolean;
  timeoutMs: number;
}

export interface McpInspectionResult {
  server: McpServer;
  tools: McpTool[];
  warning: string;
}

export interface McpInspectionEventSink {
  recordEvent?: (event: {
    type: "mcp-inspected" | "error";
    entityType: string;
    entityId: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) => void;
  emit?: (eventName: string, payload: Record<string, unknown>) => void;
}

function toolId(serverId: string, name: string): string {
  return `tool_${crypto.createHash("sha256").update(`${serverId}:${name}`).digest("hex").slice(0, 24)}`;
}

function inspectionId(serverId: string): string {
  return `inspection_${crypto.randomUUID().replaceAll("-", "")}_${serverId.slice(0, 12)}`;
}

function cleanProcessEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") env[key] = value;
  }
  return env;
}

function applyToolFilters(
  tools: Array<Record<string, unknown>>,
  enabledTools: string[],
  disabledTools: string[]
): Array<Record<string, unknown>> {
  const enabled = new Set(enabledTools);
  const disabled = new Set(disabledTools);
  return tools.filter((tool) => {
    const name = typeof tool.name === "string" ? tool.name : "";
    if (!name) return false;
    if (enabled.size > 0 && !enabled.has(name)) return false;
    return !disabled.has(name);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`MCP inspection timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function asSchema(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export class McpInspectionService {
  constructor(
    private readonly mcpRepository = new McpRepository(),
    private readonly eventSink: McpInspectionEventSink = {}
  ) {}

  getWarning(): string {
    return MCP_INSPECTION_WARNING;
  }

  async inspectServer(serverId: string, request: McpInspectionRequest): Promise<McpInspectionResult> {
    if (!request.confirmed) {
      throw new AppError(400, "MCP_CONFIRMATION_REQUIRED", "MCP inspection requires confirmation.", {
        warning: MCP_INSPECTION_WARNING
      });
    }

    const server = this.mcpRepository.getServer(serverId);
    if (!server) {
      throw new AppError(404, "MCP_SERVER_NOT_FOUND", "MCP server was not found.");
    }

    if (server.disabled) {
      this.mcpRepository.updateServerInspectionState(server.id, "disabled", null, null);
      throw new AppError(409, "MCP_SERVER_DISABLED", "Disabled MCP servers cannot be inspected.");
    }

    const configItem = this.mcpRepository.getConfigItemForServer(server.id);
    if (!configItem) {
      throw new AppError(409, "MCP_CONFIG_NOT_FOUND", "MCP server source config was not found.");
    }

    const runtimeServer = getRuntimeServerByName(configItem.id, configItem.absolute_path, server.name);
    if (!runtimeServer) {
      throw new AppError(409, "MCP_SERVER_CONFIG_MISSING", "MCP server is no longer present in config.toml.");
    }

    const id = inspectionId(server.id);
    this.mcpRepository.createInspection(id, server.id, "running");
    this.mcpRepository.updateServerInspectionState(server.id, "running", null, null);
    this.eventSink.emit?.("mcp-inspection", { serverId: server.id, status: "running" });

    try {
      const tools = await withTimeout(
        this.discoverTools(runtimeServer, request.timeoutMs),
        request.timeoutMs
      );
      const inspectedAt = nowIso();
      const persistedTools = tools.map((tool) => ({
        id: toolId(server.id, String(tool.name)),
        serverId: server.id,
        name: String(tool.name),
        description: typeof tool.description === "string" ? tool.description : null,
        inputSchema: asSchema(tool.inputSchema),
        outputSchema: asSchema(tool.outputSchema),
        inspectedAt
      }));

      this.mcpRepository.replaceTools(server.id, persistedTools, inspectedAt);
      this.mcpRepository.finishInspection(id, "succeeded", null);
      this.mcpRepository.updateServerInspectionState(server.id, "succeeded", inspectedAt, null);
      this.eventSink.recordEvent?.({
        type: "mcp-inspected",
        entityType: "mcp_server",
        entityId: server.id,
        message: `Inspected MCP server ${server.name}.`,
        metadata: { toolCount: persistedTools.length }
      });
      this.eventSink.emit?.("mcp-inspection", {
        serverId: server.id,
        status: "succeeded",
        toolCount: persistedTools.length
      });

      return {
        server: this.mcpRepository.getServer(server.id) as McpServer,
        tools: this.mcpRepository.listTools(server.id),
        warning: MCP_INSPECTION_WARNING
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "MCP inspection failed.";
      this.mcpRepository.finishInspection(id, "failed", message);
      this.mcpRepository.updateServerInspectionState(server.id, "failed", null, message);
      this.eventSink.recordEvent?.({
        type: "error",
        entityType: "mcp_server",
        entityId: server.id,
        message: `MCP inspection failed for ${server.name}.`,
        metadata: { error: message }
      });
      this.eventSink.emit?.("mcp-inspection", { serverId: server.id, status: "failed", error: message });
      throw new AppError(502, "MCP_INSPECTION_FAILED", message);
    }
  }

  async inspectAll(request: McpInspectionRequest): Promise<McpInspectionResult[]> {
    const results: McpInspectionResult[] = [];
    for (const server of this.mcpRepository.listServers()) {
      if (server.disabled) {
        this.mcpRepository.updateServerInspectionState(server.id, "disabled", null, null);
        continue;
      }
      results.push(await this.inspectServer(server.id, request));
    }
    return results;
  }

  private async discoverTools(
    server: ParsedMcpServer,
    timeoutMs: number
  ): Promise<Array<Record<string, unknown>>> {
    const client = new Client(
      { name: "prompt-desk", version: "0.1.0" },
      { capabilities: {} }
    );
    const transport =
      server.transport === "streamable-http"
        ? this.createHttpTransport(server)
        : this.createStdioTransport(server);

    try {
      await client.connect(transport);
      const result = await withTimeout(client.listTools(), timeoutMs);
      const tools = Array.isArray(result.tools) ? (result.tools as Array<Record<string, unknown>>) : [];
      return applyToolFilters(tools, server.enabledTools, server.disabledTools);
    } finally {
      await client.close().catch(() => undefined);
    }
  }

  private createStdioTransport(server: ParsedMcpServer): StdioClientTransport {
    if (!server.command) {
      throw new Error("STDIO MCP server is missing a command.");
    }

    return new StdioClientTransport({
      command: server.command,
      args: server.raw.args,
      cwd: server.cwd ?? undefined,
      env: { ...cleanProcessEnv(), ...server.raw.env }
    });
  }

  private createHttpTransport(server: ParsedMcpServer): StreamableHTTPClientTransport {
    if (!server.url) {
      throw new Error("Streamable HTTP MCP server is missing a URL.");
    }

    const headers: Record<string, string> = { ...server.raw.headers };
    if (server.raw.bearerTokenEnvVar) {
      const token = process.env[server.raw.bearerTokenEnvVar];
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    return new StreamableHTTPClientTransport(new URL(server.url), {
      requestInit: { headers }
    });
  }
}
