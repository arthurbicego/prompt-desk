import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../util/errors.js";

export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten()));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function parseQuery<T>(schema: ZodSchema<T>, query: unknown): T {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid query parameters", parsed.error.flatten());
  }
  return parsed.data;
}
