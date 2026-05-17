import type { ItemsQueryInput } from "../api";

export const promptDeskQueryKeys = {
  all: ["prompt-desk"] as const,
  bootstrap: () => [...promptDeskQueryKeys.all, "bootstrap"] as const,
  preferences: () => [...promptDeskQueryKeys.all, "preferences"] as const,
  projects: () => [...promptDeskQueryKeys.all, "projects"] as const,
  items: (input: ItemsQueryInput) => [...promptDeskQueryKeys.all, "items", input] as const,
  counts: (input: Pick<ItemsQueryInput, "tab" | "query" | "scopes" | "sessionState">) =>
    [...promptDeskQueryKeys.all, "counts", input] as const,
  preview: (itemId: string | null | undefined) => [...promptDeskQueryKeys.all, "preview", itemId] as const,
  versions: (itemId: string | null | undefined) => [...promptDeskQueryKeys.all, "versions", itemId] as const,
  mcp: (configItemId?: string) => [...promptDeskQueryKeys.all, "mcp", configItemId ?? "all"] as const,
  events: (limit: number) => [...promptDeskQueryKeys.all, "events", limit] as const,
  trash: () => [...promptDeskQueryKeys.all, "trash"] as const
};
