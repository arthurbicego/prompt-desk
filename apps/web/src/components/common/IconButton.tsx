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
  tooltip,
  side = "bottom",
  variant = "ghost",
  size = "icon",
  ...props
}: IconButtonProps) {
  const button = (
    <Button
      className={cn("relative", className)}
      variant={variant}
      size={size}
      aria-label={label}
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
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side={side}>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
