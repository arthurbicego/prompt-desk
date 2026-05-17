import { Router } from "express";
import type { infer as ZodInfer } from "zod";
import { itemsQuerySchema } from "@prompt-desk/shared";
import { ItemsRepository } from "../db/repositories/itemsRepository.js";
import { SearchRepository } from "../db/repositories/searchRepository.js";
import { PreviewService } from "../services/files/previewService.js";
import { parseQuery } from "./validate.js";

type ItemsQuery = ZodInfer<typeof itemsQuerySchema>;

export function createItemsRouter(): Router {
  const router = Router();
  const itemsRepository = new ItemsRepository();
  const searchRepository = new SearchRepository();
  const previewService = new PreviewService(itemsRepository);

  router.get("/", (req, res, next) => {
    try {
      const query = parseQuery(itemsQuerySchema, req.query) as ItemsQuery;
      const scopes = parseScopes(query.scopes);
      const hits = query.query
        ? searchRepository.search({
            query: query.query,
            tab: query.tab,
            scopes,
            limit: query.limit,
            offset: query.offset
          })
        : null;
      const result = itemsRepository.list({
        tab: query.tab,
        scopes,
        sessionState: query.sessionState,
        limit: query.limit,
        offset: hits ? 0 : query.offset,
        sort: query.sort,
        direction: query.direction,
        itemIds: hits?.map((hit) => hit.itemId)
      });
      res.json({ items: result.items, total: hits ? result.items.length : result.total });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/preview", async (req, res, next) => {
    try {
      res.json({ preview: await previewService.getPreview(req.params.id) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const itemsRouter = createItemsRouter;

function parseScopes(value: string): string[] {
  return value
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}
