import { useMemo, useState } from "react";
import { ExternalLink, FolderOpen, GitCompare, RotateCcw, SquarePen, Trash2 } from "lucide-react";
import type { CodexItem, FileVersion, RestoreConflictMode } from "@prompt-desk/shared";
import { Button } from "../../components/ui/button";
import { DeleteConfirmDialog, RestoreConfirmDialog } from "../dialogs";
import { getItemActionAvailability } from "./actionAvailability";

export interface ItemActionsProps {
  item: CodexItem | null;
  selectedVersion?: FileVersion | null;
  busy?: boolean;
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
}

export function ItemActions({
  item,
  selectedVersion = null,
  busy = false,
  onOpen,
  onReveal,
  onCompare,
  onOpenVersion,
  onRestoreVersion,
  onApplyAsCurrent,
  onDelete
}: ItemActionsProps) {
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const availability = useMemo(() => getItemActionAvailability(item, selectedVersion), [item, selectedVersion]);

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Actions</h3>
        {availability.reason ? <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{availability.reason}</p> : null}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(128px,1fr))] gap-2">
        <Button className="min-w-0" disabled={!item || !availability.openInVsCode || busy} onClick={() => item && onOpen?.(item)}>
          <ExternalLink size={15} />
          <span className="truncate">Open</span>
        </Button>
        <Button className="min-w-0" variant="secondary" disabled={!item || !availability.revealInFinder || busy} onClick={() => item && onReveal?.(item)}>
          <FolderOpen size={15} />
          <span className="truncate">Reveal</span>
        </Button>
        <Button
          className="min-w-0"
          variant="secondary"
          disabled={!item || !selectedVersion || !availability.compareWithCurrent || busy}
          onClick={() => item && selectedVersion && onCompare?.(item, selectedVersion)}
        >
          <GitCompare size={15} />
          <span className="truncate">Compare</span>
        </Button>
        <Button
          className="min-w-0"
          variant="secondary"
          disabled={!item || !selectedVersion || !availability.openHistoricalVersion || busy}
          onClick={() => item && selectedVersion && onOpenVersion?.(item, selectedVersion)}
        >
          <SquarePen size={15} />
          <span className="truncate">Open version</span>
        </Button>
        <Button
          className="min-w-0"
          variant="secondary"
          disabled={!item || !selectedVersion || !availability.restoreVersion || busy}
          onClick={() => setRestoreOpen(true)}
        >
          <RotateCcw size={15} />
          <span className="truncate">Restore</span>
        </Button>
        <Button
          className="min-w-0"
          variant="destructive"
          disabled={!item || !availability.deleteItem || busy}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 size={15} />
          <span className="truncate">Delete</span>
        </Button>
      </div>
      {availability.applyAsCurrent ? (
        <Button
          className="mt-2 w-full"
          variant="primary"
          disabled={!item || !selectedVersion || busy}
          onClick={() =>
            item &&
            selectedVersion &&
            onApplyAsCurrent?.(item, selectedVersion, { mode: "overwrite", rememberDecision: false })
          }
        >
          Apply as current
        </Button>
      ) : null}
      <RestoreConfirmDialog
        open={restoreOpen}
        item={item}
        version={selectedVersion}
        onOpenChange={setRestoreOpen}
        onConfirm={(input) => {
          if (item && selectedVersion) {
            onRestoreVersion?.(item, selectedVersion, input);
          }
          setRestoreOpen(false);
        }}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        item={item}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          if (item) {
            onDelete?.(item);
          }
          setDeleteOpen(false);
        }}
      />
    </section>
  );
}
