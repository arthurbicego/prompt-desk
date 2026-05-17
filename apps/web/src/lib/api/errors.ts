import type { ApiError } from "@prompt-desk/shared";

export class PromptDeskApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, options: { code: string; status: number; details?: unknown }) {
    super(message);
    this.name = "PromptDeskApiError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

export class PromptDeskParseError extends Error {
  readonly details: unknown;

  constructor(message: string, details: unknown) {
    super(message);
    this.name = "PromptDeskParseError";
    this.details = details;
  }
}

export function toApiError(payload: ApiError | null, status: number): PromptDeskApiError {
  if (!payload) {
    return new PromptDeskApiError("Request failed", { code: "request_failed", status });
  }

  return new PromptDeskApiError(payload.error.message, {
    code: payload.error.code,
    status,
    details: payload.error.details
  });
}
