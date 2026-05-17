import { Moon, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Settings, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton } from "../common/IconButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import {
  BackendStatusIndicator,
  type BackendStatus,
  type BackendStatusModel,
  type WatcherStatus
} from "../../features/status";

export interface TopbarProps {
  theme: "dark" | "light";
  language: string;
  watcher: WatcherStatus;
  backend?: BackendStatus;
  statusMessage?: string;
  lastStatusUpdate?: string | null;
  leftSidebarOpen?: boolean;
  rightPanelOpen?: boolean;
  onThemeChange: (theme: "dark" | "light") => void;
  onLanguageChange: (language: string) => void;
  onToggleLeftSidebar?: () => void;
  onToggleRightPanel?: () => void;
  onSettingsClick?: () => void;
}

function statusFromProps({
  backend = "ok",
  watcher,
  statusMessage,
  lastStatusUpdate
}: Pick<TopbarProps, "backend" | "watcher" | "statusMessage" | "lastStatusUpdate">): BackendStatusModel {
  return {
    backend,
    watcher,
    message: statusMessage,
    lastUpdatedAt: lastStatusUpdate
  };
}

export function Topbar({
  theme,
  language,
  watcher,
  backend,
  statusMessage,
  lastStatusUpdate,
  leftSidebarOpen = true,
  rightPanelOpen = true,
  onThemeChange,
  onLanguageChange,
  onToggleLeftSidebar,
  onToggleRightPanel,
  onSettingsClick
}: TopbarProps) {
  const { t } = useTranslation();
  const status = statusFromProps({ backend, watcher, statusMessage, lastStatusUpdate });

  return (
    <header className="flex h-[var(--topbar-height)] min-h-12 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3">
      <div className="flex min-w-0 items-center gap-3">
        {onToggleLeftSidebar ? (
          <IconButton
            icon={leftSidebarOpen ? PanelLeftClose : PanelLeftOpen}
            label={leftSidebarOpen ? "Collapse left sidebar" : "Expand left sidebar"}
            tooltip={leftSidebarOpen ? "Collapse left sidebar" : "Expand left sidebar"}
            onClick={onToggleLeftSidebar}
          />
        ) : null}
        <div className="flex min-w-0 items-baseline gap-2">
          <div className="truncate text-sm font-semibold tracking-normal">{t("appName")}</div>
          <div className="hidden truncate font-mono text-[11px] text-[var(--muted)] sm:block">
            Local workspace
          </div>
        </div>
        <BackendStatusIndicator status={status} />
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {onToggleRightPanel ? (
          <IconButton
            icon={rightPanelOpen ? PanelRightClose : PanelRightOpen}
            label={rightPanelOpen ? "Collapse detail panel" : "Expand detail panel"}
            tooltip={rightPanelOpen ? "Collapse detail panel" : "Expand detail panel"}
            onClick={onToggleRightPanel}
          />
        ) : null}
        <Select
          value={language}
          onValueChange={onLanguageChange}
        >
          <SelectTrigger aria-label="Language" className="w-[156px] max-w-[38vw]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
            <SelectItem value="en-US">English (United States)</SelectItem>
            <SelectItem value="es-ES">Español (España)</SelectItem>
          </SelectContent>
        </Select>
        <IconButton
          icon={theme === "dark" ? Moon : Sun}
          label="Toggle theme"
          tooltip={theme === "dark" ? "Dark mode active" : "Light mode active"}
          onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
        />
        <IconButton
          icon={Settings}
          label={t("settings")}
          tooltip={t("settings")}
          onClick={onSettingsClick}
        />
      </div>
    </header>
  );
}
