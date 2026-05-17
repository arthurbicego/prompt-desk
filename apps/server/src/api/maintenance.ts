import { Router } from "express";
import { z } from "zod";
import { maintenanceRequestSchema } from "@prompt-desk/shared";
import { McpRepository } from "../db/repositories/mcpRepository.js";
import { validateBody } from "./validate.js";
import { AppEventsService } from "../services/activity/appEvents.js";
import { AppError } from "../util/errors.js";

const clearEventsRequestSchema = maintenanceRequestSchema.extend({
  createdBefore: z.string().min(1)
});

export function createMaintenanceRouter(): Router {
  const router = Router();
  const mcpRepository = new McpRepository();
  const appEvents = new AppEventsService();

  router.post("/mcp-cache/clear", validateBody(maintenanceRequestSchema), (req, res, next) => {
    try {
      if (!req.body.confirmed) {
        throw new AppError(400, "CONFIRMATION_REQUIRED", "Clearing MCP inspection cache requires confirmation.");
      }
      const deletedTools = mcpRepository.clearInspectionCache();
      appEvents.record({
        type: "maintenance",
        entityType: "mcp_cache",
        message: "Cleared MCP inspection cache.",
        metadata: { deletedTools }
      });
      res.json({ ok: true, deletedTools });
    } catch (error) {
      next(error);
    }
  });

  router.post("/app-events/clear", validateBody(clearEventsRequestSchema), (req, res, next) => {
    try {
      if (!req.body.confirmed) {
        throw new AppError(400, "CONFIRMATION_REQUIRED", "Clearing app events requires confirmation.");
      }
      const deletedEvents = appEvents.clearOlderThan(req.body.createdBefore);
      appEvents.record({
        type: "maintenance",
        entityType: "app_events",
        message: "Cleared old app events.",
        metadata: { deletedEvents, createdBefore: req.body.createdBefore }
      });
      res.json({ ok: true, deletedEvents });
    } catch (error) {
      next(error);
    }
  });

  router.post("/search/reindex", validateBody(maintenanceRequestSchema), (req, res, next) => {
    try {
      if (!req.body.confirmed) {
        throw new AppError(400, "CONFIRMATION_REQUIRED", "Search reindex requires confirmation.");
      }
      appEvents.record({
        type: "maintenance",
        entityType: "search_index",
        message: "Search reindex was requested.",
        metadata: { status: "not-wired" }
      });
      res.json({
        ok: true,
        status: "not-wired",
        message: "Search reindex endpoint is available, but no search indexer service is registered yet."
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
