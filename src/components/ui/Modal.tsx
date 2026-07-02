"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}

/** Radix Dialog with framer-motion enter/exit, styled like the app's modals */
export default function Modal({
  open,
  onOpenChange,
  title,
  children,
  footer,
  width = 440,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, x: "-50%", y: "-48%" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.96, x: "-50%", y: "-48%" }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="elev-3 fixed left-1/2 top-1/2 z-50 max-w-[92vw] rounded-2xl border-t border-white/[0.07] bg-surface/85 outline-none backdrop-blur-2xl"
                style={{ width }}
              >
                <div className="flex items-center justify-between px-6 pt-5">
                  <Dialog.Title className="text-lg font-semibold">
                    {title}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      aria-label="Close"
                      className="rounded-md p-1 text-muted transition-colors hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  </Dialog.Close>
                </div>
                <div className="px-6 py-5">{children}</div>
                {footer && (
                  <div className="flex items-center justify-between rounded-b-2xl bg-surface-2/50 px-6 py-4">
                    {footer}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
