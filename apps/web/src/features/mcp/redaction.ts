const SENSITIVE_KEY_PATTERN = /(token|secret|password|passwd|api[_-]?key|authorization|auth|credential|session|cookie)/i;

export function redactValue(key: string, value: string | null | undefined): string {
  if (value === null || value === undefined || value.length === 0) {
    return "";
  }

  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return "redacted";
  }

  if (value.length <= 6) {
    return "redacted";
  }

  return `${value.slice(0, 2)}...${value.slice(-2)}`;
}

export function redactRecord(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, redactValue(key, value)]));
}

