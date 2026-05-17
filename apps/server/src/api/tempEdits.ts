import { Router } from "express";
import { z } from "zod";
import { validateBody } from "./validate.js";
import { TempEditsService } from "../services/tempEdits/tempEditsService.js";

const applyTempEditSchema = z.object({
  confirmed: z.boolean()
});

const emptyBodySchema = z.object({}).passthrough().default({});

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function createTempEditsRouter(): Router {
  const router = Router();
  const tempEdits = new TempEditsService();

  router.post("/items/:id/open-version/:versionId", validateBody(emptyBodySchema), async (req, res, next) => {
    try {
      const tempEdit = await tempEdits.openHistoricalVersion(routeParam(req.params.id), routeParam(req.params.versionId));
      res.json({ ok: true, tempEdit });
    } catch (error) {
      next(error);
    }
  });

  router.post("/items/:id/versions/:versionId/open", validateBody(emptyBodySchema), async (req, res, next) => {
    try {
      const tempEdit = await tempEdits.openHistoricalVersion(routeParam(req.params.id), routeParam(req.params.versionId));
      res.json({ ok: true, tempEdit });
    } catch (error) {
      next(error);
    }
  });

  router.get("/temp-edits/:id", async (req, res, next) => {
    try {
      res.json({ tempEdit: await tempEdits.getTrackedTempEdit(routeParam(req.params.id)) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/temp-edits/:id/apply", validateBody(applyTempEditSchema), async (req, res, next) => {
    try {
      res.json({ ok: true, ...(await tempEdits.applyTempEdit(routeParam(req.params.id), req.body.confirmed)) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/temp-edits/:id/discard", validateBody(emptyBodySchema), (req, res, next) => {
    try {
      res.json({ ok: true, tempEdit: tempEdits.discardTempEdit(routeParam(req.params.id)) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const tempEditsRouter = createTempEditsRouter;
