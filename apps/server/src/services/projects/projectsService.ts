import type { ProjectSummary } from "@prompt-desk/shared";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { projectCreateRequestSchema, projectUpdateRequestSchema } from "@prompt-desk/shared";
import { projectsRepository } from "../../db/repositories/projectsRepository.js";
import { eventBus } from "../../events/eventBus.js";
import { AppError } from "../../util/errors.js";
import { nowIso } from "../../util/time.js";
import { gitService } from "../git/gitService.js";

function readableDirectory(candidate: string): string {
  const resolved = path.resolve(candidate);
  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolved);
    fs.accessSync(resolved, fs.constants.R_OK);
  } catch {
    throw new AppError(400, "INVALID_PROJECT_PATH", "Project path does not exist or is not readable.");
  }

  if (!stat.isDirectory()) {
    throw new AppError(400, "INVALID_PROJECT_PATH", "Project path must be a directory.");
  }

  return fs.realpathSync(resolved);
}

function defaultProjectName(projectPath: string): string {
  return path.basename(projectPath) || projectPath;
}

export class ProjectsService {
  async listProjects(): Promise<ProjectSummary[]> {
    const projects = projectsRepository.listActive();
    await Promise.all(
      projects.map(async (project) => {
        const status = await gitService.getStatus(project.path);
        projectsRepository.saveGitStatus(project.id, status);
      })
    );
    return projectsRepository.listActive();
  }

  async addProject(input: unknown): Promise<ProjectSummary> {
    const request = projectCreateRequestSchema.parse(input);
    const projectPath = readableDirectory(request.path);
    const existing = projectsRepository.getActiveByPath(projectPath);
    if (existing) {
      throw new AppError(409, "PROJECT_ALREADY_EXISTS", "Project is already registered.");
    }
    const name = request.name?.trim();

    const project = projectsRepository.create({
      id: randomUUID(),
      name: name || defaultProjectName(projectPath),
      path: projectPath,
      lastScannedAt: nowIso()
    });
    const gitStatus = await gitService.getStatus(project.path);
    projectsRepository.saveGitStatus(project.id, gitStatus);
    const summary = projectsRepository.getSummary(project.id);
    if (!summary) {
      throw new AppError(500, "PROJECT_CREATE_FAILED", "Project was created but could not be loaded.");
    }

    eventBus.emitEvent({
      type: "project-added",
      entityType: "project",
      entityId: summary.id,
      message: `Project added: ${summary.name}.`,
      metadata: { path: summary.path, gitState: summary.gitState, branch: summary.branch }
    });
    eventBus.emitEvent({
      type: "project-scanned",
      entityType: "project",
      entityId: summary.id,
      message: `Project scan queued: ${summary.name}.`,
      metadata: { path: summary.path }
    });

    return summary;
  }

  async updateProject(id: string, input: unknown): Promise<ProjectSummary> {
    const request = projectUpdateRequestSchema.parse(input);
    const name = request.name?.trim();
    if (request.name !== undefined && !name) {
      throw new AppError(400, "INVALID_PROJECT_NAME", "Project name cannot be empty.");
    }
    const project = projectsRepository.update(id, {
      name
    });
    if (!project || project.status !== "active") {
      throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found.");
    }

    const gitStatus = await gitService.getStatus(project.path);
    projectsRepository.saveGitStatus(project.id, gitStatus);
    const summary = projectsRepository.getSummary(project.id);
    if (!summary) {
      throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found.");
    }

    eventBus.emitEvent({
      type: "project-updated",
      entityType: "project",
      entityId: summary.id,
      message: `Project updated: ${summary.name}.`,
      metadata: { path: summary.path }
    });

    return summary;
  }

  removeProject(id: string): { ok: true } {
    const project = projectsRepository.markRemoved(id);
    if (!project) {
      throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found.");
    }

    eventBus.emitEvent({
      type: "project-removed",
      entityType: "project",
      entityId: project.id,
      message: `Project removed: ${project.name}.`,
      metadata: { path: project.path }
    });

    return { ok: true };
  }

  async refreshGitStatus(id: string): Promise<ProjectSummary> {
    const project = projectsRepository.getById(id);
    if (!project || project.status !== "active") {
      throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found.");
    }

    const status = await gitService.getStatus(project.path);
    projectsRepository.saveGitStatus(project.id, status);
    const summary = projectsRepository.getSummary(project.id);
    if (!summary) {
      throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found.");
    }
    return summary;
  }
}

export const projectsService = new ProjectsService();
