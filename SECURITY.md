# Security Policy

PromptDesk is a local-first developer tool that reads local Codex context and configuration files. Security issues can expose local files, secrets, command execution paths, or sensitive metadata, so please report them carefully.

## Supported Versions

PromptDesk is pre-1.0. Security fixes are applied to the main development line.

## Reporting a Vulnerability

Do not include working secrets, private local paths, personal Codex data, or exploit details in a public issue.

Preferred reporting flow:

1. Use GitHub private vulnerability reporting after it is enabled for the repository.
2. If private reporting is not available yet, contact the maintainer through a private channel and include only a minimal description until a secure channel is established.
3. Share reproduction steps with synthetic fixtures whenever possible.

## Security Expectations

PromptDesk should:

- Bind the backend to loopback by default.
- Avoid following symlinks for sensitive file operations.
- Block secret-looking files and raw secret content from preview, indexing, versioning, opening, restore, and delete flows.
- Redact MCP environment values, headers, tokens, authorization values, and credential-like data.
- Require explicit confirmation before MCP inspection starts configured commands.
- Treat sessions, activity, and unknown internal state as read-only unless a safe behavior is explicitly implemented and tested.
- Ignore plugin cache content in scanners, watchers, and item lists unless a safe behavior is explicitly implemented and tested.

## Out of Scope

- Reports that require disabling local OS filesystem permissions.
- Reports based only on a user manually configuring malicious MCP commands and then approving their execution, unless PromptDesk leaks secrets or bypasses its own confirmation/redaction model.
