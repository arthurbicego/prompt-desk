import type { ItemPreview } from "@prompt-desk/shared";
import { ItemsRepository } from "../../db/repositories/itemsRepository.js";
import { inspectFileSafety, readSafeTextFile } from "./fileSafety.js";

export class PreviewService {
  constructor(private readonly itemsRepository = new ItemsRepository()) {}

  async getPreview(itemId: string): Promise<ItemPreview> {
    const item = this.itemsRepository.findById(itemId);
    if (!item) {
      return {
        itemId,
        state: "missing",
        contentType: "unknown",
        content: null,
        message: "Item was not found."
      };
    }

    const safety = await inspectFileSafety(item.absolutePath);
    if (!safety.exists || item.status === "missing") {
      return {
        itemId,
        state: "missing",
        contentType: safety.contentType,
        content: null,
        message: "File is missing on disk."
      };
    }

    if (item.editability === "blocked" || !item.metadata.safeToPreview || safety.blockedReason) {
      return {
        itemId,
        state: safety.isBinary ? "binary" : "blocked",
        contentType: safety.contentType,
        content: null,
        message: item.blockedReason ?? safety.blockedReason ?? "Preview is blocked for this item."
      };
    }

    try {
      return {
        itemId,
        state: "available",
        contentType: safety.contentType,
        content: await readSafeTextFile(item.absolutePath),
        message: null
      };
    } catch (error) {
      return {
        itemId,
        state: "blocked",
        contentType: safety.contentType,
        content: null,
        message: error instanceof Error ? error.message : "Preview is blocked for this item."
      };
    }
  }
}
