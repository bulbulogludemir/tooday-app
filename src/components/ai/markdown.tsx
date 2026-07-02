import React from "react";

/** Minimal inline markdown: only **bold**, since models emit it constantly. */
export function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

/**
 * Tiny block-level markdown for coach-written notes: headings (#, ##),
 * bullet lists (- ), paragraphs, **bold**. Anything fancier stays plain.
 */
export function renderMarkdownLite(text: string): React.ReactNode {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = (key: string) => {
    if (bullets.length === 0) return;
    out.push(
      <ul key={key} className="my-1.5 space-y-1 pl-4">
        {bullets.map((b, i) => (
          <li key={i} className="list-disc text-sm leading-relaxed">
            {renderInline(b)}
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      bullets.push(trimmed.slice(2));
      return;
    }
    flushBullets(`ul-${i}`);
    if (trimmed.startsWith("## ")) {
      out.push(
        <h4 key={i} className="mt-3 text-sm font-semibold">
          {renderInline(trimmed.slice(3))}
        </h4>,
      );
    } else if (trimmed.startsWith("# ")) {
      out.push(
        <h3 key={i} className="mt-3 text-sm font-semibold">
          {renderInline(trimmed.slice(2))}
        </h3>,
      );
    } else if (trimmed.length > 0) {
      out.push(
        <p key={i} className="my-1.5 text-sm leading-relaxed">
          {renderInline(trimmed)}
        </p>,
      );
    }
  });
  flushBullets("ul-end");
  return <>{out}</>;
}
