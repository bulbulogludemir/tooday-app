import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import PomodoroBar from "@/components/pomodoro/PomodoroBar";
import Toaster from "@/components/ui/Toaster";
import NotificationsWatcher from "@/components/NotificationsWatcher";
import PwaRegister from "@/components/PwaRegister";
import MotionProvider from "@/components/MotionProvider";
import CommandPalette from "@/components/CommandPalette";
import ThemeApplier from "@/components/ThemeApplier";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tooday",
  description: "A simpler, faster way to plan and track your day.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <span className="pointer-events-none fixed left-6 top-5 z-30 select-none font-display text-sm font-semibold tracking-widest text-white/20">
          tooday
        </span>
        <MotionProvider>
          <PomodoroBar />
          {children}
          <Sidebar />
          <Toaster />
          <CommandPalette />
        </MotionProvider>
        <NotificationsWatcher />
        <PwaRegister />
        <ThemeApplier />
      </body>
    </html>
  );
}
