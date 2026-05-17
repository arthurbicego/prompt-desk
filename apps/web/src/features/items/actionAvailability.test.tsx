import type { CodexItem, FileVersion } from "@prompt-desk/shared";
import { describe, expect, it } from "vitest";
import { getItemActionAvailability } from "./actionAvailability";

const now = "2026-05-15T12:00:00.000Z";

function item(overrides: Partial<CodexItem> = {}): CodexItem {
  return {
    id: "item_fixture",
    type: "agents",
    origin: "global",
    name: "AGENTS.md",
    absolutePath: "/tmp/codex-home/AGENTS.md",
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
    metadata: {},
    ...overrides
  };
}

const version: FileVersion = {
  id: "version_fixture",
  itemId: "item_fixture",
  path: "/tmp/codex-home/AGENTS.md",
  hash: "abc123",
  size: 42,
  origin: "initial-scan",
  createdAt: now,
  protected: false
};

describe("item action availability", () => {
  it("enables edit, restore, apply, and delete actions for editable items with a selected version", () => {
    expect(getItemActionAvailability(item(), version)).toMatchObject({
      openInVsCode: true,
      revealInFinder: true,
      compareWithCurrent: true,
      openHistoricalVersion: true,
      restoreVersion: true,
      applyAsCurrent: true,
      deleteItem: true,
      reason: null
    });
  });

  it("keeps read-only items inspectable but prevents file-changing actions", () => {
    expect(getItemActionAvailability(item({ editability: "read-only", origin: "plugin" }), version)).toMatchObject({
      openInVsCode: false,
      revealInFinder: true,
      compareWithCurrent: true,
      openHistoricalVersion: true,
      restoreVersion: false,
      applyAsCurrent: false,
      deleteItem: false
    });
  });

  it("blocks reveal, edit, version, and delete actions for safety-blocked items", () => {
    expect(
      getItemActionAvailability(
        item({
          editability: "blocked",
          status: "blocked",
          blockedReason: "auth.json is sensitive and blocked"
        }),
        version
      )
    ).toMatchObject({
      openInVsCode: false,
      revealInFinder: false,
      compareWithCurrent: false,
      restoreVersion: false,
      deleteItem: false,
      reason: "auth.json is sensitive and blocked"
    });
  });
});
