import { Router } from "express";
import { z } from "zod";
import { eventBus } from "../events/eventBus.js";
import { parseQuery } from "./validate.js";

const eventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  before: z.string().optional()
});

function writeSse(res: { write: (chunk: string) => void }, _eventName: string, id: string, data: unknown): void {
  res.write(`id: ${id}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function createEventsRouter(): Router {
  const router = Router();

  router.get("/", (req, res, next) => {
    try {
      const query = parseQuery(eventsQuerySchema, req.query);
      res.json({ events: eventBus.listRecent(query.limit, query.before) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/stream", (req, res) => {
    res.writeHead(200, {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no"
    });
    res.write(": connected\n\n");

    const unsubscribe = eventBus.subscribe((event) => {
      writeSse(res, event.type, event.id, event);
    });

    const heartbeat = setInterval(() => {
      res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  });

  return router;
}
