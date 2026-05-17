import { Router } from "express";
import { TABS, tabSchema, type PromptDeskTab } from "@prompt-desk/shared";
import {
  ItemsRepository,
  type CountItemIdsByScope,
  type CountItemIdsByTab
} from "../db/repositories/itemsRepository.js";
import { ProjectsRepository } from "../db/repositories/projectsRepository.js";
import { SearchRepository } from "../db/repositories/searchRepository.js";
import { AppError } from "../util/errors.js";

export function createCountsRouter(): Router {
  const router = Router();
  const itemsRepository = new ItemsRepository();
  const projectsRepository = new ProjectsRepository();
  const searchRepository = new SearchRepository();

  router.get("/", (req, res, next) => {
    try {
      const tab = tabSchema.safeParse(req.query.tab ?? "agents");
      if (!tab.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid tab query parameter", tab.error.flatten());
      }
      const scopes = parseScopes(typeof req.query.scopes === "string" ? req.query.scopes : "global");
      const query = typeof req.query.query === "string" ? req.query.query : "";
      res.json({
        scopes: itemsRepository.countByScope(
          tab.data,
          searchItemIdsByScope(searchRepository, projectsRepository, query, tab.data)
        ),
        tabs: itemsRepository.countByTab(scopes, searchItemIdsByTab(searchRepository, query, scopes))
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

function searchItemIdsByTab(
  searchRepository: SearchRepository,
  query: string,
  scopes: string[]
): CountItemIdsByTab {
  if (!query.trim()) return {};

  const itemIdsByTab: CountItemIdsByTab = {};
  for (const tab of TABS) {
    itemIdsByTab[tab] = searchRepository.searchItemIds({ query, tab, scopes });
  }
  return itemIdsByTab;
}

function searchItemIdsByScope(
  searchRepository: SearchRepository,
  projectsRepository: ProjectsRepository,
  query: string,
  tab: PromptDeskTab
): CountItemIdsByScope {
  if (!query.trim()) return {};

  const itemIdsByScope: CountItemIdsByScope = {
    global: searchRepository.searchItemIds({ query, tab, scopes: ["global"] })
  };
  for (const project of projectsRepository.listActive()) {
    const scope = `project:${project.id}`;
    itemIdsByScope[scope] = searchRepository.searchItemIds({ query, tab, scopes: [scope] });
  }
  return itemIdsByScope;
}
