import { Router } from "express";
import { projectCreateRequestSchema, projectUpdateRequestSchema } from "@prompt-desk/shared";
import { projectsService } from "../services/projects/projectsService.js";
import { chooseProjectFolder } from "../services/projects/folderPicker.js";
import { validateBody } from "./validate.js";

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function createProjectsRouter(): Router {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      res.json({ projects: await projectsService.listProjects() });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", validateBody(projectCreateRequestSchema), async (req, res, next) => {
    try {
      const project = await projectsService.addProject(req.body);
      res.status(201).json({ project, projects: await projectsService.listProjects() });
    } catch (error) {
      next(error);
    }
  });

  router.post("/choose-folder", async (_req, res, next) => {
    try {
      res.json({ path: await chooseProjectFolder() });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", validateBody(projectUpdateRequestSchema), async (req, res, next) => {
    try {
      const project = await projectsService.updateProject(routeParam(req.params.id), req.body);
      res.json({ project, projects: await projectsService.listProjects() });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", (req, res, next) => {
    try {
      res.json(projectsService.removeProject(routeParam(req.params.id)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/git/refresh", async (req, res, next) => {
    try {
      res.json({ project: await projectsService.refreshGitStatus(routeParam(req.params.id)) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/scan", async (req, res, next) => {
    try {
      const project = await projectsService.refreshGitStatus(routeParam(req.params.id));
      res.json({ ok: true, project });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/git-status", async (req, res, next) => {
    try {
      res.json({ project: await projectsService.refreshGitStatus(routeParam(req.params.id)) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
