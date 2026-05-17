PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_scanned_at TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS project_git_status (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  branch TEXT,
  state TEXT NOT NULL,
  checked_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS codex_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  origin TEXT NOT NULL,
  name TEXT NOT NULL,
  absolute_path TEXT NOT NULL UNIQUE,
  relative_path TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  project_name TEXT,
  plugin_name TEXT,
  editability TEXT NOT NULL,
  status TEXT NOT NULL,
  hash TEXT,
  size INTEGER,
  created_at TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_version_at TEXT,
  blocked_reason TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_codex_items_type ON codex_items(type);
CREATE INDEX IF NOT EXISTS idx_codex_items_origin ON codex_items(origin);
CREATE INDEX IF NOT EXISTS idx_codex_items_project ON codex_items(project_id);
CREATE INDEX IF NOT EXISTS idx_codex_items_status ON codex_items(status);
CREATE INDEX IF NOT EXISTS idx_codex_items_updated ON codex_items(updated_at);

CREATE TABLE IF NOT EXISTS file_versions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES codex_items(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  hash TEXT NOT NULL,
  size INTEGER NOT NULL,
  origin TEXT NOT NULL,
  protected INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_file_versions_item ON file_versions(item_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_file_versions_item_hash_origin ON file_versions(item_id, hash, origin);

CREATE TABLE IF NOT EXISTS temp_edits (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES codex_items(id) ON DELETE CASCADE,
  version_id TEXT NOT NULL REFERENCES file_versions(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  hash TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  config_item_id TEXT REFERENCES codex_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  transport TEXT NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0,
  command TEXT,
  args_json TEXT NOT NULL DEFAULT '[]',
  url TEXT,
  cwd TEXT,
  env_json TEXT NOT NULL DEFAULT '{}',
  headers_json TEXT NOT NULL DEFAULT '{}',
  enabled_tools_json TEXT NOT NULL DEFAULT '[]',
  disabled_tools_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  last_inspected_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mcp_tools (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  input_schema_json TEXT,
  output_schema_json TEXT,
  inspected_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mcp_inspections (
  id TEXT PRIMARY KEY,
  server_id TEXT REFERENCES mcp_servers(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  error TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS app_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  message TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_events_type ON app_events(type);
CREATE INDEX IF NOT EXISTS idx_app_events_created ON app_events(created_at DESC);

CREATE TABLE IF NOT EXISTS trash_items (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES codex_items(id) ON DELETE SET NULL,
  original_path TEXT NOT NULL,
  basename TEXT NOT NULL,
  trash_path TEXT NOT NULL,
  item_type TEXT NOT NULL,
  origin TEXT NOT NULL,
  hash TEXT,
  size INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  item_id UNINDEXED,
  name,
  relative_path,
  absolute_path,
  content,
  type UNINDEXED,
  origin UNINDEXED,
  scope UNINDEXED,
  indexed_at UNINDEXED
);
