import { z } from "zod";
import {
  APP_EVENT_TYPES,
  EDITABILITY_STATES,
  GIT_STATES,
  ITEM_ORIGINS,
  ITEM_TYPES,
  LANGUAGES,
  MCP_INSPECTION_STATES,
  MCP_TRANSPORTS,
  RESTORE_CONFLICT_MODES,
  SESSION_STATES,
  TABS,
  THEMES,
  VERSION_ORIGINS
} from "./types.js";

export const absolutePathSchema = z.string().min(1).refine((value) => value.startsWith("/"), {
  message: "Path must be absolute"
});

export const idSchema = z.string().min(1);
export const itemTypeSchema = z.enum(ITEM_TYPES);
export const itemOriginSchema = z.enum(ITEM_ORIGINS);
export const editabilitySchema = z.enum(EDITABILITY_STATES);
export const gitStateSchema = z.enum(GIT_STATES);
export const versionOriginSchema = z.enum(VERSION_ORIGINS);
export const appEventTypeSchema = z.enum(APP_EVENT_TYPES);
export const mcpTransportSchema = z.enum(MCP_TRANSPORTS);
export const mcpInspectionStateSchema = z.enum(MCP_INSPECTION_STATES);
export const sessionStateSchema = z.enum(SESSION_STATES);
export const restoreConflictModeSchema = z.enum(RESTORE_CONFLICT_MODES);
export const tabSchema = z.enum(TABS);
export const languageSchema = z.enum(LANGUAGES);
export const themeSchema = z.enum(THEMES);

export const projectSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  path: absolutePathSchema,
  branch: z.string().nullable(),
  gitState: gitStateSchema,
  lastScannedAt: z.string().nullable(),
  createdAt: z.string(),
  itemCount: z.number().int().nonnegative()
});

export const codexItemSchema = z.object({
  id: idSchema,
  type: itemTypeSchema,
  origin: itemOriginSchema,
  name: z.string(),
  absolutePath: absolutePathSchema,
  relativePath: z.string(),
  projectId: z.string().nullable(),
  projectName: z.string().nullable(),
  pluginName: z.string().nullable(),
  editability: editabilitySchema,
  status: z.enum(["current", "deleted", "missing", "blocked"]),
  hash: z.string().nullable(),
  size: z.number().nullable(),
  createdAt: z.string(),
  detectedAt: z.string(),
  updatedAt: z.string(),
  lastVersionAt: z.string().nullable(),
  blockedReason: z.string().nullable(),
  metadata: z.record(z.unknown())
});

export const itemPreviewSchema = z.object({
  itemId: idSchema,
  state: z.enum(["available", "blocked", "missing", "binary"]),
  contentType: z.enum(["markdown", "toml", "yaml", "json", "jsonl", "text", "unknown"]),
  content: z.string().nullable(),
  message: z.string().nullable()
});

export const fileVersionSchema = z.object({
  id: idSchema,
  itemId: idSchema,
  path: absolutePathSchema,
  hash: z.string(),
  size: z.number(),
  origin: versionOriginSchema,
  createdAt: z.string(),
  protected: z.boolean()
});

export const appPreferencesSchema = z.object({
  theme: themeSchema,
  language: languageSchema,
  activeTab: tabSchema,
  selectedScopes: z.array(z.string()),
  versionRetention: z.number().int().min(1).max(500),
  codexHomeOverride: absolutePathSchema.nullable(),
  restoreDecision: restoreConflictModeSchema.nullable(),
  ui: z.record(z.unknown())
});

export const mcpServerSchema = z.object({
  id: idSchema,
  configItemId: z.string().nullable(),
  name: z.string(),
  transport: mcpTransportSchema,
  disabled: z.boolean(),
  command: z.string().nullable(),
  args: z.array(z.string()),
  url: z.string().nullable(),
  cwd: z.string().nullable(),
  env: z.record(z.string()),
  headers: z.record(z.string()),
  enabledTools: z.array(z.string()),
  disabledTools: z.array(z.string()),
  lastInspectedAt: z.string().nullable(),
  status: mcpInspectionStateSchema,
  error: z.string().nullable()
});

export const mcpToolSchema = z.object({
  id: idSchema,
  serverId: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  inputSchema: z.record(z.unknown()).nullable(),
  outputSchema: z.record(z.unknown()).nullable(),
  inspectedAt: z.string()
});

export const appEventSchema = z.object({
  id: idSchema,
  type: appEventTypeSchema,
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  message: z.string(),
  metadata: z.record(z.unknown()),
  createdAt: z.string()
});

export const trashItemSchema = z.object({
  id: idSchema,
  itemId: z.string().nullable(),
  originalPath: absolutePathSchema,
  basename: z.string(),
  trashPath: absolutePathSchema,
  itemType: itemTypeSchema,
  origin: itemOriginSchema,
  hash: z.string().nullable(),
  size: z.number().nullable(),
  metadata: z.record(z.unknown()),
  createdAt: z.string()
});

export const bootstrapResponseSchema = z.object({
  backend: z.object({
    status: z.enum(["ok", "degraded", "error"]),
    watcher: z.enum(["starting", "ready", "error", "disabled"]),
    version: z.string()
  }),
  paths: z.object({
    promptDeskHome: absolutePathSchema,
    dataDir: absolutePathSchema,
    trashDir: absolutePathSchema,
    tempDir: absolutePathSchema,
    logsDir: absolutePathSchema
  }),
  codexHome: z.object({
    path: absolutePathSchema.nullable(),
    source: z.enum(["preference", "CODEX_HOME", "default", "invalid"]),
    valid: z.boolean(),
    error: z.string().optional()
  }),
  preferences: appPreferencesSchema,
  projects: z.array(projectSummarySchema)
});

export const itemsQuerySchema = z.object({
  tab: tabSchema.default("agents"),
  query: z.string().default(""),
  scopes: z.string().default("global"),
  sessionState: sessionStateSchema.default("all"),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(["updatedAt", "name", "type", "origin"]).default("updatedAt"),
  direction: z.enum(["asc", "desc"]).default("desc")
});

export const itemsResponseSchema = z.object({
  items: z.array(codexItemSchema),
  total: z.number().int().nonnegative()
});

export const countsResponseSchema = z.object({
  scopes: z.array(
    z.object({
      scope: z.string(),
      label: z.string(),
      count: z.number().int().nonnegative()
    })
  ),
  tabs: z.record(z.number().int().nonnegative())
});

export const projectCreateRequestSchema = z.object({
  path: absolutePathSchema,
  name: z.string().min(1).optional()
});

export const projectFolderSelectionResponseSchema = z.object({
  path: absolutePathSchema.nullable()
});

export const projectUpdateRequestSchema = z.object({
  name: z.string().min(1).optional()
});

export const preferencesPatchSchema = appPreferencesSchema.partial();

export const restoreRequestSchema = z.object({
  mode: restoreConflictModeSchema,
  destinationPath: absolutePathSchema.optional(),
  rememberDecision: z.boolean().default(false)
});

export const mcpInspectionRequestSchema = z.object({
  confirmed: z.boolean(),
  timeoutMs: z.number().int().min(1000).max(120000).default(20000)
});

export const maintenanceRequestSchema = z.object({
  confirmed: z.boolean()
});
