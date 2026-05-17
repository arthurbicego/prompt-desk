import { z } from "zod";
import {
  apiErrorSchema,
  appPreferencesSchema,
  bootstrapResponseSchema,
  countsResponseSchema,
  eventsResponseSchema,
  itemsQuerySchema,
  itemsResponseSchema,
  maintenanceRequestSchema,
  mcpInspectionRequestSchema,
  mcpServersResponseSchema,
  okResponseSchema,
  preferencesPatchSchema,
  previewResponseSchema,
  projectCreateRequestSchema,
  projectFolderSelectionResponseSchema,
  projectSummarySchema,
  projectUpdateRequestSchema,
  restoreRequestSchema,
  trashResponseSchema,
  versionsResponseSchema,
  type AppPreferences,
  type BootstrapResponse,
  type CountsResponse,
  type EventsResponse,
  type ItemsResponse,
  type McpServersResponse,
  type PreviewResponse,
  type PromptDeskTab,
  type RestoreConflictMode,
  type SessionState,
  type TrashResponse,
  type VersionsResponse
} from "@prompt-desk/shared";
import { PromptDeskParseError, toApiError } from "./errors";

const projectsResponseSchema = z.object({
  projects: z.array(projectSummarySchema)
});

const preferencesResponseSchema = z.object({
  preferences: appPreferencesSchema
});

export type SortField = "updatedAt" | "name" | "type" | "origin";
export type SortDirection = "asc" | "desc";

export interface ItemsQueryInput {
  tab?: PromptDeskTab;
  query?: string;
  scopes?: string[];
  sessionState?: SessionState;
  limit?: number;
  offset?: number;
  sort?: SortField;
  direction?: SortDirection;
}

export interface ProjectCreateInput {
  path: string;
  name?: string;
}

export interface ProjectUpdateInput {
  name?: string;
}

export interface RestoreInput {
  mode: RestoreConflictMode;
  destinationPath?: string;
  rememberDecision?: boolean;
}

export interface InspectionInput {
  confirmed: boolean;
  timeoutMs?: number;
}

export interface PromptDeskApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

function makeUrl(path: string, baseUrl: string): URL {
  const origin = typeof window === "undefined" ? "http://127.0.0.1:5175" : window.location.origin;
  return new URL(`${baseUrl}${path}`, origin);
}

function encodeItemsQuery(input: ItemsQueryInput = {}): URLSearchParams {
  const normalized = itemsQuerySchema.parse({
    ...input,
    scopes: input.scopes?.join(",") ?? "global"
  });
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(normalized)) {
    params.set(key, String(value));
  }

  return params;
}

function encodeSearch(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  const value = search.toString();
  return value ? `?${value}` : "";
}

