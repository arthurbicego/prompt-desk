import type { TrashItem } from "@prompt-desk/shared";
import { ConfirmActionDialog } from "./ConfirmActionDialog";

export interface PermanentTrashDeleteDialogProps {
  open: boolean;
  item: TrashItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function PermanentTrashDeleteDialog({ open, item, onOpenChange, onConfirm }: PermanentTrashDeleteDialogProps) {
  return (
    <ConfirmActionDialog
      open={open}
      title="Permanently delete trash item"
      description={
        item
          ? `This permanently removes ${item.basename} from PromptDesk internal trash. The original path was ${item.originalPath}.`
          : "Select a trash item before deleting it permanently."
      }
      confirmLabel="Delete permanently"
      destructive
      disabled={!item}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}

export interface RestoreConflictDialogProps {
  open: boolean;
  item: TrashItem | null;
  reason?: "destination-exists" | "missing-directory";
  onOpenChange: (open: boolean) => void;
  onChooseCompare: () => void;
  onChooseOverwrite: () => void;
  onChooseNewName: () => void;
  onChooseDestination: () => void;
  onChooseRecreateDirectory: () => void;
}

export function RestoreConflictDialog({
  open,
  item,
  reason = "destination-exists",
  onOpenChange,
  onChooseCompare,
  onChooseOverwrite,
  onChooseNewName,
  onChooseDestination,
  onChooseRecreateDirectory
}: RestoreConflictDialogProps) {
  return (
    <ConfirmActionDialog
      open={open}
      title="Resolve restore conflict"
      description={
        item
          ? reason === "missing-directory"
            ? `The original directory for ${item.basename} is missing. Choose how PromptDesk should restore the file.`
            : `The original destination for ${item.basename} already exists. Choose how PromptDesk should continue.`
          : "Select a trash item before restoring it."
      }
      confirmLabel="Cancel restore"
      disabled={false}
      onOpenChange={onOpenChange}
      onConfirm={() => onOpenChange(false)}
    >
      <div className="grid gap-2">
        {reason === "destination-exists" ? (
          <>
            <button className="rounded-md border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]" onClick={onChooseCompare}>
              Compare before restoring
            </button>
            <button className="rounded-md border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]" onClick={onChooseOverwrite}>
              Overwrite after creating a snapshot
            </button>
            <button className="rounded-md border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]" onClick={onChooseNewName}>
              Restore with a timestamped new name
            </button>
          </>
        ) : (
          <button className="rounded-md border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]" onClick={onChooseRecreateDirectory}>
            Recreate the original directory
          </button>
        )}
        <button className="rounded-md border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]" onClick={onChooseDestination}>
          Choose another destination
        </button>
      </div>
    </ConfirmActionDialog>
  );
}
