import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { RestoreConflictMode, TrashItem } from "@prompt-desk/shared";
import { AppError } from "../../util/errors.js";
import { nowIso } from "../../util/time.js";
import { resolvePromptDeskPaths } from "../paths/appHome.js";
import { createId } from "../versioning/hash.js";
import { assertSafeEditableItem, readSafeTextFile } from "../versioning/itemSafety.js";
import { VersionsRepository } from "../../db/repositories/versionsRepository.js";
import { VersioningService } from "../versioning/versioningService.js";
import { TrashRepository } from "../../db/repositories/trashRepository.js";

export interface RestoreTrashRequest {
  mode: RestoreConflictMode;
  destinationPath?: string;
}

export interface TrashRestoreResult {
  restored: boolean;
  trashItem: TrashItem;
  destinationPath: string | null;
  externalTool?: {
    command: string;
    args: string[];
  };
  conflict?: {
    reason: "destination-exists" | "directory-missing";
    availableModes: RestoreConflictMode[];
  };
}

function timestampForName(date = new Date()): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+$/, "")
    .replace("T", "-");
}

function restoredName(filePath: string): string {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, `${parsed.name}.restored-${timestampForName()}${parsed.ext}`);
}

export class TrashService {
  constructor(
    private readonly trashRepository = new TrashRepository(),
    private readonly versionsRepository = new VersionsRepository(),
    private readonly versioning = new VersioningService(versionsRepository)
  ) {}

  listTrash(): TrashItem[] {
    return this.trashRepository.list();
  }

