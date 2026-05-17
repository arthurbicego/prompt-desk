import { AlertTriangle, CheckCircle2, CircleDashed, PauseCircle, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "../../lib/utils";
import { StatusChip, type OperationalTone } from "../../components/common/StatusChip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "../../components/ui/tooltip";

export type BackendStatus = "ok" | "degraded" | "error" | "disconnected";
export type WatcherStatus = "starting" | "ready" | "error" | "disabled" | "paused" | "reindexing";

export interface BackendStatusModel {
  backend: BackendStatus;
  watcher: WatcherStatus;
  message?: string;
  lastUpdatedAt?: string | null;
}

const watcherMeta: Record<
  WatcherStatus,
  {
    label: string;
    tone: OperationalTone;
    icon: typeof CheckCircle2;
  }
> = {
  ready: { label: "Live", tone: "success", icon: CheckCircle2 },
  starting: { label: "Starting", tone: "warning", icon: CircleDashed },
  reindexing: { label: "Reindexing", tone: "info", icon: RefreshCw },
  paused: { label: "Paused", tone: "warning", icon: PauseCircle },
  disabled: { label: "Disabled", tone: "neutral", icon: PauseCircle },
  error: { label: "Watcher error", tone: "danger", icon: AlertTriangle }
};

function resolveStatus(status: BackendStatusModel) {
  if (status.backend === "disconnected") {
    return { label: "Disconnected", tone: "danger" as OperationalTone, icon: WifiOff };
  }

  if (status.backend === "error") {
    return { label: "Backend error", tone: "danger" as OperationalTone, icon: AlertTriangle };
  }

  if (status.backend === "degraded" && status.watcher === "ready") {
    return { label: "Degraded", tone: "warning" as OperationalTone, icon: AlertTriangle };
  }

  return watcherMeta[status.watcher];
}

export interface BackendStatusIndicatorProps {
  status: BackendStatusModel;
  className?: string;
}

export function BackendStatusIndicator({ status, className }: BackendStatusIndicatorProps) {
  const meta = resolveStatus(status);
  const Icon = meta.icon;
  const detail = status.message ?? "Backend and filesystem watcher status";

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex min-w-0", className)}>
            <StatusChip tone={meta.tone} className="h-6 gap-1.5 px-2">
              <Icon size={13} aria-hidden="true" />
              <span className="truncate">{meta.label}</span>
            </StatusChip>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          <div className="grid gap-1">
            <div className="font-medium">{detail}</div>
            <div className="text-[var(--muted)]">
              Backend: {status.backend}. Watcher: {status.watcher}.
            </div>
            {status.lastUpdatedAt ? (
              <div className="text-[var(--muted)]">Updated: {status.lastUpdatedAt}</div>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
