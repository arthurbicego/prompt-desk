import { useEffect, useMemo, useState } from "react";
import type { PointerEvent } from "react";
import type { Language, PromptDeskTab, Theme } from "@prompt-desk/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ItemDetailPanel, ItemList, ItemTabs } from "../features/items";
import {
  useBootstrapQuery,
  useAppEventsQuery,
  useCountsQuery,
  useItemActionMutations,
  useItemPreviewQuery,
  useItemVersionsQuery,
  useItemsQuery,
  useMcpActionMutations,
  useMcpServersQuery,
  useProjectsQuery,
  useTrashQuery,
  useUpdatePreferencesMutation
} from "../hooks";
import { usePromptDeskEvents } from "../lib/events";
import { promptDeskApi } from "../lib/api";
import { promptDeskQueryKeys } from "../lib/query";
import { Sidebar, type SidebarProject, type SidebarScope } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { Badge } from "../components/ui/badge";
import { SettingsDialog } from "../features/settings";
import { ProjectManagerDialog, type ProjectCreateDraft } from "../features/projects";
import { ConfigsMcpSection } from "../features/configs";
import { SessionsReadOnlyPanel, codexItemToSessionRecord } from "../features/sessions";
import { ActivityTrail } from "../features/activity";
import { i18n } from "../i18n";
import { cn } from "../lib/utils";

const LEFT_PANEL_STORAGE_KEY = "promptdesk.leftPanelWidth";
const RIGHT_PANEL_STORAGE_KEY = "promptdesk.rightPanelWidth";
const LEFT_PANEL_OPEN_STORAGE_KEY = "promptdesk.leftPanelOpen";
const RIGHT_PANEL_OPEN_STORAGE_KEY = "promptdesk.rightPanelOpen";

const LEFT_PANEL_DEFAULT_WIDTH = 280;
const LEFT_PANEL_MIN_WIDTH = 240;
const LEFT_PANEL_MAX_WIDTH = 520;
const RIGHT_PANEL_DEFAULT_WIDTH = 360;
const RIGHT_PANEL_MIN_WIDTH = 300;
const RIGHT_PANEL_MAX_WIDTH = 720;

function clampPanelWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, Math.round(width)));
}

function readStoredNumber(key: string, fallback: number, minWidth: number, maxWidth: number) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedValue = Number(window.localStorage.getItem(key));
  return Number.isFinite(storedValue) ? clampPanelWidth(storedValue, minWidth, maxWidth) : fallback;
}

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedValue = window.localStorage.getItem(key);
  return storedValue === null ? fallback : storedValue === "true";
}

async function writeClipboardText(value: string) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // Fall back to the legacy copy path below.
  }

  if (typeof document === "undefined") {
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
  } catch {
    // Copy is best-effort when the browser blocks clipboard APIs.
  } finally {
    textarea.remove();
  }
}

function beginPanelResize({
  event,
  initialWidth,
  minWidth,
  maxWidth,
  direction,
  onResize
}: {
  event: PointerEvent<HTMLButtonElement>;
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  direction: "left" | "right";
  onResize: (width: number) => void;
}) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  const startX = event.clientX;
  const previousCursor = document.body.style.cursor;
  const previousUserSelect = document.body.style.userSelect;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";

  function handlePointerMove(moveEvent: globalThis.PointerEvent) {
    const delta = moveEvent.clientX - startX;
    const nextWidth = direction === "left" ? initialWidth + delta : initialWidth - delta;
    onResize(clampPanelWidth(nextWidth, minWidth, maxWidth));
  }

  function handlePointerUp() {
    document.body.style.cursor = previousCursor;
    document.body.style.userSelect = previousUserSelect;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerUp);
  }

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp, { once: true });
  window.addEventListener("pointercancel", handlePointerUp, { once: true });
}

