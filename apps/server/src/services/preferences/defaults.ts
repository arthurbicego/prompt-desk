import type { AppPreferences } from "@prompt-desk/shared";

export function getDefaultPreferences(): AppPreferences {
  return {
    theme: "dark",
    language: "pt-BR",
    activeTab: "agents",
    selectedScopes: ["global"],
    versionRetention: 10,
    codexHomeOverride: null,
    restoreDecision: null,
    ui: {}
  };
}
