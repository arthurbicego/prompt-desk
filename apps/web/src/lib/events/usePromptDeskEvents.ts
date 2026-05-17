import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AppEvent } from "@prompt-desk/shared";
import { appEventSchema } from "@prompt-desk/shared";
import { invalidateForPromptDeskEvent } from "../query";

export type SseConnectionState = "connecting" | "connected" | "disconnected" | "unsupported";

export interface PromptDeskEventsState {
  connectionState: SseConnectionState;
  lastEvent: AppEvent | null;
  error: string | null;
}

export interface UsePromptDeskEventsOptions {
  enabled?: boolean;
  url?: string;
  onEvent?: (event: AppEvent) => void;
}

export function usePromptDeskEvents({
  enabled = true,
  url = "/api/events/stream",
  onEvent
}: UsePromptDeskEventsOptions = {}): PromptDeskEventsState {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<SseConnectionState>(
    typeof EventSource === "undefined" ? "unsupported" : "connecting"
  );
  const [lastEvent, setLastEvent] = useState<AppEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") {
      setConnectionState(typeof EventSource === "undefined" ? "unsupported" : "disconnected");
      return undefined;
    }

    const source = new EventSource(url);
    setConnectionState("connecting");
    setError(null);

    source.onopen = () => {
      setConnectionState("connected");
      setError(null);
    };

    source.onmessage = (message) => {
      const parsedJson = safeJsonParse(message.data);
      const parsedEvent = appEventSchema.safeParse(parsedJson);
      if (!parsedEvent.success) {
        setError("Received an invalid event payload.");
        return;
      }

      setLastEvent(parsedEvent.data);
      invalidateForPromptDeskEvent(queryClient, parsedEvent.data);
      onEvent?.(parsedEvent.data);
    };

    source.onerror = () => {
      setConnectionState("disconnected");
      setError("The live event stream is disconnected.");
    };

    return () => {
      source.close();
      setConnectionState("disconnected");
    };
  }, [enabled, onEvent, queryClient, url]);

  return useMemo(
    () => ({ connectionState, lastEvent, error }),
    [connectionState, error, lastEvent]
  );
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
