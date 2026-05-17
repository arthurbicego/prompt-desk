import { Router } from "express";
import { z } from "zod";
import { maintenanceRequestSchema } from "@prompt-desk/shared";
import { validateBody } from "./validate.js";
import { ExternalToolsService } from "../services/externalTools/editor.js";
import { TrashService } from "../services/trash/trashService.js";

const emptyBodySchema = z.object({}).passthrough().default({});

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function createItemActionsRouter(): Router {
  const router = Router();
  const externalTools = new ExternalToolsService();
  const trash = new TrashService();

  router.post("/items/:id/open", validateBody(emptyBodySchema), (req, res, next) => {
    try {
      res.json({ ok: true, externalTool: externalTools.openItem(routeParam(req.params.id)) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/items/:id/diff/:versionId", validateBody(emptyBodySchema), async (req, res, next) => {
    try {
      const result = await externalTools.diffVersion(routeParam(req.params.id), routeParam(req.params.versionId));
      res.json({ ok: true, externalTool: result });
    } catch (error) {
      next(error);
    }
  });

  router.post("/items/:id/reveal", validateBody(emptyBodySchema), (req, res, next) => {
    try {
      res.json({ ok: true, externalTool: externalTools.revealItem(routeParam(req.params.id)) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/items/:id/delete", validateBody(maintenanceRequestSchema), async (req, res, next) => {
    try {
      if (!req.body.confirmed) {
        res.status(400).json({
          error: { code: "CONFIRMATION_REQUIRED", message: "Deleting an item requires confirmation" }
        });
        return;
      }
      const trashItem = await trash.deleteItem(routeParam(req.params.id));
      res.json({ ok: true, trashItem });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const itemActionsRouter = createItemActionsRouter;
