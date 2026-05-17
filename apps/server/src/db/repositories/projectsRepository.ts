import type { GitState, ProjectSummary } from "@prompt-desk/shared";
import { getDb } from "../connection.js";
import { nowIso } from "../../util/time.js";

export interface ProjectRecord {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  lastScannedAt: string | null;
  status: "active" | "removed";
}

interface ProjectRow {
  id: string;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
  last_scanned_at: string | null;
  status: "active" | "removed";
  branch: string | null;
  git_state: GitState | null;
  item_count: number;
}

function mapProject(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastScannedAt: row.last_scanned_at,
    status: row.status
  };
}

function mapSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    branch: row.branch,
    gitState: row.git_state ?? "unknown",
    lastScannedAt: row.last_scanned_at,
    createdAt: row.created_at,
    itemCount: row.item_count
  };
}

export class ProjectsRepository {
  listActive(): ProjectSummary[] {
    const rows = getDb()
      .prepare(
        `SELECT
          p.id,
          p.name,
          p.path,
          p.created_at,
          p.updated_at,
          p.last_scanned_at,
          p.status,
          g.branch,
          g.state AS git_state,
          COUNT(i.id) AS item_count
        FROM projects p
        LEFT JOIN project_git_status g ON g.project_id = p.id
        LEFT JOIN codex_items i ON i.project_id = p.id AND i.status = 'current'
        WHERE p.status = 'active'
        GROUP BY p.id
        ORDER BY lower(p.name), p.path`
      )
      .all() as ProjectRow[];

    return rows.map(mapSummary);
  }

  getById(id: string): ProjectRecord | null {
    const row = getDb()
      .prepare(
        `SELECT
          p.id,
          p.name,
          p.path,
          p.created_at,
          p.updated_at,
          p.last_scanned_at,
          p.status,
          g.branch,
          g.state AS git_state,
          0 AS item_count
        FROM projects p
        LEFT JOIN project_git_status g ON g.project_id = p.id
        WHERE p.id = ?`
      )
      .get(id) as ProjectRow | undefined;
    return row ? mapProject(row) : null;
  }

  getActiveByPath(projectPath: string): ProjectRecord | null {
    const row = getDb()
      .prepare(
        `SELECT
          p.id,
          p.name,
          p.path,
          p.created_at,
          p.updated_at,
          p.last_scanned_at,
          p.status,
          g.branch,
          g.state AS git_state,
          0 AS item_count
        FROM projects p
        LEFT JOIN project_git_status g ON g.project_id = p.id
        WHERE p.path = ? AND p.status = 'active'`
      )
      .get(projectPath) as ProjectRow | undefined;
    return row ? mapProject(row) : null;
  }

  create(input: { id: string; name: string; path: string; lastScannedAt?: string | null }): ProjectRecord {
    const now = nowIso();
    getDb()
      .prepare(
        `INSERT INTO projects (id, name, path, created_at, updated_at, last_scanned_at, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')
         ON CONFLICT(path) DO UPDATE SET
           name = excluded.name,
           updated_at = excluded.updated_at,
           last_scanned_at = excluded.last_scanned_at,
           status = 'active'`
      )
      .run(input.id, input.name, input.path, now, now, input.lastScannedAt ?? null);

    const existing = this.getActiveByPath(input.path);
    if (!existing) {
      throw new Error("Project was not persisted.");
    }
    return existing;
  }

  update(id: string, patch: { name?: string; lastScannedAt?: string | null }): ProjectRecord | null {
    const current = this.getById(id);
    if (!current || current.status !== "active") return null;

    getDb()
      .prepare(
        `UPDATE projects
         SET name = ?, last_scanned_at = ?, updated_at = ?
         WHERE id = ? AND status = 'active'`
      )
      .run(patch.name ?? current.name, patch.lastScannedAt ?? current.lastScannedAt, nowIso(), id);

    return this.getById(id);
  }

  markRemoved(id: string): ProjectRecord | null {
    const current = this.getById(id);
    if (!current || current.status !== "active") return null;

    getDb()
      .prepare("UPDATE projects SET status = 'removed', updated_at = ? WHERE id = ?")
      .run(nowIso(), id);
    return { ...current, status: "removed", updatedAt: nowIso() };
  }

  saveGitStatus(projectId: string, status: { branch: string | null; state: GitState }): void {
    getDb()
      .prepare(
        `INSERT INTO project_git_status (project_id, branch, state, checked_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(project_id) DO UPDATE SET
           branch = excluded.branch,
           state = excluded.state,
           checked_at = excluded.checked_at`
      )
      .run(projectId, status.branch, status.state, nowIso());
  }

  getSummary(id: string): ProjectSummary | null {
    const row = getDb()
      .prepare(
        `SELECT
          p.id,
          p.name,
          p.path,
          p.created_at,
          p.updated_at,
          p.last_scanned_at,
          p.status,
          g.branch,
          g.state AS git_state,
          COUNT(i.id) AS item_count
        FROM projects p
        LEFT JOIN project_git_status g ON g.project_id = p.id
        LEFT JOIN codex_items i ON i.project_id = p.id AND i.status = 'current'
        WHERE p.id = ? AND p.status = 'active'
        GROUP BY p.id`
      )
      .get(id) as ProjectRow | undefined;
    return row ? mapSummary(row) : null;
  }
}

export const projectsRepository = new ProjectsRepository();
