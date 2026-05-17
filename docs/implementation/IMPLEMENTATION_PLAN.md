# PromptDesk Implementation Plan

This implementation plan is meant to be used together with `PLANO.md` and `DESIGN_BRIEF.md` as the third orchestration file for a main agent that can spawn sub-agents.

The product scope is V1 from `PLANO.md`: a local single-screen web app for inspecting, searching, versioning, comparing, restoring, and safely deleting persistent Codex context/configuration files. The UI direction is the operational, dense, technical workspace described in `DESIGN_BRIEF.md`.

## 0. Non-Negotiable V1 Constraints

- Build the full V1 scope from `PLANO.md`; do not introduce profile switching or profile management.
- Use React, Vite, TypeScript, shadcn/ui, Tailwind, i18next, Express, SQLite, SQLite FTS5, Zod, chokidar, and SSE.
- Keep the app local-only. The backend must listen on `127.0.0.1`.
- Store PromptDesk internal data in `~/Library/Application Support/PromptDesk` by default, with `PROMPT_DESK_HOME` override.
- Resolve Codex Home in this order: saved preference, `CODEX_HOME`, readable `~/.codex`.
- Never store PromptDesk data in a hidden dot directory by default.
- Do not implement an in-app content editor. Real file edits happen in VS Code.
- Use `spawn(command, args)` for external commands. Do not concatenate shell strings with user paths.
- Treat read-only and blocked items as first-class states, not just disabled buttons.
- Never open, edit, version, delete, preview, or persist sensitive content such as `auth.json`, raw tokens, secrets, raw MCP env values, or unknown caches.
- Sessions and Activity from Codex are read-only in V1.
- Plugin cache content is read-only by default.
- MCP inspection is manual only, confirmed by the user, timeout-bound, and must respect disabled servers/tools.
- Use SQLite as the local source of derived state, history, preferences, trash metadata, MCP cache, and search index. The real filesystem remains the source of current file content.
- Use SSE for live UI updates. Users should not need to refresh after filesystem changes.
- Use dark mode as the default theme and support light mode.
- Support `en-US`, `pt-BR`, and `es-ES`. First-use default is `pt-BR`.

## 1. Recommended Repository Shape

Use npm workspaces to create clear ownership boundaries for parallel agents.

```txt
prompt-desk/
  package.json
  tsconfig.base.json
  eslint.config.js
  apps/
    server/
      package.json
      src/
        api/
        db/
        domain/
        events/
        services/
        util/
        index.ts
    web/
      package.json
      index.html
      src/
        app/
        components/
        features/
        hooks/
        i18n/
        lib/
        styles/
        main.tsx
  packages/
    shared/
      package.json
      src/
        api.ts
        events.ts
        schemas.ts
        types.ts
  tests/
    fixtures/
```

The main agent should create the scaffold and shared contracts before spawning implementation workers. Workers can then own disjoint directories.

## 2. Orchestration Rules For Sub-Agents

- Spawn workers only after the initial workspace scaffold, shared package, database migration runner, and basic dev scripts exist.
- Every worker must receive explicit ownership of files or directories.
- Workers must assume other agents are editing the repo at the same time.
- Workers must not revert unrelated changes.
- Workers must keep code and comments in en-US.
- Workers must update shared contracts only when their task explicitly owns that change.
- Workers must add or update focused tests for the behavior they implement.
- The main agent owns final integration, dependency reconciliation, end-to-end checks, visual QA, and conflict resolution.

## 3. Parallel Execution Map

### Wave 0: Serial Bootstrap

These tasks should run first and should not be parallelized heavily because they establish the repo shape and contracts used by all later workers.

- `T00` Project scaffold and workspace scripts
- `T01` Shared domain types and Zod schemas
- `T02` SQLite migration runner and baseline schema
- `T03` Server bootstrap and health route
- `T04` Web bootstrap, Tailwind, shadcn/ui, and i18n shell

### Wave 1: Core Backend And Core Frontend In Parallel

After Wave 0, these can run in parallel because their ownership is mostly separate.

- Backend foundations: `T10`, `T11`, `T12`, `T13`
- Frontend foundations: `T20`, `T21`, `T22`, `T23`
- Test fixtures: `T50`

### Wave 2: Item Discovery, Lists, Details, And Live Updates

These can run in parallel once contracts and basic APIs exist.

- Backend scanner and classifier: `T30`, `T31`, `T32`, `T33`
- Frontend item workspace: `T40`, `T41`, `T42`, `T43`
- SSE and client cache integration: `T34`, `T44`

### Wave 3: Advanced Operations

These are feature-heavy and can be split across workers after item discovery and item detail contracts are stable.

- Versioning and diff: `T60`, `T61`, `T62`
- Trash and restore conflicts: `T63`, `T64`
- MCP inspection: `T70`, `T71`, `T72`
- Settings and maintenance: `T80`, `T81`, `T82`
- Sessions and Activity: `T90`, `T91`

### Wave 4: Integration, Hardening, And V1 Acceptance

These should be coordinated by the main agent, with optional verification workers.

- `T100` Integration pass across API, UI, SSE, and filesystem events
- `T101` Security and sensitive-data audit
- `T102` Accessibility and responsive QA
- `T103` Visual QA against `DESIGN_BRIEF.md`
- `T104` End-to-end V1 acceptance checklist
- `T105` Documentation and operational notes

## 4. Task Backlog

### T00 - Project scaffold and workspace scripts

Status: `serial`

Dependencies: none

Suggested owner: main agent

Primary paths:

- `package.json`
- `tsconfig.base.json`
- `apps/server/package.json`
- `apps/web/package.json`
- `packages/shared/package.json`

Deliverables:

