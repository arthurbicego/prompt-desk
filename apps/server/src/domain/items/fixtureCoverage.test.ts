import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const fixturesRoot = path.join(process.cwd(), "tests", "fixtures");

async function expectFile(relativePath: string): Promise<void> {
  const stat = await fs.stat(path.join(fixturesRoot, relativePath));
  expect(stat.isFile()).toBe(true);
}

describe("PromptDesk fixture coverage", () => {
  it("contains a representative Codex Home fixture", async () => {
    await expectFile("codex-home/AGENTS.md");
    await expectFile("codex-home/config.toml");
    await expectFile("codex-home/hooks.json");
    await expectFile("codex-home/auth.json");
    await expectFile("codex-home/history.jsonl");
    await expectFile("codex-home/session_index.jsonl");
    await expectFile("codex-home/sessions/2026/05/15/session-active.jsonl");
    await expectFile("codex-home/archived_sessions/2026/session-archived.jsonl");
    await expectFile("codex-home/skills/team-context/SKILL.md");
    await expectFile("codex-home/skills/team-context/agents/reviewer.yaml");
    await expectFile("codex-home/skills/.system/base/SKILL.md");
    await expectFile("codex-home/plugins/cache/browser/.codex-plugin/plugin.json");
    await expectFile("codex-home/plugins/cache/browser/skills/browser/SKILL.md");
    await expectFile("codex-home/plugins/cache/browser/skills/browser/agents/navigator.yaml");
    await expectFile("codex-home/memories/project-notes.md");
    await expectFile("codex-home/automations/daily-review.json");
    await expectFile("codex-home/cache/mcp-cache.json");
    await expectFile("codex-home/log/promptdesk.log");
    await expectFile("codex-home/tmp/state.json");
    await expectFile("codex-home/sqlite/index.sqlite");
    await expectFile("codex-home/logs_2026.sqlite");
    await expectFile("codex-home/state_2026.sqlite");
  });

  it("contains project fixtures for nested AGENTS, local Codex state, ignored directories, and git shapes", async () => {
    await expectFile("projects/git-project/AGENTS.md");
    await expectFile("projects/git-project/packages/api/AGENTS.md");
    await expectFile("projects/git-project/packages/nested-repo/AGENTS.md");
    await expectFile("projects/git-project/.codex/config.toml");
    await expectFile("projects/git-project/.codex/hooks.json");
    await expectFile("projects/git-project/.codex/skills/local/SKILL.md");
    await expectFile("projects/git-project/.codex/skills/local/agents/reviewer.yaml");
    await expectFile("projects/git-project/.agents/skills/imported/SKILL.md");
    await expectFile("projects/git-project/.agents/skills/imported/agents/planner.yaml");
    await expectFile("projects/git-project/.codex/automations/check.json");
    await expectFile("projects/git-project/.codex/plugins/vendor/plugin.json");
    await expectFile("projects/git-project/node_modules/pkg/AGENTS.md");
    await expectFile("projects/git-project/dist/AGENTS.md");
    await expectFile("projects/non-git-project/AGENTS.md");
    await expectFile("projects/non-git-project/.codex/config.toml");
  });
});
