"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * Rolling-digit clock: each character sits in a fixed slot and slides up
 * when it changes, like a mechanical counter — only the digits that change
 * actually move.
 */
export default function TimeTicker({
  value,
  className = "",
}: {
  value: string; // e.g. "02:41"
  className?: string;
}) {
  return (
    <span className={`inline-flex items-baseline overflow-hidden ${className}`}>
      {value.split("").map((ch, i) => (
        <span
          key={i}
          className={`relative inline-flex justify-center ${
            ch === ":" ? "w-[0.34em]" : "w-[0.62em]"
          }`}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={ch}
              initial={{ y: "0.85em", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-0.85em", opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block"
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
