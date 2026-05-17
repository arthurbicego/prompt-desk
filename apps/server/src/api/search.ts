import { Router } from "express";
import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { itemsQuerySchema } from "@prompt-desk/shared";
import { ItemsRepository } from "../db/repositories/itemsRepository.js";
import { SearchRepository } from "../db/repositories/searchRepository.js";
import { SearchService } from "../services/search/searchService.js";
import { parseQuery, validateBody } from "./validate.js";

const reindexRequestSchema = z.object({
  confirmed: z.boolean()
});

type ItemsQuery = ZodInfer<typeof itemsQuerySchema>;

export function createSearchRouter(): Router {
  const router = Router();
  const searchRepository = new SearchRepository();
  const itemsRepository = new ItemsRepository();
  const searchService = new SearchService(searchRepository, itemsRepository);

  router.get("/", (req, res, next) => {
    try {
      const query = parseQuery(itemsQuerySchema, req.query) as ItemsQuery;
      const scopes = parseScopes(query.scopes);
      const hits = searchRepository.search({
        query: query.query,
        tab: query.tab,
        scopes,
        limit: query.limit,
        offset: query.offset
      });
      const result = itemsRepository.list({
        tab: query.tab,
        scopes,
        sessionState: query.sessionState,
        limit: query.limit,
        offset: 0,
        sort: query.sort,
        direction: query.direction,
        itemIds: hits.map((hit) => hit.itemId)
      });
      res.json({ items: result.items, total: result.items.length });
    } catch (error) {
      next(error);
    }
  });

  router.post("/reindex", validateBody(reindexRequestSchema), async (req, res, next) => {
    try {
      if (!req.body.confirmed) {
        res.status(400).json({ error: { code: "CONFIRMATION_REQUIRED", message: "Reindex must be confirmed." } });
        return;
      }
      const indexed = await searchService.reindexAll();
      res.json({ ok: true, indexed });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const searchRouter = createSearchRouter;

function parseScopes(value: string): string[] {
  return value
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}
