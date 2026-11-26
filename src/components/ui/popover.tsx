"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "./utils";

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ref,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const [contentEl, setContentEl] = React.useState<HTMLDivElement | null>(null);

  // Quando um Popover abre dentro de um Radix Dialog, o react-remove-scroll
  // bloqueia eventos `wheel`/`touchmove` no `document` para portais fora do modal.
  // Parar a propagação nativa aqui permite fazer scroll com a roda do rato.
  React.useEffect(() => {
    if (!contentEl) return;
    const stop = (e: Event) => e.stopPropagation();
    contentEl.addEventListener("wheel", stop, { passive: true });
    contentEl.addEventListener("touchmove", stop, { passive: true });
    return () => {
      contentEl.removeEventListener("wheel", stop);
      contentEl.removeEventListener("touchmove", stop);
    };
  }, [contentEl]);

  const mergedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      setContentEl(node);
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [ref],
  );

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={mergedRef}
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[150] w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
