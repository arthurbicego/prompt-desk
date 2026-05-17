import { Router } from "express";
import { z } from "zod";
import { absolutePathSchema } from "@prompt-desk/shared";
import { preferencesService } from "../services/preferences/preferencesService.js";
import { validateBody } from "./validate.js";

const codexHomePatchSchema = z.object({
  codexHomeOverride: absolutePathSchema.nullable()
});

export function createSettingsRouter(): Router {
  const router = Router();

  router.get("/", (_req, res, next) => {
    try {
      res.json(preferencesService.getSettingsSnapshot());
    } catch (error) {
      next(error);
    }
  });

  router.patch("/codex-home", validateBody(codexHomePatchSchema), (req, res, next) => {
    try {
      const { codexHomeOverride } = req.body;
      res.json(preferencesService.setCodexHomeOverride(codexHomeOverride));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
