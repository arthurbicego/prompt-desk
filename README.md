# PromptDesk

PromptDesk is a local-first web workspace for inspecting, searching, versioning, comparing, restoring, and safely managing persistent Codex context and configuration files.

The app is intentionally not a content editor. It opens editable files in VS Code and watches the real filesystem for changes while keeping derived state, history, preferences, trash metadata, MCP cache, and search indexes in a local SQLite database.

## Current Status

PromptDesk is early-stage software. The public API, storage layout, and UI may change before a stable release.

## What It Manages

- `AGENTS.md` files
- Skills and skill agents
- Plugins and plugin-provided context
- Codex configs and MCP server metadata
- Memories
- Automations
- Sessions and activity/history, read-only in V1

## Safety Model

PromptDesk is designed for local use and binds the backend to `127.0.0.1` by default.

Important safety constraints:

- Sensitive files such as `auth.json`, `.env`, token files, credential files, unknown caches, and binary files are blocked from preview, indexing, versioning, opening, restoring, and deleting.
- MCP inspection is manual and requires explicit confirmation because it may start commands configured on disk.
- Raw MCP environment values, headers, bearer tokens, and secret-looking values are redacted before they reach the UI or persisted metadata.
- Sessions and Codex activity files are read-only in V1.
- Plugin cache content is ignored by default.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm `>=10`
- VS Code command-line launcher (`code`) for open, compare, and temporary version workflows

## Development

Install dependencies:

```sh
npm ci
```

Run the web app and local API together:

```sh
npm run dev
```

Default local endpoints:

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:4317`

Run verification:

```sh
npm run lint
npm run typecheck
npm run test
npm run build
```

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `PROMPT_DESK_PORT` | API port. Defaults to `4317`. |
| `PROMPT_DESK_HOME` | Absolute path for PromptDesk runtime data. Defaults to `~/Library/Application Support/PromptDesk`. |
| `CODEX_HOME` | Optional Codex Home override. If unset, PromptDesk falls back to readable `~/.codex`. |

## Repository Layout

```txt
apps/
  server/   Express API, filesystem scanner, SQLite storage, versioning, MCP inspection
  web/      React/Vite UI
packages/
  shared/   Shared types, schemas, and API contracts
tests/
  fixtures/ Safe placeholder fixtures used by tests
docs/
  implementation/ Original implementation planning documents
```

## License

PromptDesk is licensed under the [MIT License](LICENSE).
