import fs from "node:fs/promises";
import path from "node:path";
import { isIgnoredRelativePath } from "../../domain/items/itemPolicy.js";

export interface WalkOptions {
  rootPath: string;
  startPath?: string;
  include?: (absolutePath: string, relativePath: string) => boolean;
}

export async function* walkFiles(options: WalkOptions): AsyncGenerator<string> {
  const rootPath = path.resolve(options.rootPath);
  const startPath = path.resolve(options.startPath ?? rootPath);
  let entries: Array<{ name: string; path: string }>;

  try {
    entries = (await fs.readdir(startPath, { withFileTypes: true })).map((entry) => ({
      name: entry.name,
      path: path.join(startPath, entry.name)
    }));
  } catch {
    return;
  }

  for (const entry of entries) {
    const relativePath = path.relative(rootPath, entry.path).split(path.sep).join("/");
    if (isIgnoredRelativePath(relativePath)) continue;

    let stat;
    try {
      stat = await fs.lstat(entry.path);
    } catch {
      continue;
    }

    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      yield* walkFiles({ ...options, startPath: entry.path });
      continue;
    }
    if (!stat.isFile()) continue;
    if (options.include && !options.include(entry.path, relativePath)) continue;
    yield entry.path;
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}
