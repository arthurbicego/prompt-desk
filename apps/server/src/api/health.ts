import type { BootstrapResponse } from "@prompt-desk/shared";
import { getDb } from "../db/connection.js";
import { preferencesService } from "../services/preferences/preferencesService.js";
import { projectsService } from "../services/projects/projectsService.js";

export async function getBootstrap(): Promise<BootstrapResponse> {
  getDb();
  const settings = preferencesService.getSettingsSnapshot();
  return {
    backend: {
      status: "ok",
      watcher: settings.codexHome.valid ? "ready" : "disabled",
      version: "0.1.0"
    },
    paths: settings.paths,
    codexHome: settings.codexHome,
    preferences: settings.preferences,
    projects: await projectsService.listProjects()
  };
}
