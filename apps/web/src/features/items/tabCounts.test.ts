import { describe, expect, it } from "vitest";
import type { CountsResponse, ProjectWorktrees } from "@prompt-desk/shared";
import { buildVisibleTabCounts } from "./tabCounts";

const itemCounts: CountsResponse["tabs"] = {
  agents: 4,
  skill: 5,
  agent: 5,
  plugin: 0,
  config: 2,
  hook: 0,
  memory: 0,
  automation: 0,
  session: 262,
  activity: 1,
  worktree: 0,
  all: 278
};

function worktreeProject(worktreeCount: number): ProjectWorktrees {
  return {
    project: {
      id: "project_1",
      name: "Fixture",
      path: "/workspace/fixture",
      branch: "main",
      gitState: "clean",
      lastScannedAt: null,
      createdAt: "2026-05-17T00:00:00.000Z",
      itemCount: 0
    },
    worktrees: Array.from({ length: worktreeCount }, (_, index) => ({
      id: `worktree_${index}`,
      projectId: "project_1",
      projectName: "Fixture",
      projectPath: "/workspace/fixture",
      path: `/workspace/fixture-${index}`,
      branch: index === 0 ? "main" : `feature/${index}`,
      head: null,
      isCurrentProject: index === 0,
      isBare: false,
      isDetached: false,
      isLocked: false,
      lockedReason: null,
      isPrunable: false,
      prunableReason: null
    })),
    error: null
  };
}

describe("visible tab counts", () => {
  it("uses visible Git worktrees instead of the item table worktree count", () => {
    const counts = buildVisibleTabCounts({
      itemCounts,
      visibleWorktreeProjects: [worktreeProject(3)]
    });

    expect(counts?.worktree).toBe(3);
    expect(counts?.agents).toBe(4);
  });

  it("includes app events in the Activity tab because they render in the activity view", () => {
    const counts = buildVisibleTabCounts({
      itemCounts,
      appEventCount: 12
    });

    expect(counts?.activity).toBe(13);
  });
});
