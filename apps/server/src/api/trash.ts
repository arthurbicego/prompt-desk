import { Router } from "express";
import { maintenanceRequestSchema, restoreRequestSchema } from "@prompt-desk/shared";
import { validateBody } from "./validate.js";
import { TrashService } from "../services/trash/trashService.js";

export function createTrashRouter(): Router {
  const router = Router();
  const trash = new TrashService();

  router.get("/trash", (_req, res, next) => {
    try {
      res.json({ items: trash.listTrash() });
    } catch (error) {
      next(error);
    }
  });

  router.post("/trash/:id/restore", validateBody(restoreRequestSchema), async (req, res, next) => {
    try {
      res.json({ ok: true, ...(await trash.restoreTrash(routeParam(req.params.id), req.body)) });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/trash/:id", validateBody(maintenanceRequestSchema), async (req, res, next) => {
    try {
      await trash.permanentlyDelete(routeParam(req.params.id), req.body.confirmed);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/trash/:id/delete", validateBody(maintenanceRequestSchema), async (req, res, next) => {
    try {
      await trash.permanentlyDelete(routeParam(req.params.id), req.body.confirmed);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const trashRouter = createTrashRouter;

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
