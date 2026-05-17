import type { McpServer, McpTool } from "@prompt-desk/shared";
import { AlertTriangle, Clock, Play, Server, Wrench } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { StatusChip } from "../../components/common/StatusChip";
import { cn } from "../../lib/utils";
import { redactRecord } from "./redaction";

const statusTone = {
  pending: "neutral",
  running: "info",
  succeeded: "success",
  failed: "danger",
  disabled: "warning"
} as const;

export interface McpServerToolsProps {
  servers?: McpServer[];
  tools?: McpTool[];
  busyServerId?: string | null;
  onInspectServer?: (server: McpServer) => void;
  onInspectAll?: () => void;
  className?: string;
}

export function McpServerTools({
  servers = [],
  tools = [],
  busyServerId = null,
  onInspectServer,
  onInspectAll,
  className
}: McpServerToolsProps) {
  const toolsByServer = new Map<string, McpTool[]>();
  for (const tool of tools) {
    const serverTools = toolsByServer.get(tool.serverId) ?? [];
    serverTools.push(tool);
    toolsByServer.set(tool.serverId, serverTools);
  }

  return (
    <section className={cn("overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]", className)}>
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--border)] px-3 py-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">MCP servers and tools</h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Sensitive environment values and headers are always redacted.</p>
        </div>
        <Button variant="secondary" size="sm" disabled={servers.length === 0} onClick={onInspectAll}>
          <Wrench size={14} />
          Discover all tools
        </Button>
      </div>

      {servers.length === 0 ? (
        <div className="p-4 text-sm text-[var(--muted)]">No MCP servers were parsed from config.toml.</div>
      ) : (
        <ScrollArea className="max-h-[520px]">
          <div className="grid gap-3 p-3">
            {servers.map((server) => (
              <McpServerCard
                key={server.id}
                server={server}
                tools={toolsByServer.get(server.id) ?? []}
                busy={busyServerId === server.id}
                onInspectServer={onInspectServer}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}

function McpServerCard({
  server,
  tools,
  busy,
  onInspectServer
}: {
  server: McpServer;
  tools: McpTool[];
  busy: boolean;
  onInspectServer?: (server: McpServer) => void;
}) {
  const env = redactRecord(server.env);
  const headers = redactRecord(server.headers);

  return (
    <article className="rounded-md border border-[var(--border)] bg-[var(--background)]">
      <div className="grid gap-3 border-b border-[var(--border)] p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Server size={15} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
            <h4 className="truncate text-sm font-semibold">{server.name}</h4>
            <StatusChip tone={server.disabled ? "warning" : statusTone[server.status]}>
              {server.disabled ? "Disabled" : server.status}
            </StatusChip>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
            <Badge tone="neutral" className="rounded-md">
              {server.transport}
            </Badge>
            {server.command ? <span className="font-mono">{server.command}</span> : null}
            {server.url ? <span className="font-mono">{server.url}</span> : null}
            {server.lastInspectedAt ? (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} aria-hidden="true" />
                {new Date(server.lastInspectedAt).toLocaleString("en-US")}
              </span>
            ) : null}
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={server.disabled || busy}
          onClick={() => onInspectServer?.(server)}
        >
          <Play size={14} />
          Discover tools
        </Button>
      </div>

      {server.error ? (
        <div className="border-b border-[var(--border)] px-3 py-2 text-sm text-[var(--danger)]">{server.error}</div>
      ) : null}

      <div className="grid gap-3 p-3 lg:grid-cols-2">
        <RedactedRecord title="Environment" values={env} emptyLabel="No environment entries." />
        <RedactedRecord title="Headers" values={headers} emptyLabel="No headers." />
      </div>

      <div className="border-t border-[var(--border)] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h5 className="text-xs font-semibold text-[var(--muted)]">Tools</h5>
          <StatusChip tone="neutral">{tools.length} discovered</StatusChip>
        </div>
        {tools.length === 0 ? (
          <div className="flex gap-2 rounded-md border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            Manual discovery has not cached tools for this server.
          </div>
        ) : (
          <div className="grid gap-2">
            {tools.map((tool) => (
              <div key={tool.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="truncate text-sm font-medium">{tool.name}</div>
                {tool.description ? (
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{tool.description}</p>
                ) : null}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-[var(--accent)]">Schemas</summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-[var(--surface-2)] p-2 font-mono text-xs text-[var(--muted)]">
                    {JSON.stringify({ input: tool.inputSchema, output: tool.outputSchema }, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function RedactedRecord({
  title,
  values,
  emptyLabel
}: {
  title: string;
  values: Record<string, string>;
  emptyLabel: string;
}) {
  const entries = Object.entries(values);

  return (
    <div className="min-w-0">
      <h5 className="mb-1.5 text-xs font-semibold text-[var(--muted)]">{title}</h5>
      {entries.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--border)] p-2 text-xs text-[var(--muted)]">
          {emptyLabel}
        </div>
      ) : (
        <dl className="grid gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
          {entries.map(([key, value]) => (
            <div key={key} className="grid min-w-0 grid-cols-[minmax(80px,0.35fr)_minmax(0,1fr)] gap-2">
              <dt className="truncate font-mono text-xs text-[var(--muted)]">{key}</dt>
              <dd className="truncate font-mono text-xs text-[var(--foreground)]">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

