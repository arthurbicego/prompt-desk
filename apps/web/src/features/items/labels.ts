import type { CodexItem, EditabilityState, ItemOrigin, ItemType, PromptDeskTab } from "@prompt-desk/shared";

export const tabLabels: Record<PromptDeskTab, string> = {
  agents: "AGENTS",
  skill: "Skills",
  agent: "Agents",
  plugin: "Plugins",
  config: "Configs",
  hook: "Hooks",
  memory: "Memories",
  automation: "Automations",
  session: "Sessions",
  activity: "Activity",
  all: "All"
};

export const itemTypeLabels: Record<ItemType, string> = {
  agents: "AGENTS",
  skill: "Skill",
  agent: "Agent",
  plugin: "Plugin",
  config: "Config",
  hook: "Hook",
  memory: "Memory",
  automation: "Automation",
  session: "Session",
  activity: "Activity"
};

export const originLabels: Record<ItemOrigin, string> = {
  global: "Global",
  project: "Project",
  plugin: "Plugin",
  internal: "Internal"
};

export const editabilityLabels: Record<EditabilityState, string> = {
  editable: "Editable",
  "read-only": "Read-only",
  blocked: "Blocked",
  deleted: "Deleted",
  internal: "Internal"
};

export function itemScopeLabel(item: CodexItem): string {
  if (item.origin === "project" && item.projectName) {
    return item.projectName;
  }

  if (item.origin === "plugin" && item.pluginName) {
    return item.pluginName;
  }

  return originLabels[item.origin];
}

export function formatBytes(size: number | null): string {
  if (size === null) {
    return "Unknown";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function shortHash(hash: string | null): string {
  return hash ? hash.slice(0, 10) : "No hash";
}
