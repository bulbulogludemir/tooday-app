"use client";

import { minutesToHHmm } from "@/lib/time";
import type { Activity, Category } from "@/stores/usePlanStore";
import { categoryOf } from "@/stores/usePlanStore";
import Modal from "@/components/ui/Modal";
import ColorDot from "@/components/ui/ColorDot";

interface ActivityDetailModalProps {
  activity: Activity | null;
  categories: Category[];
  onClose: () => void;
}

/** Read-only detail shown when clicking a card on the clock view */
export default function ActivityDetailModal({
  activity,
  categories,
  onClose,
}: ActivityDetailModalProps) {
  const cat = activity ? categoryOf(activity, categories) : null;
  return (
    <Modal
      open={activity !== null}
      onOpenChange={(v) => !v && onClose()}
      title="Activity Detail"
      width={440}
    >
      {activity && (
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-muted">Name</span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                Category
                <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-foreground">
                  <ColorDot color={cat?.color} size={5} />
                  {cat?.name ?? "None"}
                </span>
              </span>
            </div>
            <div className="flex h-11 items-center rounded-lg bg-surface-2 px-3 text-sm">
              {activity.name}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-xs text-muted">Time</span>
            <div className="flex items-center gap-3">
              <div className="flex h-11 flex-1 items-center rounded-lg bg-surface-2 px-3 text-sm tabular-nums">
                {minutesToHHmm(activity.start)}
              </div>
              <div className="flex h-11 flex-1 items-center rounded-lg bg-surface-2 px-3 text-sm tabular-nums">
                {minutesToHHmm(activity.start + activity.duration)}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
