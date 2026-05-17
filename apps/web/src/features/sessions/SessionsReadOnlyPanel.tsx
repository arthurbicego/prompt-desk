import { useMemo, useState } from "react";
import type { CodexItem, SessionState } from "@prompt-desk/shared";
import { Archive, CircleDot, Code2, FileJson } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { EditabilityChip, StatusChip } from "../../components/common/StatusChip";
import { cn } from "../../lib/utils";

export interface PromptDeskSessionRecord {
  item: CodexItem;
  state: Exclude<SessionState, "all">;
  title?: string;
  json: unknown;
  messageCount?: number;
  lastMessageAt?: string | null;
}

export interface SessionsReadOnlyPanelProps {
  sessions?: PromptDeskSessionRecord[];
  selectedSessionId?: string | null;
  filter?: SessionState;
  onFilterChange?: (filter: SessionState) => void;
  onSelectSession?: (session: PromptDeskSessionRecord) => void;
  className?: string;
}

export function SessionsReadOnlyPanel({
  sessions = [],
  selectedSessionId = null,
  filter,
  onFilterChange,
  onSelectSession,
  className
}: SessionsReadOnlyPanelProps) {
  const [internalFilter, setInternalFilter] = useState<SessionState>("active");
  const activeFilter = filter ?? internalFilter;
  const visibleSessions = useMemo(
    () => sessions.filter((session) => activeFilter === "all" || session.state === activeFilter),
    [activeFilter, sessions]
  );
  const selected =
    visibleSessions.find((session) => session.item.id === selectedSessionId) ??
    visibleSessions[0] ??
    null;

  function changeFilter(nextFilter: SessionState) {
    setInternalFilter(nextFilter);
    onFilterChange?.(nextFilter);
  }

  return (
    <section className={cn("grid min-h-0 gap-3 lg:grid-cols-[360px_minmax(0,1fr)]", className)}>
      <div className="min-h-0 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Sessions</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">Read-only JSON conversations from Codex sessions.</p>
            </div>
            <StatusChip tone="info">Read-only</StatusChip>
          </div>
          <Tabs value={activeFilter} onValueChange={(value) => changeFilter(value as SessionState)}>
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="active">Active</TabsTrigger>
              <TabsTrigger className="flex-1" value="archived">Archived</TabsTrigger>
              <TabsTrigger className="flex-1" value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ScrollArea className="h-[520px]">
          {visibleSessions.length === 0 ? (
            <div className="p-4 text-sm leading-6 text-[var(--muted)]">No sessions match this filter.</div>
          ) : (
            visibleSessions.map((session) => (
              <button
                key={session.item.id}
                type="button"
                className={cn(
                  "grid w-full gap-2 border-b border-[var(--border)] p-3 text-left last:border-b-0 hover:bg-[var(--surface-2)]",
                  selected?.item.id === session.item.id && "bg-[var(--surface-3)]"
                )}
                onClick={() => onSelectSession?.(session)}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {session.state === "active" ? (
                    <CircleDot size={14} className="text-[var(--success)]" aria-hidden="true" />
                  ) : (
                    <Archive size={14} className="text-[var(--muted)]" aria-hidden="true" />
                  )}
                  <span className="truncate text-sm font-semibold">{session.title ?? session.item.name}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip tone={session.state === "active" ? "success" : "neutral"}>{session.state}</StatusChip>
                  <EditabilityChip state={session.item.editability} />
                  {session.messageCount !== undefined ? (
                    <StatusChip tone="neutral">{session.messageCount} messages</StatusChip>
                  ) : null}
                </div>
                <div className="truncate font-mono text-xs text-[var(--muted)]">{session.item.relativePath}</div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      <SessionJsonViewer session={selected} />
    </section>
  );
}

function SessionJsonViewer({ session }: { session: PromptDeskSessionRecord | null }) {
  if (!session) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm font-semibold">Session JSON</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Select a session to inspect its structured JSON payload.
        </p>
      </div>
    );
  }

  return (
    <article className="min-h-0 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
      <div className="grid gap-3 border-b border-[var(--border)] p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <FileJson size={15} className="text-[var(--muted)]" aria-hidden="true" />
            <h2 className="truncate text-sm font-semibold">{session.title ?? session.item.name}</h2>
            <StatusChip tone="info">JSON</StatusChip>
          </div>
          <p className="mt-1 truncate font-mono text-xs text-[var(--muted)]" title={session.item.absolutePath}>
            {session.item.absolutePath}
          </p>
        </div>
        <Button variant="secondary" size="sm" disabled>
          <Code2 size={14} />
          Read-only
        </Button>
      </div>
      <ScrollArea className="h-[520px]">
        <pre className="min-w-full whitespace-pre p-3 font-mono text-xs leading-5 text-[var(--foreground)]">
          {JSON.stringify(session.json, null, 2)}
        </pre>
      </ScrollArea>
    </article>
  );
}

export function codexItemToSessionRecord(item: CodexItem): PromptDeskSessionRecord {
  const metadataState = item.metadata.state === "archived" ? "archived" : "active";
  return {
    item,
    state: metadataState,
    title: typeof item.metadata.title === "string" ? item.metadata.title : item.name,
    json: item.metadata.sessionJson ?? item.metadata,
    messageCount: typeof item.metadata.messageCount === "number" ? item.metadata.messageCount : undefined,
    lastMessageAt: typeof item.metadata.lastMessageAt === "string" ? item.metadata.lastMessageAt : null
  };
}

