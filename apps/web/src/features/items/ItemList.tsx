import type { CodexItem, PromptDeskTab } from "@prompt-desk/shared";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { fallbackItems } from "./sampleData";
import { ItemRow } from "./ItemRow";

export interface ItemListProps {
  items?: CodexItem[];
  activeTab?: PromptDeskTab;
  selectedItemId?: string | null;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyBody?: string;
  onSelectItem?: (item: CodexItem) => void;
  onRevealItem?: (item: CodexItem) => void;
  onOpenItem?: (item: CodexItem) => void;
  onCopyPath?: (item: CodexItem) => void;
  onRetry?: () => void;
  className?: string;
}

export function ItemList({
  items,
  activeTab = "all",
  selectedItemId,
  loading = false,
  error = null,
  emptyTitle = "No items found",
  emptyBody = "PromptDesk did not find matching local context or configuration items for the current filters.",
  onSelectItem,
  onRevealItem,
  onOpenItem,
  onCopyPath,
  onRetry,
  className
}: ItemListProps) {
  const visibleItems = items ?? fallbackItems;

  if (loading) {
    return <ListState title="Loading items" body="Reading the local PromptDesk index." className={className} />;
  }

  if (error) {
    return <ListState title="Could not load items" body={error} actionLabel="Retry" onAction={onRetry} className={className} />;
  }

  if (visibleItems.length === 0) {
    return <ListState title={emptyTitle} body={emptyBody} className={className} />;
  }

  return (
    <section
      className={cn("overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]", className)}
      aria-label="PromptDesk items"
    >
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid h-9 grid-cols-[minmax(150px,1.4fr)_minmax(88px,0.8fr)_84px_92px_128px] items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-semibold text-[var(--muted)]">
            <span>{activeTab === "all" ? "Item and type" : "Item"}</span>
            <span>Origin</span>
            <span>Access</span>
            <span>Updated</span>
            <span className="text-right">Actions</span>
          </div>
          <div role="table">
            {visibleItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                activeTab={activeTab}
                selected={selectedItemId === item.id}
                onSelect={onSelectItem}
                onReveal={onRevealItem}
                onOpen={onOpenItem}
                onCopyPath={onCopyPath}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ListState({
  title,
  body,
  actionLabel,
  onAction,
  className
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6", className)}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{body}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}
