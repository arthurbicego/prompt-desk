import type { AppEventType, CodexItem } from "@prompt-desk/shared";
import { eventBus } from "../events/eventBus.js";
import { ItemsRepository } from "../db/repositories/itemsRepository.js";
import { logger } from "../util/logger.js";
import { preferencesService } from "./preferences/preferencesService.js";
import { projectsService } from "./projects/projectsService.js";
import { ScannerService } from "./scanner/scanner.js";
import { VersioningService } from "./versioning/versioningService.js";
import { FileWatcherService, type WatcherEvent } from "./watchers/fileWatchers.js";

let watcherService: FileWatcherService | null = null;
let started = false;

export async function startBackgroundServices(): Promise<void> {
  if (started) return;
  started = true;

  const scanner = new ScannerService();
  const versioning = new VersioningService();
  const itemsRepository = new ItemsRepository();

  watcherService = new FileWatcherService(scanner, {
    onEvent: async (event) => {
      await handleWatcherEvent(event, itemsRepository, versioning);
    }
  });

  try {
    const settings = preferencesService.getSettingsSnapshot();
    if (!settings.codexHome.valid || !settings.codexHome.path) {
      eventBus.emitEvent({
        type: "watcher-status",
        entityType: "codex-home",
        entityId: null,
        message: "Codex Home is invalid or unreadable. Watchers are disabled.",
        metadata: { codexHome: settings.codexHome }
      });
      return;
    }

    await scanner.scanGlobal(settings.codexHome.path);
    await snapshotEditableItems(itemsRepository, versioning, "initial-scan");
    watcherService.watchCodexHome(settings.codexHome.path);

    const projects = await projectsService.listProjects();
    for (const project of projects) {
      await scanner.scanProject(project);
      watcherService.watchProject(project);
    }
    await snapshotEditableItems(itemsRepository, versioning, "initial-scan");

    eventBus.emitEvent({
      type: "watcher-status",
      entityType: "watcher",
      entityId: null,
      message: "PromptDesk scanner and watchers are ready.",
      metadata: { codexHome: settings.codexHome.path, projects: projects.length }
    });
  } catch (error) {
    logger.error("PromptDesk background startup failed", error);
    eventBus.emitEvent({
      type: "error",
      entityType: "startup",
      entityId: null,
      message: "PromptDesk background services failed to start.",
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
  }
}

export async function stopBackgroundServices(): Promise<void> {
  await watcherService?.closeAll();
  watcherService = null;
  started = false;
}

async function handleWatcherEvent(
  event: WatcherEvent,
  itemsRepository: ItemsRepository,
  versioning: VersioningService
): Promise<void> {
  const eventType = mapWatcherEventType(event.type);
  eventBus.emitEvent({
    type: eventType,
    entityType: event.projectId ? "project-file" : "global-file",
    entityId: event.projectId,
    message: event.message,
    metadata: {
      path: event.path,
      rootPath: event.rootPath,
      projectId: event.projectId,
      error: event.error instanceof Error ? event.error.message : event.error
    }
  });

  if (event.type === "branch-changed" && event.projectId) {
    await projectsService.refreshGitStatus(event.projectId);
    return;
  }

  if (event.type !== "file-created" && event.type !== "file-changed") return;

  const item = itemsRepository.findByAbsolutePath(event.path);
  if (!item || !isVersionable(item)) return;

  try {
    await versioning.snapshotItem(item.id, event.type === "file-created" ? "initial-scan" : "external-edit");
  } catch (error) {
    logger.warn("Skipping watcher version snapshot", {
      itemId: item.id,
      path: item.absolutePath,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function snapshotEditableItems(
  itemsRepository: ItemsRepository,
  versioning: VersioningService,
  origin: "initial-scan" | "external-edit"
): Promise<void> {
  let offset = 0;
  const limit = 250;

  for (;;) {
    const page = itemsRepository.list({
      tab: "all",
      scopes: ["global", "all-projects"],
      sessionState: "all",
      limit,
      offset,
      sort: "updatedAt",
      direction: "desc"
    });

    for (const item of page.items) {
      if (!isVersionable(item)) continue;
      try {
        await versioning.snapshotItem(item.id, origin);
      } catch (error) {
        logger.warn("Skipping initial version snapshot", {
          itemId: item.id,
          path: item.absolutePath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    offset += page.items.length;
    if (page.items.length < limit) break;
  }
}

function isVersionable(item: CodexItem): boolean {
  return item.status === "current" && item.editability === "editable";
}

function mapWatcherEventType(type: WatcherEvent["type"]): AppEventType {
  switch (type) {
    case "file-created":
    case "file-changed":
    case "file-removed":
    case "branch-changed":
      return type;
    case "watcher-error":
      return "error";
  }
}