- Create npm workspace structure.
- Add scripts for `dev`, `build`, `typecheck`, `lint`, `test`, `dev:server`, and `dev:web`.
- Configure TypeScript project references or shared base config.
- Ensure `npm run dev` starts frontend and backend together.
- Keep backend bound to `127.0.0.1`.

Acceptance criteria:

- `npm install` works.
- `npm run dev` launches both apps.
- `npm run typecheck` can run across all packages.

### T01 - Shared domain types and Zod schemas

Status: `serial`

Dependencies: `T00`

Suggested owner: main agent

Primary paths:

- `packages/shared/src/types.ts`
- `packages/shared/src/schemas.ts`
- `packages/shared/src/api.ts`
- `packages/shared/src/events.ts`

Deliverables:

- Define shared enums and discriminated unions for item types, origins, editability states, git states, version origins, event types, MCP inspection states, session states, and restore conflict modes.
- Define API request/response schemas with Zod for all planned endpoints.
- Export inferred TypeScript types for backend and frontend.
- Include string values aligned with UI labels and database persistence.

Acceptance criteria:

- Shared package builds independently.
- Backend and frontend can import shared schemas/types without circular dependencies.

### T02 - SQLite migration runner and baseline schema

Status: `serial`

Dependencies: `T00`, `T01`

Suggested owner: main agent

Primary paths:

- `apps/server/src/db/connection.ts`
- `apps/server/src/db/migrations.ts`
- `apps/server/src/db/schema.sql`
- `apps/server/src/db/repositories/`

Deliverables:

- Implement SQLite connection creation under PromptDesk Home.
- Implement migrations table and idempotent migration runner.
- Create tables from `PLANO.md`: `projects`, `project_git_status`, `codex_items`, `file_versions`, `preferences`, `temp_edits`, `mcp_servers`, `mcp_tools`, `mcp_inspections`, `app_events`, `trash_items`, and `search_index`.
- Configure SQLite FTS5 for searchable item content and metadata.
- Add indexes for item type, origin, project, path, status, updated timestamp, and version lookup.

Acceptance criteria:

- A fresh database initializes successfully.
- Re-running migrations is safe.
- FTS5 table is available and queryable.

### T03 - Server bootstrap and health route

Status: `serial`

Dependencies: `T00`, `T01`, `T02`

Suggested owner: main agent

Primary paths:

- `apps/server/src/index.ts`
- `apps/server/src/api/router.ts`
- `apps/server/src/api/health.ts`
- `apps/server/src/util/logger.ts`

Deliverables:

- Create Express app with JSON middleware, request validation helpers, and error handler.
- Add `GET /api/bootstrap` placeholder.
- Add health/status route used by frontend topbar.
- Add structured local logging to PromptDesk logs.
- Ensure CORS is local and narrow.

Acceptance criteria:

- Backend starts on `127.0.0.1`.
- Health route returns backend status.
- Validation errors return stable JSON.

### T04 - Web bootstrap, Tailwind, shadcn/ui, and i18n shell

Status: `serial`

Dependencies: `T00`, `T01`

Suggested owner: main agent

Primary paths:

- `apps/web/src/main.tsx`
- `apps/web/src/app/App.tsx`
- `apps/web/src/styles/globals.css`
- `apps/web/src/i18n/`
- `apps/web/src/components/ui/`

Deliverables:

- Configure Vite React TypeScript app.
- Configure Tailwind and shadcn/ui-compatible primitives.
- Implement i18next with `en-US`, `pt-BR`, and `es-ES`.
- Set `pt-BR` as first-use default and support persisted preference later.
- Add dark/light theme infrastructure with dark as default.

Acceptance criteria:

- Web app renders a basic PromptDesk shell.
- Language switching can be wired to a temporary local state.
- Dark/light classes work.

### T10 - PromptDesk Home and Codex Home resolution

Status: `parallel after Wave 0`

Dependencies: `T02`, `T03`

Suggested owner: backend foundation worker

Primary paths:

- `apps/server/src/services/paths/`
- `apps/server/src/services/preferences/`
- `apps/server/src/api/settings.ts`

Deliverables:

- Resolve PromptDesk Home from `PROMPT_DESK_HOME` or `~/Library/Application Support/PromptDesk`.
- Create `data`, `trash`, `temp`, and `logs` directories.
- Resolve Codex Home by saved preference, `CODEX_HOME`, then `~/.codex`.
- Persist resolution source and validity.
- Expose settings/bootstrap data for frontend.
- Return actionable invalid-Codex-Home state when missing or unreadable.

Acceptance criteria:

- Resolution order is tested.
- Invalid Codex Home does not crash the server.
- Settings API can update Codex Home and trigger rescan later.

### T11 - Preferences repository and settings persistence

Status: `parallel after Wave 0`

Dependencies: `T02`, `T10`

Suggested owner: backend foundation worker

Primary paths:

- `apps/server/src/db/repositories/preferencesRepository.ts`
- `apps/server/src/services/preferences/`
- `apps/server/src/api/preferences.ts`

Deliverables:

- Implement get/update preferences.
- Persist theme, language, active tab, selected scopes, retention policy, saved restore decisions, Codex Home, and UI preferences.
- Validate all preference updates with Zod.

Acceptance criteria:

- `GET /api/preferences` and `PATCH /api/preferences` work.
- Default retention is 10 versions per versioned item.

### T12 - Project registry and git status

Status: `parallel after Wave 0`

Dependencies: `T02`, `T03`

Suggested owner: backend foundation worker

Primary paths:

- `apps/server/src/services/projects/`
- `apps/server/src/services/git/`
- `apps/server/src/api/projects.ts`

Deliverables:

