import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getDb } from "../../db/connection.js";
import { ItemsRepository } from "../../db/repositories/itemsRepository.js";
import {
  isIgnoredRelativePath,
  toRelativePath,
  type ClassificationContext,
  type ScanScope
} from "../../domain/items/itemPolicy.js";
import { classifyItemPath, isPathCandidate } from "../files/itemClassifier.js";
import { inspectFileSafety } from "../files/fileSafety.js";
import { SearchService } from "../search/searchService.js";
import { fileExists, walkFiles } from "./fileWalker.js";

export interface ProjectScanTarget {
  id: string;
  name: string;
  path: string;
}

export interface ScanResult {
  rootPath: string;
  scanned: number;
  indexed: number;
  missing: number;
}

export class ScannerService {
  constructor(
    private readonly itemsRepository = new ItemsRepository(),
    private readonly searchService = new SearchService()
  ) {}

  async scanGlobal(codexHome: string): Promise<ScanResult> {
    const rootPath = path.resolve(codexHome);
    const context: ClassificationContext = { scope: "global", rootPath };
    const candidates = await collectGlobalCandidates(rootPath);
    return this.scanCandidates(rootPath, candidates, context);
  }

  async scanProject(project: ProjectScanTarget): Promise<ScanResult> {
    const rootPath = path.resolve(project.path);
    const context: ClassificationContext = {
      scope: "project",
      rootPath,
      projectId: project.id,
      projectName: project.name
    };
    const candidates = await collectProjectCandidates(rootPath);
    const result = await this.scanCandidates(rootPath, candidates, context);
    getDb().prepare("UPDATE projects SET last_scanned_at = ?, updated_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      new Date().toISOString(),
      project.id
    );
    return result;
  }

  async scanRegisteredProjects(): Promise<ScanResult[]> {
    const rows = getDb()
      .prepare("SELECT id, name, path FROM projects WHERE status = 'active' ORDER BY name ASC")
      .all() as ProjectScanTarget[];
    const results: ScanResult[] = [];
    for (const row of rows) results.push(await this.scanProject(row));
    return results;
  }

  async scanSinglePath(absolutePath: string, context: ClassificationContext): Promise<boolean> {
    const safety = await inspectFileSafety(absolutePath);
    const classification = await classifyItemPath(absolutePath, context, { safety });
    if (!classification) return false;
    const hash = classification.safeToRead ? await hashFile(absolutePath) : null;
    const item = this.itemsRepository.upsertDetectedItem({
      ...classification,
      hash,
      size: safety.size,
      mtimeMs: safety.mtimeMs
    });
    await this.searchService.indexItem(item);
    return true;
  }

  markMissing(absolutePath: string): void {
    const item = this.itemsRepository.markMissingByAbsolutePath(path.resolve(absolutePath));
    if (item) this.searchService.removeItem(item.id);
  }

  private async scanCandidates(
    rootPath: string,
    candidates: Set<string>,
    context: ClassificationContext
  ): Promise<ScanResult> {
    const seen = new Set<string>();
    let scanned = 0;
    let indexed = 0;

    for (const candidate of candidates) {
      const safety = await inspectFileSafety(candidate);
      const classification = await classifyItemPath(candidate, context, { safety });
      if (!classification) continue;
      seen.add(classification.absolutePath);
      const hash = classification.safeToRead ? await hashFile(candidate) : null;
      const item = this.itemsRepository.upsertDetectedItem({
        ...classification,
        hash,
        size: safety.size,
        mtimeMs: safety.mtimeMs
      });
      scanned += 1;
      if (classification.safeToIndex) {
        await this.searchService.indexItem(item);
        indexed += 1;
      } else {
        this.searchService.removeItem(item.id);
      }
    }

    const missing = this.itemsRepository.markMissingOutsideSeen(rootPath, seen, context.projectId ?? null);
    return { rootPath, scanned, indexed, missing };
  }
}

export async function collectGlobalCandidates(rootPath: string): Promise<Set<string>> {
  const candidates = new Set<string>();
  for (const file of ["AGENTS.md", "config.toml", "hooks.json", "auth.json", "session_index.jsonl", "history.jsonl"]) {
    const absolutePath = path.join(rootPath, file);
    if (await fileExists(absolutePath)) candidates.add(absolutePath);
  }

  await addWalkedCandidates(rootPath, candidates, ["skills", "plugins", "memories", "automations", "sessions", "archived_sessions"], "global");
  await addRootSqliteStateFiles(rootPath, candidates);
  return candidates;
}

export async function collectProjectCandidates(rootPath: string): Promise<Set<string>> {
  const candidates = new Set<string>();
  for await (const absolutePath of walkFiles({
    rootPath,
    scope: "project",
    include: (_absolutePath, relativePath) => {
      if (isIgnoredRelativePath(relativePath, "project")) return false;
      return path.posix.basename(relativePath) === "AGENTS.md";
    }
  })) {
    candidates.add(absolutePath);
  }

  await addWalkedCandidates(rootPath, candidates, [".codex", ".agents"], "project");
  return candidates;
}

export async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function addWalkedCandidates(
  rootPath: string,
  candidates: Set<string>,
  relativeRoots: string[],
  scope: ScanScope
): Promise<void> {
  for (const relativeRoot of relativeRoots) {
    const startPath = path.join(rootPath, relativeRoot);
    for await (const absolutePath of walkFiles({
      rootPath,
      scope,
      startPath,
      include: (_absolutePath, relativePath) => isPathCandidate(toRelativePath(rootPath, path.join(rootPath, relativePath)), scope)
    })) {
      candidates.add(absolutePath);
    }
  }
}

async function addRootSqliteStateFiles(rootPath: string, candidates: Set<string>): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(rootPath);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (/^(logs_|state_).*\.sqlite/.test(entry)) {
      const absolutePath = path.join(rootPath, entry);
      if (await fileExists(absolutePath)) candidates.add(absolutePath);
    }
  }
}
