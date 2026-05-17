import { Router } from "express";
import { VersioningService } from "../services/versioning/versioningService.js";

export function createVersionsRouter(): Router {
  const router = Router();
  const versioning = new VersioningService();

  router.get("/items/:id/versions", (req, res, next) => {
    try {
      res.json({ versions: versioning.listVersions(routeParam(req.params.id)) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/items/:id/restore/:versionId", async (req, res, next) => {
    try {
      const version = await versioning.restoreVersion(routeParam(req.params.id), routeParam(req.params.versionId));
      res.json({ ok: true, version });
    } catch (error) {
      next(error);
    }
  });

  router.post("/items/:id/versions/:versionId/restore", async (req, res, next) => {
    try {
      const version = await versioning.restoreVersion(routeParam(req.params.id), routeParam(req.params.versionId));
      res.json({ ok: true, version });
    } catch (error) {
      next(error);
    }
  });

  router.post("/items/:id/versions/:versionId/apply", async (req, res, next) => {
    try {
      const version = await versioning.restoreVersion(routeParam(req.params.id), routeParam(req.params.versionId));
      res.json({ ok: true, version });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const versionsRouter = createVersionsRouter;

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
