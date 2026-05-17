import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeAll } from "vitest";
import { getDb } from "../db/connection.js";
import { ItemsRepository } from "../db/repositories/itemsRepository.js";
import { SearchRepository } from "../db/repositories/searchRepository.js";
import { collectGlobalCandidates, collectProjectCandidates, ScannerService } from "./scanner/scanner.js";
import { inspectFileSafety, readSafeTextFile } from "./files/fileSafety.js";
import { classifyItemPath } from "./files/itemClassifier.js";
import { SearchService } from "./search/searchService.js";
import { VersioningService } from "./versioning/versioningService.js";
import { TrashService } from "./trash/trashService.js";
import { isIgnoredByWatcher, isRelevantWatcherPath } from "./watchers/fileWatchers.js";

const fixturesRoot = path.join(process.cwd(), "tests", "fixtures");
let tempRoot = "";
let codexHome = "";
let projectPath = "";

async function copyFixture(relativePath: string, destinationName: string): Promise<string> {
  const destination = path.join(tempRoot, destinationName);
  await fs.cp(path.join(fixturesRoot, relativePath), destination, { recursive: true });
  return destination;
}

async function createGitDirectoryFixture(projectRoot: string): Promise<void> {
  const gitDirs = [path.join(projectRoot, ".git"), path.join(projectRoot, "packages", "nested-repo", ".git")];
  for (const gitDir of gitDirs) {
    await fs.mkdir(gitDir, { recursive: true });
    await fs.writeFile(path.join(gitDir, "HEAD"), "ref: refs/heads/main\n", "utf8");
  }
}

function loadSchema(): Promise<string> {
  return fs.readFile(path.join(process.cwd(), "apps", "server", "src", "db", "schema.sql"), "utf8");
}

