import { GitCompare, History, RotateCcw, SquarePen } from "lucide-react";
import type { FileVersion } from "@prompt-desk/shared";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import { formatBytes, formatDateTime, shortHash } from "../items/labels";

export interface VersionHistoryProps {
  versions?: FileVersion[];
  selectedVersionId?: string | null;
  loading?: boolean;
  error?: string | null;
  readOnly?: boolean;
  onSelectVersion?: (version: FileVersion) => void;
  onCompare?: (version: FileVersion) => void;
  onOpen?: (version: FileVersion) => void;
  onRestore?: (version: FileVersion) => void;
  className?: string;
}

export function VersionHistory({
  versions = [],
  selectedVersionId,
  loading = false,
  error = null,
  readOnly = false,
  onSelectVersion,
  onCompare,
  onOpen,
  onRestore,
  className
}: VersionHistoryProps) {
  if (loading) {
    return <HistoryState title="Loading versions" body="Reading the local version index." className={className} />;
  }

  if (error) {
    return <HistoryState title="Could not load version history" body={error} className={className} />;
  }

  if (versions.length === 0) {
    return <HistoryState title="No version history" body="This item does not have local snapshots yet." className={className} />;
  }

  return (
    <section className={cn("min-w-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]", className)}>
      <div className="flex h-10 items-center gap-2 border-b border-[var(--border)] px-3">
        <History size={15} />
        <h3 className="text-sm font-semibold">Version history</h3>
      </div>
      <div className="max-h-[280px] overflow-auto">
        {versions.map((version) => (
          <div
            key={version.id}
            className={cn(
              "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[var(--border)] px-3 py-3 last:border-b-0",
              selectedVersionId === version.id && "bg-[var(--surface-2)]"
            )}
          >
            <button type="button" className="min-w-0 text-left" onClick={() => onSelectVersion?.(version)}>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium">{formatDateTime(version.createdAt)}</span>
                <Badge>{version.origin}</Badge>
                {version.protected ? <Badge tone="warning">Protected</Badge> : null}
              </div>
              <div className="mt-1 flex min-w-0 gap-3 text-xs text-[var(--muted)]">
                <span className="font-mono">{shortHash(version.hash)}</span>
                <span>{formatBytes(version.size)}</span>
              </div>
            </button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Compare with current" onClick={() => onCompare?.(version)}>
                <GitCompare size={15} />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Open historical version" onClick={() => onOpen?.(version)}>
                <SquarePen size={15} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Restore this version"
                disabled={readOnly}
                onClick={() => onRestore?.(version)}
              >
                <RotateCcw size={15} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HistoryState({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4", className)}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
    </section>
  );
}
