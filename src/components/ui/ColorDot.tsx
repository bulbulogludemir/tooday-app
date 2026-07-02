import { dotGradient } from "@/lib/colors";

export default function ColorDot({
  color,
  size = 6,
  className = "",
}: {
  color: string | null | undefined;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size, background: dotGradient(color) }}
    />
  );
}
