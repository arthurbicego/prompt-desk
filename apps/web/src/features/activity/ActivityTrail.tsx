import { useMemo, useState } from "react";
import type { AppEvent, CodexItem } from "@prompt-desk/shared";
import { Bell, FileText, History, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { OriginChip, StatusChip } from "../../components/common/StatusChip";
import { cn } from "../../lib/utils";

export type ActivitySourceFilter = "all" | "history" | "app";

export interface ActivityTrailProps {
  historyItems?: CodexItem[];
  appEvents?: AppEvent[];
  filter?: ActivitySourceFilter;
  onFilterChange?: (filter: ActivitySourceFilter) => void;
  onRefresh?: () => void;
  onSelectHistoryItem?: (item: CodexItem) => void;
  className?: string;
}

type ActivityRow =
  | { source: "history"; id: string; createdAt: string; item: CodexItem }
  | { source: "app"; id: string; createdAt: string; event: AppEvent };

export function ActivityTrail({
  historyItems = [],
  appEvents = [],
  filter,
  onFilterChange,
  onRefresh,
  onSelectHistoryItem,
  className
}: ActivityTrailProps) {
  const [internalFilter, setInternalFilter] = useState<ActivitySourceFilter>("all");
  const activeFilter = filter ?? internalFilter;
  const rows = useMemo(() => {
    const historyRows: ActivityRow[] = historyItems.map((item) => ({
      source: "history",
      id: `history:${item.id}`,
      createdAt: item.updatedAt,
      item
    }));
    const appRows: ActivityRow[] = appEvents.map((event) => ({
      source: "app",
      id: `app:${event.id}`,
      createdAt: event.createdAt,
      event
    }));
    return [...historyRows, ...appRows]
      .filter((row) => activeFilter === "all" || row.source === activeFilter)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }, [activeFilter, appEvents, historyItems]);

  function changeFilter(nextFilter: ActivitySourceFilter) {
    setInternalFilter(nextFilter);
    onFilterChange?.(nextFilter);
  }

  return (
    <section className={cn("overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]", className)}>
      <div className="grid gap-3 border-b border-[var(--border)] p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <h2 className="text-sm font-semibold">Activity</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Codex history.jsonl entries are read-only and separate from PromptDesk app events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={activeFilter} onValueChange={(value) => changeFilter(value as ActivitySourceFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="history">history.jsonl</TabsTrigger>
              <TabsTrigger value="app">App events</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="secondary" size="sm" onClick={onRefresh}>
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-[620px]">
        {rows.length === 0 ? (
          <div className="p-5 text-sm text-[var(--muted)]">No activity matches this filter.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {rows.map((row) =>
              row.source === "history" ? (
                <HistoryRow key={row.id} row={row} onSelectHistoryItem={onSelectHistoryItem} />
              ) : (
                <AppEventRow key={row.id} row={row} />
              )
            )}
          </div>
        )}
      </ScrollArea>
    </section>
  );
}

function HistoryRow({
  row,
  onSelectHistoryItem
}: {
  row: Extract<ActivityRow, { source: "history" }>;
  onSelectHistoryItem?: (item: CodexItem) => void;
}) {
  return (
    <button
      type="button"
      className="grid w-full gap-2 p-3 text-left hover:bg-[var(--surface-2)]"
      onClick={() => onSelectHistoryItem?.(row.item)}
    >
      <div className="flex min-w-0 items-center gap-2">
        <History size={15} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
        <span className="truncate text-sm font-semibold">{row.item.name}</span>
        <StatusChip tone="info">history.jsonl</StatusChip>
        <StatusChip tone="neutral">Read-only</StatusChip>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <OriginChip origin={row.item.origin} />
        <span>{formatDate(row.createdAt)}</span>
      </div>
      <div className="truncate font-mono text-xs text-[var(--muted-2)]">{row.item.relativePath}</div>
    </button>
  );
}

function AppEventRow({ row }: { row: Extract<ActivityRow, { source: "app" }> }) {
  return (
    <div className="grid gap-2 p-3">
      <div className="flex min-w-0 items-center gap-2">
        {row.event.type === "error" ? (
          <Bell size={15} className="shrink-0 text-[var(--danger)]" aria-hidden="true" />
        ) : (
          <FileText size={15} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
        )}
        <span className="truncate text-sm font-semibold">{row.event.message}</span>
        <StatusChip tone={row.event.type === "error" ? "danger" : "success"}>App event</StatusChip>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
        <span>{row.event.type}</span>
        <span>{formatDate(row.createdAt)}</span>
        {row.event.entityType ? <span>{row.event.entityType}</span> : null}
      </div>
      {Object.keys(row.event.metadata).length > 0 ? (
        <pre className="max-h-40 overflow-auto rounded-md bg-[var(--surface-2)] p-2 font-mono text-xs text-[var(--muted)]">
          {JSON.stringify(row.event.metadata, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Date(timestamp).toLocaleString("en-US");
}

