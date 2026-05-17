import type { HTMLAttributes, ReactNode } from "react";
import type { EditabilityState, GitState, ItemOrigin } from "@prompt-desk/shared";
import { cn } from "../../lib/utils";
import { Badge, type BadgeTone } from "../ui/badge";

export type OperationalTone = BadgeTone;

const editabilityTone: Record<EditabilityState, BadgeTone> = {
  editable: "success",
  "read-only": "info",
  blocked: "danger",
  deleted: "warning",
  internal: "neutral"
};

const gitTone: Record<GitState, BadgeTone> = {
  clean: "success",
  dirty: "warning",
  detached: "warning",
  "not-git": "neutral",
  unknown: "neutral"
};

const originTone: Record<ItemOrigin, BadgeTone> = {
  global: "info",
  project: "success",
  plugin: "warning",
  internal: "neutral"
};

const statusLabels = {
  editable: "Editable",
  "read-only": "Read-only",
  blocked: "Blocked",
  deleted: "Deleted",
  internal: "Internal",
  clean: "Clean",
  dirty: "Dirty",
  detached: "Detached",
  "not-git": "No Git",
  unknown: "Unknown",
  global: "Global",
  project: "Project",
  plugin: "Plugin"
} as const;

export interface StatusChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: OperationalTone;
  children: ReactNode;
}

export function StatusChip({ className, tone = "neutral", children, ...props }: StatusChipProps) {
  return (
    <Badge
      tone={tone}
      className={cn("max-w-full gap-1 truncate rounded-md px-1.5 py-0 text-[11px]", className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function EditabilityChip({
  state,
  label,
  className
}: {
  state: EditabilityState;
  label?: string;
  className?: string;
}) {
  return (
    <StatusChip tone={editabilityTone[state]} className={className}>
      {label ?? statusLabels[state]}
    </StatusChip>
  );
}

export function GitStatusChip({
  state,
  className
}: {
  state: GitState;
  className?: string;
}) {
  return (
    <StatusChip tone={gitTone[state]} className={className}>
      {statusLabels[state]}
    </StatusChip>
  );
}

export function OriginChip({
  origin,
  label,
  className
}: {
  origin: ItemOrigin;
  label?: string;
  className?: string;
}) {
  return (
    <StatusChip tone={originTone[origin]} className={className}>
      {label ?? statusLabels[origin]}
    </StatusChip>
  );
}

export function CountChip({ count, className }: { count: number; className?: string }) {
  return (
    <StatusChip tone="neutral" className={cn("min-w-6 justify-center font-mono", className)}>
      {count.toLocaleString("en-US")}
    </StatusChip>
  );
}
