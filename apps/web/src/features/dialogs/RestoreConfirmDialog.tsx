import { useState } from "react";
import type { CodexItem, FileVersion, RestoreConflictMode } from "@prompt-desk/shared";
import { ConfirmActionDialog } from "./ConfirmActionDialog";

export interface RestoreConfirmDialogProps {
  open: boolean;
  item: CodexItem | null;
  version: FileVersion | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: { mode: RestoreConflictMode; rememberDecision: boolean }) => void;
}

export function RestoreConfirmDialog({ open, item, version, onOpenChange, onConfirm }: RestoreConfirmDialogProps) {
  const [rememberDecision, setRememberDecision] = useState(false);

  return (
    <ConfirmActionDialog
      open={open}
      title="Restore historical version"
      description={
        item && version
          ? `PromptDesk will restore ${item.name} from the ${version.origin} snapshot created at ${version.createdAt}. A new version should be recorded before overwriting current content.`
          : "Select an item and version before restoring."
      }
      confirmLabel="Restore version"
      disabled={!item || !version}
      onOpenChange={onOpenChange}
      onConfirm={() => onConfirm({ mode: "overwrite", rememberDecision })}
    >
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={rememberDecision}
          onChange={(event) => setRememberDecision(event.currentTarget.checked)}
        />
        Do not ask me again for this restore decision
      </label>
    </ConfirmActionDialog>
  );
}
