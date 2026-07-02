"use client";

import { RotateCcw } from "lucide-react";

/** Route-level error boundary: keeps a crash from taking the whole app down */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="font-display text-2xl font-bold">Something went wrong</h2>
      <p className="max-w-sm text-sm text-muted">
        The view crashed unexpectedly. Your data lives locally and is safe —
        try reloading this view.
      </p>
      {error.digest && (
        <p className="text-[11px] text-muted/50">Ref: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--accent-strong)] px-4 py-2 text-sm font-medium text-white transition-[filter] hover:brightness-110"
      >
        <RotateCcw size={14} /> Try again
      </button>
    </main>
  );
}
