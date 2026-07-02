"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatDuration, minutesToHHmm } from "@/lib/time";

export interface DialSegment {
  id: string;
  start: number; // minutes since midnight
  duration: number; // minutes
  color: string; // solid fill color
  /** activity name shown in the hover tooltip */
  label?: string;
}

interface ClockDialProps {
  segments: DialSegment[];
  /** current time in minutes; needle hidden when undefined */
  needleMinutes?: number;
  size?: number;
  /** clicking a planned chunk (activity id) */
  onSegmentClick?: (id: string) => void;
}

/** the dial shows the full day: 00:00 at the top, clockwise around 24h */
const DAY = 1440;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function minutesToAngle(mins: number): number {
  return (mins / DAY) * 360;
}

/**
 * A filled annular sector with slightly rounded corners — like a timeline
 * block bent around the ring. Corner radius stays small so the ends read
 * as firm edges, not pills.
 */
function chunkPath(
  cx: number,
  cy: number,
  rMid: number,
  width: number,
  a0: number,
  a1: number,
  corner: number
) {
  const Ro = rMid + width / 2;
  const Ri = rMid - width / 2;
  const span = a1 - a0;
  // clamp so tiny chunks and the band height can still fit the corners
  const cr = Math.min(corner, width / 2, ((span * Math.PI) / 180) * Ri * 0.45);
  const aOut = (cr / Ro) * (180 / Math.PI);
  const aIn = (cr / Ri) * (180 / Math.PI);
  const p1 = polar(cx, cy, Ro, a0 + aOut);
  const p2 = polar(cx, cy, Ro, a1 - aOut);
  const p3 = polar(cx, cy, Ro - cr, a1);
  const p4 = polar(cx, cy, Ri + cr, a1);
  const p5 = polar(cx, cy, Ri, a1 - aIn);
  const p6 = polar(cx, cy, Ri, a0 + aIn);
  const p7 = polar(cx, cy, Ri + cr, a0);
  const p8 = polar(cx, cy, Ro - cr, a0);
  const largeOuter = span - 2 * aOut > 180 ? 1 : 0;
  const largeInner = span - 2 * aIn > 180 ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${Ro} ${Ro} 0 ${largeOuter} 1 ${p2.x} ${p2.y}`,
    `A ${cr} ${cr} 0 0 1 ${p3.x} ${p3.y}`,
    `L ${p4.x} ${p4.y}`,
    `A ${cr} ${cr} 0 0 1 ${p5.x} ${p5.y}`,
    `A ${Ri} ${Ri} 0 ${largeInner} 0 ${p6.x} ${p6.y}`,
    `A ${cr} ${cr} 0 0 1 ${p7.x} ${p7.y}`,
    `L ${p8.x} ${p8.y}`,
    `A ${cr} ${cr} 0 0 1 ${p1.x} ${p1.y}`,
    "Z",
  ].join(" ");
}

export default function ClockDial({
  segments,
  needleMinutes,
  size = 240,
  onSegmentClick,
}: ClockDialProps) {
  const [hover, setHover] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const c = size / 2;
  const stroke = size * 0.105; // band thickness
  const r = c - stroke / 2 - size * 0.015; // small margin for the active chunk's breath

  /**
   * The whole ring is made of chunks — no continuous track behind them.
   * Activities become colored chunks; the leftover time in between becomes
   * dark "unplanned" chunks. Every boundary is a clear gap, and the
   * unplanned stretch wrapping over midnight is split at 00:00.
   */
  const arcs = useMemo(() => {
    const acts = segments
      .map((s) => ({
        ...s,
        s0: Math.max(0, s.start),
        s1: Math.min(DAY, s.start + s.duration),
      }))
      .filter((s) => s.s1 > s.s0)
      .sort((a, b) => a.s0 - b.s0);

    const chunks: {
      id: string;
      s0: number;
      s1: number;
      color: string;
      active: boolean;
      planned: boolean;
    }[] = [];
    let cursor = 0;
    for (const a of acts) {
      if (a.s0 > cursor)
        chunks.push({
          id: `gap-${cursor}`,
          s0: cursor,
          s1: a.s0,
          color: "var(--ring-track)",
          active: false,
          planned: false,
        });
      chunks.push({
        id: a.id,
        s0: a.s0,
        s1: a.s1,
        color: a.color,
        active:
          needleMinutes !== undefined &&
          needleMinutes >= a.s0 &&
          needleMinutes < a.s1,
        planned: true,
      });
      cursor = Math.max(cursor, a.s1);
    }
    if (cursor < DAY)
      chunks.push({
        id: `gap-${cursor}`,
        s0: cursor,
        s1: DAY,
        color: "var(--ring-track)",
        active: false,
        planned: false,
      });

    // ~0.9° shaved from each side -> a clear ~1.8° divider between chunks
    const inset = 0.9;
    return chunks
      .map((ch) => {
        const a0 = minutesToAngle(ch.s0) + inset;
        const a1 = Math.min(minutesToAngle(ch.s1) - inset, 359.99);
        if (a1 <= a0) return null;
        // active chunk keeps the same size — the glow makes it stand out
        return {
          id: ch.id,
          d: chunkPath(c, c, r, stroke * 0.92, a0, a1, stroke * 0.24),
          color: ch.color,
          active: ch.active,
          planned: ch.planned,
        };
      })
      .filter(Boolean) as {
      id: string;
      d: string;
      color: string;
      active: boolean;
      planned: boolean;
    }[];
  }, [segments, needleMinutes, c, r, stroke]);

  const needleAngle =
    needleMinutes === undefined ? null : minutesToAngle(needleMinutes % DAY);

  // tip reaches into the middle of the band
  const needleLength = r + stroke * 0.1;

  const activeColor = arcs.find((a) => a.active)?.color;

  return (
    <div
      className="dial-in relative"
      style={{ width: size, height: size }}
    >
      {/* ambient halo behind the dial — tinted by the running activity */}
      <div
        aria-hidden
        className="absolute -inset-[14%] rounded-full transition-colors duration-1000"
        style={{
          background: `radial-gradient(circle, ${
            activeColor ? `${activeColor}14` : "rgba(255,255,255,0.04)"
          } 0%, transparent 68%)`,
          filter: "blur(18px)",
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="clock dial"
        className="relative"
      >
        <defs>
          <radialGradient id="dial-face" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="#17171b" />
            <stop offset="70%" stopColor="#121215" />
            <stop offset="100%" stopColor="#0f0f12" />
          </radialGradient>
        </defs>
        {/* face disc with a soft radial falloff */}
        <circle cx={c} cy={c} r={r + stroke / 2} fill="url(#dial-face)" />
        {/* rim light around the dial */}
        <circle
          cx={c}
          cy={c}
          r={r + stroke / 2}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
        <circle cx={c} cy={c} r={r - stroke / 2} fill="var(--background)" />
        {/* instrument ticks — one per hour, quarters emphasized */}
        {Array.from({ length: 24 }, (_, h) => {
          const p = polar(c, c, r - stroke / 2 - size * 0.05, (h / 24) * 360);
          const major = h % 6 === 0;
          return (
            <circle
              key={h}
              cx={p.x}
              cy={p.y}
              r={major ? size * 0.0075 : size * 0.0045}
              fill={`rgba(255,255,255,${major ? 0.16 : 0.07})`}
            />
          );
        })}
        {/* ring chunks — soft staggered fade-in, active last */}
        {[...arcs]
          .sort((a, b) => Number(a.active) - Number(b.active))
          .map((a, i) => (
            <motion.path
              key={`${a.id}-${a.active}`}
              d={a.d}
              fill={a.color}
              className={`${a.active ? "dial-active-glow " : ""}${
                a.planned && onSegmentClick ? "cursor-pointer" : ""
              }`}
              onMouseMove={
                a.planned
                  ? (e) => {
                      const rect = (
                        e.currentTarget.ownerSVGElement as SVGSVGElement
                      ).getBoundingClientRect();
                      setHover({
                        id: a.id,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }
                  : undefined
              }
              onMouseLeave={a.planned ? () => setHover(null) : undefined}
              onClick={
                a.planned && onSegmentClick
                  ? () => onSegmentClick(a.id)
                  : undefined
              }
              style={
                {
                  "--seg-glow": `${a.color}66`,
                  filter: a.active
                    ? undefined
                    : a.planned
                      ? "drop-shadow(0 1px 2px rgba(0,0,0,0.4))"
                      : undefined,
                } as React.CSSProperties
              }
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.08 + i * 0.05 }}
            />
          ))}
        {/* needle — CSS transform with view-box origin keeps it centered */}
        {needleAngle !== null && (
          <g style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.55))" }}>
            <g
              style={{
                transform: `rotate(${needleAngle}deg)`,
                transformOrigin: `${c}px ${c}px`,
                transformBox: "view-box",
                transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {/* tapered needle: wide at the hub, fine at the tip */}
              <polygon
                points={`${c - size * 0.008},${c} ${c + size * 0.008},${c} ${
                  c + size * 0.0028
                },${c - needleLength} ${c - size * 0.0028},${c - needleLength}`}
                fill="white"
              />
              <circle
                cx={c}
                cy={c - needleLength}
                r={size * 0.006}
                fill="white"
              />
            </g>
            {/* center hub with a faint halo */}
            <circle
              cx={c}
              cy={c}
              r={size * 0.062}
              fill="rgba(255,255,255,0.07)"
            />
            <circle cx={c} cy={c} r={size * 0.042} fill="white" />
          </g>
        )}
      </svg>
      {/* hover tooltip for planned chunks */}
      {hover &&
        (() => {
          const seg = segments.find((s) => s.id === hover.id);
          if (!seg) return null;
          return (
            <div
              className="elev-2 pointer-events-none absolute z-30 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5 whitespace-nowrap rounded-lg border-t border-white/[0.07] bg-surface-2/90 px-3 py-1.5 text-center text-xs backdrop-blur-md"
              style={{ left: hover.x, top: hover.y - 10 }}
            >
              <span className="font-medium">{seg.label ?? "Activity"}</span>
              <span className="tabular-nums text-muted">
                {minutesToHHmm(seg.start)}-
                {minutesToHHmm(seg.start + seg.duration)} ·{" "}
                {formatDuration(seg.duration)}
              </span>
            </div>
          );
        })()}
    </div>
  );
}
