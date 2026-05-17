import { useEffect, useMemo, useState } from "react";
import type {
  AppPreferences,
  CodexHomeResolution,
  Language,
  PromptDeskPaths,
  RestoreConflictMode,
  Theme,
  TrashItem
} from "@prompt-desk/shared";
import { LANGUAGES, RESTORE_CONFLICT_MODES, THEMES } from "@prompt-desk/shared";
import { AlertTriangle, RotateCcw, Settings2, Trash2, Wrench } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { StatusChip } from "../../components/common/StatusChip";
import { cn } from "../../lib/utils";

const languageLabels: Record<Language, string> = {
  "pt-BR": "Português (Brasil)",
  "en-US": "English (United States)",
  "es-ES": "Español (España)"
};

const restoreDecisionLabels: Record<RestoreConflictMode, string> = {
  "restore-original": "Restore original",
  compare: "Compare",
  overwrite: "Overwrite",
  "new-name": "Use new name",
  "choose-destination": "Choose destination",
  "recreate-directory": "Recreate directory",
  cancel: "Cancel"
};

export interface SettingsDialogProps {
  open: boolean;
  preferences: AppPreferences;
  paths: PromptDeskPaths;
  codexHome: CodexHomeResolution;
  trashItems?: TrashItem[];
  maintenanceBusy?: boolean;
  onOpenChange: (open: boolean) => void;
  onThemeChange?: (theme: Theme) => void;
  onLanguageChange?: (language: Language) => void;
  onCodexHomeChange?: (path: string | null) => void;
  onRetentionChange?: (versionRetention: number) => void;
  onRestoreDecisionChange?: (decision: RestoreConflictMode | null) => void;
  onRestoreTrashItem?: (item: TrashItem) => void;
  onDeleteTrashItem?: (item: TrashItem) => void;
  onEmptyTrash?: () => void;
  onRunMaintenance?: () => void;
  className?: string;
}