describe("PromptDesk technical behavior", () => {
  beforeAll(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "promptdesk-technical-"));
    process.env.PROMPT_DESK_HOME = path.join(tempRoot, "promptdesk-home");
    codexHome = await copyFixture("codex-home", "codex-home");
    projectPath = await copyFixture(path.join("projects", "git-project"), "git-project");
    await createGitDirectoryFixture(projectPath);
    getDb().exec(await loadSchema());
  });

  it("collects fixture candidates without ignored project directories", async () => {
    const globalCandidates = [...(await collectGlobalCandidates(codexHome))].map((filePath) =>
      path.relative(codexHome, filePath).split(path.sep).join("/")
    );
    expect(globalCandidates).toContain("AGENTS.md");
    expect(globalCandidates).toContain("hooks.json");
    expect(globalCandidates).toContain("skills/team-context/SKILL.md");
    expect(globalCandidates).toContain("sessions/2026/05/15/session-active.jsonl");
    expect(globalCandidates).toContain("archived_sessions/2026/session-archived.jsonl");
    expect(globalCandidates).toContain("history.jsonl");
    expect(globalCandidates).toContain("auth.json");
    expect(globalCandidates).not.toContain("plugins/cache/browser/.codex-plugin/plugin.json");
    expect(globalCandidates).not.toContain("plugins/cache/browser/skills/browser/SKILL.md");
    expect(globalCandidates).not.toContain("plugins/cache/browser/skills/browser/agents/navigator.yaml");

    const projectCandidates = [...(await collectProjectCandidates(projectPath))].map((filePath) =>
      path.relative(projectPath, filePath).split(path.sep).join("/")
    );
    expect(projectCandidates).toContain("AGENTS.md");
    expect(projectCandidates).toContain("packages/api/AGENTS.md");
    expect(projectCandidates).toContain("packages/nested-repo/AGENTS.md");
    expect(projectCandidates).toContain(".codex/config.toml");
    expect(projectCandidates).toContain(".codex/hooks.json");
    expect(projectCandidates).toContain(".agents/skills/imported/SKILL.md");
    expect(projectCandidates).not.toContain("node_modules/pkg/AGENTS.md");
    expect(projectCandidates).not.toContain("dist/AGENTS.md");
  });

  it("ignores transient Codex global roots in watcher events", async () => {
    expect(isIgnoredByWatcher(codexHome, path.join(codexHome, ".tmp", "plugins", "browser", "AGENTS.md"), "global")).toBe(
      true
    );
    expect(
      isIgnoredByWatcher(codexHome, path.join(codexHome, "worktrees", "7dfc", "prompt-desk", "AGENTS.md"), "global")
    ).toBe(true);
    expect(
      isRelevantWatcherPath(codexHome, path.join(codexHome, "worktrees", "7dfc", "prompt-desk", "AGENTS.md"), "global")
    ).toBe(false);
    expect(
      isIgnoredByWatcher(codexHome, path.join(codexHome, "plugins", "cache", "browser", "AGENTS.md"), "global")
    ).toBe(true);
    expect(
      isRelevantWatcherPath(
        codexHome,
        path.join(codexHome, "plugins", "cache", "browser", "skills", "browser", "SKILL.md"),
        "global"
      )
    ).toBe(false);
    expect(isIgnoredByWatcher(projectPath, path.join(projectPath, "packages", "api", "AGENTS.md"), "project")).toBe(
      false
    );
  });

  it("enforces file safety before preview and indexing", async () => {
    const authPath = path.join(codexHome, "auth.json");
    const binaryPath = path.join(tempRoot, "blob.txt");
    await fs.writeFile(binaryPath, Buffer.from([0, 159, 146, 150]));

    await expect(readSafeTextFile(authPath)).rejects.toThrow(/sensitive/i);
    await expect(readSafeTextFile(binaryPath)).rejects.toThrow(/binary|safe text/i);
    await expect(inspectFileSafety(path.join(codexHome, "AGENTS.md"))).resolves.toMatchObject({
      isText: true,
      contentType: "markdown",
      blockedReason: null
    });

    await expect(classifyItemPath(authPath, { scope: "global", rootPath: codexHome })).resolves.toMatchObject({
      type: "config",
      editability: "blocked",
      safeToIndex: false,
      safeToPreview: false
    });
  });

  it("scans global and project fixtures, classifies read-only areas, and indexes searchable content", async () => {
    const db = getDb();
    const scanner = new ScannerService();
    const globalResult = await scanner.scanGlobal(codexHome);
    expect(globalResult.scanned).toBeGreaterThanOrEqual(12);
    expect(globalResult.indexed).toBeGreaterThan(0);

    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO projects (id, name, path, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, 'active')"
    ).run("project_fixture", "Git Fixture", projectPath, now, now);

    const projectResult = await scanner.scanProject({
      id: "project_fixture",
      name: "Git Fixture",
      path: projectPath
    });
    expect(projectResult.scanned).toBeGreaterThanOrEqual(8);

    const items = new ItemsRepository();
    expect(items.findByAbsolutePath(path.join(codexHome, "AGENTS.md"))).toMatchObject({
      type: "agents",
      origin: "global",
      editability: "editable"
    });
    expect(items.findByAbsolutePath(path.join(codexHome, "skills/.system/base/SKILL.md"))).toMatchObject({
      type: "skill",
      editability: "read-only"
    });
    expect(items.findByAbsolutePath(path.join(codexHome, "plugins/cache/browser/skills/browser/SKILL.md"))).toBeNull();
    expect(items.findByAbsolutePath(path.join(codexHome, "auth.json"))).toMatchObject({
      editability: "blocked",
      status: "blocked"
    });
    expect(items.findByAbsolutePath(path.join(codexHome, "hooks.json"))).toMatchObject({
      type: "hook",
      origin: "global",
      editability: "editable"
    });
    expect(items.findByAbsolutePath(path.join(projectPath, "packages/api/AGENTS.md"))).toMatchObject({
      type: "agents",
      origin: "project",
      projectId: "project_fixture",
      editability: "editable"
    });
    expect(items.findByAbsolutePath(path.join(projectPath, ".codex/hooks.json"))).toMatchObject({
      type: "hook",
      origin: "project",
      projectId: "project_fixture",
      editability: "editable"
    });
    expect(items.findByAbsolutePath(path.join(projectPath, "node_modules/pkg/AGENTS.md"))).toBeNull();

    const ignoredWorktreePath = path.join(codexHome, "worktrees/7dfc/prompt-desk/AGENTS.md");
    items.upsertDetectedItem({
      type: "agents",
      origin: "global",
      name: "AGENTS.md",
      absolutePath: ignoredWorktreePath,
      relativePath: "worktrees/7dfc/prompt-desk/AGENTS.md",
      projectId: null,
      projectName: null,
      pluginName: null,
      editability: "editable",
      status: "current",
      hash: "ignored-worktree-fixture",
      size: 1,
      mtimeMs: Date.now(),
      blockedReason: null,
      metadata: { safeToIndex: true },
      safeToRead: true,
      safeToIndex: true,
      safeToPreview: true,
      safeToVersion: true
    });
    expect(
      items
        .list({
          tab: "agents",
          scopes: ["global"],
          sessionState: "all",
          limit: 50,
          offset: 0,
          sort: "updatedAt",
          direction: "desc"
        })
        .items.some((item) => item.absolutePath === ignoredWorktreePath)
    ).toBe(false);

    const ignoredPluginCachePath = path.join(codexHome, "plugins/cache/browser/skills/browser/SKILL.md");
    items.upsertDetectedItem({
      type: "skill",
      origin: "plugin",
      name: "browser",
      absolutePath: ignoredPluginCachePath,
      relativePath: "plugins/cache/browser/skills/browser/SKILL.md",
      projectId: null,
      projectName: null,
      pluginName: "browser",
      editability: "read-only",
      status: "current",
      hash: "ignored-plugin-cache-fixture",
      size: 1,
      mtimeMs: Date.now(),
      blockedReason: null,
      metadata: { safeToIndex: true },
      safeToRead: true,
      safeToIndex: true,
      safeToPreview: true,
      safeToVersion: false
    });
    expect(
      items
        .list({
          tab: "skill",
          scopes: ["global"],
          sessionState: "all",
          limit: 50,
          offset: 0,
          sort: "updatedAt",
          direction: "desc"
        })
        .items.some((item) => item.absolutePath === ignoredPluginCachePath)
    ).toBe(false);
    expect(
      items.list({
        tab: "all",
        scopes: [],
        sessionState: "all",
        limit: 50,
        offset: 0,
        sort: "updatedAt",
        direction: "desc"
      })
    ).toMatchObject({ items: [], total: 0 });
    expect(items.countByTab([]).all).toBe(0);

    const search = new SearchRepository();
    expect(search.search({ query: "global guidance", limit: 10, offset: 0, scopes: ["global"] })).not.toHaveLength(0);
    expect(search.search({ query: "global guidance", limit: 10, offset: 0, scopes: [] })).toHaveLength(0);
    expect(search.search({ query: "fixture-user", limit: 10, offset: 0, scopes: ["global"] })).toHaveLength(0);
    const matchingAgentIds = search.searchItemIds({ query: "editable global", tab: "agents", scopes: ["global"] });
    expect(matchingAgentIds).not.toHaveLength(0);
    expect(items.countByTab(["global"], { agents: matchingAgentIds }).agents).toBe(matchingAgentIds.length);
    expect(items.countByTab(["global"], { agents: [] }).agents).toBe(0);
    expect(
      items.countByScope("agents", { global: matchingAgentIds }).find((scope) => scope.scope === "global")
    ).toMatchObject({
      count: matchingAgentIds.length
    });

    const searchService = new SearchService();
    await expect(searchService.reindexAll()).resolves.toBeGreaterThan(0);
  });

  it("snapshots and restores editable item versions only", async () => {
    const items = new ItemsRepository();
    const agentsItem = items.findByAbsolutePath(path.join(codexHome, "AGENTS.md"));
    const authItem = items.findByAbsolutePath(path.join(codexHome, "auth.json"));
    expect(agentsItem).not.toBeNull();
    expect(authItem).not.toBeNull();

    const versioning = new VersioningService();
    const initial = await versioning.snapshotItem(agentsItem!.id, "initial-scan");
    await fs.writeFile(agentsItem!.absolutePath, "# Global Codex Instructions\n\nUpdated fixture content.\n", "utf8");
    const changed = await versioning.snapshotItem(agentsItem!.id, "external-edit");
    expect(changed.hash).not.toBe(initial.hash);

    await versioning.restoreVersion(agentsItem!.id, initial.id);
    await expect(fs.readFile(agentsItem!.absolutePath, "utf8")).resolves.toBe(initial.content);
    expect(versioning.listVersions(agentsItem!.id).length).toBeGreaterThanOrEqual(2);
    await expect(versioning.snapshotItem(authItem!.id, "initial-scan")).rejects.toMatchObject({
      code: "ITEM_BLOCKED"
    });
  });

  it("moves editable files to PromptDesk trash and restores them to the original path", async () => {
    const items = new ItemsRepository();
    const memoryItem = items.findByAbsolutePath(path.join(codexHome, "memories/project-notes.md"));
    expect(memoryItem).not.toBeNull();

    const trash = new TrashService();
    const trashItem = await trash.deleteItem(memoryItem!.id);
    await expect(fs.stat(memoryItem!.absolutePath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.readFile(trashItem.trashPath, "utf8")).resolves.toContain("fixture workspace");

    const metadataPath = path.join(path.dirname(trashItem.trashPath), "metadata.json");
    const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8")) as { originalPath: string; restore: unknown };
    expect(metadata.originalPath).toBe(memoryItem!.absolutePath);
    expect(metadata.restore).toMatchObject({ defaultMode: "restore-original" });

    const restored = await trash.restoreTrash(trashItem.id, { mode: "restore-original" });
    expect(restored.restored).toBe(true);
    expect(restored.destinationPath).toBe(memoryItem!.absolutePath);
    await expect(fs.readFile(memoryItem!.absolutePath, "utf8")).resolves.toContain("fixture workspace");
  });
});
