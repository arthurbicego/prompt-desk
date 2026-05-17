import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppPreferences } from "@prompt-desk/shared";
import { promptDeskApi, type InspectionInput, type ItemsQueryInput, type RestoreInput } from "../lib/api";
import { promptDeskQueryKeys } from "../lib/query";

export function useBootstrapQuery() {
  return useQuery({
    queryKey: promptDeskQueryKeys.bootstrap(),
    queryFn: () => promptDeskApi.bootstrap()
  });
}

export function usePreferencesQuery() {
  return useQuery({
    queryKey: promptDeskQueryKeys.preferences(),
    queryFn: () => promptDeskApi.preferences()
  });
}

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AppPreferences>) => promptDeskApi.updatePreferences(patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promptDeskQueryKeys.preferences() });
      void queryClient.invalidateQueries({ queryKey: promptDeskQueryKeys.bootstrap() });
    }
  });
}

export function useProjectsQuery() {
  return useQuery({
    queryKey: promptDeskQueryKeys.projects(),
    queryFn: () => promptDeskApi.projects()
  });
}

export function useItemsQuery(input: ItemsQueryInput = {}) {
  return useQuery({
    queryKey: promptDeskQueryKeys.items(input),
    queryFn: () => promptDeskApi.items(input)
  });
}

export function useCountsQuery(input: Pick<ItemsQueryInput, "tab" | "query" | "scopes" | "sessionState"> = {}) {
  return useQuery({
    queryKey: promptDeskQueryKeys.counts(input),
    queryFn: () => promptDeskApi.counts(input)
  });
}

export function useItemPreviewQuery(itemId: string | null | undefined) {
  return useQuery({
    queryKey: promptDeskQueryKeys.preview(itemId),
    queryFn: () => promptDeskApi.preview(itemId ?? ""),
    enabled: Boolean(itemId)
  });
}

export function useItemVersionsQuery(itemId: string | null | undefined) {
  return useQuery({
    queryKey: promptDeskQueryKeys.versions(itemId),
    queryFn: () => promptDeskApi.versions(itemId ?? ""),
    enabled: Boolean(itemId)
  });
}

export function useMcpServersQuery(configItemId?: string) {
  return useQuery({
    queryKey: promptDeskQueryKeys.mcp(configItemId),
    queryFn: () => promptDeskApi.mcpServers(configItemId)
  });
}

export function useAppEventsQuery(limit = 100) {
  return useQuery({
    queryKey: promptDeskQueryKeys.events(limit),
    queryFn: () => promptDeskApi.events(limit)
  });
}

export function useTrashQuery() {
  return useQuery({
    queryKey: promptDeskQueryKeys.trash(),
    queryFn: () => promptDeskApi.trash()
  });
}

export function useItemActionMutations(itemId: string | null | undefined) {
  const queryClient = useQueryClient();

  const invalidateItemState = () => {
    void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "items"] });
    void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "counts"] });
    void queryClient.invalidateQueries({ queryKey: promptDeskQueryKeys.preview(itemId) });
    void queryClient.invalidateQueries({ queryKey: promptDeskQueryKeys.versions(itemId) });
    void queryClient.invalidateQueries({ queryKey: promptDeskQueryKeys.trash() });
  };

  return {
    open: useMutation({
      mutationFn: () => promptDeskApi.openItem(requireItemId(itemId))
    }),
    reveal: useMutation({
      mutationFn: () => promptDeskApi.revealItem(requireItemId(itemId))
    }),
    deleteItem: useMutation({
      mutationFn: () => promptDeskApi.deleteItem(requireItemId(itemId)),
      onSuccess: invalidateItemState
    }),
    compareVersion: useMutation({
      mutationFn: (versionId: string) => promptDeskApi.compareVersion(requireItemId(itemId), versionId)
    }),
    openVersion: useMutation({
      mutationFn: (versionId: string) => promptDeskApi.openVersion(requireItemId(itemId), versionId)
    }),
    restoreVersion: useMutation({
      mutationFn: ({ versionId, input }: { versionId: string; input: RestoreInput }) =>
        promptDeskApi.restoreVersion(requireItemId(itemId), versionId, input),
      onSuccess: invalidateItemState
    }),
    applyVersion: useMutation({
      mutationFn: ({ versionId, input }: { versionId: string; input: RestoreInput }) =>
        promptDeskApi.applyVersion(requireItemId(itemId), versionId, input),
      onSuccess: invalidateItemState
    })
  };
}

export function useMcpActionMutations() {
  const queryClient = useQueryClient();
  return {
    inspectServer: useMutation({
      mutationFn: ({ serverId, input }: { serverId: string; input: InspectionInput }) =>
        promptDeskApi.inspectMcpServer(serverId, input),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "mcp"] });
        void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "events"] });
      }
    }),
    inspectAll: useMutation({
      mutationFn: (input: InspectionInput) => promptDeskApi.inspectAllMcp(input),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "mcp"] });
        void queryClient.invalidateQueries({ queryKey: ["prompt-desk", "events"] });
      }
    })
  };
}

function requireItemId(itemId: string | null | undefined): string {
  if (!itemId) {
    throw new Error("An item must be selected before running this action.");
  }

  return itemId;
}
