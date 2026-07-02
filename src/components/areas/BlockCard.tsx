"use client";

import { ExternalLink } from "lucide-react";
import { renderMarkdownLite } from "@/components/ai/markdown";
import { colorSolid } from "@/lib/colors";
import { useAreasStore, type AreaBlock } from "@/stores/useAreasStore";

function Sparkline({
  history,
  color,
}: {
  history: { date: string; value: number }[];
  color: string;
}) {
  if (history.length < 2) return null;
  const points = history.slice(-24);
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const W = 160;
  const H = 36;
  const path = points
    .map(
      (p, i) =>
        `${(i / (points.length - 1)) * W},${H - 4 - ((p.value - min) / span) * (H - 8)}`,
    )
    .join(" ");
  return (
    <svg width={W} height={H} className="mt-2 overflow-visible">
      <polyline
        points={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

export default function BlockCard({
  areaId,
  block,
  accentColor,
}: {
  areaId: string;
  block: AreaBlock;
  accentColor: string;
}) {
  const toggleChecklistItem = useAreasStore((s) => s.toggleChecklistItem);
  const solid = colorSolid(accentColor);

  return (
    <section className="glass elev-1 mb-4 break-inside-avoid rounded-2xl border-t border-white/[0.07] p-4">
      <h3 className="font-display text-sm font-semibold tracking-wide">
        {block.title}
      </h3>

      {block.type === "note" && (
        <div className="mt-1 text-neutral-300">
          {renderMarkdownLite(block.markdown)}
        </div>
      )}

      {block.type === "table" && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {block.columns.map((c, i) => (
                  <th
                    key={i}
                    className="border-b border-white/[0.06] pb-1.5 pr-4 text-left text-xs font-medium text-muted"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border-b border-white/[0.04] py-1.5 pr-4 text-neutral-200"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {block.type === "metric" && (
        <div className="mt-2">
          {block.history.length > 0 ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-semibold">
                  {block.history[block.history.length - 1].value}
                </span>
                <span className="text-sm text-muted">{block.unit}</span>
              </div>
              <Sparkline history={block.history} color={solid} />
              <div className="mt-1 text-[11px] text-muted/70">
                {block.history[block.history.length - 1].date} ·{" "}
                {block.history.length} entries
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">No entries yet.</p>
          )}
        </div>
      )}

      {block.type === "routine" && (
        <div className="mt-2 space-y-2.5">
          {block.days.map((d, i) => (
            <div key={i}>
              <div className="text-xs font-medium" style={{ color: solid }}>
                {d.day}
              </div>
              <ul className="mt-1 space-y-1">
                {d.items.map((item, j) => (
                  <li key={j} className="text-sm text-neutral-200">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {block.type === "checklist" && (
        <ul className="mt-2 space-y-1.5">
          {block.items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => toggleChecklistItem(areaId, block.id, item.id)}
                className="flex w-full items-center gap-2.5 text-left"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    item.done ? "border-transparent" : "border-white/25"
                  }`}
                  style={item.done ? { background: solid } : undefined}
                >
                  {item.done && (
                    <svg width="8" height="8" viewBox="0 0 8 8">
                      <path
                        d="M1 4l2 2 4-4"
                        stroke="#0e0e10"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-sm ${
                    item.done ? "text-muted line-through" : "text-neutral-200"
                  }`}
                >
                  {item.text}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {block.type === "links" && (
        <ul className="mt-2 space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1.5 text-sm text-neutral-200 hover:text-accent"
              >
                {item.label}
                <ExternalLink
                  size={11}
                  className="text-muted/60 group-hover:text-accent"
                />
              </a>
              {item.note && (
                <div className="text-xs text-muted">{item.note}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
