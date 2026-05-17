import type { ProjectWorktrees, WorktreeSummary } from "@prompt-desk/shared";
import { FolderOpen, GitBranch, Lock, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { CountChip, GitStatusChip, StatusChip } from "../../components/common/StatusChip";
import { cn } from "../../lib/utils";

export interface WorktreesPanelProps {
  projects?: ProjectWorktrees[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  emptyTitle?: string;
  emptyBody?: string;
  className?: string;
}

export function WorktreesPanel({
  projects = [],
  loading = false,
  error = null,
  onRefresh,
  emptyTitle,
  emptyBody,
  className
}: WorktreesPanelProps) {
  const totalWorktrees = projects.reduce((total, project) => total + project.worktrees.length, 0);
  const linkedWorktrees = projects.reduce(
    (total, project) => total + project.worktrees.filter((worktree) => !worktree.isCurrentProject).length,
    0
  );

  if (loading) {
    return (
      <WorktreesState
        title="Loading worktrees"
        body="Reading Git worktrees for registered projects."
        className={className}
      />
    );
  }

  if (error) {
    return (
      <WorktreesState
        title="Could not load worktrees"
        body={error}
        actionLabel="Retry"
        onAction={onRefresh}
        className={className}
      />
    );
  }

  if (projects.length === 0) {
    return (
      <WorktreesState
        title={emptyTitle ?? "No projects registered"}
        body={emptyBody ?? "Add a project before reviewing its Git worktrees."}
        className={className}
      />
    );
  }

  return (
    <section className={cn("overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]", className)}>
      <div className="grid gap-3 border-b border-[var(--border)] p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Worktrees</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Git worktrees detected for registered projects.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusChip tone="neutral">{projects.length} projects</StatusChip>
            <CountChip count={totalWorktrees} />
            <StatusChip tone="info">{linkedWorktrees} linked</StatusChip>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onRefresh}>
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      <ScrollArea className="max-h-[calc(100vh-250px)]">
        <div className="divide-y divide-[var(--border)]">
          {projects.map((project) => (
            <ProjectWorktreesSection key={project.project.id} group={project} />
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}

function ProjectWorktreesSection({ group }: { group: ProjectWorktrees }) {
  const linkedCount = group.worktrees.filter((worktree) => !worktree.isCurrentProject).length;

  return (
    <section>
      <div className="grid gap-2 bg-[var(--surface-2)] p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{group.project.name}</h3>
            <GitStatusChip state={group.project.gitState} />
            {group.project.branch ? <StatusChip tone="neutral">{group.project.branch}</StatusChip> : null}
          </div>
          <div className="mt-1 truncate font-mono text-xs text-[var(--muted-2)]">{group.project.path}</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <StatusChip tone="info">{linkedCount} linked</StatusChip>
          <CountChip count={group.worktrees.length} />
        </div>
      </div>

      {group.error ? (
        <div className="p-3 text-sm text-[var(--danger)]">{group.error}</div>
      ) : group.project.gitState === "not-git" ? (
        <div className="p-3 text-sm text-[var(--muted)]">This project is not a Git repository.</div>
      ) : group.worktrees.length === 0 ? (
        <div className="p-3 text-sm text-[var(--muted)]">No worktrees found for this project.</div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {group.worktrees.map((worktree) => (
            <WorktreeRow key={worktree.id} worktree={worktree} />
          ))}
        </div>
      )}
    </section>
  );
}

function WorktreeRow({ worktree }: { worktree: WorktreeSummary }) {
  const branchLabel = worktree.isDetached ? "Detached" : worktree.branch ?? "No branch";
  const headLabel = worktree.head ? worktree.head.slice(0, 10) : "No HEAD";

  return (
    <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_minmax(140px,0.35fr)_minmax(96px,0.25fr)]">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <FolderOpen size={15} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <span className="truncate font-mono text-sm">{worktree.path}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusChip tone={worktree.isCurrentProject ? "success" : "info"}>
            {worktree.isCurrentProject ? "Current project" : "Linked worktree"}
          </StatusChip>
          {worktree.isBare ? <StatusChip tone="warning">Bare</StatusChip> : null}
          {worktree.isLocked ? (
            <StatusChip tone="warning">
              <Lock size={11} aria-hidden="true" />
              {worktree.lockedReason ?? "Locked"}
            </StatusChip>
          ) : null}
          {worktree.isPrunable ? (
            <StatusChip tone="danger">{worktree.prunableReason ?? "Prunable"}</StatusChip>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <GitBranch size={14} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <span className="truncate">{branchLabel}</span>
        </div>
      </div>

      <div className="min-w-0 font-mono text-xs text-[var(--muted)] md:text-right">{headLabel}</div>
    </div>
  );
}

function WorktreesState({
  title,
  body,
  actionLabel,
  onAction,
  className
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <section className={cn("rounded-md border border-[var(--border)] bg-[var(--surface)] p-6", className)}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{body}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}
