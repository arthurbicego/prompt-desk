import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
  info: "border-[color-mix(in_oklab,var(--info)_48%,transparent)] bg-[var(--info-muted)] text-[var(--info)]",
  success:
    "border-[color-mix(in_oklab,var(--success)_48%,transparent)] bg-[var(--success-muted)] text-[var(--success)]",
  warning:
    "border-[color-mix(in_oklab,var(--warning)_48%,transparent)] bg-[var(--warning-muted)] text-[var(--warning)]",
  danger:
    "border-[color-mix(in_oklab,var(--danger)_48%,transparent)] bg-[var(--danger-muted)] text-[var(--danger)]"
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
