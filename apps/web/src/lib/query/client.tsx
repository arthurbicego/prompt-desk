import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

export function createPromptDeskQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: 1,
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: 0
      }
    }
  });
}

export const promptDeskQueryClient = createPromptDeskQueryClient();

export function PromptDeskQueryProvider({ children, client = promptDeskQueryClient }: PropsWithChildren<{ client?: QueryClient }>) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
