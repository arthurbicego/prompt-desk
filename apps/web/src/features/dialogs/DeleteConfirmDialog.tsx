import type { CodexItem } from "@prompt-desk/shared";
import { ConfirmActionDialog } from "./ConfirmActionDialog";

export interface DeleteConfirmDialogProps {
  open: boolean;
  item: CodexItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ open, item, onOpenChange, onConfirm }: DeleteConfirmDialogProps) {
  const affectsInternalData = item?.editability === "internal";

  return (
    <ConfirmActionDialog
      open={open}
      title={affectsInternalData ? "Delete internal PromptDesk data" : "Delete real file"}
      description={
        item
          ? affectsInternalData
            ? `This deletes derived PromptDesk data for ${item.name}. It does not remove the source file from disk.`
            : `This moves ${item.name} to PromptDesk internal trash and marks the item as deleted. The original path is ${item.absolutePath}.`
          : "Select an item before deleting."
      }
      confirmLabel={affectsInternalData ? "Delete data" : "Move to trash"}
      destructive
      disabled={!item}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}
