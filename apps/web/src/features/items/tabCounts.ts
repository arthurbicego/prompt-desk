import type { CountsResponse, PromptDeskTab, ProjectWorktrees } from "@prompt-desk/shared";

export type TabCounts = Partial<Record<PromptDeskTab, number>>;

export function buildVisibleTabCounts({
  itemCounts,
  visibleWorktreeProjects,
  appEventCount
}: {
  itemCounts?: CountsResponse["tabs"];
  visibleWorktreeProjects?: ProjectWorktrees[];
  appEventCount?: number;
}): TabCounts | undefined {
  if (!itemCounts && !visibleWorktreeProjects && appEventCount === undefined) {
    return undefined;
  }

  const counts: TabCounts = { ...itemCounts };

  if (visibleWorktreeProjects) {
    counts.worktree = countWorktrees(visibleWorktreeProjects);
  }

  if (appEventCount !== undefined || itemCounts?.activity !== undefined) {
    counts.activity = (itemCounts?.activity ?? 0) + (appEventCount ?? 0);
  }

  return counts;
}

export function countWorktrees(projects: ProjectWorktrees[]): number {
  return projects.reduce((total, project) => total + project.worktrees.length, 0);
}
