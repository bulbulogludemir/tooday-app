import {
  BookOpen,
  Briefcase,
  Dumbbell,
  GraduationCap,
  Heart,
  Home,
  Music,
  Palette,
  Plane,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const AREA_ICONS: Record<string, LucideIcon> = {
  Heart,
  Wallet,
  GraduationCap,
  Palette,
  Dumbbell,
  Briefcase,
  Plane,
  Home,
  BookOpen,
  Music,
};

export const AREA_COLORS = [
  "rose",
  "orange",
  "amber",
  "lime",
  "emerald",
  "teal",
  "sky",
  "indigo",
  "violet",
  "pink",
] as const;

export const AREA_PRESETS = [
  { name: "Health", icon: "Heart", color: "rose" },
  { name: "Finance", icon: "Wallet", color: "emerald" },
  { name: "Learning", icon: "GraduationCap", color: "sky" },
  { name: "Hobby", icon: "Palette", color: "amber" },
] as const;