export class PromptDeskApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(options: PromptDeskApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "/api";
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  }

  async bootstrap(): Promise<BootstrapResponse> {
    return this.request("/bootstrap", { schema: bootstrapResponseSchema });
  }

  async preferences(): Promise<AppPreferences> {
    const response = await this.request("/preferences", { schema: preferencesResponseSchema });
    return response.preferences;
  }

  async updatePreferences(patch: Partial<AppPreferences>): Promise<AppPreferences> {
    const body = preferencesPatchSchema.parse(patch);
    const response = await this.request("/preferences", {
      method: "PATCH",
      body,
      schema: preferencesResponseSchema
    });
    return response.preferences;
  }

  async projects(): Promise<z.infer<typeof projectsResponseSchema>> {
    return this.request("/projects", { schema: projectsResponseSchema });
  }

  async createProject(input: ProjectCreateInput): Promise<z.infer<typeof projectsResponseSchema>> {
    const body = projectCreateRequestSchema.parse(input);
    return this.request("/projects", { method: "POST", body, schema: projectsResponseSchema });
  }

  async chooseProjectFolder(): Promise<z.infer<typeof projectFolderSelectionResponseSchema>> {
    return this.request("/projects/choose-folder", {
      method: "POST",
      schema: projectFolderSelectionResponseSchema
    });
  }

  async updateProject(id: string, input: ProjectUpdateInput): Promise<z.infer<typeof projectsResponseSchema>> {
    const body = projectUpdateRequestSchema.parse(input);
    return this.request(`/projects/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
      schema: projectsResponseSchema
    });
  }

  async removeProject(id: string): Promise<{ ok: true }> {
    return this.request(`/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
      schema: okResponseSchema
    });
  }

  async items(input: ItemsQueryInput = {}): Promise<ItemsResponse> {
    const params = encodeItemsQuery(input);
    return this.request(`/items?${params.toString()}`, { schema: itemsResponseSchema });
  }

  async counts(input: Pick<ItemsQueryInput, "tab" | "query" | "scopes" | "sessionState"> = {}): Promise<CountsResponse> {
    const params = encodeItemsQuery(input);
    return this.request(`/items/counts?${params.toString()}`, { schema: countsResponseSchema });
  }

  async preview(itemId: string): Promise<PreviewResponse> {
    return this.request(`/items/${encodeURIComponent(itemId)}/preview`, { schema: previewResponseSchema });
  }

  async versions(itemId: string): Promise<VersionsResponse> {
    return this.request(`/items/${encodeURIComponent(itemId)}/versions`, { schema: versionsResponseSchema });
  }

  async openItem(itemId: string): Promise<{ ok: true }> {
    return this.request(`/items/${encodeURIComponent(itemId)}/open`, {
      method: "POST",
      schema: okResponseSchema
    });
  }

  async revealItem(itemId: string): Promise<{ ok: true }> {
    return this.request(`/items/${encodeURIComponent(itemId)}/reveal`, {
      method: "POST",
      schema: okResponseSchema
    });
  }

  async deleteItem(itemId: string, confirmed = true): Promise<{ ok: true }> {
    return this.request(`/items/${encodeURIComponent(itemId)}/delete`, {
      method: "POST",
      body: maintenanceRequestSchema.parse({ confirmed }),
      schema: okResponseSchema
    });
  }

  async compareVersion(itemId: string, versionId: string): Promise<{ ok: true }> {
    return this.request(
      `/items/${encodeURIComponent(itemId)}/diff/${encodeURIComponent(versionId)}`,
      { method: "POST", schema: okResponseSchema }
    );
  }

  async openVersion(itemId: string, versionId: string): Promise<{ ok: true }> {
    return this.request(
      `/items/${encodeURIComponent(itemId)}/versions/${encodeURIComponent(versionId)}/open`,
      { method: "POST", schema: okResponseSchema }
    );
  }

  async restoreVersion(itemId: string, versionId: string, input: RestoreInput): Promise<{ ok: true }> {
    const body = restoreRequestSchema.parse({
      ...input,
      rememberDecision: input.rememberDecision ?? false
    });
    return this.request(
      `/items/${encodeURIComponent(itemId)}/versions/${encodeURIComponent(versionId)}/restore`,
      { method: "POST", body, schema: okResponseSchema }
    );
  }

  async applyVersion(itemId: string, versionId: string, input: RestoreInput): Promise<{ ok: true }> {
    const body = restoreRequestSchema.parse({
      ...input,
      rememberDecision: input.rememberDecision ?? false
    });
    return this.request(
      `/items/${encodeURIComponent(itemId)}/versions/${encodeURIComponent(versionId)}/apply`,
      { method: "POST", body, schema: okResponseSchema }
    );
  }

  async mcpServers(configItemId?: string): Promise<McpServersResponse> {
    return this.request(`/mcp${encodeSearch({ configItemId })}`, { schema: mcpServersResponseSchema });
  }

  async inspectMcpServer(serverId: string, input: InspectionInput): Promise<{ ok: true }> {
    const body = mcpInspectionRequestSchema.parse({
      ...input,
      timeoutMs: input.timeoutMs ?? 20000
    });
    return this.request(`/mcp/${encodeURIComponent(serverId)}/inspect`, {
      method: "POST",
      body,
      schema: okResponseSchema
    });
  }

  async inspectAllMcp(input: InspectionInput): Promise<{ ok: true }> {
    const body = mcpInspectionRequestSchema.parse({
      ...input,
      timeoutMs: input.timeoutMs ?? 20000
    });
    return this.request("/mcp/inspect-all", { method: "POST", body, schema: okResponseSchema });
  }

  async events(limit = 100): Promise<EventsResponse> {
    return this.request(`/events${encodeSearch({ limit })}`, { schema: eventsResponseSchema });
  }

  async trash(): Promise<TrashResponse> {
    return this.request("/trash", { schema: trashResponseSchema });
  }

  async restoreTrashItem(trashId: string, input: RestoreInput): Promise<{ ok: true }> {
    const body = restoreRequestSchema.parse({
      ...input,
      rememberDecision: input.rememberDecision ?? false
    });
    return this.request(`/trash/${encodeURIComponent(trashId)}/restore`, {
      method: "POST",
      body,
      schema: okResponseSchema
    });
  }

  async deleteTrashItemPermanently(trashId: string, confirmed = true): Promise<{ ok: true }> {
    return this.request(`/trash/${encodeURIComponent(trashId)}/delete`, {
      method: "POST",
      body: maintenanceRequestSchema.parse({ confirmed }),
      schema: okResponseSchema
    });
  }

  private async request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      schema: z.ZodType<T>;
    }
  ): Promise<T> {
    const response = await this.fetcher(makeUrl(path, this.baseUrl), {
      method: options.method ?? "GET",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    const payload = await this.readJson(response);

    if (!response.ok) {
      const errorPayload = apiErrorSchema.safeParse(payload);
      throw toApiError(errorPayload.success ? errorPayload.data : null, response.status);
    }

    const parsed = options.schema.safeParse(payload);
    if (!parsed.success) {
      throw new PromptDeskParseError("API response did not match the shared contract", parsed.error.format());
    }

    return parsed.data;
  }

  private async readJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      throw new PromptDeskParseError("API response was not valid JSON", error);
    }
  }
}

export const promptDeskApi = new PromptDeskApiClient();
