import * as React from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { cn } from "../ui/utils";

export interface ActionTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
  delayDuration?: number;
}

export function ActionTooltip({
  content,
  children,
  side = "top",
  align = "center",
  className,
  delayDuration = 100,
}: ActionTooltipProps) {
  if (!content) {
    return <>{children}</>;
  }

  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        sideOffset={6}
        className={cn(
          "max-w-xs px-2.5 py-1.5 text-xs font-normal leading-normal text-center shadow-lg pointer-events-none",
          className
        )}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export default ActionTooltip;

