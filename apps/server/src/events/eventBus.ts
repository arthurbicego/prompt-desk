import type { AppEvent } from "@prompt-desk/shared";
import { EventEmitter } from "node:events";
import {
  appEventsRepository,
  type CreateAppEventInput
} from "../db/repositories/appEventsRepository.js";

export type AppEventListener = (event: AppEvent) => void;

class EventBus {
  private readonly emitter = new EventEmitter();

  emitEvent(input: CreateAppEventInput): AppEvent {
    const event = appEventsRepository.create(input);
    this.emitter.emit("app-event", event);
    return event;
  }

  subscribe(listener: AppEventListener): () => void {
    this.emitter.on("app-event", listener);
    return () => {
      this.emitter.off("app-event", listener);
    };
  }

  listRecent(limit?: number, before?: string): AppEvent[] {
    return appEventsRepository.list(limit, before);
  }
}

export const eventBus = new EventBus();
