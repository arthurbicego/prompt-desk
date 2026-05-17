import { Copy, ExternalLink, FolderOpen, Info } from "lucide-react";
import type { CodexItem, PromptDeskTab } from "@prompt-desk/shared";
import { IconButton } from "../../components/common/IconButton";
import { Badge, type BadgeTone } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import { editabilityLabels, formatDateTime, itemScopeLabel, itemTypeLabels, shortHash } from "./labels";

export interface ItemRowProps {
  item: CodexItem;
  activeTab?: PromptDeskTab;
  selected?: boolean;
  onSelect?: (item: CodexItem) => void;
  onReveal?: (item: CodexItem) => void;
  onOpen?: (item: CodexItem) => void;
  onCopyPath?: (item: CodexItem) => void;
}

export function ItemRow({
  item,
  activeTab = "all",
  selected = false,
  onSelect,
  onReveal,
  onOpen,
  onCopyPath
}: ItemRowProps) {
  const showType = activeTab === "all";
  const editabilityTone = getEditabilityTone(item.editability);
  const canOpen = item.editability === "editable";

  return (
    <div
      className={cn(
        "grid min-h-[68px] grid-cols-[minmax(150px,1.4fr)_minmax(88px,0.8fr)_84px_92px_128px] items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-sm last:border-b-0",
        "hover:bg-[var(--surface-2)]",
        selected && "bg-[var(--surface-2)] shadow-[inset_3px_0_0_var(--accent)]"
      )}
      role="row"
      aria-selected={selected}
    >
      <button type="button" className="min-w-0 text-left" onClick={() => onSelect?.(item)}>
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-[var(--foreground)]">{item.name}</span>
          {showType ? <Badge>{itemTypeLabels[item.type]}</Badge> : null}
        </span>
        <span className="mt-1 block truncate font-mono text-xs text-[var(--muted)]" title={item.absolutePath}>
          {item.relativePath || item.absolutePath}
        </span>
      </button>

      <button type="button" className="min-w-0 text-left" onClick={() => onSelect?.(item)}>
        <span className="block truncate font-medium">{itemScopeLabel(item)}</span>
        <span className="block truncate text-xs text-[var(--muted)]">{item.origin}</span>
      </button>

      <Badge tone={editabilityTone} className="w-fit">
        {editabilityLabels[item.editability]}
      </Badge>

      <button type="button" className="min-w-0 text-left" onClick={() => onSelect?.(item)}>
        <span className="block truncate text-xs text-[var(--muted)]">{formatDateTime(item.updatedAt)}</span>
        <span className="block truncate font-mono text-[11px] text-[var(--muted-2)]">{shortHash(item.hash)}</span>
      </button>

      <div className="flex justify-end gap-1">
        <IconButton
          icon={Info}
          variant="ghost"
          size="iconSm"
          label={`Show details for ${item.name}`}
          tooltip="Show details"
          onClick={() => onSelect?.(item)}
        />
        <IconButton
          icon={Copy}
          variant="ghost"
          size="iconSm"
          label={`Copy full path for ${item.name}`}
          tooltip="Copy full path"
          onClick={() => {
            onSelect?.(item);
            onCopyPath?.(item);
          }}
        />
        <IconButton
          icon={FolderOpen}
          variant="ghost"
          size="iconSm"
          label={`Reveal ${item.name}`}
          tooltip="Reveal in Finder"
          onClick={() => {
            onSelect?.(item);
            onReveal?.(item);
          }}
        />
        <IconButton
          icon={ExternalLink}
          variant="ghost"
          size="iconSm"
          label={`Open ${item.name} in VS Code`}
          tooltip={canOpen ? "Open in VS Code" : "Only editable files can be opened in VS Code"}
          disabled={!canOpen}
          onClick={() => {
            onSelect?.(item);
            onOpen?.(item);
          }}
        />
      </div>
    </div>
  );
}

function getEditabilityTone(editability: CodexItem["editability"]): BadgeTone {
  if (editability === "editable") {
    return "success";
  }

  if (editability === "blocked" || editability === "deleted") {
    return "danger";
  }

  if (editability === "read-only") {
    return "warning";
  }

  return "info";
}
