import type { CodexItem } from "@prompt-desk/shared";
import { ItemsRepository } from "../../db/repositories/itemsRepository.js";
import { SearchRepository } from "../../db/repositories/searchRepository.js";
import { readSafeTextFile } from "../files/fileSafety.js";

export class SearchService {
  constructor(
    private readonly searchRepository = new SearchRepository(),
    private readonly itemsRepository = new ItemsRepository()
  ) {}

  async indexItem(item: CodexItem): Promise<boolean> {
    if (!canIndex(item)) {
      this.searchRepository.remove(item.id);
      return false;
    }

    try {
      const content = await readSafeTextFile(item.absolutePath);
      this.searchRepository.upsert({
        item,
        content,
        scope: item.projectId ? `project:${item.projectId}` : item.origin
      });
      return true;
    } catch {
      this.searchRepository.remove(item.id);
      return false;
    }
  }

  removeItem(itemId: string): void {
    this.searchRepository.remove(itemId);
  }

  async reindexAll(): Promise<number> {
    this.searchRepository.clear();
    let indexed = 0;
    let offset = 0;
    const pageSize = 250;
    for (;;) {
      const page = this.itemsRepository.list({
        tab: "all",
        scopes: ["global", "all-projects"],
        sessionState: "all",
        limit: pageSize,
        offset,
        sort: "updatedAt",
        direction: "desc"
      });
      for (const item of page.items) {
        if (await this.indexItem(item)) indexed += 1;
      }
      offset += page.items.length;
      if (page.items.length < pageSize) break;
    }
    return indexed;
  }
}

function canIndex(item: CodexItem): boolean {
  if (item.status !== "current") return false;
  if (item.editability === "blocked" || item.editability === "deleted") return false;
  if (item.relativePath === "auth.json" || item.relativePath.endsWith("/auth.json")) return false;
  return Boolean(item.metadata.safeToIndex);
}
