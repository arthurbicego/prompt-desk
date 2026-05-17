import { useMemo, useState } from "react";
import type { CodexItem, FileVersion, ItemPreview, RestoreConflictMode } from "@prompt-desk/shared";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import { RestoreConfirmDialog } from "../dialogs";
import { SafePreview } from "../preview";
import { VersionHistory } from "../versions";
import { ItemActions } from "./ItemActions";
import {
  editabilityLabels,
  formatBytes,
  formatDateTime,
  itemScopeLabel,
  itemTypeLabels,
  originLabels,
  shortHash
} from "./labels";

export interface ItemDetailPanelProps {
  item?: CodexItem | null;
  preview?: ItemPreview | null;
  versions?: FileVersion[];
  previewLoading?: boolean;
  versionsLoading?: boolean;
  previewError?: string | null;
  versionsError?: string | null;
  busy?: boolean;
  onCopyPath?: (path: string) => void;
  onCopyPreview?: (content: string) => void;
  onOpen?: (item: CodexItem) => void;
  onReveal?: (item: CodexItem) => void;
  onCompare?: (item: CodexItem, version: FileVersion) => void;
  onOpenVersion?: (item: CodexItem, version: FileVersion) => void;
  onRestoreVersion?: (
    item: CodexItem,
    version: FileVersion,
    input: { mode: RestoreConflictMode; rememberDecision: boolean }
  ) => void;
  onApplyAsCurrent?: (
    item: CodexItem,
    version: FileVersion,
    input: { mode: RestoreConflictMode; rememberDecision: boolean }
  ) => void;
  onDelete?: (item: CodexItem) => void;
  className?: string;
}

export function ItemDetailPanel({
  item = null,
  preview = null,
  versions = [],
  previewLoading = false,
  versionsLoading = false,
  previewError = null,
  versionsError = null,
  busy = false,
  onCopyPath,
  onCopyPreview,
  onOpen,
  onReveal,
  onCompare,
  onOpenVersion,
  onRestoreVersion,
  onApplyAsCurrent,
  onDelete,
  className
}: ItemDetailPanelProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [pendingRestoreVersion, setPendingRestoreVersion] = useState<FileVersion | null>(null);
  const selectedVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersionId) ?? versions[0] ?? null,
    [selectedVersionId, versions]
  );

  if (!item) {
    return (
      <aside className={cn("min-w-0 overflow-hidden border-l border-[var(--border)] bg-[var(--surface)] p-4", className)}>
        <h2 className="text-base font-semibold">Select an item</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Metadata, safe preview, version history, and allowed actions appear here.
        </p>
      </aside>
    );
  }

  return (
    <aside className={cn("min-w-0 overflow-y-auto overflow-x-hidden border-l border-[var(--border)] bg-[var(--background)] p-4", className)}>
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{item.name}</h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--muted)]" title={item.absolutePath}>
              {item.relativePath || item.absolutePath}
            </p>
          </div>
          <Badge className="shrink-0" tone={item.editability === "editable" ? "success" : item.editability === "blocked" ? "danger" : "warning"}>
            {editabilityLabels[item.editability]}
          </Badge>
        </div>
        {item.blockedReason ? (
          <p className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm leading-6 text-red-200 light:text-red-700">
            {item.blockedReason}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3">
        <section className="min-w-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <h3 className="mb-3 text-sm font-semibold">Metadata</h3>
          <dl className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <DetailTerm>Type</DetailTerm>
            <DetailValue>{itemTypeLabels[item.type]}</DetailValue>
            <DetailTerm>Origin</DetailTerm>
            <DetailValue>{originLabels[item.origin]}</DetailValue>
            <DetailTerm>Scope</DetailTerm>
            <DetailValue>{itemScopeLabel(item)}</DetailValue>
            <DetailTerm>Status</DetailTerm>
            <DetailValue>{item.status}</DetailValue>
            <DetailTerm>Hash</DetailTerm>
            <DetailValue className="font-mono">{shortHash(item.hash)}</DetailValue>
            <DetailTerm>Size</DetailTerm>
            <DetailValue>{formatBytes(item.size)}</DetailValue>
            <DetailTerm>Updated</DetailTerm>
            <DetailValue>{formatDateTime(item.updatedAt)}</DetailValue>
            <DetailTerm>Versioned</DetailTerm>
            <DetailValue>{formatDateTime(item.lastVersionAt)}</DetailValue>
            <DetailTerm>Full path</DetailTerm>
            <dd className="min-w-0">
              <button
                type="button"
                className="block max-w-full whitespace-normal break-all rounded text-left font-mono text-xs text-[var(--accent)] hover:underline"
                title={item.absolutePath}
                onClick={() => onCopyPath?.(item.absolutePath)}
              >
                {item.absolutePath}
              </button>
            </dd>
          </dl>
        </section>

        <ItemActions
          item={item}
          selectedVersion={selectedVersion}
          busy={busy}
          onOpen={onOpen}
          onReveal={onReveal}
          onCompare={onCompare}
          onOpenVersion={onOpenVersion}
          onRestoreVersion={onRestoreVersion}
          onApplyAsCurrent={onApplyAsCurrent}
          onDelete={onDelete}
        />

        <SafePreview
          preview={preview}
          loading={previewLoading}
          error={previewError}
          onCopy={onCopyPreview}
        />

        <VersionHistory
          versions={versions}
          selectedVersionId={selectedVersionId}
          loading={versionsLoading}
          error={versionsError}
          readOnly={item.editability !== "editable"}
          onSelectVersion={(version) => setSelectedVersionId(version.id)}
          onCompare={(version) => onCompare?.(item, version)}
          onOpen={(version) => onOpenVersion?.(item, version)}
          onRestore={(version) => {
            setSelectedVersionId(version.id);
            setPendingRestoreVersion(version);
          }}
        />
        <RestoreConfirmDialog
          open={Boolean(pendingRestoreVersion)}
          item={item}
          version={pendingRestoreVersion}
          onOpenChange={(open) => {
            if (!open) {
              setPendingRestoreVersion(null);
            }
          }}
          onConfirm={(input) => {
            if (pendingRestoreVersion) {
              onRestoreVersion?.(item, pendingRestoreVersion, input);
            }
            setPendingRestoreVersion(null);
          }}
        />
      </div>
    </aside>
  );
}

function DetailTerm({ children }: { children: string }) {
  return <dt className="text-xs font-medium text-[var(--muted)]">{children}</dt>;
}

function DetailValue({ children, className }: { children: string; className?: string }) {
  return <dd className={cn("min-w-0 truncate text-sm text-[var(--foreground)]", className)}>{children}</dd>;
}
