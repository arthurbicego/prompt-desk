import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "../ui/tooltip";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  tooltip?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "icon" | "iconSm";
}

export function IconButton({
  className,
  icon: Icon,
  label,
  tooltip = label,
  side = "bottom",
  variant = "ghost",
  size = "icon",
  disabled,
  ...props
}: IconButtonProps) {
  const hoverClassName =
    variant === "ghost"
      ? "text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)] hover:shadow-[inset_0_0_0_1px_var(--border-strong)] active:bg-[var(--surface-2)] disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:shadow-none"
      : "";
  const button = (
    <Button
      className={cn("relative", hoverClassName, className)}
      variant={variant}
      size={size}
      aria-label={label}
      disabled={disabled}
      {...props}
    >
      <Icon size={size === "iconSm" ? 14 : 16} aria-hidden="true" />
    </Button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          {disabled ? <span className="inline-flex cursor-not-allowed">{button}</span> : button}
        </TooltipTrigger>
        <TooltipContent side={side}>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
