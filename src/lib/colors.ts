/**
 * Category colors are stored as Tailwind color names. SVG arcs and inline
 * styles need concrete values, so we map each name to its 500/400 shades.
 */
export const COLOR_NAMES = [
  "slate",
  "orange",
  "yellow",
  "amber",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const;

export type ColorName = (typeof COLOR_NAMES)[number];

/** [shade500, shade400, pastel300] per Tailwind color name */
const SHADES: Record<ColorName, [string, string, string]> = {
  slate: ["#64748b", "#94a3b8", "#cbd5e1"],
  orange: ["#f97316", "#fb923c", "#fdba74"],
  yellow: ["#eab308", "#facc15", "#fde047"],
  amber: ["#f59e0b", "#fbbf24", "#fcd34d"],
  lime: ["#84cc16", "#a3e635", "#bef264"],
  green: ["#22c55e", "#4ade80", "#86efac"],
  emerald: ["#10b981", "#34d399", "#6ee7b7"],
  teal: ["#14b8a6", "#2dd4bf", "#5eead4"],
  cyan: ["#06b6d4", "#22d3ee", "#67e8f9"],
  sky: ["#0ea5e9", "#38bdf8", "#7dd3fc"],
  blue: ["#3b82f6", "#60a5fa", "#93c5fd"],
  indigo: ["#6366f1", "#818cf8", "#a5b4fc"],
  violet: ["#8b5cf6", "#a78bfa", "#c4b5fd"],
  purple: ["#a855f7", "#c084fc", "#d8b4fe"],
  fuchsia: ["#d946ef", "#e879f9", "#f0abfc"],
  pink: ["#ec4899", "#f472b6", "#f9a8d4"],
  rose: ["#f43f5e", "#fb7185", "#fda4af"],
};

export const UNCATEGORIZED: [string, string, string] = SHADES.slate;

/**
 * Dial segments for uncategorized activities — a soft slate, visible
 * against the track like the timeline's gray blocks.
 */
export const ARC_UNCATEGORIZED = "#a2adc0";

export function colorShades(
  name: string | null | undefined
): [string, string, string] {
  return SHADES[(name ?? "slate") as ColorName] ?? UNCATEGORIZED;
}

/** solid color for SVG strokes / plain fills */
export function colorSolid(name: string | null | undefined): string {
  return colorShades(name)[0];
}

/** soft pastel 300 shade — dial segments and timeline blocks use this */
export function colorArc(name: string | null | undefined): string {
  return colorShades(name)[2];
}

/** CSS gradient used by the little category dots */
export function dotGradient(name: string | null | undefined): string {
  const [c500, c400] = colorShades(name);
  return `linear-gradient(to top right, ${c500}, ${c400})`;
}
