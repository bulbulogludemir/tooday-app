"use client";

import { MotionConfig } from "framer-motion";

/** Framer Motion honors the user's reduced-motion preference */
export default function MotionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
