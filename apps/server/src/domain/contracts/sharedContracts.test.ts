import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  APP_EVENT_TYPES,
  EDITABILITY_STATES,
  ITEM_ORIGINS,
  ITEM_TYPES,
  TABS,
  appEventSchema,
  bootstrapResponseSchema,
  codexItemSchema,
  restoreRequestSchema,
  sseEnvelopeSchema,
  trashItemSchema
} from "@prompt-desk/shared";

const now = "2026-05-15T12:00:00.000Z";
const fixturePath = path.join(process.cwd(), "tests", "fixtures", "codex-home", "AGENTS.md");

function codexItem(overrides: Partial<unknown> = {}) {
  return {
    id: "item_fixture",
    type: "agents",
    origin: "global",
    name: "AGENTS.md",
    absolutePath: fixturePath,
    relativePath: "AGENTS.md",
    projectId: null,
    projectName: null,
    pluginName: null,
    editability: "editable",
    status: "current",
    hash: "abc123",
    size: 42,
    createdAt: now,
    detectedAt: now,
    updatedAt: now,
    lastVersionAt: null,
    blockedReason: null,
    metadata: {
      safeToIndex: true,
      safeToPreview: true,
      safeToVersion: true
    },
    ...overrides
  };
}

describe("shared PromptDesk contracts", () => {
  it("keeps item tabs aligned with item types plus All", () => {
    expect(TABS).toEqual([...ITEM_TYPES, "all"]);
    expect(ITEM_ORIGINS).toEqual(["global", "project", "plugin", "internal"]);
    expect(EDITABILITY_STATES).toContain("read-only");
    expect(APP_EVENT_TYPES).toContain("trash-restored");
  });

  it("accepts complete bootstrap, item, SSE, and trash payloads", () => {
    expect(codexItemSchema.parse(codexItem()).absolutePath).toBe(fixturePath);

    expect(
      bootstrapResponseSchema.parse({
        backend: { status: "ok", watcher: "ready", version: "0.1.0" },
        paths: {
          promptDeskHome: "/tmp/promptdesk",
          dataDir: "/tmp/promptdesk/data",
          trashDir: "/tmp/promptdesk/trash",
          tempDir: "/tmp/promptdesk/temp",
          logsDir: "/tmp/promptdesk/logs"
        },
        codexHome: { path: "/tmp/codex-home", source: "CODEX_HOME", valid: true },
        preferences: {
          theme: "dark",
          language: "pt-BR",
          activeTab: "agents",
          selectedScopes: ["global"],
          versionRetention: 50,
          codexHomeOverride: null,
          restoreDecision: null,
          ui: {}
        },
        projects: [
          {
            id: "project_fixture",
            name: "Fixture",
            path: "/tmp/project-fixture",
            branch: "main",
            gitState: "clean",
            lastScannedAt: now,
            createdAt: now,
            itemCount: 3
          }
        ]
      }).backend.status
    ).toBe("ok");

    expect(
      sseEnvelopeSchema.parse({
        id: "event_fixture",
        event: "file-changed",
        data: {
          id: "event_fixture",
          type: "file-changed",
          entityType: "item",
          entityId: "item_fixture",
          message: "Fixture item changed",
          metadata: { path: fixturePath },
          createdAt: now
        }
      }).data.type
    ).toBe("file-changed");

    expect(
      appEventSchema.parse({
        id: "event_fixture",
        type: "trash-restored",
        entityType: "trash",
        entityId: "trash_fixture",
        message: "Fixture trash item restored",
        metadata: { path: fixturePath },
        createdAt: now
      }).entityType
    ).toBe("trash");

    expect(
      trashItemSchema.parse({
        id: "trash_fixture",
        itemId: "item_fixture",
        originalPath: fixturePath,
        basename: "AGENTS.md",
        trashPath: "/tmp/promptdesk/trash/items/trash_fixture/file",
        itemType: "agents",
        origin: "global",
        hash: "abc123",
        size: 42,
        metadata: { restore: { defaultMode: "restore-original" } },
        createdAt: now
      }).basename
    ).toBe("AGENTS.md");
  });

  it("rejects relative paths and invalid restore modes", () => {
    expect(codexItemSchema.safeParse(codexItem({ absolutePath: "relative/AGENTS.md" })).success).toBe(false);
    expect(restoreRequestSchema.safeParse({ mode: "merge", rememberDecision: false }).success).toBe(false);
  });
});
