# Contributing

Thanks for considering a contribution to PromptDesk.

## Development Setup

1. Install Node.js `^20.19.0` or `>=22.12.0`.
2. Install dependencies with `npm ci`.
3. Start the local app with `npm run dev`.
4. Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before opening a pull request.

## Project Conventions

- Keep code, comments, test names, and documentation intended for contributors in en-US.
- Keep the app local-first. Do not expose the backend beyond loopback without a deliberate security review.
- Use shared schemas and types from `packages/shared` for API contracts.
- Add focused tests for behavior changes, especially around safety checks, filesystem actions, and restore/versioning flows.
- Do not commit generated output such as `dist`, `node_modules`, coverage reports, local databases, or runtime PromptDesk data.

## Security-Sensitive Areas

Treat these areas as high-risk:

- File opening, restore, delete, reveal, and diff actions
- Secret detection and redaction
- MCP server parsing and inspection
- Codex Home scanning
- PromptDesk runtime data and trash metadata

Changes in those areas should include tests for blocked files, read-only states, and redacted values.

## Pull Request Checklist

- The change is scoped to one behavior or clearly related set of behaviors.
- User-facing behavior is documented when needed.
- Safety-sensitive behavior has tests.
- `npm run lint` passes without new warnings.
- `npm run typecheck`, `npm run test`, and `npm run build` pass.
