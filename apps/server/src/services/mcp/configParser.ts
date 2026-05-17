import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parse } from "smol-toml";
import type { McpServer } from "@prompt-desk/shared";
import type { PersistMcpServerInput } from "../../db/repositories/mcpRepository.js";
import {
  mergeRedactedMaps,
  redactArgs,
  redactEnvReferences,
  redactKeyValueMap
} from "./redaction.js";

export interface ParsedMcpServer extends PersistMcpServerInput {
  raw: {
    args: string[];
    env: Record<string, string>;
    headers: Record<string, string>;
    bearerTokenEnvVar: string | null;
  };
}

export interface ParsedMcpConfig {
  configItemId: string | null;
  absolutePath: string;
  servers: ParsedMcpServer[];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeScalarMap(value: unknown): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, entry] of Object.entries(asRecord(value))) {
    if (typeof entry === "string") normalized[key] = entry;
    if (typeof entry === "number" || typeof entry === "boolean") normalized[key] = String(entry);
  }
  return normalized;
}

function normalizeEnvVarMap(value: unknown): Record<string, string> {
  if (Array.isArray(value)) {
    return Object.fromEntries(
      value.filter((entry): entry is string => typeof entry === "string").map((name) => [name, name])
    );
  }
  return normalizeScalarMap(value);
}

function stableServerId(configItemId: string | null, absolutePath: string, name: string): string {
  const source = `${configItemId ?? absolutePath}:${name}`;
  return `mcp_${crypto.createHash("sha256").update(source).digest("hex").slice(0, 24)}`;
}

function readConfig(filePath: string): Record<string, unknown> {
  const content = fs.readFileSync(filePath, "utf8");
  return asRecord(parse(content));
}

function getMcpServersTable(config: Record<string, unknown>): Record<string, unknown> {
  return {
    ...asRecord(config.mcp_servers),
    ...asRecord(config.mcpServers)
  };
}

function resolveCwd(configPath: string, cwd: string | null): string | null {
  if (!cwd) return null;
  return path.isAbsolute(cwd) ? cwd : path.resolve(path.dirname(configPath), cwd);
}

function parseOneServer(
  configItemId: string | null,
  absolutePath: string,
  name: string,
  value: unknown
): ParsedMcpServer | null {
  const server = asRecord(value);
  if (Object.keys(server).length === 0) return null;

  const command = asString(server.command);
  const url = asString(server.url);
  const transport: McpServer["transport"] =
    asString(server.transport) === "streamable-http" || url ? "streamable-http" : "stdio";
  const args = asStringArray(server.args);
  const cwd = resolveCwd(absolutePath, asString(server.cwd));
  const env = normalizeScalarMap(server.env);
  const envVarMap = normalizeEnvVarMap(server.env_vars);
  const headers = normalizeScalarMap(server.headers);
  const bearerTokenEnvVar = asString(server.bearer_token_env_var) ?? asString(server.bearerTokenEnvVar);
  const enabled = asBoolean(server.enabled);
  const disabled = asBoolean(server.disabled) === true || enabled === false;
  const enabledTools = asStringArray(server.enabled_tools ?? server.enabledTools);
  const disabledTools = asStringArray(server.disabled_tools ?? server.disabledTools);
  const redactedEnv = mergeRedactedMaps(redactKeyValueMap(env), redactEnvReferences(Object.keys(envVarMap)));
  const redactedHeaders = redactKeyValueMap(headers);

  if (bearerTokenEnvVar) {
    redactedHeaders.Authorization = "<from-env>";
  }

  return {
    id: stableServerId(configItemId, absolutePath, name),
    configItemId,
    name,
    transport,
    disabled,
    command,
    args: redactArgs(args),
    url,
    cwd,
    env: redactedEnv,
    headers: redactedHeaders,
    enabledTools,
    disabledTools,
    raw: {
      args,
      env: {
        ...env,
        ...Object.fromEntries(
          Object.entries(envVarMap)
            .map(([serverEnvName, hostEnvName]) => [serverEnvName, process.env[hostEnvName]])
            .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        )
      },
      headers,
      bearerTokenEnvVar
    }
  };
}

export function parseMcpConfigFile(configItemId: string | null, absolutePath: string): ParsedMcpConfig {
  const config = readConfig(absolutePath);
  const serversTable = getMcpServersTable(config);
  const servers = Object.entries(serversTable)
    .map(([name, server]) => parseOneServer(configItemId, absolutePath, name, server))
    .filter((server): server is ParsedMcpServer => server !== null);

  return { configItemId, absolutePath, servers };
}

export function getRuntimeServerByName(
  configItemId: string | null,
  absolutePath: string,
  name: string
): ParsedMcpServer | null {
  const parsed = parseMcpConfigFile(configItemId, absolutePath);
  return parsed.servers.find((server) => server.name === name) ?? null;
}
