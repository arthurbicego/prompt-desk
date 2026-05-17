import path from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import { isIgnoredRelativePath, type ClassificationContext } from "../../domain/items/itemPolicy.js";
import { classifyType } from "../files/itemClassifier.js";
import { ScannerService, type ProjectScanTarget } from "../scanner/scanner.js";

export type WatcherEventType = "file-created" | "file-changed" | "file-removed" | "branch-changed" | "watcher-error";

export interface WatcherEvent {
  type: WatcherEventType;
  path: string;
  rootPath: string | null;
  projectId: string | null;
  message: string;
  error?: unknown;
}

export interface FileWatcherHooks {
  onEvent?: (event: WatcherEvent) => void | Promise<void>;
}

interface WatchedRoot {
  rootPath: string;
  context: ClassificationContext;
  watcher: FSWatcher;
}

export class FileWatcherService {
  private readonly watchedRoots = new Map<string, WatchedRoot>();

  constructor(
    private readonly scannerService = new ScannerService(),
    private readonly hooks: FileWatcherHooks = {}
  ) {}

  watchCodexHome(codexHome: string): FSWatcher {
    const rootPath = path.resolve(codexHome);
    return this.watchRoot({
      rootPath,
      context: { scope: "global", rootPath }
    });
  }

  watchProject(project: ProjectScanTarget): FSWatcher {
    const rootPath = path.resolve(project.path);
    return this.watchRoot({
      rootPath,
      context: { scope: "project", rootPath, projectId: project.id, projectName: project.name }
    });
  }

  async closeAll(): Promise<void> {
    const watchers = [...this.watchedRoots.values()].map((entry) => entry.watcher.close());
    this.watchedRoots.clear();
    await Promise.all(watchers);
  }

  private watchRoot(input: { rootPath: string; context: ClassificationContext }): FSWatcher {
    const existing = this.watchedRoots.get(input.rootPath);
    if (existing) return existing.watcher;

    const watcher = chokidar.watch(input.rootPath, {
      ignored: (candidatePath) => isIgnoredByWatcher(input.rootPath, candidatePath, input.context.scope),
      persistent: true,
      ignoreInitial: false,
      followSymlinks: false,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    watcher.on("add", (filePath) => {
      void this.handleFileEvent("file-created", filePath, input);
    });
    watcher.on("change", (filePath) => {
      void this.handleFileEvent(isGitRef(input.rootPath, filePath) ? "branch-changed" : "file-changed", filePath, input);
    });
    watcher.on("unlink", (filePath) => {
      void this.handleFileEvent("file-removed", filePath, input);
    });
    watcher.on("error", (error) => {
      void this.emit({
        type: "watcher-error",
        path: input.rootPath,
        rootPath: input.rootPath,
        projectId: input.context.projectId ?? null,
        message: "Watcher failed.",
        error
      });
    });

    this.watchedRoots.set(input.rootPath, { ...input, watcher });
    return watcher;
  }

  private async handleFileEvent(
    type: Exclude<WatcherEventType, "watcher-error">,
    filePath: string,
    input: { rootPath: string; context: ClassificationContext }
  ): Promise<void> {
    if (!isRelevantWatcherPath(input.rootPath, filePath, input.context.scope) && !isGitRef(input.rootPath, filePath)) {
      return;
    }

    if (type === "file-removed") this.scannerService.markMissing(filePath);
    else if (type !== "branch-changed") await this.scannerService.scanSinglePath(filePath, input.context);

    await this.emit({
      type,
      path: path.resolve(filePath),
      rootPath: input.rootPath,
      projectId: input.context.projectId ?? null,
      message: eventMessage(type)
    });
  }

  private async emit(event: WatcherEvent): Promise<void> {
    await this.hooks.onEvent?.(event);
  }
}

export function isIgnoredByWatcher(rootPath: string, candidatePath: string, scope: "global" | "project"): boolean {
  const relativePath = path.relative(rootPath, candidatePath).split(path.sep).join("/");
  if (!relativePath) return false;
  if (isGitRef(rootPath, candidatePath)) return false;
  return isIgnoredRelativePath(relativePath, scope);
}

export function isRelevantWatcherPath(rootPath: string, candidatePath: string, scope: "global" | "project"): boolean {
  const relativePath = path.relative(rootPath, candidatePath).split(path.sep).join("/");
  if (!relativePath || isIgnoredRelativePath(relativePath, scope)) return false;
  if (path.posix.basename(relativePath) === "AGENTS.md") return true;
  if (scope === "project" && (relativePath.startsWith(".codex/") || relativePath.startsWith(".agents/"))) {
    return classifyType(relativePath, scope) !== null;
  }
  if (scope === "global") return classifyType(relativePath, scope) !== null;
  return false;
}

function isGitRef(rootPath: string, candidatePath: string): boolean {
  const relativePath = path.relative(rootPath, candidatePath).split(path.sep).join("/");
  return relativePath === ".git/HEAD" || relativePath.startsWith(".git/refs/");
}

function eventMessage(type: WatcherEventType): string {
  switch (type) {
    case "file-created":
      return "File was created.";
    case "file-changed":
      return "File was changed.";
    case "file-removed":
      return "File was removed.";
    case "branch-changed":
      return "Git branch reference changed.";
    case "watcher-error":
      return "Watcher failed.";
  }
}