export function SettingsDialog({
  open,
  preferences,
  paths,
  codexHome,
  trashItems = [],
  maintenanceBusy = false,
  onOpenChange,
  onThemeChange,
  onLanguageChange,
  onCodexHomeChange,
  onRetentionChange,
  onRestoreDecisionChange,
  onRestoreTrashItem,
  onDeleteTrashItem,
  onEmptyTrash,
  onRunMaintenance,
  className
}: SettingsDialogProps) {
  const [codexHomeDraft, setCodexHomeDraft] = useState(preferences.codexHomeOverride ?? codexHome.path ?? "");
  const [retentionDraft, setRetentionDraft] = useState(String(preferences.versionRetention));
  const trashCount = trashItems.length;

  useEffect(() => {
    if (open) {
      setCodexHomeDraft(preferences.codexHomeOverride ?? codexHome.path ?? "");
      setRetentionDraft(String(preferences.versionRetention));
    }
  }, [codexHome.path, open, preferences.codexHomeOverride, preferences.versionRetention]);
  const codexHomeSource = useMemo(() => {
    if (!codexHome.valid) {
      return "Invalid";
    }
    if (codexHome.source === "CODEX_HOME") {
      return "CODEX_HOME";
    }
    return codexHome.source[0]?.toUpperCase() + codexHome.source.slice(1);
  }, [codexHome.source, codexHome.valid]);

  function commitCodexHome() {
    const trimmed = codexHomeDraft.trim();
    onCodexHomeChange?.(trimmed.length > 0 ? trimmed : null);
  }

  function commitRetention() {
    const parsed = Number.parseInt(retentionDraft, 10);
    if (Number.isFinite(parsed)) {
      onRetentionChange?.(Math.min(500, Math.max(1, parsed)));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-[880px] p-0", className)}>
        <DialogHeader className="border-b border-[var(--border)] px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 size={17} aria-hidden="true" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure local UI preferences, filesystem roots, retention, trash, and maintenance.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[min(640px,calc(100vh-176px))]">
          <div className="grid gap-5 p-5">
            <section className="grid gap-3">
              <SectionTitle title="Interface" description="Theme and language preferences used by PromptDesk." />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Theme">
                  <Select value={preferences.theme} onValueChange={(value) => onThemeChange?.(value as Theme)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {THEMES.map((theme) => (
                        <SelectItem key={theme} value={theme}>
                          {theme === "dark" ? "Dark" : "Light"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Language">
                  <Select value={preferences.language} onValueChange={(value) => onLanguageChange?.(value as Language)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((language) => (
                        <SelectItem key={language} value={language}>
                          {languageLabels[language]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </section>

            <Separator />

            <section className="grid gap-3">
              <SectionTitle title="Homes" description="PromptDesk stores app state separately from Codex files." />
              <div className="grid gap-3">
                <Field
                  label="Codex Home"
                  meta={
                    <StatusChip tone={codexHome.valid ? "success" : "danger"}>{codexHomeSource}</StatusChip>
                  }
                >
                  <div className="flex gap-2">
                    <Input
                      className="font-mono"
                      value={codexHomeDraft}
                      placeholder="/Users/name/.codex"
                      onChange={(event) => setCodexHomeDraft(event.target.value)}
                    />
                    <Button variant="secondary" onClick={commitCodexHome}>
                      Save
                    </Button>
                  </div>
                  {codexHome.error ? (
                    <p className="mt-2 text-xs leading-5 text-[var(--danger)]">{codexHome.error}</p>
                  ) : null}
                </Field>
                <Field label="PromptDesk Home">
                  <Input className="font-mono" value={paths.promptDeskHome} readOnly />
                  <div className="mt-2 grid gap-1 font-mono text-[11px] text-[var(--muted)]">
                    <span>Data: {paths.dataDir}</span>
                    <span>Trash: {paths.trashDir}</span>
                    <span>Logs: {paths.logsDir}</span>
                  </div>
                </Field>
              </div>
            </section>

            <Separator />

            <section className="grid gap-3">
              <SectionTitle title="Retention and Decisions" description="Control version retention and saved restore behavior." />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Versions retained per item">
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={retentionDraft}
                    onBlur={commitRetention}
                    onChange={(event) => setRetentionDraft(event.target.value)}
                  />
                </Field>
                <Field label="Saved restore decision">
                  <Select
                    value={preferences.restoreDecision ?? "none"}
                    onValueChange={(value) =>
                      onRestoreDecisionChange?.(value === "none" ? null : (value as RestoreConflictMode))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No saved decision</SelectItem>
                      {RESTORE_CONFLICT_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {restoreDecisionLabels[mode]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </section>

            <Separator />

            <section className="grid gap-3">
              <SectionTitle title="Trash" description="Trash entries are internal PromptDesk records and do not delete folders directly." />
              {trashCount === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">
                  Trash is empty.
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border border-[var(--border)]">
                  {trashItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-3 border-b border-[var(--border)] p-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{item.basename}</div>
                        <div className="truncate font-mono text-xs text-[var(--muted)]">{item.originalPath}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => onRestoreTrashItem?.(item)}>
                          <RotateCcw size={14} />
                          Restore
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onDeleteTrashItem?.(item)}>
                          <Trash2 size={14} />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            <section className="grid gap-3">
              <SectionTitle title="Maintenance" description="Run local maintenance tasks such as cache cleanup or index refresh." />
              <div className="rounded-md border border-[var(--warning)]/40 bg-[var(--warning-muted)] p-3 text-sm text-[var(--warning)]">
                <div className="flex gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <p className="leading-6">
                    Maintenance actions affect PromptDesk internal cache, indexes, and trash metadata only when confirmed by the backend.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-[var(--border)] px-5 py-4">
          <Button variant="destructive" disabled={trashCount === 0} onClick={onEmptyTrash}>
            <Trash2 size={14} />
            Empty trash
          </Button>
          <Button variant="secondary" disabled={maintenanceBusy} onClick={onRunMaintenance}>
            <Wrench size={14} />
            Run maintenance
          </Button>
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}

function Field({
  label,
  meta,
  children
}: {
  label: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {meta}
      </div>
      {children}
    </div>
  );
}
