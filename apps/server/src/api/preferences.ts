import { Router } from "express";
import { preferencesPatchSchema } from "@prompt-desk/shared";
import { preferencesService } from "../services/preferences/preferencesService.js";
import { validateBody } from "./validate.js";

export function createPreferencesRouter(): Router {
  const router = Router();

  router.get("/", (_req, res, next) => {
    try {
      res.json({ preferences: preferencesService.getPreferences() });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/", validateBody(preferencesPatchSchema), (req, res, next) => {
    try {
      res.json({ preferences: preferencesService.patchPreferences(req.body) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
