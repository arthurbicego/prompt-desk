import fs from "node:fs/promises";
import type { FileVersion, VersionOrigin } from "@prompt-desk/shared";
import { AppError } from "../../util/errors.js";
import { getDefaultPreferences } from "../preferences/defaults.js";
import { VersionsRepository, type FileVersionWithContent } from "../../db/repositories/versionsRepository.js";
import { assertSafeEditableItem, readSafeTextFile } from "./itemSafety.js";

export class VersioningService {
  constructor(private readonly versions = new VersionsRepository()) {}

  listVersions(itemId: string): FileVersion[] {
    if (!this.versions.getItem(itemId)) {
      throw new AppError(404, "ITEM_NOT_FOUND", "Item was not found");
    }
    return this.versions.listForItem(itemId);
  }

  getVersionForItem(itemId: string, versionId: string): FileVersionWithContent {
    const version = this.versions.getVersion(versionId, itemId);
    if (!version) {
      throw new AppError(404, "VERSION_NOT_FOUND", "Version was not found");
    }
    return version;
  }

  async snapshotItem(itemId: string, origin: VersionOrigin): Promise<FileVersionWithContent> {
    const item = this.versions.getItem(itemId);
    if (!item) {
      throw new AppError(404, "ITEM_NOT_FOUND", "Item was not found");
    }

    assertSafeEditableItem(item, "version");
    const content = await readSafeTextFile(item.absolutePath);
    const version = this.versions.createVersion(
      {
        itemId: item.id,
        path: item.absolutePath,
        content: content.content,
        hash: content.hash,
        size: content.size,
        origin
      },
      getDefaultPreferences().versionRetention
    );

    this.versions.replaceSearchIndex(item, content.content);
    return version;
  }

  async restoreVersion(itemId: string, versionId: string): Promise<FileVersion> {
    const item = this.versions.getItem(itemId);
    if (!item) {
      throw new AppError(404, "ITEM_NOT_FOUND", "Item was not found");
    }

    assertSafeEditableItem(item, "restore");
    const version = this.getVersionForItem(itemId, versionId);
    await fs.writeFile(item.absolutePath, version.content, "utf8");

    const restored = this.versions.createVersion(
      {
        itemId: item.id,
        path: item.absolutePath,
        content: version.content,
        hash: version.hash,
        size: version.size,
        origin: "restore"
      },
      getDefaultPreferences().versionRetention
    );

    this.versions.replaceSearchIndex(item, version.content);
    this.versions.insertEvent("version-restored", "item", item.id, "Restored item version", {
      versionId,
      path: item.absolutePath
    });

    const { content: _content, ...publicVersion } = restored;
    return publicVersion;
  }

  createVersionFromContent(
    itemId: string,
    filePath: string,
    content: string,
    hash: string,
    size: number,
    origin: VersionOrigin
  ): FileVersionWithContent {
    return this.versions.createVersion(
      { itemId, path: filePath, content, hash, size, origin },
      getDefaultPreferences().versionRetention
    );
  }
}
