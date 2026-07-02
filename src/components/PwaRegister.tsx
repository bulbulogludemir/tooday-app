"use client";

import { useEffect } from "react";

/** Registers the service worker in production so the app is installable */
export default function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    )
      return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registration failures are non-fatal
    });
  }, []);
  return null;
}
