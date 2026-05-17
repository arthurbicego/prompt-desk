import type { ProjectWorktrees, WorktreeSummary } from "@prompt-desk/shared";

export function filterWorktreeProjects({
  projects,
  scopes,
  query
}: {
  projects: ProjectWorktrees[];
  scopes: string[];
  query: string;
}): ProjectWorktrees[] {
  const selectedProjectIds = new Set(
    scopes.filter((scope) => scope.startsWith("project:")).map((scope) => scope.slice("project:".length))
  );
  if (selectedProjectIds.size === 0) {
    return [];
  }

  const normalizedQuery = normalizeQuery(query);
  return projects
    .filter((group) => selectedProjectIds.has(group.project.id))
    .map((group) => {
      if (!normalizedQuery) {
        return group;
      }

      const projectMatches = matchesText(normalizedQuery, group.project.name, group.project.path, group.project.branch);
      const worktrees = projectMatches
        ? group.worktrees
        : group.worktrees.filter((worktree) => matchesWorktree(normalizedQuery, worktree));

      return { ...group, worktrees };
    })
    .filter(
      (group) =>
        !normalizedQuery ||
        matchesText(normalizedQuery, group.project.name, group.project.path, group.project.branch) ||
        group.worktrees.length > 0
    );
}

function matchesWorktree(query: string, worktree: WorktreeSummary): boolean {
  return matchesText(
    query,
    worktree.path,
    worktree.branch,
    worktree.head,
    worktree.lockedReason,
    worktree.prunableReason
  );
}

function matchesText(query: string, ...values: Array<string | null | undefined>): boolean {
  return values.some((value) => value?.toLowerCase().includes(query));
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}
