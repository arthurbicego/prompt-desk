import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classifyItemPath } from "../../services/files/itemClassifier.js";

async function makeTempRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "promptdesk-classifier-"));
}

async function writeFixture(root: string, relativePath: string, content = "safe text\n"): Promise<string> {
  const absolutePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, "utf8");
  return absolutePath;
}

describe("item classifier", () => {
  it("classifies editable global files from the V1 matrix", async () => {
    const root = await makeTempRoot();
    const cases = [
      ["AGENTS.md", "agents"],
      ["config.toml", "config"],
      ["hooks.json", "config"],
      ["skills/example/SKILL.md", "skill"],
      ["skills/example/agents/reviewer.yaml", "agent"],
      ["memories/team.md", "memory"],
      ["automations/daily.json", "automation"]
    ] as const;

    for (const [relativePath, type] of cases) {
      const absolutePath = await writeFixture(root, relativePath);
      const item = await classifyItemPath(absolutePath, { scope: "global", rootPath: root });
      expect(item?.type).toBe(type);
      expect(item?.editability).toBe("editable");
      expect(item?.safeToIndex).toBe(true);
      expect(item?.safeToVersion).toBe(true);
    }
  });

  it("blocks or marks read-only global sensitive and internal Codex paths", async () => {
    const root = await makeTempRoot();
    const auth = await writeFixture(root, "auth.json", '{"token":"secret"}');
    const session = await writeFixture(root, "sessions/2026/session.jsonl", '{"role":"user"}\n');
    const history = await writeFixture(root, "history.jsonl", '{"prompt":"hello"}\n');
    const systemSkill = await writeFixture(root, "skills/.system/base/SKILL.md", "# System\n");
    const pluginSkill = await writeFixture(root, "plugins/cache/browser/skills/browser/SKILL.md", "# Plugin\n");

    await expect(classifyItemPath(auth, { scope: "global", rootPath: root })).resolves.toMatchObject({
      type: "config",
      editability: "blocked",
      safeToIndex: false,
      safeToPreview: false
    });
    await expect(classifyItemPath(session, { scope: "global", rootPath: root })).resolves.toMatchObject({
      type: "session",
      editability: "read-only",
      safeToIndex: true,
      safeToVersion: false
    });
    await expect(classifyItemPath(history, { scope: "global", rootPath: root })).resolves.toMatchObject({
      type: "activity",
      editability: "read-only"
    });
    await expect(classifyItemPath(systemSkill, { scope: "global", rootPath: root })).resolves.toMatchObject({
      type: "skill",
      editability: "read-only"
    });
    await expect(classifyItemPath(pluginSkill, { scope: "global", rootPath: root })).resolves.toMatchObject({
      type: "skill",
      origin: "plugin",
      editability: "read-only",
      pluginName: "browser"
    });
  });

  it("classifies editable project files and ignores heavy directories", async () => {
    const root = await makeTempRoot();
    const nestedAgents = await writeFixture(root, "packages/api/AGENTS.md", "# API\n");
    const config = await writeFixture(root, ".codex/config.toml", "[mcp]\n");
    const skill = await writeFixture(root, ".agents/skills/local/SKILL.md", "# Local\n");
    const agent = await writeFixture(root, ".codex/skills/local/agents/reviewer.yaml", "name: reviewer\n");
    const ignored = await writeFixture(root, "node_modules/pkg/AGENTS.md", "# Ignored\n");

    for (const absolutePath of [nestedAgents, config, skill, agent]) {
      const item = await classifyItemPath(absolutePath, {
        scope: "project",
        rootPath: root,
        projectId: "project_1",
        projectName: "Fixture"
      });
      expect(item?.origin).toBe("project");
      expect(item?.editability).toBe("editable");
    }

    await expect(classifyItemPath(ignored, { scope: "project", rootPath: root })).resolves.toBeNull();
  });

  it("blocks binary and secret-like files before preview or indexing", async () => {
    const root = await makeTempRoot();
    const secret = await writeFixture(root, "memories/api-token.txt", "token=abcdabcdabcdabcdabcd\n");
    const binary = path.join(root, "memories/blob.txt");
    await fs.mkdir(path.dirname(binary), { recursive: true });
    await fs.writeFile(binary, Buffer.from([0, 159, 146, 150]));

    await expect(classifyItemPath(secret, { scope: "global", rootPath: root })).resolves.toMatchObject({
      editability: "blocked",
      safeToIndex: false,
      safeToPreview: false
    });
    await expect(classifyItemPath(binary, { scope: "global", rootPath: root })).resolves.toMatchObject({
      editability: "blocked",
      safeToIndex: false,
      safeToPreview: false
    });
  });
});
