import type { AppPreferences, CodexHomeResolution, PromptDeskPaths } from "@prompt-desk/shared";
import { appPreferencesSchema, preferencesPatchSchema } from "@prompt-desk/shared";
import { preferencesRepository } from "../../db/repositories/preferencesRepository.js";
import { eventBus } from "../../events/eventBus.js";
import { resolvePromptDeskPaths } from "../paths/appHome.js";
import { resolveCodexHome } from "../paths/codexHome.js";

export interface SettingsSnapshot {
  paths: PromptDeskPaths;
  codexHome: CodexHomeResolution;
  preferences: AppPreferences;
}

function codexHomeResolutionMetadata(resolution: CodexHomeResolution): Record<string, unknown> {
  return {
    path: resolution.path,
    source: resolution.source,
    valid: resolution.valid,
    error: resolution.error ?? null
  };
}

export class PreferencesService {
  getPreferences(): AppPreferences {
    return preferencesRepository.getPreferences();
  }

  patchPreferences(input: unknown): AppPreferences {
    const patch = preferencesPatchSchema.parse(input);
    const current = preferencesRepository.getPreferences();
    const next = appPreferencesSchema.parse({ ...current, ...patch });
    const saved = preferencesRepository.patchPreferences(next);

    eventBus.emitEvent({
      type: "maintenance",
      entityType: "preferences",
      entityId: null,
      message: "Preferences updated.",
      metadata: { changedKeys: Object.keys(patch) }
    });

    return saved;
  }

  setCodexHomeOverride(codexHomeOverride: string | null): SettingsSnapshot {
    preferencesRepository.patchPreferences({ codexHomeOverride });
    const snapshot = this.getSettingsSnapshot();
    eventBus.emitEvent({
      type: "maintenance",
      entityType: "settings",
      entityId: "codex-home",
      message: "Codex Home preference updated.",
      metadata: {
        codexHomeOverride,
        resolvedPath: snapshot.codexHome.path,
        source: snapshot.codexHome.source,
        valid: snapshot.codexHome.valid
      }
    });
    return snapshot;
  }

  getCodexHomeResolution(): CodexHomeResolution {
    const preferences = preferencesRepository.getPreferences();
    return resolveCodexHome(preferences.codexHomeOverride);
  }

  getSettingsSnapshot(): SettingsSnapshot {
    let preferences = preferencesRepository.getPreferences();
    const codexHome = resolveCodexHome(preferences.codexHomeOverride);
    const resolutionMetadata = codexHomeResolutionMetadata(codexHome);
    const currentMetadata = preferences.ui.codexHomeResolution;

    if (JSON.stringify(currentMetadata) !== JSON.stringify(resolutionMetadata)) {
      preferences = preferencesRepository.patchPreferences({
        ui: {
          ...preferences.ui,
          codexHomeResolution: resolutionMetadata
        }
      });
    }

    return {
      paths: resolvePromptDeskPaths(),
      codexHome,
      preferences
    };
  }
}

export const preferencesService = new PreferencesService();
