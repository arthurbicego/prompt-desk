import { Router } from "express";
import { getBootstrap } from "./health.js";
import { createCountsRouter } from "./counts.js";
import { createEventsRouter } from "./events.js";
import { createItemActionsRouter } from "./itemActions.js";
import { createItemsRouter } from "./items.js";
import { createMaintenanceRouter } from "./maintenance.js";
import { createMcpRouter } from "./mcp.js";
import { createPreferencesRouter } from "./preferences.js";
import { createProjectsRouter } from "./projects.js";
import { createSearchRouter } from "./search.js";
import { createSettingsRouter } from "./settings.js";
import { createTempEditsRouter } from "./tempEdits.js";
import { createTrashRouter } from "./trash.js";
import { createVersionsRouter } from "./versions.js";

export function createRouter(): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, status: "ok" });
  });

  router.get("/bootstrap", async (_req, res, next) => {
    try {
      res.json(await getBootstrap());
    } catch (error) {
      next(error);
    }
  });

  router.use("/events", createEventsRouter());
  router.use("/preferences", createPreferencesRouter());
  router.use("/settings", createSettingsRouter());
  router.use("/projects", createProjectsRouter());
  router.use("/items/counts", createCountsRouter());
  router.use("/items", createItemsRouter());
  router.use(createItemActionsRouter());
  router.use(createVersionsRouter());
  router.use(createTempEditsRouter());
  router.use(createTrashRouter());
  router.use("/search", createSearchRouter());
  router.use("/mcp", createMcpRouter());
  router.use("/maintenance", createMaintenanceRouter());

  return router;
}