export function App() {
  const bootstrap = useBootstrapQuery();
  const projects = useProjectsQuery();
  const updatePreferences = useUpdatePreferencesMutation();
  const events = usePromptDeskEvents();
  const queryClient = useQueryClient();

  const [theme, setTheme] = useState<Theme>(
    (window.localStorage.getItem("promptdesk.theme") as Theme | null) ?? "dark"
  );
  const [language, setLanguage] = useState<Language>(
    (window.localStorage.getItem("promptdesk.language") as Language | null) ?? "pt-BR"
  );
  const [activeTab, setActiveTab] = useState<PromptDeskTab>("agents");
  const [query, setQuery] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["global"]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(() => readStoredBoolean(LEFT_PANEL_OPEN_STORAGE_KEY, true));
  const [rightPanelOpen, setRightPanelOpen] = useState(() => readStoredBoolean(RIGHT_PANEL_OPEN_STORAGE_KEY, true));
  const [leftPanelWidth, setLeftPanelWidth] = useState(() =>
    readStoredNumber(
      LEFT_PANEL_STORAGE_KEY,
      LEFT_PANEL_DEFAULT_WIDTH,
      LEFT_PANEL_MIN_WIDTH,
      LEFT_PANEL_MAX_WIDTH
    )
  );
  const [rightPanelWidth, setRightPanelWidth] = useState(() =>
    readStoredNumber(
      RIGHT_PANEL_STORAGE_KEY,
      RIGHT_PANEL_DEFAULT_WIDTH,
      RIGHT_PANEL_MIN_WIDTH,
      RIGHT_PANEL_MAX_WIDTH
    )
  );

  const counts = useCountsQuery({
    tab: activeTab,
    query,
    scopes: selectedScopes,
    sessionState: "all"
  });
  const items = useItemsQuery({
    tab: activeTab,
    query,
    scopes: selectedScopes,
    sessionState: "all",
    limit: 150,
    sort: "updatedAt",
    direction: "desc"
  });

  const itemRows = items.data?.items ?? [];
  const selectedItem = useMemo(
    () => itemRows.find((item) => item.id === selectedItemId) ?? itemRows[0] ?? null,
    [itemRows, selectedItemId]
  );
  const preview = useItemPreviewQuery(selectedItem?.id);
  const versions = useItemVersionsQuery(selectedItem?.id);
  const itemActions = useItemActionMutations(selectedItem?.id);
  const mcp = useMcpServersQuery(selectedItem?.type === "config" ? selectedItem.id : undefined);
  const mcpActions = useMcpActionMutations();
  const trash = useTrashQuery();
  const appEvents = useAppEventsQuery(150);

  const createProject = useMutation({
    mutationFn: (input: ProjectCreateDraft) => promptDeskApi.createProject(input),
    onSuccess: () => {
      void projects.refetch();
      void counts.refetch();
      void items.refetch();
    }
  });
  const updateProject = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => promptDeskApi.updateProject(id, { name }),
    onSuccess: () => {
      void projects.refetch();
    }
  });
  const removeProject = useMutation({
    mutationFn: (id: string) => promptDeskApi.removeProject(id),
    onSuccess: () => {
      void projects.refetch();
      void counts.refetch();
      void items.refetch();
    }
  });
  const restoreTrash = useMutation({
    mutationFn: (trashId: string) =>
      promptDeskApi.restoreTrashItem(trashId, { mode: "restore-original", rememberDecision: false }),
    onSuccess: () => {
      void trash.refetch();
      void items.refetch();
      void counts.refetch();
    }
  });
  const deleteTrash = useMutation({
    mutationFn: (trashId: string) => promptDeskApi.deleteTrashItemPermanently(trashId, true),
    onSuccess: () => {
      void trash.refetch();
    }
  });

  useEffect(() => {
    const preferences = bootstrap.data?.preferences;
    if (!preferences) return;
    setTheme(preferences.theme);
    setLanguage(preferences.language);
    setActiveTab(preferences.activeTab);
    setSelectedScopes(preferences.selectedScopes.length > 0 ? preferences.selectedScopes : ["global"]);
    void i18n.changeLanguage(preferences.language);
  }, [bootstrap.data?.preferences]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    window.localStorage.setItem("promptdesk.theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("promptdesk.language", language);
    void i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem(LEFT_PANEL_OPEN_STORAGE_KEY, String(leftPanelOpen));
  }, [leftPanelOpen]);

  useEffect(() => {
    window.localStorage.setItem(RIGHT_PANEL_OPEN_STORAGE_KEY, String(rightPanelOpen));
  }, [rightPanelOpen]);

  useEffect(() => {
    window.localStorage.setItem(LEFT_PANEL_STORAGE_KEY, String(leftPanelWidth));
  }, [leftPanelWidth]);

  useEffect(() => {
    window.localStorage.setItem(RIGHT_PANEL_STORAGE_KEY, String(rightPanelWidth));
  }, [rightPanelWidth]);

  useEffect(() => {
    if (selectedItemId && !itemRows.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(itemRows[0]?.id ?? null);
    }
  }, [itemRows, selectedItemId]);

  const projectRows = projects.data?.projects ?? bootstrap.data?.projects ?? [];
  const scopeCounts = counts.data?.scopes ?? [];
  const projectCountTotal = scopeCounts
    .filter((scope) => scope.scope.startsWith("project:"))
    .reduce((total, scope) => total + scope.count, 0);

  const sidebarScopes: SidebarScope[] = [
    {
      id: "global",
      label: "Global",
      count: scopeCounts.find((scope) => scope.scope === "global")?.count ?? 0,
      selected: selectedScopes.includes("global")
    },
    {
      id: "all-projects",
      label: "All projects",
      count: projectCountTotal,
      selected: selectedScopes.includes("all-projects")
    }
  ];

  const sidebarProjects: SidebarProject[] = projectRows.map((project) => ({
    id: project.id,
    name: project.name,
    path: project.path,
    branch: project.branch,
    gitState: project.gitState,
    itemCount: scopeCounts.find((scope) => scope.scope === `project:${project.id}`)?.count ?? project.itemCount,
    selected: selectedScopes.includes(`project:${project.id}`)
  }));

  const actionBusy =
    itemActions.open.isPending ||
    itemActions.reveal.isPending ||
    itemActions.deleteItem.isPending ||
    itemActions.compareVersion.isPending ||
    itemActions.openVersion.isPending ||
    itemActions.restoreVersion.isPending ||
    itemActions.applyVersion.isPending;

  function updateTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    updatePreferences.mutate({ theme: nextTheme });
  }

  function updateLanguage(nextLanguage: string) {
    const languageValue = nextLanguage as Language;
    setLanguage(languageValue);
    updatePreferences.mutate({ language: languageValue });
  }

  function updateActiveTab(tab: PromptDeskTab) {
    setActiveTab(tab);
    setSelectedItemId(null);
    updatePreferences.mutate({ activeTab: tab });
  }

  function toggleScope(scopeId: string) {
    setSelectedScopes((current) => {
      const next = current.includes(scopeId)
        ? current.filter((scope) => scope !== scopeId)
        : [...current, scopeId];
      const normalized = next.length > 0 ? next : ["global"];
      updatePreferences.mutate({ selectedScopes: normalized });
      return normalized;
    });
  }

  function copyText(value: string) {
    void writeClipboardText(value);
  }

  function startLeftPanelResize(event: PointerEvent<HTMLButtonElement>) {
    beginPanelResize({
      event,
      initialWidth: leftPanelWidth,
      minWidth: LEFT_PANEL_MIN_WIDTH,
      maxWidth: LEFT_PANEL_MAX_WIDTH,
      direction: "left",
      onResize: setLeftPanelWidth
    });
  }

  function startRightPanelResize(event: PointerEvent<HTMLButtonElement>) {
    beginPanelResize({
      event,
      initialWidth: rightPanelWidth,
      minWidth: RIGHT_PANEL_MIN_WIDTH,
      maxWidth: RIGHT_PANEL_MAX_WIDTH,
      direction: "right",
      onResize: setRightPanelWidth
    });
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[var(--background)] text-[var(--foreground)]">
      <Topbar
        theme={theme}
        language={language}
        backend={bootstrap.isError ? "error" : "ok"}
        watcher={events.connectionState === "connected" ? "ready" : bootstrap.data?.backend.watcher ?? "starting"}
        statusMessage={events.error ?? bootstrap.data?.codexHome.error ?? undefined}
        lastStatusUpdate={events.lastEvent?.createdAt ?? null}
        leftSidebarOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onThemeChange={updateTheme}
        onLanguageChange={updateLanguage}
        onToggleLeftSidebar={() => setLeftPanelOpen((open) => !open)}
        onToggleRightPanel={() => setRightPanelOpen((open) => !open)}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {leftPanelOpen ? (
          <>
            <div
              className="min-h-0 shrink-0 max-w-[min(38vw,520px)] max-[700px]:hidden"
              style={{ width: leftPanelWidth }}
            >
              <Sidebar
                className="w-full"
                searchValue={query}
                scopes={sidebarScopes}
                projects={sidebarProjects}
                onSearchChange={setQuery}
                onToggleScope={toggleScope}
                onToggleProject={(projectId) => toggleScope(`project:${projectId}`)}
                onSelectAllProjects={() => {
                  const next = ["all-projects"];
                  setSelectedScopes(next);
                  updatePreferences.mutate({ selectedScopes: next });
                }}
                onClearScopes={() => {
                  setSelectedScopes(["global"]);
                  updatePreferences.mutate({ selectedScopes: ["global"] });
                }}
                onAddProject={() => setProjectsOpen(true)}
                onManageProjects={() => setProjectsOpen(true)}
              />
            </div>
            <PanelResizeHandle
              className="max-[700px]:hidden"
              label="Resize left sidebar"
              onPointerDown={startLeftPanelResize}
            />
          </>
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col bg-[var(--background)]">
          <ItemTabs activeTab={activeTab} counts={counts.data?.tabs} onTabChange={updateActiveTab} />

          {!bootstrap.data?.codexHome.valid ? (
            <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="warning">Codex Home</Badge>
                <span className="text-[var(--muted)]">
                  {bootstrap.data?.codexHome.error ?? "Codex Home is not configured or readable."}
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 overflow-hidden max-[900px]:flex-col">
            <section className="min-w-0 flex-1 overflow-auto p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold">PromptDesk</h1>
                  <p className="text-sm text-[var(--muted)]">
                    Inspect local Codex context, configuration, versions, and safe file actions.
                  </p>
                </div>
                <Badge tone={events.connectionState === "connected" ? "success" : "warning"}>
                  {events.connectionState}
                </Badge>
              </div>

              <ItemList
                items={itemRows}
                activeTab={activeTab}
                selectedItemId={selectedItem?.id ?? null}
                loading={items.isLoading || bootstrap.isLoading}
                error={items.error instanceof Error ? items.error.message : null}
                onSelectItem={(item) => setSelectedItemId(item.id)}
                onRevealItem={(item) => {
                  setSelectedItemId(item.id);
                  void promptDeskApi.revealItem(item.id);
                }}
                onOpenItem={(item) => {
                  setSelectedItemId(item.id);
                  void promptDeskApi.openItem(item.id);
                }}
                onCopyPath={(item) => copyText(item.absolutePath)}
                onRetry={() => void items.refetch()}
              />

              {activeTab === "config" ? (
                <ConfigsMcpSection
                  className="mt-4"
                  configItem={selectedItem?.type === "config" ? selectedItem : null}
                  servers={mcp.data?.servers ?? []}
                  tools={mcp.data?.tools ?? []}
                  busyServerId={mcpActions.inspectServer.isPending ? "busy" : null}
                  onOpenConfig={(item) => {
                    setSelectedItemId(item.id);
                    void promptDeskApi.openItem(item.id);
                  }}
                  onInspectServer={(server) => {
                    if (
                      window.confirm(
                        "Discovering MCP tools may start the MCP server command configured on disk. Continue only if you trust this configuration."
                      )
                    ) {
                      mcpActions.inspectServer.mutate({ serverId: server.id, input: { confirmed: true } });
                    }
                  }}
                  onInspectAll={() => {
                    if (
                      window.confirm(
                        "Discovering MCP tools may start MCP server commands configured on disk. Continue only if you trust these configurations."
                      )
                    ) {
                      mcpActions.inspectAll.mutate({ confirmed: true });
                    }
                  }}
                />
              ) : null}

              {activeTab === "session" ? (
                <SessionsReadOnlyPanel
                  className="mt-4"
                  sessions={itemRows.filter((item) => item.type === "session").map(codexItemToSessionRecord)}
                  selectedSessionId={selectedItem?.type === "session" ? selectedItem.id : null}
                  onSelectSession={(session) => setSelectedItemId(session.item.id)}
                />
              ) : null}

              {activeTab === "activity" ? (
                <ActivityTrail
                  className="mt-4"
                  historyItems={itemRows.filter((item) => item.type === "activity")}
                  appEvents={appEvents.data?.events ?? []}
                  onRefresh={() => {
                    void appEvents.refetch();
                    void items.refetch();
                  }}
                  onSelectHistoryItem={(item) => setSelectedItemId(item.id)}
                />
              ) : null}
            </section>

            {rightPanelOpen ? (
              <>
                <PanelResizeHandle
                  className="max-[900px]:hidden"
                  label="Resize detail panel"
                  onPointerDown={startRightPanelResize}
                />
                <div
                  className="min-h-0 shrink-0 max-w-[min(42vw,720px)] max-[900px]:h-[44vh] max-[900px]:w-full max-[900px]:max-w-none"
                  style={{ width: rightPanelWidth }}
                >
                  <ItemDetailPanel
                    className="h-full max-[900px]:border-l-0 max-[900px]:border-t"
                    item={selectedItem}
                    preview={preview.data?.preview ?? null}
                    versions={versions.data?.versions ?? []}
                    previewLoading={preview.isLoading}
                    versionsLoading={versions.isLoading}
                    previewError={preview.error instanceof Error ? preview.error.message : null}
                    versionsError={versions.error instanceof Error ? versions.error.message : null}
                    busy={actionBusy}
                    onCopyPath={copyText}
                    onCopyPreview={copyText}
                    onOpen={() => itemActions.open.mutate()}
                    onReveal={() => itemActions.reveal.mutate()}
                    onCompare={(_item, version) => itemActions.compareVersion.mutate(version.id)}
                    onOpenVersion={(_item, version) => itemActions.openVersion.mutate(version.id)}
                    onRestoreVersion={(_item, version, input) =>
                      itemActions.restoreVersion.mutate({ versionId: version.id, input })
                    }
                    onApplyAsCurrent={(_item, version, input) =>
                      itemActions.applyVersion.mutate({ versionId: version.id, input })
                    }
                    onDelete={() => itemActions.deleteItem.mutate()}
                  />
                </div>
              </>
            ) : null}
          </div>
        </main>
      </div>

      {bootstrap.data ? (
        <SettingsDialog
          open={settingsOpen}
          preferences={bootstrap.data.preferences}
          paths={bootstrap.data.paths}
          codexHome={bootstrap.data.codexHome}
          trashItems={trash.data?.items ?? []}
          maintenanceBusy={updatePreferences.isPending || restoreTrash.isPending || deleteTrash.isPending}
          onOpenChange={setSettingsOpen}
          onThemeChange={updateTheme}
          onLanguageChange={(nextLanguage) => updateLanguage(nextLanguage)}
          onCodexHomeChange={(codexHomeOverride) => {
            updatePreferences.mutate(
              { codexHomeOverride },
              {
                onSuccess: () => {
                  void bootstrap.refetch();
                  void queryClient.invalidateQueries({ queryKey: promptDeskQueryKeys.items({}) });
                }
              }
            );
          }}
          onRetentionChange={(versionRetention) => updatePreferences.mutate({ versionRetention })}
          onRestoreDecisionChange={(restoreDecision) => updatePreferences.mutate({ restoreDecision })}
          onRestoreTrashItem={(item) => restoreTrash.mutate(item.id)}
          onDeleteTrashItem={(item) => deleteTrash.mutate(item.id)}
          onEmptyTrash={() => {
            for (const item of trash.data?.items ?? []) {
              deleteTrash.mutate(item.id);
            }
          }}
          onRunMaintenance={() => {
            void items.refetch();
            void counts.refetch();
            void trash.refetch();
            void appEvents.refetch();
          }}
        />
      ) : null}

      <ProjectManagerDialog
        open={projectsOpen}
        projects={projectRows}
        busy={createProject.isPending || updateProject.isPending || removeProject.isPending}
        onOpenChange={setProjectsOpen}
        onAddProject={(project) => createProject.mutate(project)}
        onRenameProject={(project, name) => updateProject.mutate({ id: project.id, name })}
        onRemoveProject={(project) => removeProject.mutate(project.id)}
      />
    </div>
  );
}

function PanelResizeHandle({
  label,
  className,
  onPointerDown
}: {
  label: string;
  className?: string;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "group relative z-10 h-full w-2 shrink-0 cursor-col-resize touch-none bg-transparent",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]",
        className
      )}
      aria-label={label}
      onPointerDown={onPointerDown}
    >
      <span
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--border)] transition-colors group-hover:bg-[var(--accent)]"
        aria-hidden="true"
      />
      <span
        className="absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 bg-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-10"
        aria-hidden="true"
      />
    </button>
  );
}
