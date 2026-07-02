"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bookmark, CopyPlus, LayoutTemplate, Plus, Scissors } from "lucide-react";
import { useUiStore } from "@/stores/useUiStore";
import { Tooltip, TooltipProvider, Kbd } from "@/components/ui/Tooltip";

interface PlanToolsRailProps {
  onNewActivity: () => void;
  onManageCategories: () => void;
  onOpenTemplates: () => void;
  /** copy the shown day N days forward */
  onCopyDay: (offsetDays: number) => void;
}

/** Extra tool rail shown only on the Plan view, right under the nav rail */
export default function PlanToolsRail({
  onNewActivity,
  onManageCategories,
  onOpenTemplates,
  onCopyDay,
}: PlanToolsRailProps) {
  const cutMode = useUiStore((s) => s.cutMode);
  const toggleCutMode = useUiStore((s) => s.toggleCutMode);
  const railOpen = useUiStore((s) => s.railOpen);

  // collapses together with the main nav rail, like the original
  if (!railOpen) return null;

  const itemCls =
    "flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-foreground";

  return (
    <TooltipProvider>
      <div className="glass elev-1 fixed right-2 top-[calc(50%+118px)] z-40 flex animate-[rail-in_0.2s_ease-out] flex-col items-center gap-1 rounded-full p-1.5">
        <Tooltip content="New Activity">
          <button aria-label="New activity" onClick={onNewActivity} className={itemCls}>
            <Plus size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Manage Categories">
          <button
            aria-label="Manage categories"
            onClick={onManageCategories}
            className={itemCls}
          >
            <Bookmark size={15} />
          </button>
        </Tooltip>
        <Tooltip content="Day Templates">
          <button
            aria-label="Day templates"
            onClick={onOpenTemplates}
            className={itemCls}
          >
            <LayoutTemplate size={15} />
          </button>
        </Tooltip>
        <DropdownMenu.Root>
          <Tooltip content="Copy day to…">
            <DropdownMenu.Trigger asChild>
              <button aria-label="Copy day" className={itemCls}>
                <CopyPlus size={15} />
              </button>
            </DropdownMenu.Trigger>
          </Tooltip>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="left"
              sideOffset={8}
              className="elev-2 z-[60] rounded-lg border-t border-white/[0.07] bg-surface-2/90 p-1 backdrop-blur-md"
            >
              {[
                { label: "Tomorrow", offset: 1 },
                { label: "In 2 days", offset: 2 },
                { label: "Next week (same day)", offset: 7 },
              ].map((o) => (
                <DropdownMenu.Item
                  key={o.offset}
                  onSelect={() => onCopyDay(o.offset)}
                  className="cursor-pointer rounded px-2.5 py-1.5 text-xs outline-none data-[highlighted]:bg-white/5"
                >
                  {o.label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <Tooltip
          content={
            <>
              Cut Mode
              <span className="flex items-center gap-0.5">
                <Kbd>⌥</Kbd>
                <Kbd>C</Kbd>
              </span>
            </>
          }
        >
          <button
            aria-label="Cut mode"
            onClick={toggleCutMode}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              cutMode
                ? "bg-red-500/20 text-red-400"
                : "text-muted hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <Scissors size={15} />
          </button>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
