export const ITEM_TYPES = [
  "agents",
  "skill",
  "agent",
  "plugin",
  "config",
  "hook",
  "memory",
  "automation",
  "session",
  "activity"
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_ORIGINS = ["global", "project", "plugin", "internal"] as const;
export type ItemOrigin = (typeof ITEM_ORIGINS)[number];

export const EDITABILITY_STATES = [
  "editable",
  "read-only",
  "blocked",
  "deleted",
  "internal"
] as const;
export type EditabilityState = (typeof EDITABILITY_STATES)[number];

export const GIT_STATES = ["clean", "dirty", "detached", "not-git", "unknown"] as const;
export type GitState = (typeof GIT_STATES)[number];

export const VERSION_ORIGINS = [
  "initial-scan",
  "external-edit",
  "restore",
  "delete",
  "temp-edit-apply"
] as const;
export type VersionOrigin = (typeof VERSION_ORIGINS)[number];

export const APP_EVENT_TYPES = [
  "backend-status",
  "watcher-status",
  "file-created",
  "file-changed",
  "file-removed",
  "project-added",
  "project-updated",
  "project-removed",
  "project-scanned",
  "branch-changed",
  "config-changed",
  "mcp-inspected",
  "version-restored",
  "item-deleted",
  "trash-restored",
  "search-reindexed",
  "maintenance",
  "error"
] as const;
export type AppEventType = (typeof APP_EVENT_TYPES)[number];

export const MCP_TRANSPORTS = ["stdio", "streamable-http"] as const;
export type McpTransport = (typeof MCP_TRANSPORTS)[number];

export const MCP_INSPECTION_STATES = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "disabled"
] as const;
export type McpInspectionState = (typeof MCP_INSPECTION_STATES)[number];

export const SESSION_STATES = ["active", "archived", "all"] as const;
export type SessionState = (typeof SESSION_STATES)[number];

export const RESTORE_CONFLICT_MODES = [
  "restore-original",
  "compare",
  "overwrite",
  "new-name",
  "choose-destination",
  "recreate-directory",
  "cancel"
] as const;
export type RestoreConflictMode = (typeof RESTORE_CONFLICT_MODES)[number];

export const TABS = [
  "agents",
  "skill",
  "agent",
  "plugin",
  "config",
  "hook",
  "memory",
  "automation",
  "session",
  "activity",
  "all"
] as const;
export type PromptDeskTab = (typeof TABS)[number];

export const LANGUAGES = ["pt-BR", "en-US", "es-ES"] as const;
export type Language = (typeof LANGUAGES)[number];

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export interface PromptDeskPaths {
  promptDeskHome: string;
  dataDir: string;
  trashDir: string;
  tempDir: string;
  logsDir: string;
}

export interface CodexHomeResolution {
  path: string | null;
  source: "preference" | "CODEX_HOME" | "default" | "invalid";
  valid: boolean;
  error?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  branch: string | null;
  gitState: GitState;
  lastScannedAt: string | null;
  createdAt: string;
  itemCount: number;
}

export interface CodexItem {
  id: string;
  type: ItemType;
  origin: ItemOrigin;
  name: string;
  absolutePath: string;
  relativePath: string;
  projectId: string | null;
  projectName: string | null;
  pluginName: string | null;
  editability: EditabilityState;
  status: "current" | "deleted" | "missing" | "blocked";
  hash: string | null;
  size: number | null;
  createdAt: string;
  detectedAt: string;
  updatedAt: string;
  lastVersionAt: string | null;
  blockedReason: string | null;
  metadata: Record<string, unknown>;
}

export interface ItemPreview {
  itemId: string;
  state: "available" | "blocked" | "missing" | "binary";
  contentType: "markdown" | "toml" | "yaml" | "json" | "jsonl" | "text" | "unknown";
  content: string | null;
  message: string | null;
}

export interface FileVersion {
  id: string;
  itemId: string;
  path: string;
  hash: string;
  size: number;
  origin: VersionOrigin;
  createdAt: string;
  protected: boolean;
}

export interface McpServer {
  id: string;
  configItemId: string | null;
  name: string;
  transport: McpTransport;
  disabled: boolean;
  command: string | null;
  args: string[];
  url: string | null;
  cwd: string | null;
  env: Record<string, string>;
  headers: Record<string, string>;
  enabledTools: string[];
  disabledTools: string[];
  lastInspectedAt: string | null;
  status: McpInspectionState;
  error: string | null;
}

export interface McpTool {
  id: string;
  serverId: string;
  name: string;
  description: string | null;
  inputSchema: Record<string, unknown> | null;
  outputSchema: Record<string, unknown> | null;
  inspectedAt: string;
}

export interface AppEvent {
  id: string;
  type: AppEventType;
  entityType: string | null;
  entityId: string | null;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface TrashItem {
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
  createdAt: string;
}

export interface AppPreferences {
  theme: Theme;
  language: Language;
  activeTab: PromptDeskTab;
  selectedScopes: string[];
  versionRetention: number;
  codexHomeOverride: string | null;
  restoreDecision: RestoreConflictMode | null;
  ui: Record<string, unknown>;
}
