import type { ReactNode } from "react";
import type { GitState } from "@prompt-desk/shared";
import { FolderPlus, GitBranch, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { CountChip, GitStatusChip } from "../common/StatusChip";
import { IconButton } from "../common/IconButton";
import { cn } from "../../lib/utils";

export interface SidebarScope {
  id: string;
  label: string;
  count: number;
  selected?: boolean;
}

export interface SidebarProject {
  id: string;
  name: string;
  path: string;
  branch: string | null;
  gitState: GitState;
  itemCount: number;
  selected?: boolean;
}

export interface SidebarProps {
  searchValue?: string;
  scopes?: SidebarScope[];
  projects?: SidebarProject[];
  className?: string;
  onSearchChange?: (value: string) => void;
  onToggleScope?: (scopeId: string) => void;
  onToggleProject?: (projectId: string) => void;
  onClearScopes?: () => void;
  onAddProject?: () => void;
  onManageProjects?: () => void;
}

function SidebarRow({
  active,
  children,
  onClick
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-[var(--surface-3)] text-[var(--foreground)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
      )}
      aria-pressed={active ? "true" : "false"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Sidebar({
  searchValue,
  scopes,
  projects = [],
  className,
  onSearchChange,
  onToggleScope,
  onToggleProject,
  onClearScopes,
  onAddProject,
  onManageProjects
}: SidebarProps) {
  const { t } = useTranslation();
  const scopeRows = scopes ?? [{ id: "global", label: t("global"), count: 0, selected: true }];
  const projectCount = projects.reduce((total, project) => total + project.itemCount, 0);

  return (
    <aside className={cn("flex h-full min-w-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]", className)}>
      <div className="border-b border-[var(--border)] p-3">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
            aria-hidden="true"
          />
          <Input
            className="h-9 pl-8 pr-8"
            placeholder={t("search")}
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
          />
          {searchValue ? (
            <IconButton
              className="absolute right-1 top-1 h-7 w-7"
              icon={X}
              label="Clear search"
              tooltip="Clear search"
              size="iconSm"
              onClick={() => onSearchChange?.("")}
            />
          ) : null}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-4 p-3">
          <section className="grid gap-1" aria-label="Scope filters">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-normal text-[var(--muted)]">
                Scope
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                  onClick={onClearScopes}
                >
                  {t("clear")}
                </button>
              </div>
            </div>

            {scopeRows.map((scope) => (
              <SidebarRow
                key={scope.id}
                active={scope.selected}
                onClick={() => onToggleScope?.(scope.id)}
              >
                <span className="truncate font-medium">{scope.label}</span>
                <CountChip count={scope.count} />
              </SidebarRow>
            ))}
          </section>

          <Separator />

          <section className="grid gap-1" aria-label="Projects">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-normal text-[var(--muted)]">
                Projects
              </div>
              <CountChip count={projectCount} />
            </div>

            {projects.length > 0 ? (
              projects.map((project) => (
                <SidebarRow
                  key={project.id}
                  active={project.selected}
                  onClick={() => onToggleProject?.(project.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-[var(--foreground)]">
                      {project.name}
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-[var(--muted)]">
                      <GitBranch size={12} aria-hidden="true" />
                      <span className="truncate">{project.branch ?? "No branch"}</span>
                      <GitStatusChip state={project.gitState} />
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-[var(--muted-2)]">
                      {project.path}
                    </span>
                  </span>
                  <CountChip count={project.itemCount} />
                </SidebarRow>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-[var(--border)] px-2 py-3 text-xs leading-5 text-[var(--muted)]">
                No projects registered.
              </div>
            )}
          </section>
        </div>
      </ScrollArea>

      <div className="flex gap-2 border-t border-[var(--border)] p-3">
        <Button variant="secondary" size="sm" className="min-w-0 flex-1" onClick={onAddProject}>
          <FolderPlus size={14} />
          <span className="truncate">{t("addProject")}</span>
        </Button>
        <IconButton
          icon={SlidersHorizontal}
          label={t("manageProjects")}
          tooltip={t("manageProjects")}
          onClick={onManageProjects}
        />
      </div>
    </aside>
  );
}
