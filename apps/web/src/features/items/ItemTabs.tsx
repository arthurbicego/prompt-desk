import type { CountsResponse, PromptDeskTab } from "@prompt-desk/shared";
import { TABS } from "@prompt-desk/shared";
import { cn } from "../../lib/utils";
import { tabLabels } from "./labels";

export interface ItemTabsProps {
  activeTab: PromptDeskTab;
  counts?: CountsResponse["tabs"];
  onTabChange: (tab: PromptDeskTab) => void;
  className?: string;
}

export function ItemTabs({ activeTab, counts, onTabChange, className }: ItemTabsProps) {
  return (
    <div
      className={cn(
        "flex min-h-10 gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-3 pt-2",
        className
      )}
      role="tablist"
      aria-label="PromptDesk item categories"
    >
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-2 rounded-t-md border-x border-t px-3 text-sm transition-colors",
            activeTab === tab
              ? "border-[var(--border)] bg-[var(--background)] font-semibold text-[var(--foreground)]"
              : "border-transparent text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          )}
          onClick={() => onTabChange(tab)}
        >
          <span>{tabLabels[tab]}</span>
          {counts?.[tab] !== undefined ? (
            <span className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]">
              {counts[tab]}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
