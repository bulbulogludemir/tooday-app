"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={150}>{children}</RadixTooltip.Provider>
  );
}

interface TooltipProps {
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  children: React.ReactNode;
}

export function Tooltip({ content, side = "left", children }: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={10}
          className="elev-2 z-[60] flex items-center gap-2 whitespace-nowrap rounded-lg border-t border-white/[0.07] bg-surface-2/85 px-3 py-1.5 text-xs text-foreground backdrop-blur-md data-[state=delayed-open]:animate-in"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/10 px-1 py-px text-[10px] text-muted">
      {children}
    </kbd>
  );
}
