"use client";

import { motion } from "framer-motion";
import { LayoutGrid, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AREA_COLORS,
  AREA_ICONS,
  AREA_PRESETS,
} from "@/components/areas/areaIcons";
import Modal from "@/components/ui/Modal";
import { dotGradient } from "@/lib/colors";
import { useNow } from "@/lib/useNow";
import { useAreasStore } from "@/stores/useAreasStore";

export default function AreasPage() {
  const now = useNow(60_000);
  const router = useRouter();
  const areas = useAreasStore((s) => s.areas);
  const blocks = useAreasStore((s) => s.blocks);
  const addArea = useAreasStore((s) => s.addArea);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Heart");
  const [color, setColor] = useState("rose");

  if (!now) return <main className="min-h-screen" />;

  const create = (n = name, i = icon, c = color) => {
    const trimmed = n.trim();
    if (!trimmed) return;
    const id = addArea(trimmed, i, c);
    setCreating(false);
    router.push(`/areas/${id}`);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 pt-28">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Areas</h1>
        <button
          onClick={() => {
            setName("");
            setCreating(true);
          }}
          className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-white/10"
        >
          <Plus size={14} /> New area
        </button>
      </div>

      {areas.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-5 text-center">
          <div className="glass flex h-12 w-12 items-center justify-center rounded-full">
            <LayoutGrid size={18} className="text-accent" />
          </div>
          <p className="max-w-[300px] text-sm leading-relaxed text-muted">
            One page per part of your life — health, finance, learning — each
            curated by its own AI coach.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {AREA_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => create(p.name, p.icon, p.color)}
                className="rounded-full bg-surface-2 px-3.5 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-white/10 hover:text-foreground"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {areas.map((area) => {
            const Icon = AREA_ICONS[area.icon] ?? LayoutGrid;
            const count = (blocks[area.id] ?? []).length;
            return (
              <motion.button
                key={area.id}
                layout
                onClick={() => router.push(`/areas/${area.id}`)}
                className="glass elev-1 flex items-center gap-4 rounded-2xl border-t border-white/[0.07] p-5 text-left transition-colors hover:bg-white/[0.04]"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{ background: dotGradient(area.color) }}
                >
                  <Icon size={18} className="text-black/70" />
                </span>
                <span>
                  <span className="block font-display text-base font-semibold">
                    {area.name}
                  </span>
                  <span className="text-xs text-muted">
                    {count === 0 ? "Not set up yet" : `${count} blocks`}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="New area"
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => create()}
              disabled={!name.trim()}
              className="rounded-lg bg-[var(--accent-strong)] px-5 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-40"
            >
              Create
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {AREA_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setName(p.name);
                  setIcon(p.icon);
                  setColor(p.color);
                }}
                className="rounded-full bg-surface-2 px-3 py-1 text-xs text-neutral-300 hover:bg-white/10"
              >
                {p.name}
              </button>
            ))}
          </div>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Area name…"
            className="h-11 w-full rounded-lg border border-transparent bg-surface-2 px-3.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent/60"
          />
          <div className="flex flex-wrap gap-2">
            {Object.entries(AREA_ICONS).map(([key, Icon]) => (
              <button
                key={key}
                onClick={() => setIcon(key)}
                aria-label={key}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  icon === key
                    ? "bg-white/10 text-foreground"
                    : "bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {AREA_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={c}
                className={`h-7 w-7 rounded-full transition-transform ${
                  color === c ? "scale-110 ring-2 ring-white/60" : ""
                }`}
                style={{ background: dotGradient(c) }}
              />
            ))}
          </div>
        </div>
      </Modal>
    </main>
  );
}
