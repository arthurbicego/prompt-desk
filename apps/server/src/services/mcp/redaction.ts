const SENSITIVE_NAME_PATTERN = /token|secret|password|credential|authorization|api[_-]?key|access[_-]?key|bearer/i;
const SENSITIVE_VALUE_PATTERN = /^(bearer\s+)?(sk-[a-z0-9_-]+|[a-z0-9_/-]{32,})$/i;

export const REDACTED_VALUE = "<redacted>";
export const ENV_VAR_REFERENCE = "<from-env>";

export function isSensitiveName(name: string): boolean {
  return SENSITIVE_NAME_PATTERN.test(name);
}

function redactValue(value: unknown): string {
  if (typeof value !== "string") return REDACTED_VALUE;
  if (!value) return "";
  return REDACTED_VALUE;
}

export function redactKeyValueMap(values: Record<string, unknown>): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    redacted[key] = redactValue(value);
  }
  return redacted;
}

export function redactEnvReferences(names: string[]): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const name of names) {
    redacted[name] = ENV_VAR_REFERENCE;
  }
  return redacted;
}

export function redactArgs(args: string[]): string[] {
  const redacted: string[] = [];
  let redactNext = false;

  for (const arg of args) {
    if (redactNext) {
      redacted.push(REDACTED_VALUE);
      redactNext = false;
      continue;
    }

    const equalsIndex = arg.indexOf("=");
    if (equalsIndex > 0) {
      const key = arg.slice(0, equalsIndex);
      const value = arg.slice(equalsIndex + 1);
      redacted.push(
        isSensitiveName(key) || SENSITIVE_VALUE_PATTERN.test(value)
          ? `${key}=${REDACTED_VALUE}`
          : arg
      );
      continue;
    }

    redacted.push(SENSITIVE_VALUE_PATTERN.test(arg) ? REDACTED_VALUE : arg);
    redactNext = arg.startsWith("-") && isSensitiveName(arg);
  }

  return redacted;
}

export function mergeRedactedMaps(...maps: Array<Record<string, string>>): Record<string, string> {
  return Object.assign({}, ...maps);
}
