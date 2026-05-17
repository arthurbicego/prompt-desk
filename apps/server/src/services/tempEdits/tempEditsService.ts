import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { FileVersion } from "@prompt-desk/shared";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../util/time.js";
import { AppError } from "../../util/errors.js";
import { createId, sha256 } from "../versioning/hash.js";
import { resolvePromptDeskPaths } from "../paths/appHome.js";
import { VersionsRepository } from "../../db/repositories/versionsRepository.js";
import { VersioningService } from "../versioning/versioningService.js";
import { assertSafeEditableItem, readSafeTextFile, safeTempFilename } from "../versioning/itemSafety.js";

export type TempEditStatus = "opened" | "changed" | "applied" | "discarded";

export interface TempEdit {
  id: string;
  itemId: string;
  versionId: string;
  path: string;
  hash: string;
  status: TempEditStatus;
  createdAt: string;
  updatedAt: string;
}

interface TempEditRow {
  id: string;
  item_id: string;
  version_id: string;
  path: string;
  hash: string;
  status: TempEditStatus;
  created_at: string;
  updated_at: string;
}

function mapTempEdit(row: TempEditRow): TempEdit {
  return {
    id: row.id,
    itemId: row.item_id,
    versionId: row.version_id,
    path: row.path,
    hash: row.hash,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function openInCode(filePath: string): void {
  const child = spawn("code", ["--goto", filePath], {
    detached: true,
    stdio: "ignore",
    shell: false
  });
  child.unref();
}

export class TempEditsService {
  private readonly db = getDb();

  constructor(
    private readonly versionsRepository = new VersionsRepository(this.db),
    private readonly versioning = new VersioningService(versionsRepository)
  ) {}

  async openHistoricalVersion(itemId: string, versionId: string): Promise<TempEdit> {
    const item = this.versionsRepository.getItem(itemId);
    if (!item) {
      throw new AppError(404, "ITEM_NOT_FOUND", "Item was not found");
    }
    assertSafeEditableItem(item, "open a historical version for");

    const version = this.versioning.getVersionForItem(item.id, versionId);
    const id = createId("temp");
    const tempDir = path.join(resolvePromptDeskPaths().tempDir, "versions", id);
    await fs.mkdir(tempDir, { recursive: true });

    const tempPath = path.join(tempDir, safeTempFilename(version.path));
    await fs.writeFile(tempPath, version.content, "utf8");

    const createdAt = nowIso();
    this.db
      .prepare(
        `INSERT INTO temp_edits
          (id, item_id, version_id, path, hash, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, item.id, version.id, tempPath, version.hash, "opened", createdAt, createdAt);

    openInCode(tempPath);
    return this.getTempEdit(id);
  }

  async getTrackedTempEdit(tempEditId: string): Promise<TempEdit> {
    const tempEdit = this.getTempEdit(tempEditId);
    if (tempEdit.status === "opened" || tempEdit.status === "changed") {
      return this.refreshStatus(tempEdit);
    }
    return tempEdit;
  }

  async applyTempEdit(tempEditId: string, confirmed: boolean): Promise<{ tempEdit: TempEdit; version: FileVersion }> {
    if (!confirmed) {
      throw new AppError(400, "CONFIRMATION_REQUIRED", "Applying a temporary edit requires confirmation");
    }

    const tempEdit = await this.getTrackedTempEdit(tempEditId);
    if (tempEdit.status === "applied" || tempEdit.status === "discarded") {
      throw new AppError(409, "TEMP_EDIT_CLOSED", "Temporary edit is already closed");
    }

    const item = this.versionsRepository.getItem(tempEdit.itemId);
    if (!item) {
      throw new AppError(404, "ITEM_NOT_FOUND", "Item was not found");
    }
    assertSafeEditableItem(item, "apply a temporary edit to");

    const content = await readSafeTextFile(tempEdit.path);
    await fs.writeFile(item.absolutePath, content.content, "utf8");

    const version = this.versioning.createVersionFromContent(
      item.id,
      item.absolutePath,
      content.content,
      content.hash,
      content.size,
      "temp-edit-apply"
    );

    this.versionsRepository.replaceSearchIndex(item, content.content);
    this.versionsRepository.insertEvent("version-restored", "item", item.id, "Applied temporary edit", {
      tempEditId,
      versionId: version.id,
      path: item.absolutePath
    });

    const updated = this.updateStatus(tempEditId, content.hash, "applied");
    const { content: _content, ...publicVersion } = version;
    return { tempEdit: updated, version: publicVersion };
  }

  discardTempEdit(tempEditId: string): TempEdit {
    const tempEdit = this.getTempEdit(tempEditId);
    if (tempEdit.status === "applied") {
      throw new AppError(409, "TEMP_EDIT_APPLIED", "Applied temporary edits cannot be discarded");
    }
    return this.updateStatus(tempEdit.id, tempEdit.hash, "discarded");
  }

  private getTempEdit(tempEditId: string): TempEdit {
    const row = this.db.prepare("SELECT * FROM temp_edits WHERE id = ?").get(tempEditId) as TempEditRow | undefined;
    if (!row) {
      throw new AppError(404, "TEMP_EDIT_NOT_FOUND", "Temporary edit was not found");
    }
    return mapTempEdit(row);
  }

  private async refreshStatus(tempEdit: TempEdit): Promise<TempEdit> {
    const buffer = await fs.readFile(tempEdit.path);
    const hash = sha256(buffer);
    if (hash === tempEdit.hash) {
      return tempEdit;
    }
    return this.updateStatus(tempEdit.id, hash, "changed");
  }

  private updateStatus(tempEditId: string, hash: string, status: TempEditStatus): TempEdit {
    this.db
      .prepare("UPDATE temp_edits SET hash = ?, status = ?, updated_at = ? WHERE id = ?")
      .run(hash, status, nowIso(), tempEditId);
    return this.getTempEdit(tempEditId);
  }
}