- Implement project add/remove/list.
- Validate project paths as readable directories.
- Store friendly name, absolute path, created timestamp, last scan timestamp, and active/removed status.
- Implement branch detection with `git -C <repoPath> branch --show-current`.
- Return git states: `clean`, `dirty`, `detached`, `not-git`, `unknown`.
- Treat sub-repositories as normal subfolders unless manually added as projects.

Acceptance criteria:

- Adding a valid project persists it.
- Removing a project only removes the reference.
- Git status is compact and stable for non-git, clean, dirty, and detached repositories.

### T13 - App event log and SSE event bus

Status: `parallel after Wave 0`

Dependencies: `T02`, `T03`

Suggested owner: backend foundation worker

Primary paths:

- `apps/server/src/events/eventBus.ts`
- `apps/server/src/api/events.ts`
- `apps/server/src/db/repositories/appEventsRepository.ts`

Deliverables:

- Implement internal event bus.
- Persist app events for saves detected, restores, deletes, MCP inspections, project changes, scans, and errors.
- Implement `GET /api/events/stream` with SSE.
- Add heartbeat and disconnect cleanup.

Acceptance criteria:

- Frontend can subscribe to SSE.
- Emitted events are persisted and streamed.
- Disconnects do not leak listeners.

### T20 - App layout shell

Status: `parallel after Wave 0`

Dependencies: `T04`

Suggested owner: frontend shell worker

Primary paths:

- `apps/web/src/app/App.tsx`
- `apps/web/src/app/Layout.tsx`
- `apps/web/src/components/layout/`

Deliverables:

- Implement single-screen desktop-first layout: topbar, left sidebar, main content, right detail panel.
- Respect suggested widths: sidebar 280px-340px and detail panel 380px-560px.
- Add responsive fallback for tablet and mobile.
- Avoid landing-page or promotional composition.

Acceptance criteria:

- Layout supports empty shell states.
- No nested cards or decorative backgrounds.
- Text does not overlap at desktop, tablet, or mobile widths.

### T21 - Theme, visual tokens, and reusable primitives

Status: `parallel after Wave 0`

Dependencies: `T04`

Suggested owner: frontend shell worker

Primary paths:

- `apps/web/src/styles/globals.css`
- `apps/web/src/components/ui/`
- `apps/web/src/components/common/`

Deliverables:

- Define dark and light theme tokens with neutral, operational palette.
- Add status badges/chips for editable, read-only, deleted, active, archived, clean, dirty, detached, not-git, unknown, warning, and error.
- Add tooltip-ready icon buttons using lucide icons.
- Add reusable code/preview surfaces with monospace handling and horizontal scroll.

Acceptance criteria:

- UI reads as a technical workspace.
- Semantic colors are used only for state.
- Focus states and hover states are visible.

### T22 - Topbar implementation

Status: `parallel after Wave 0`

Dependencies: `T20`, `T21`

Suggested owner: frontend shell worker

Primary paths:

- `apps/web/src/components/layout/Topbar.tsx`
- `apps/web/src/features/settings/SettingsButton.tsx`
- `apps/web/src/features/status/BackendStatus.tsx`

Deliverables:

- Show app name, theme toggle, language selector, settings button, and backend/watcher status.
- Represent normal, disconnected, watcher error, reindexing, and stale states.
- Wire temporary state first, then API/SSE state when available.

Acceptance criteria:

- Topbar status is readable without relying only on color.
- Language selector includes `en-US`, `pt-BR`, and `es-ES`.

### T23 - Sidebar search and scope filter shell

Status: `parallel after Wave 0`

Dependencies: `T20`, `T21`

Suggested owner: frontend shell worker

Primary paths:

- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/features/search/`
- `apps/web/src/features/projects/ScopeFilter.tsx`

Deliverables:

- Add VS Code-style search input.
- Add combinable scope filters: Global, each project, all projects, and clear selection.
- Show counters per scope for active tab.
- Show project friendly name, branch, and compact git status.
- Add sidebar footer actions for add project and manage projects.

Acceptance criteria:

- Scope combinations are visually clear.
- Sidebar remains compact and readable.

### T30 - File classification and safety policy

Status: `parallel after Wave 1 contracts`

Dependencies: `T01`, `T10`

Suggested owner: scanner worker

Primary paths:

- `apps/server/src/domain/items/`
- `apps/server/src/services/files/fileSafety.ts`
- `apps/server/src/services/files/itemClassifier.ts`

Deliverables:

- Implement item type classification for AGENTS, Skill, Agent, Plugin, Config, Memory, Automation, Session, Activity, and unknown blocked content.
- Implement editability matrix from `PLANO.md`.
- Detect textual safe files for Markdown, TOML, YAML, JSON, JSONL, and plain text.
- Block binary, secret, cache, internal state, auth, unknown sensitive logs, and unsafe paths.
- Mark plugins/cache, system skills, sessions, and activity as read-only.

Acceptance criteria:

- Classification tests cover all editable and read-only rules from the matrix.
- `auth.json` and raw secrets are never previewed, indexed, versioned, opened, restored, or deleted.

### T31 - Scanner for global and project scopes

Status: `parallel after Wave 1 contracts`

Dependencies: `T12`, `T30`

Suggested owner: scanner worker

Primary paths:

- `apps/server/src/services/scanner/`
- `apps/server/src/db/repositories/itemsRepository.ts`

Deliverables:

- Scan global Codex Home paths listed in `PLANO.md`.
- Scan registered project paths listed in `PLANO.md`.
- Discover nested `AGENTS.md`.
- Ignore heavy directories: `.git`, `node_modules`, `dist`, `build`, `target`, `coverage`, `.next`, `.nuxt`, `.venv`, `venv`, `.idea`, and `.DS_Store`.
- Upsert `codex_items` records with path, relative path, type, origin, project/plugin relation, editability, hash, size, timestamps, and deleted state.
- Mark missing files as removed/deleted without crashing.

Acceptance criteria:

- Initial scan detects all planned item categories.
- Nested `AGENTS.md` shows clear relative path.
- Scan is idempotent.

### T32 - Search index with SQLite FTS5

Status: `parallel after Wave 1 contracts`

Dependencies: `T02`, `T30`, `T31`

Suggested owner: scanner worker

Primary paths:

- `apps/server/src/services/search/`
- `apps/server/src/db/repositories/searchRepository.ts`
- `apps/server/src/api/search.ts`

Deliverables:

- Index filename, relative path, absolute path, textual content, item type, origin, project/plugin relation, and last indexed timestamp.
- Search by filename and full textual content.
- Respect active tab and selected scope filters.
- Do not index blocked sensitive files.
- Process large text files asynchronously without truncating allowed content.
- Provide reindex action.

Acceptance criteria:

- Search does not rescan the filesystem on every query.
- Search returns filtered results consistently.
- Reindex emits app/SSE events.

### T33 - Chokidar watchers and live filesystem updates

Status: `parallel after Wave 1 contracts`

Dependencies: `T13`, `T31`, `T32`

Suggested owner: scanner worker

Primary paths:

- `apps/server/src/services/watchers/`

Deliverables:

- Watch Codex Home and registered projects.
- Watch nested `AGENTS.md`, `.codex/**`, `.agents/**`, and relevant Git refs/HEAD.
- Use `followSymlinks: false`, `ignoreInitial: false`, and `awaitWriteFinish`.
- Recalculate hashes on changes.
- Create version snapshots when safe editable content changes.
- Update search index and emit SSE events for create, change, remove, project changes, branch changes, config changes, restore, delete, and MCP inspection.

Acceptance criteria:

- External file edits appear in UI without refresh.
- Watchers do not follow symlinks outside roots.
- Watcher errors are visible in backend status.

### T34 - REST item APIs and count APIs

Status: `parallel after scanner APIs`

Dependencies: `T31`, `T32`

Suggested owner: backend API worker

Primary paths:

- `apps/server/src/api/items.ts`
- `apps/server/src/api/counts.ts`

Deliverables:

- Implement `GET /api/items`.
- Implement `GET /api/items/counts`.
- Support tab, scope, search query, session status, pagination, and sorting.
- Return enough metadata for list rows and detail panel.
- Include active-tab counters per scope.

Acceptance criteria:

- List and counts are consistent.
- All tab returns item type as primary metadata.
- Non-All tabs keep type as secondary metadata.

### T40 - Frontend API client and client state

Status: `parallel after Wave 1 contracts`

Dependencies: `T01`, `T20`

Suggested owner: frontend data worker

Primary paths:

- `apps/web/src/lib/api/`
- `apps/web/src/lib/query/`
- `apps/web/src/hooks/`

Deliverables:

- Implement typed API client using shared Zod schemas.
- Add query/cache layer for bootstrap, preferences, projects, items, counts, versions, settings, trash, MCP, and app events.
- Add optimistic-safe invalidation hooks for SSE events.

Acceptance criteria:

- API parse failures are visible and typed.
- Client state can update from SSE without full page reload.

### T41 - Main tabs and active item list

Status: `parallel after frontend data shell`

Dependencies: `T21`, `T23`, `T34`, `T40`

Suggested owner: frontend item workspace worker

Primary paths:

- `apps/web/src/features/items/ItemTabs.tsx`
- `apps/web/src/features/items/ItemList.tsx`
- `apps/web/src/features/items/ItemRow.tsx`

Deliverables:

- Implement tabs: AGENTS, Skills, Agents, Plugins, Configs, Memories, Automations, Sessions, Activity, and All.
- Implement dense row list with name, origin, relative path, editability/read-only, last modified, status/hash summary, and compact actions.
- Show item type as primary column only in All.
- Add info and folder/path actions with tooltips.
- Support selected item state.

Acceptance criteria:

- Rows are stable in height and scannable.
- Paths truncate predictably with full path access.
- Read-only and editable states are visible by text/icon, not color alone.

### T42 - Detail panel and safe preview

Status: `parallel after frontend item list`

Dependencies: `T34`, `T40`, `T41`

Suggested owner: frontend item workspace worker

Primary paths:

- `apps/web/src/features/items/ItemDetailPanel.tsx`
- `apps/web/src/features/preview/`
- `apps/web/src/features/versions/VersionHistory.tsx`

Deliverables:

- Implement metadata sections: origin, path, type, editability, hash, size, timestamps, project/plugin relation, and git status when relevant.
- Implement safe textual preview for Markdown, TOML, YAML, JSON, JSONL, and plain text.
- Sanitize Markdown/HTML preview.
- Add loading, blocked, read-only, deleted, and error states.
- Add version history shell.

Acceptance criteria:

- Blocked/sensitive items never show unsafe content.
- Large previews use async loading, pagination, or virtualization without artificial truncation of allowed content.

### T43 - Item actions UI

Status: `parallel after detail panel`

Dependencies: `T42`

Suggested owner: frontend item workspace worker

Primary paths:

- `apps/web/src/features/items/ItemActions.tsx`
- `apps/web/src/features/dialogs/`

Deliverables:

- Add action availability rules for Open in VS Code, Compare with current, Open historical version, Restore version, Delete, Reveal in Finder, and Apply as current.
- Hide or disable actions according to editability/read-only/deleted state.
- Add confirmation dialogs for restore, delete, MCP inspection, permanent trash delete, and restore conflicts.
- Add saved-decision checkbox for restore/apply flow.

Acceptance criteria:

- Read-only items do not expose real-file edit, restore, apply, or delete actions.
- Destructive dialogs state whether the action affects a real file, internal cache, trash, or project reference.

### T44 - SSE client integration

Status: `parallel after backend SSE`

Dependencies: `T13`, `T40`

Suggested owner: frontend data worker

Primary paths:

- `apps/web/src/lib/events/`
- `apps/web/src/features/status/BackendStatus.tsx`

Deliverables:

- Connect to `GET /api/events/stream`.
- Update backend/watcher status in topbar.
- Invalidate or patch queries for file create/change/remove, project add/remove, branch status, MCP inspection, restore, delete, and reindex events.
- Handle reconnect and disconnected states.

Acceptance criteria:

- UI reflects backend changes without manual refresh.
- Disconnection is visible and non-disruptive.

### T50 - Test fixtures for filesystem and Codex Home shapes

Status: `parallel after Wave 0`

Dependencies: `T01`

Suggested owner: verification worker

Primary paths:

- `tests/fixtures/codex-home/`
- `tests/fixtures/projects/`
- `apps/server/src/**/*.test.ts`

Deliverables:

- Add fixture Codex Home with global `AGENTS.md`, `config.toml`, `hooks.json`, skills, agents, plugin cache, memories, automations, sessions, archived sessions, `session_index.jsonl`, `history.jsonl`, `auth.json`, cache, logs, and system skills.
- Add fixture projects with nested `AGENTS.md`, `.codex`, `.agents`, git and non-git variants, and ignored directories.
- Include text, Markdown, TOML, YAML, JSON, JSONL, binary, and sensitive files.

Acceptance criteria:

- Backend scanner, classifier, search, versioning, and trash tests can reuse fixtures.
- Fixtures include both allowed and blocked examples.

### T60 - Versioning service and retention policy

Status: `parallel after scanner`

Dependencies: `T11`, `T30`, `T31`, `T33`

Suggested owner: versioning worker

Primary paths:

- `apps/server/src/services/versioning/`
- `apps/server/src/db/repositories/versionsRepository.ts`
- `apps/server/src/api/versions.ts`

Deliverables:

- Create snapshots for safe editable text files when hash changes.
- Support version origins: `initial-scan`, `external-edit`, `restore`, `delete`, and `temp-edit-apply`.
- Store full textual content, hash, size, path, timestamp, and origin.
- Apply retention policy after new versions.
- Never prune protected versions if protected support is later added.
- Implement `GET /api/items/:id/versions`.

Acceptance criteria:

- Duplicate hashes do not create duplicate versions.
- Retention defaults to 10 versions per item.
- Sensitive/read-only files are not versioned as editable content.

### T61 - VS Code open, diff, and reveal services

Status: `parallel after item APIs`

Dependencies: `T30`, `T60`

Suggested owner: versioning worker

Primary paths:

- `apps/server/src/services/externalTools/`
- `apps/server/src/api/itemActions.ts`

Deliverables:

- Implement `POST /api/items/:id/open` with `code --goto <file>`.
- Implement `POST /api/items/:id/diff/:versionId` with `code --diff <historical-temp-file> <current-real-file>`.
- Implement optional reveal in Finder with safe platform-specific invocation.
- Use `spawn(command, args)` only.
- Block actions for read-only, deleted, sensitive, or unsafe items.

Acceptance criteria:

- Paths with spaces work.
- No shell command concatenation is used.
- Unauthorized actions return clear validation errors.

### T62 - Historical temp edit flow

Status: `parallel after versioning`

Dependencies: `T60`, `T61`

Suggested owner: versioning worker

Primary paths:

- `apps/server/src/services/tempEdits/`
- `apps/server/src/api/tempEdits.ts`

Deliverables:

- Create editable temporary historical version files under PromptDesk temp.
- Open temp files in VS Code.
- Watch temp files for changes.
- Track temp edit status: opened, changed, applied, discarded.
- Implement Apply as current with confirmation flow support.
- Create `temp-edit-apply` version after applying.

Acceptance criteria:

- Editing a temp file does not change the real file until Apply as current.
- Applying creates a new version and emits SSE events.

### T63 - Delete service and internal trash

Status: `parallel after versioning`

Dependencies: `T30`, `T60`

Suggested owner: trash worker

Primary paths:

- `apps/server/src/services/trash/`
- `apps/server/src/db/repositories/trashRepository.ts`
- `apps/server/src/api/trash.ts`

Deliverables:

- Implement delete for real editable files by snapshotting and moving the file to PromptDesk internal trash.
- Generate unique `trash-id`.
- Write `metadata.json` with original path, basename, hash, size, timestamps, item id, item type, origin, and restore metadata.
- Mark item as deleted and emit SSE event.
- Implement delete for MCP cache/internal data separately from real file delete.
- Avoid direct unlink for real editable files.

Acceptance criteria:

- Deleting a safe editable file preserves recoverable metadata.
- Read-only real files cannot be deleted.
- Project removal only removes app reference.

### T64 - Trash restore and conflict resolution

Status: `parallel after trash delete`

Dependencies: `T63`

Suggested owner: trash worker

Primary paths:

- `apps/server/src/services/trash/restore.ts`
- `apps/server/src/api/trash.ts`

Deliverables:

- Restore to original path when free.
- Handle existing destination with options: compare, overwrite after snapshot, restore with timestamped new name, choose another destination, or cancel.
- Handle missing original directory with options: recreate directory, choose another destination, or cancel.
- Implement permanent trash delete with confirmation support.

Acceptance criteria:

- Conflict responses are explicit and actionable.
- Overwrite creates a snapshot before replacing.
- Restore updates SQLite, search index, versions, and emits SSE.

### T70 - Config parsing and MCP server extraction

Status: `parallel after scanner`

Dependencies: `T30`, `T31`

Suggested owner: MCP worker

Primary paths:

- `apps/server/src/services/configs/`
- `apps/server/src/services/mcp/configParser.ts`
- `apps/server/src/db/repositories/mcpRepository.ts`

Deliverables:

- Parse global and project `config.toml`.
- Extract MCP servers from configs.
- Support STDIO servers with `command`, `args`, `env`, `env_vars`, and `cwd`.
- Support Streamable HTTP servers with `url`, bearer token by env var, and redacted headers.
- Respect `enabled = false`, `enabled_tools`, and `disabled_tools`.
- Persist redacted server metadata.

Acceptance criteria:

- Raw env values, headers, and tokens are never persisted.
- Disabled servers are represented but not executable.

### T71 - Manual MCP tool discovery

Status: `parallel after MCP extraction`

Dependencies: `T13`, `T70`

Suggested owner: MCP worker

Primary paths:

- `apps/server/src/services/mcp/inspection.ts`
- `apps/server/src/api/mcp.ts`

Deliverables:

- Implement `POST /api/mcp/:id/inspect`.
- Implement `POST /api/mcp/inspect-all`.
- Show required safety warning through API metadata consumed by frontend.
- Start MCP servers only after explicit user confirmation.
- Enforce timeout.
- Persist discovered tools, descriptions, input schema, output schema when available, status, errors, and inspected timestamp.
- Emit SSE events and app events.

Acceptance criteria:

- Manual inspection works for enabled STDIO and Streamable HTTP configurations.
- Disabled servers are not executed.
- Failed inspections persist clear error status without crashing.

### T72 - Configs tab MCP UI

Status: `parallel after MCP APIs`

Dependencies: `T41`, `T42`, `T70`, `T71`

Suggested owner: frontend MCP worker

Primary paths:

- `apps/web/src/features/configs/`
- `apps/web/src/features/mcp/`

Deliverables:

- In Configs tab, show `config.toml` items and extracted MCP servers as a section/sublist.
- Add Discover tools per server and Discover all tools.
- Show last inspection time, status, errors, discovered tools, and schemas.
- Add strong MCP inspection warning dialog.
- Redact env, headers, and tokens in UI.

Acceptance criteria:

- There is no separate MCP top-level tab.
- Inspection is impossible without explicit confirmation.
- Disabled servers are visible but not executable.

### T80 - Settings UI and settings APIs

Status: `parallel after preferences`

Dependencies: `T10`, `T11`, `T20`, `T40`

Suggested owner: settings worker

Primary paths:

- `apps/server/src/api/settings.ts`
- `apps/web/src/features/settings/`

Deliverables:

- Implement settings drawer/modal from topbar.
- Include theme, language, resolved Codex Home, Codex Home override/rescan, PromptDesk Home, version retention, saved restore decisions, trash, projects, preferences, search index, MCP cache, and maintenance actions.
- Show resolution source for Codex Home: saved preference, `CODEX_HOME`, fallback `~/.codex`, or invalid.
- Separate destructive/maintenance actions visually.

Acceptance criteria:

- Invalid or missing Codex Home first-run state is actionable.
- Settings can update language, theme, retention, and Codex Home.

### T81 - Project management UI

Status: `parallel after project APIs`

Dependencies: `T12`, `T23`, `T40`

Suggested owner: settings worker

Primary paths:

- `apps/web/src/features/projects/`

Deliverables:

- Add project dialog with path input.
- Manage projects screen in settings/sidebar flow.
- Allow editing friendly name without moving or renaming folders.
- Remove project reference with clear wording that real folder is not deleted.
- Trigger scan after add and manual scan action.

Acceptance criteria:

- Add/remove project flows are clear and safe.
- Branch/status and counters update after scan/SSE.

### T82 - Maintenance actions

Status: `parallel after search, MCP, activity`

Dependencies: `T13`, `T32`, `T71`, `T90`

Suggested owner: settings worker

Primary paths:

- `apps/server/src/api/maintenance.ts`
- `apps/web/src/features/settings/MaintenanceSection.tsx`

Deliverables:

- Implement reindex search.
- Implement clear MCP inspection cache.
- Implement clear old app events.
- Add confirmations and event logging.

Acceptance criteria:

- Maintenance actions state exactly which internal data is affected.
- Reindex emits progress/status events when available.

### T90 - Sessions tab

Status: `parallel after scanner and item UI`

Dependencies: `T30`, `T31`, `T41`, `T42`

Suggested owner: sessions/activity worker

Primary paths:

- `apps/server/src/services/sessions/`
- `apps/web/src/features/sessions/`

Deliverables:

- Include `{codexHome}/sessions` and `{codexHome}/archived_sessions`.
- Mark all session files read-only.
- Show structured JSON conversation view.
- Add quick filters: active, archived, and all.
- Support textual search through the local index.

Acceptance criteria:

- Sessions never expose edit, restore, apply, or delete real-file actions.
- Active and archived tags are clear.

### T91 - Activity tab

Status: `parallel after app events and scanner`

Dependencies: `T13`, `T30`, `T31`, `T41`, `T42`

Suggested owner: sessions/activity worker

Primary paths:

- `apps/server/src/services/activity/`
- `apps/web/src/features/activity/`

Deliverables:

- Include read-only `{codexHome}/history.jsonl`.
- Show PromptDesk app events: saves detected, restores, deletes, MCP inspections, projects added/removed, maintenance actions, and errors.
- Separate Codex history entries from PromptDesk internal app events.
- Support filtering and search.

Acceptance criteria:

- Activity clearly distinguishes read-only Codex history from PromptDesk operational events.
- Sensitive raw logs are not indexed or previewed.

### T100 - Full integration pass

Status: `serial integration`

Dependencies: all implementation tasks

Suggested owner: main agent

Primary paths:

- All app paths

Deliverables:

- Wire startup sequence: resolve paths, migrate database, load preferences, scan Codex Home, load projects, start watchers, start API, start frontend.
- Ensure bootstrap returns everything needed for initial UI.
- Resolve contract drift between backend and frontend.
- Ensure all endpoints from `PLANO.md` are implemented or intentionally covered by equivalent routes.

Acceptance criteria:

- `npm run dev` starts the full app.
- First load works with valid Codex Home.
- Invalid Codex Home shows actionable setup state.
- Main tabs, sidebar, detail panel, settings, search, SSE, and actions are connected.

### T101 - Security and sensitive-data audit

Status: `serial integration`

Dependencies: all backend features

Suggested owner: main agent or verification worker

Primary paths:

- `apps/server/src/services/files/`
- `apps/server/src/services/mcp/`
- `apps/server/src/services/externalTools/`
- `apps/server/src/api/`

Deliverables:

- Audit all file reads, writes, deletes, previews, indexing, versioning, and external command execution.
- Verify blocked files cannot be previewed, indexed, versioned, opened, restored, or deleted.
- Verify raw MCP env/header/token values are never persisted or returned.
- Verify all user-supplied paths are validated and normalized.
- Verify symlinks are not followed outside watched roots.
- Verify local-only server binding.

Acceptance criteria:

- Add tests for security-critical paths.
- No shell string command construction remains.
- Read-only and sensitive behavior matches `PLANO.md`.

### T102 - Accessibility and responsive QA

Status: `serial integration`

Dependencies: all frontend features

Suggested owner: main agent or verification worker

Primary paths:

- `apps/web/src/`

Deliverables:

- Verify keyboard navigation for tabs, lists, dialogs, menus, settings, and action buttons.
- Verify visible focus states.
- Verify status states do not rely only on color.
- Verify desktop, tablet, and mobile fallback layouts.
- Verify labels fit in `en-US`, `pt-BR`, and `es-ES`.

Acceptance criteria:

- No incoherent text overlap at common viewport widths.
- Critical actions are accessible by keyboard.
- Dialogs trap focus and return focus correctly.

### T103 - Visual QA against design brief

Status: `serial integration`

Dependencies: all frontend features

Suggested owner: main agent

Primary paths:

- `apps/web/src/`

Deliverables:

- Verify dark mode as default.
- Verify light mode.
- Verify topbar normal/error states.
- Verify sidebar search, filters, projects, counters.
- Verify dense item list states: editable, read-only, deleted.
- Verify All tab type column.
- Verify Configs MCP section.
- Verify Plugins, Sessions, Activity, Settings, trash, invalid Codex Home, empty states, loading, indexing, backend/watcher error.
- Remove decorative gradients, heavy shadows, promotional layout, and unnecessary card nesting.

Acceptance criteria:

- The UI reads as a precise technical workspace.
- The first screen is the actual app, not a landing page.
- Design states from `DESIGN_BRIEF.md` are represented.

### T104 - End-to-end V1 acceptance checklist

Status: `serial integration`

Dependencies: all tasks

Suggested owner: main agent

Primary paths:

- `tests/`
- `apps/server/`
- `apps/web/`

Deliverables:

- Run typecheck, lint, unit tests, integration tests, and app build.
- Run a local app smoke test with fixture Codex Home and fixture project.
- Verify add/remove project.
- Verify nested `AGENTS.md` detection.
- Verify branch/status.
- Verify counters.
- Verify search by name and content.
- Verify external edit detection through watcher.
- Verify Open in VS Code route behavior with mocked spawn in tests.
- Verify history, diff temp file creation, restore, delete, trash restore, and MCP inspection with safe test server/mocks.

Acceptance criteria:

- The V1 done criteria in `PLANO.md` are checked off.
- Remaining known gaps are documented explicitly.

### T105 - Documentation and operational notes

Status: `serial finalization`

Dependencies: `T104`

Suggested owner: main agent

Primary paths:

- `README.md`
- `docs/`

Deliverables:

- Document install, dev, build, and test commands.
- Document PromptDesk Home and Codex Home resolution.
- Document safety model and read-only/editable matrix.
- Document MCP inspection risks and behavior.
- Document V1 scope and V2 exclusions.

Acceptance criteria:

- A new developer can run and test the app locally.
- Documentation matches implemented behavior.

## 5. Suggested Worker Assignments

Use these assignments only after Wave 0 is complete.

### Worker A - Backend Foundation

Owns:

- `apps/server/src/services/paths/`
- `apps/server/src/services/preferences/`
- `apps/server/src/services/projects/`
- `apps/server/src/services/git/`
- `apps/server/src/events/`
- related API routes

Tasks:

- `T10`
- `T11`
- `T12`
- `T13`

Do not edit:

- Scanner/classifier internals
- Versioning/trash internals
- MCP inspection internals
- Frontend feature components

### Worker B - Scanner, Search, And Watchers

Owns:

- `apps/server/src/domain/items/`
- `apps/server/src/services/files/`
- `apps/server/src/services/scanner/`
- `apps/server/src/services/search/`
- `apps/server/src/services/watchers/`
- scanner/search repositories and item APIs

Tasks:

- `T30`
- `T31`
- `T32`
- `T33`
- `T34`

Do not edit:

- External VS Code actions
- Trash restore implementation
- MCP inspection implementation
- Frontend layout except API needs documented in shared contracts

### Worker C - Frontend Shell And Data

Owns:

- `apps/web/src/app/`
- `apps/web/src/components/layout/`
- `apps/web/src/components/common/`
- `apps/web/src/lib/`
- `apps/web/src/hooks/`
- `apps/web/src/styles/`

Tasks:

- `T20`
- `T21`
- `T22`
- `T23`
- `T40`
- `T44`

Do not edit:

- Backend server internals
- Feature-specific pages unless needed for shell integration

### Worker D - Frontend Item Workspace

Owns:

- `apps/web/src/features/items/`
- `apps/web/src/features/preview/`
- `apps/web/src/features/versions/`
- `apps/web/src/features/dialogs/`

Tasks:

- `T41`
- `T42`
- `T43`

Do not edit:

- Topbar/sidebar layout except through agreed props
- Backend implementation

### Worker E - Versioning, External Tools, And Trash

Owns:

- `apps/server/src/services/versioning/`
- `apps/server/src/services/externalTools/`
- `apps/server/src/services/tempEdits/`
- `apps/server/src/services/trash/`
- versioning/trash/action API routes

Tasks:

- `T60`
- `T61`
- `T62`
- `T63`
- `T64`

Do not edit:

- Scanner classification rules except through shared interfaces
- MCP implementation
- Frontend UI beyond route contract needs

### Worker F - MCP And Configs

Owns:

- `apps/server/src/services/configs/`
- `apps/server/src/services/mcp/`
- `apps/web/src/features/configs/`
- `apps/web/src/features/mcp/`

Tasks:

- `T70`
- `T71`
- `T72`

Do not edit:

- General item list and layout except using extension points.
- Versioning/trash internals.

### Worker G - Settings, Projects UI, Sessions, And Activity

Owns:

- `apps/web/src/features/settings/`
- `apps/web/src/features/projects/`
- `apps/web/src/features/sessions/`
- `apps/web/src/features/activity/`
- maintenance API routes

Tasks:

- `T80`
- `T81`
- `T82`
- `T90`
- `T91`

Do not edit:

- Core scanner implementation.
- MCP inspection internals.
- Versioning/trash internals except consuming their APIs.

### Worker H - Fixtures And Verification

Owns:

- `tests/`
- test helpers
- focused tests for assigned behaviors

Tasks:

- `T50`
- assist `T101`
- assist `T102`
- assist `T104`

Do not edit:

- Production implementation unless asked to fix a failing test with explicit ownership.

## 6. Spawn Prompt Template

Use this template when the main agent delegates a worker task.

```txt
You are implementing part of PromptDesk. Read PLANO.md, DESIGN_BRIEF.md, and IMPLEMENTATION_PLAN.md before editing.

