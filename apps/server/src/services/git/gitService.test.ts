import { describe, expect, it } from "vitest";
import { parseWorktreePorcelain } from "./gitService.js";

describe("git worktree parser", () => {
  it("parses Git porcelain worktree output", () => {
    expect(
      parseWorktreePorcelain(`worktree /workspace/app
HEAD 1111111111111111111111111111111111111111
branch refs/heads/main

worktree /workspace/app-feature
HEAD 2222222222222222222222222222222222222222
branch refs/heads/feature/worktrees
locked needs review

worktree /workspace/app-detached
HEAD 3333333333333333333333333333333333333333
detached
prunable gitdir file points to non-existent location
`)
    ).toEqual([
      {
        path: "/workspace/app",
        head: "1111111111111111111111111111111111111111",
        branch: "main",
        isBare: false,
        isDetached: false,
        isLocked: false,
        lockedReason: null,
        isPrunable: false,
        prunableReason: null
      },
      {
        path: "/workspace/app-feature",
        head: "2222222222222222222222222222222222222222",
        branch: "feature/worktrees",
        isBare: false,
        isDetached: false,
        isLocked: true,
        lockedReason: "needs review",
        isPrunable: false,
        prunableReason: null
      },
      {
        path: "/workspace/app-detached",
        head: "3333333333333333333333333333333333333333",
        branch: null,
        isBare: false,
        isDetached: true,
        isLocked: false,
        lockedReason: null,
        isPrunable: true,
        prunableReason: "gitdir file points to non-existent location"
      }
    ]);
  });
});
