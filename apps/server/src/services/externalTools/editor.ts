import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { CodexItem } from "@prompt-desk/shared";
import { resolvePromptDeskPaths } from "../paths/appHome.js";
import { AppError } from "../../util/errors.js";
import { VersionsRepository } from "../../db/repositories/versionsRepository.js";
import { VersioningService } from "../versioning/versioningService.js";
import { assertSafeEditableItem, readSafeTextFile, safeTempFilename } from "../versioning/itemSafety.js";

export interface SpawnedExternalTool {
  command: string;
  args: string[];
}

function spawnDetached(command: string, args: string[]): SpawnedExternalTool {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    shell: false
  });
  child.unref();
  return { command, args };
}

export class ExternalToolsService {
  constructor(
    private readonly versionsRepository = new VersionsRepository(),
    private readonly versioning = new VersioningService(versionsRepository)
  ) {}

  openItem(itemId: string): SpawnedExternalTool {
    const item = this.getSafeCurrentItem(itemId, "open");
    return spawnDetached("code", ["--goto", item.absolutePath]);
  }

  async diffVersion(itemId: string, versionId: string): Promise<SpawnedExternalTool & { historicalPath: string }> {
    const item = this.getSafeCurrentItem(itemId, "diff");
    await readSafeTextFile(item.absolutePath);

    const version = this.versioning.getVersionForItem(item.id, versionId);
    const paths = resolvePromptDeskPaths();
    const diffDir = path.join(paths.tempDir, "diffs", version.id);
    await fs.mkdir(diffDir, { recursive: true });

    const historicalPath = path.join(diffDir, safeTempFilename(version.path));
    await fs.writeFile(historicalPath, version.content, "utf8");

    return {
      ...spawnDetached("code", ["--diff", historicalPath, item.absolutePath]),
      historicalPath
    };
  }

  revealItem(itemId: string): SpawnedExternalTool {
    const item = this.getSafeCurrentItem(itemId, "reveal");
    if (process.platform === "darwin") {
      return spawnDetached("open", ["-R", item.absolutePath]);
    }

    if (process.platform === "win32") {
      return spawnDetached("explorer.exe", ["/select,", item.absolutePath]);
    }

    return spawnDetached("xdg-open", [path.dirname(item.absolutePath)]);
  }

  private getSafeCurrentItem(itemId: string, action: string): CodexItem {
    const item = this.versionsRepository.getItem(itemId);
    if (!item) {
      throw new AppError(404, "ITEM_NOT_FOUND", "Item was not found");
    }
    assertSafeEditableItem(item, action);
    return item;
  }
}