You are not alone in the codebase. Other agents may be editing other areas. Do not revert unrelated changes. Keep code, comments, task text, and identifiers in en-US.

Ownership:
- You own: <paths>
- Do not edit: <paths>

Tasks:
- <task ids>

Requirements:
- Follow the V1 constraints from IMPLEMENTATION_PLAN.md.
- Use shared types and Zod schemas from packages/shared.
- Add focused tests for the behavior you implement.
- Run the relevant typecheck/tests for your area if possible.

Final response:
- List changed files.
- List tests run and results.
- Call out blockers or contract changes needed.
```

## 7. Main Agent Integration Checklist

The main agent should keep this checklist while coordinating workers.

- Shared contracts exist before parallel work starts.
- Every worker has disjoint ownership.
- API schemas remain aligned between backend and frontend.
- Scanner, search, versioning, and trash use the same item identity model.
- Watcher events update database, search index, app events, and SSE consistently.
- Frontend actions are driven by backend permissions, not duplicated assumptions only.
- All read-only and sensitive behavior is enforced on the backend, even if UI hides actions.
- MCP warning and confirmation happen before any server command starts.
- Restore/delete dialogs clearly state what will be affected.
- Settings includes Codex Home resolution, PromptDesk Home, retention, saved decisions, trash, projects, search index, MCP cache, and maintenance actions.
- Sessions and Activity remain read-only for Codex files.
- Profiles remain excluded from V1.
- `npm run dev` starts frontend and backend together.
- `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` pass or documented failures are explicit.

## 8. V1 Done Criteria

V1 is complete only when all of the following work:

- App resolves Codex Home by saved preference, `CODEX_HOME`, or `~/.codex`.
- App stores internal data under PromptDesk Home.
- User can add, rename, scan, and remove project references.
- Scanner discovers global and project `AGENTS.md`, nested `AGENTS.md`, configs, hooks, skills, agents, plugins, memories, automations, sessions, and activity.
- Branch and git status appear per project.
- Tabs and sidebar filters show live counters for the active tab.
- Search by filename and full textual content uses SQLite FTS5.
- Filesystem changes appear without refresh through watcher and SSE.
- Open in VS Code works for editable items only.
- History snapshots work for safe editable text files.
- VS Code diff with historical temp files works.
- Historical version open/apply flow works.
- Restore works with confirmation and saved-decision support.
- Delete moves safe editable real files to PromptDesk internal trash with metadata.
- Trash restore handles free paths, existing destination conflicts, and missing original directories.
- MCP servers are extracted from configs and tools can be inspected manually with warnings.
- MCP inspection results persist with redacted config data.
- Settings supports theme, language, Codex Home, PromptDesk Home, retention, saved decisions, trash, projects, search maintenance, MCP cache maintenance, and app event maintenance.
- Dark mode is the default and light mode works.
- i18n works for `en-US`, `pt-BR`, and `es-ES`.
- Sessions are visible as structured JSON read-only with active/archived/all filters.
- Activity separates Codex `history.jsonl` from PromptDesk app events.
- Sensitive files and raw secrets are not previewed, indexed, versioned, opened, restored, deleted, or persisted.
- The UI matches the operational, dense, technical design direction from `DESIGN_BRIEF.md`.
