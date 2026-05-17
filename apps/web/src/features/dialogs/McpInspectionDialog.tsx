import { useState } from "react";
import type { McpServer } from "@prompt-desk/shared";
import { ConfirmActionDialog } from "./ConfirmActionDialog";

export interface McpInspectionDialogProps {
  open: boolean;
  server: McpServer | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: { confirmed: boolean; timeoutMs: number }) => void;
}

export function McpInspectionDialog({ open, server, onOpenChange, onConfirm }: McpInspectionDialogProps) {
  const [timeoutMs, setTimeoutMs] = useState(20000);

  return (
    <ConfirmActionDialog
      open={open}
      title="Inspect MCP tools"
      description={
        server
          ? `Inspecting ${server.name} may start the MCP command configured on disk, run local code, access files, use credentials, or access the network. Disabled servers cannot be inspected.`
          : "Select an MCP server before inspection."
      }
      confirmLabel="Inspect tools"
      disabled={!server || server.disabled}
      onOpenChange={onOpenChange}
      onConfirm={() => onConfirm({ confirmed: true, timeoutMs })}
    >
      <label className="grid gap-2 text-sm">
        <span className="text-[var(--muted)]">Timeout in milliseconds</span>
        <input
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3"
          type="number"
          min={1000}
          max={120000}
          step={1000}
          value={timeoutMs}
          onChange={(event) => setTimeoutMs(Number(event.currentTarget.value))}
        />
      </label>
    </ConfirmActionDialog>
  );
}
