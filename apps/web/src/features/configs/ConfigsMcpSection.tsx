import type { CodexItem, McpServer, McpTool } from "@prompt-desk/shared";
import { AlertTriangle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { OriginChip } from "../../components/common/StatusChip";
import { McpServerTools } from "../mcp";
import { cn } from "../../lib/utils";

export interface ConfigsMcpSectionProps {
  configItem?: CodexItem | null;
  servers?: McpServer[];
  tools?: McpTool[];
  busyServerId?: string | null;
  onInspectServer?: (server: McpServer) => void;
  onInspectAll?: () => void;
  onOpenConfig?: (item: CodexItem) => void;
  className?: string;
}

export function ConfigsMcpSection({
  configItem = null,
  servers = [],
  tools = [],
  busyServerId = null,
  onInspectServer,
  onInspectAll,
  onOpenConfig,
  className
}: ConfigsMcpSectionProps) {
  return (
    <div className={cn("grid gap-3", className)}>
      <section className="rounded-md border border-[var(--warning)]/40 bg-[var(--warning-muted)] p-3 text-[var(--warning)]">
        <div className="flex gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Manual MCP inspection</h3>
            <p className="mt-1 text-sm leading-6">
              MCP tools are discovered only after explicit confirmation. PromptDesk never displays raw environment
              values, auth headers, tokens, or secrets.
            </p>
          </div>
        </div>
      </section>

      {configItem ? (
        <section className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{configItem.name}</h3>
              <OriginChip origin={configItem.origin} />
            </div>
            <p className="mt-1 truncate font-mono text-xs text-[var(--muted)]" title={configItem.absolutePath}>
              {configItem.relativePath || configItem.absolutePath}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onOpenConfig?.(configItem)}>
            Open config
          </Button>
        </section>
      ) : null}

      <McpServerTools
        servers={servers}
        tools={tools}
        busyServerId={busyServerId}
        onInspectServer={onInspectServer}
        onInspectAll={onInspectAll}
      />
    </div>
  );
}

