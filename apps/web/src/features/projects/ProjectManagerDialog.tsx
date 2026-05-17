import { useMemo, useState } from "react";
import type { ProjectSummary } from "@prompt-desk/shared";
import { FolderOpen, FolderPlus, GitBranch, Pencil, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ScrollArea } from "../../components/ui/scroll-area";
import { GitStatusChip, CountChip } from "../../components/common/StatusChip";
import { cn } from "../../lib/utils";

export interface ProjectCreateDraft {
  path: string;
  name?: string;
}

export interface ProjectManagerDialogProps {
  open: boolean;
  projects?: ProjectSummary[];
  busy?: boolean;
  choosingPath?: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProject?: (project: ProjectCreateDraft) => void;
  onChooseProjectPath?: () => Promise<string | null>;
  onRenameProject?: (project: ProjectSummary, name: string) => void;
  onRemoveProject?: (project: ProjectSummary) => void;
  className?: string;
}

export function ProjectManagerDialog({
  open,
  projects = [],
  busy = false,
  choosingPath = false,
  onOpenChange,
  onAddProject,
  onChooseProjectPath,
  onRenameProject,
  onRemoveProject,
  className
}: ProjectManagerDialogProps) {
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [chooseError, setChooseError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const canAdd = path.trim().startsWith("/");
  const itemCount = useMemo(
    () => projects.reduce((total, project) => total + project.itemCount, 0),
    [projects]
  );

  function addProject() {
    if (!canAdd) {
      return;
    }
    onAddProject?.({ path: path.trim(), name: name.trim() || undefined });
    setPath("");
    setName("");
    setChooseError(null);
  }

  async function choosePath() {
    if (!onChooseProjectPath) {
      return;
    }

    setChooseError(null);
    try {
      const selectedPath = await onChooseProjectPath();
      if (selectedPath) {
        setPath(selectedPath);
      }
    } catch (error) {
      setChooseError(error instanceof Error ? error.message : "Could not open the folder picker.");
    }
  }

  function startRename(project: ProjectSummary) {
    setEditingId(project.id);
    setEditingName(project.name);
  }

  function commitRename(project: ProjectSummary) {
    const nextName = editingName.trim();
    if (nextName && nextName !== project.name) {
      onRenameProject?.(project, nextName);
    }
    setEditingId(null);
    setEditingName("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-[820px] p-0", className)}>
        <DialogHeader className="border-b border-[var(--border)] px-5 py-4">
          <DialogTitle>Projects</DialogTitle>
          <DialogDescription>
            Register project folders as filters. Removing a project only removes the PromptDesk reference.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-5 p-5">
          <section className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Add project</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">Use an absolute folder path that the backend can read.</p>
              </div>
              <FolderPlus size={18} className="text-[var(--muted)]" aria-hidden="true" />
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_220px_auto]">
              <Field label="Path">
                <Input
                  className="font-mono"
                  value={path}
                  placeholder="/Users/name/workspace/project"
                  onChange={(event) => {
                    setPath(event.target.value);
                    setChooseError(null);
                  }}
                />
              </Field>
              <Button
                className="self-end"
                variant="secondary"
                disabled={!onChooseProjectPath || choosingPath || busy}
                onClick={choosePath}
              >
                <FolderOpen size={15} />
                {choosingPath ? "Choosing" : "Choose"}
              </Button>
              <Field label="Name">
                <Input value={name} placeholder="Optional" onChange={(event) => setName(event.target.value)} />
              </Field>
              <Button className="self-end" variant="primary" disabled={!canAdd || busy} onClick={addProject}>
                Add
              </Button>
            </div>
            {chooseError ? <p className="text-sm text-[var(--danger)]">{chooseError}</p> : null}
          </section>

          <section className="min-h-0 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex h-10 items-center justify-between border-b border-[var(--border)] px-3">
              <h3 className="text-sm font-semibold">Managed projects</h3>
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <span>{projects.length} references</span>
                <CountChip count={itemCount} />
              </div>
            </div>
            <ScrollArea className="max-h-[360px]">
              {projects.length === 0 ? (
                <div className="p-5 text-sm text-[var(--muted)]">No projects registered.</div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className="grid gap-3 border-b border-[var(--border)] p-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      {editingId === project.id ? (
                        <Input
                          value={editingName}
                          autoFocus
                          onChange={(event) => setEditingName(event.target.value)}
                          onBlur={() => commitRename(project)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              commitRename(project);
                            }
                            if (event.key === "Escape") {
                              setEditingId(null);
                            }
                          }}
                        />
                      ) : (
                        <div className="truncate text-sm font-semibold">{project.name}</div>
                      )}
                      <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[var(--muted)]">
                        <GitBranch size={13} aria-hidden="true" />
                        <span className="truncate">{project.branch ?? "No branch"}</span>
                        <GitStatusChip state={project.gitState} />
                        <CountChip count={project.itemCount} />
                      </div>
                      <div className="mt-1 truncate font-mono text-xs text-[var(--muted-2)]">{project.path}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => startRename(project)}>
                        <Pencil size={14} />
                        Rename
                      </Button>
                      <Button variant="destructive" size="sm" disabled={busy} onClick={() => onRemoveProject?.(project)}>
                        <Trash2 size={14} />
                        Remove reference
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </section>
        </div>

        <DialogFooter className="border-t border-[var(--border)] px-5 py-4">
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
