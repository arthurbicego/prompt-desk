import { Router } from "express";
import { mcpInspectionRequestSchema } from "@prompt-desk/shared";
import { McpRepository } from "../db/repositories/mcpRepository.js";
import { validateBody } from "./validate.js";
import { AppError } from "../util/errors.js";
import { AppEventsService } from "../services/activity/appEvents.js";
import { McpConfigService } from "../services/configs/mcpConfigService.js";
import { MCP_INSPECTION_WARNING, McpInspectionService } from "../services/mcp/inspection.js";

export function createMcpRouter(): Router {
  const router = Router();
  const repository = new McpRepository();
  const appEvents = new AppEventsService();
  const inspectionService = new McpInspectionService(repository, {
    recordEvent: (event) => {
      appEvents.record({
        type: event.type,
        entityType: event.entityType,
        entityId: event.entityId,
        message: event.message,
        metadata: event.metadata
      });
    }
  });
  const configService = new McpConfigService(repository);

  router.get("/", (_req, res, next) => {
    try {
      res.json({
        servers: repository.listServers(),
        tools: repository.listTools(),
        warning: MCP_INSPECTION_WARNING
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/warning", (_req, res) => {
    res.json({ warning: MCP_INSPECTION_WARNING });
  });

  router.post("/sync", (_req, res, next) => {
    try {
      const results = configService.syncKnownConfigItems();
      res.json({
        ok: true,
        results,
        servers: repository.listServers(),
        tools: repository.listTools()
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/inspect-all", validateBody(mcpInspectionRequestSchema), async (req, res, next) => {
    try {
      const results = await inspectionService.inspectAll(req.body);
      res.json({ ok: true, results, warning: MCP_INSPECTION_WARNING });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/inspect", validateBody(mcpInspectionRequestSchema), async (req, res, next) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new AppError(400, "MCP_SERVER_ID_REQUIRED", "MCP server id is required.");
      }
      const result = await inspectionService.inspectServer(id, req.body);
      res.json({ ok: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