  async deleteItem(itemId: string): Promise<TrashItem> {
    const item = this.versionsRepository.getItem(itemId);
    if (!item) {
      throw new AppError(404, "ITEM_NOT_FOUND", "Item was not found");
    }
    assertSafeEditableItem(item, "delete");

    const content = await readSafeTextFile(item.absolutePath);
    this.versioning.createVersionFromContent(
      item.id,
      item.absolutePath,
      content.content,
      content.hash,
      content.size,
      "delete"
    );

    const trashId = createId("trash");
    const trashDir = path.join(resolvePromptDeskPaths().trashDir, "items", trashId);
    const trashPath = path.join(trashDir, "file");
    await fs.mkdir(trashDir, { recursive: true });

    const metadata = {
      id: trashId,
      itemId: item.id,
      originalPath: item.absolutePath,
      basename: path.basename(item.absolutePath),
      hash: content.hash,
      size: content.size,
      itemType: item.type,
      origin: item.origin,
      deletedAt: nowIso(),
      restore: {
        defaultMode: "restore-original",
        originalDirectory: path.dirname(item.absolutePath)
      }
    };

    await fs.writeFile(path.join(trashDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf8");
    await fs.rename(item.absolutePath, trashPath);

    const trashItem = this.trashRepository.create({
      id: trashId,
      itemId: item.id,
      originalPath: item.absolutePath,
      basename: path.basename(item.absolutePath),
      trashPath,
      itemType: item.type,
      origin: item.origin,
      hash: content.hash,
      size: content.size,
      metadata
    });

    this.versionsRepository.updateItemCurrent(item.id, null, null, "deleted");
    this.versionsRepository.removeSearchIndex(item.id);
    this.versionsRepository.insertEvent("item-deleted", "item", item.id, "Moved item to PromptDesk trash", {
      trashId,
      originalPath: item.absolutePath
    });

    return trashItem;
  }

  async restoreTrash(trashId: string, request: RestoreTrashRequest): Promise<TrashRestoreResult> {
    const trashItem = this.getTrashItem(trashId);

    if (request.mode === "cancel") {
      return { restored: false, trashItem, destinationPath: null };
    }

    const destinationPath = this.resolveDestinationPath(trashItem, request);
    const destinationDirectory = path.dirname(destinationPath);
    const directoryExists = await this.exists(destinationDirectory);
    if (!directoryExists) {
      if (request.mode !== "recreate-directory") {
        return {
          restored: false,
          trashItem,
          destinationPath,
          conflict: {
            reason: "directory-missing",
            availableModes: ["recreate-directory", "choose-destination", "cancel"]
          }
        };
      }
      await fs.mkdir(destinationDirectory, { recursive: true });
    }

    const destinationExists = await this.exists(destinationPath);
    if (destinationExists && request.mode === "compare") {
      const externalTool = this.openTrashDiff(trashItem.trashPath, destinationPath);
      return {
        restored: false,
        trashItem,
        destinationPath,
        externalTool,
        conflict: {
          reason: "destination-exists",
          availableModes: ["overwrite", "new-name", "choose-destination", "cancel"]
        }
      };
    }

    if (destinationExists && request.mode !== "overwrite") {
      return {
        restored: false,
        trashItem,
        destinationPath,
        conflict: {
          reason: "destination-exists",
          availableModes: ["compare", "overwrite", "new-name", "choose-destination", "cancel"]
        }
      };
    }

    if (destinationExists && trashItem.itemId) {
      const existing = await readSafeTextFile(destinationPath);
      this.versioning.createVersionFromContent(
        trashItem.itemId,
        destinationPath,
        existing.content,
        existing.hash,
        existing.size,
        "restore"
      );
    }

    await fs.rename(trashItem.trashPath, destinationPath);
    this.trashRepository.delete(trashItem.id);

    if (trashItem.itemId) {
      const restored = await readSafeTextFile(destinationPath);
      const existingItem = this.versionsRepository.getItem(trashItem.itemId);
      const relativePath = existingItem?.relativePath ?? path.basename(destinationPath);
      this.versionsRepository.updateItemPath(
        trashItem.itemId,
        destinationPath,
        destinationPath === trashItem.originalPath ? relativePath : path.basename(destinationPath),
        path.basename(destinationPath)
      );
      this.versioning.createVersionFromContent(
        trashItem.itemId,
        destinationPath,
        restored.content,
        restored.hash,
        restored.size,
        "restore"
      );

      const item = this.versionsRepository.getItem(trashItem.itemId);
      if (item) {
        this.versionsRepository.replaceSearchIndex(item, restored.content);
      }
    }

    await fs.rm(path.dirname(trashItem.trashPath), { recursive: true, force: true });
    this.versionsRepository.insertEvent("trash-restored", "trash", trashItem.id, "Restored item from PromptDesk trash", {
      destinationPath,
      itemId: trashItem.itemId
    });

    return { restored: true, trashItem, destinationPath };
  }

  async permanentlyDelete(trashId: string, confirmed: boolean): Promise<void> {
    if (!confirmed) {
      throw new AppError(400, "CONFIRMATION_REQUIRED", "Permanent trash delete requires confirmation");
    }

    const trashItem = this.getTrashItem(trashId);
    await fs.rm(path.dirname(trashItem.trashPath), { recursive: true, force: true });
    this.trashRepository.delete(trashItem.id);
    this.versionsRepository.insertEvent("maintenance", "trash", trashItem.id, "Permanently deleted trash item", {
      originalPath: trashItem.originalPath
    });
  }

  private getTrashItem(trashId: string): TrashItem {
    const trashItem = this.trashRepository.get(trashId);
    if (!trashItem) {
      throw new AppError(404, "TRASH_NOT_FOUND", "Trash item was not found");
    }
    return trashItem;
  }

  private resolveDestinationPath(trashItem: TrashItem, request: RestoreTrashRequest): string {
    if (request.mode === "choose-destination") {
      if (!request.destinationPath) {
        throw new AppError(400, "DESTINATION_REQUIRED", "Destination path is required");
      }
      return request.destinationPath;
    }

    if (request.mode === "new-name") {
      return restoredName(trashItem.originalPath);
    }

    return trashItem.originalPath;
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private openTrashDiff(trashPath: string, destinationPath: string): { command: string; args: string[] } {
    const command = "code";
    const args = ["--diff", trashPath, destinationPath];
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      shell: false
    });
    child.unref();
    return { command, args };
  }
}
