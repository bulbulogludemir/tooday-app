"use client";

import { useToastStore } from "@/stores/useToastStore";

/** Bottom-center toast stack with an optional action (e.g. Undo) */
export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass elev-2 toast-in pointer-events-auto flex items-center gap-3 rounded-full py-2 pl-4 pr-2 text-sm"
        >
          <span className="text-foreground/90">{t.message}</span>
          {t.actionLabel ? (
            <button
              onClick={() => {
                t.onAction?.();
                dismiss(t.id);
              }}
              className="rounded-full bg-[var(--accent-strong)] px-3 py-1 text-xs font-semibold text-white transition-colors hover:brightness-110"
            >
              {t.actionLabel}
            </button>
          ) : (
            <button
              onClick={() => dismiss(t.id)}
              className="rounded-full px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
