import { z } from "zod";
import {
  appEventSchema,
  bootstrapResponseSchema,
  countsResponseSchema,
  fileVersionSchema,
  itemPreviewSchema,
  itemsResponseSchema,
  mcpServerSchema,
  mcpToolSchema,
  trashItemSchema
} from "./schemas.js";

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  })
});

export const okResponseSchema = z.object({ ok: z.literal(true) });

export const versionsResponseSchema = z.object({
  versions: z.array(fileVersionSchema)
});

export const mcpServersResponseSchema = z.object({
  servers: z.array(mcpServerSchema),
  tools: z.array(mcpToolSchema)
});

export const eventsResponseSchema = z.object({
  events: z.array(appEventSchema)
});

export const trashResponseSchema = z.object({
  items: z.array(trashItemSchema)
});

export const previewResponseSchema = z.object({
  preview: itemPreviewSchema
});

export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
export type ItemsResponse = z.infer<typeof itemsResponseSchema>;
export type CountsResponse = z.infer<typeof countsResponseSchema>;
export type VersionsResponse = z.infer<typeof versionsResponseSchema>;
export type McpServersResponse = z.infer<typeof mcpServersResponseSchema>;
export type EventsResponse = z.infer<typeof eventsResponseSchema>;
export type TrashResponse = z.infer<typeof trashResponseSchema>;
export type PreviewResponse = z.infer<typeof previewResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
