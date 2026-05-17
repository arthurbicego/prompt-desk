import { z } from "zod";
import { appEventSchema } from "./schemas.js";

export const sseEnvelopeSchema = z.object({
  id: z.string(),
  event: z.string(),
  data: appEventSchema
});

export type SseEnvelope = z.infer<typeof sseEnvelopeSchema>;
