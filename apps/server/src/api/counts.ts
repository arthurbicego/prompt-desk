import { Router } from "express";
import { tabSchema } from "@prompt-desk/shared";
import { ItemsRepository } from "../db/repositories/itemsRepository.js";
import { AppError } from "../util/errors.js";

export function createCountsRouter(): Router {
  const router = Router();
  const itemsRepository = new ItemsRepository();

  router.get("/", (req, res, next) => {
    try {
      const tab = tabSchema.safeParse(req.query.tab ?? "agents");
      if (!tab.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid tab query parameter", tab.error.flatten());
      }
      const scopes = parseScopes(typeof req.query.scopes === "string" ? req.query.scopes : "global");
      res.json({
        scopes: itemsRepository.countByScope(tab.data),
        tabs: itemsRepository.countByTab(scopes)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const countsRouter = createCountsRouter;

function parseScopes(value: string): string[] {
  return value
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}
