import { describe, expect, it } from "vitest";
import type { ProjectWorktrees, WorktreeSummary } from "@prompt-desk/shared";
import { filterWorktreeProjects } from "./worktreeFilters";

function worktree(projectId: string, projectName: string, projectPath: string, path: string, branch: string): WorktreeSummary {
  return {
    id: path,
    projectId,
    projectName,
    projectPath,
    path,
    branch,
    head: "abc123",
    isCurrentProject: branch === "main",
    isBare: false,
    isDetached: false,
    isLocked: false,
    lockedReason: null,
    isPrunable: false,
    prunableReason: null
  };
}

const projects: ProjectWorktrees[] = [
  {
    project: {
      id: "project_1",
      name: "Fixture",
      path: "/workspace/fixture",
      branch: "main",
      gitState: "dirty",
      lastScannedAt: null,
      createdAt: "2026-05-17T00:00:00.000Z",
      itemCount: 0
    },
    worktrees: [
      worktree("project_1", "Fixture", "/workspace/fixture", "/workspace/fixture", "main"),
      worktree("project_1", "Fixture", "/workspace/fixture", "/workspace/fixture-feature", "feature/search")
    ],
    error: null
  },
  {
    project: {
      id: "project_2",
      name: "Other",
      path: "/workspace/other",
      branch: "main",
      gitState: "clean",
      lastScannedAt: null,
      createdAt: "2026-05-17T00:00:00.000Z",
      itemCount: 0
    },
    worktrees: [worktree("project_2", "Other", "/workspace/other", "/workspace/other", "main")],
    error: null
  }
];

describe("worktree filters", () => {
  it("shows only worktrees from selected project scopes", () => {
    const visible = filterWorktreeProjects({
      projects,
      scopes: ["global", "project:project_1"],
      query: ""
    });

    expect(visible).toHaveLength(1);
    expect(visible[0]?.project.id).toBe("project_1");
    expect(visible[0]?.worktrees).toHaveLength(2);
  });

  it("filters visible worktrees by branch, path, or project text", () => {
    const branchMatch = filterWorktreeProjects({
      projects,
      scopes: ["project:project_1", "project:project_2"],
      query: "feature/search"
    });
    expect(branchMatch).toHaveLength(1);
    expect(branchMatch[0]?.worktrees.map((item) => item.branch)).toEqual(["feature/search"]);

    const projectMatch = filterWorktreeProjects({
      projects,
      scopes: ["project:project_1", "project:project_2"],
      query: "fixture"
    });
    expect(projectMatch[0]?.worktrees).toHaveLength(2);
  });

  it("returns no projects when no project scopes are selected", () => {
    expect(filterWorktreeProjects({ projects, scopes: ["global"], query: "" })).toEqual([]);
  });
});
