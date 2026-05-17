import type { QueryClient } from "@tanstack/react-query";
import type { AppEvent } from "@prompt-desk/shared";
import { promptDeskQueryKeys } from "./keys";

export function invalidateForPromptDeskEvent(queryClient: QueryClient, event: AppEvent): void {
  void queryClient.invalidateQueries({ queryKey: promptDeskQueryKeys.events(100) });

  switch (event.type) {
    case "backend-status":
    case "watcher-status":
    case "maintenance":
    case "error":
      void queryClient.invalidateQueries({ queryKey: promptDeskQueryKeys.bootstrap() });
      break;
    case "project-added":
    case "project-updated":
    case "project-removed":
    case "project-scanned":
    case "branch-changed":
      void queryClient.invalidateQueries({ queryKey: promptDeskQueryKeys.projects() });
      void queryClient.invalidateQueries({ queryKey: promptDeskQueryKeys.worktrees() });
      void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "counts"] });
      void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "items"] });
      break;
    case "file-created":
    case "file-changed":
    case "file-removed":
    case "config-changed":
    case "version-restored":
    case "item-deleted":
    case "trash-restored":
    case "search-reindexed":
      void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "items"] });
      void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "counts"] });
      void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "preview"] });
      void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "versions"] });
      void queryClient.invalidateQueries({ queryKey: promptDeskQueryKeys.trash() });
      break;
    case "mcp-inspected":
      void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "mcp"] });
      void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "items"] });
      break;
    default:
      void queryClient.invalidateQueries({ queryKey: promptDeskQueryKeys.all });
      break;
  }
}
