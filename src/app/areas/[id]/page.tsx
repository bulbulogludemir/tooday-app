"use client";

import { ArrowLeft, LayoutGrid, MessageCircle, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import AreaCoach from "@/components/areas/AreaCoach";
import { AREA_ICONS } from "@/components/areas/areaIcons";
import BlockCard from "@/components/areas/BlockCard";
import { dotGradient } from "@/lib/colors";
import { useNow } from "@/lib/useNow";
import { useAreasStore, type AreaBlock } from "@/stores/useAreasStore";
import { useToastStore } from "@/stores/useToastStore";

const NO_BLOCKS: AreaBlock[] = [];

export default function AreaPage() {
  const now = useNow(60_000);
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const area = useAreasStore((s) => s.areas.find((a) => a.id === id));
  const blocks = useAreasStore((s) => s.blocks[id] ?? NO_BLOCKS);
  const [tab, setTab] = useState<"content" | "coach">("coach");

  if (!now) return <main className="min-h-screen" />;
  if (!area) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted">This area doesn&apos;t exist.</p>
        <button
          onClick={() => router.push("/areas")}
          className="rounded-full bg-surface-2 px-3.5 py-1.5 text-xs text-neutral-300 hover:bg-white/10"
        >
          Back to areas
        </button>
      </main>
    );
  }

  const Icon = AREA_ICONS[area.icon] ?? LayoutGrid;

  const deleteArea = () => {
    const s = useAreasStore.getState();
    const snapshot = {
      area,
      blocks: s.blocks[id] ?? [],
      memory: s.memories[id] ?? "",
      chat: s.chats[id] ?? [],
    };
    s.deleteArea(id);
    router.push("/areas");
    useToastStore.getState().show(`"${area.name}" deleted`, {
      actionLabel: "Undo",
      onAction: () =>
        useAreasStore
          .getState()
          .restoreArea(
            snapshot.area,
            snapshot.blocks,
            snapshot.memory,
            snapshot.chat,
          ),
    });
  };

  const contentPane = (
    <div className="min-w-0 flex-1 overflow-y-auto px-6 pb-24 pt-6">
      {blocks.length === 0 ? (
        <div className="mt-20 text-center text-sm text-muted">
          Nothing here yet — your coach will build this page as you talk.
        </div>
      ) : (
        <div className="gap-4 md:columns-2">
          {blocks.map((block) => (
            <BlockCard
              key={block.id}
              areaId={id}
              block={block}
              accentColor={area.color}
            />
          ))}
        </div>
      )}
    </div>
  );

  const coachPane = (
    <aside className="flex w-full flex-col border-white/[0.06] lg:w-[400px] lg:shrink-0 lg:border-l">
      <AreaCoach areaId={id} />
    </aside>
  );

  return (
    <main className="mx-auto flex h-screen w-full max-w-6xl flex-col px-0 lg:px-6">
      <header className="flex items-center gap-3 px-6 pb-4 pt-24 lg:px-0">
        <button
          onClick={() => router.push("/areas")}
          aria-label="Back to areas"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <ArrowLeft size={15} />
        </button>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: dotGradient(area.color) }}
        >
          <Icon size={15} className="text-black/70" />
        </span>
        <h1 className="font-display text-lg font-semibold">{area.name}</h1>
        <button
          onClick={deleteArea}
          aria-label="Delete area"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </header>

      {/* mobile tab switch */}
      <div className="mx-6 mb-3 flex gap-1 rounded-full bg-surface-2 p-1 lg:hidden">
        {(
          [
            { key: "content", label: "Content", icon: LayoutGrid },
            { key: "coach", label: "Coach", icon: MessageCircle },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs transition-colors ${
              tab === t.key
                ? "bg-white/10 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* desktop: both panes; mobile: active tab */}
        <div className={`min-w-0 flex-1 ${tab === "coach" ? "hidden lg:flex" : "flex"}`}>
          {contentPane}
        </div>
        <div
          className={`min-h-0 flex-1 lg:flex lg:flex-none ${
            tab === "content" ? "hidden" : "flex"
          }`}
        >
          {coachPane}
        </div>
      </div>
    </main>
  );
}
