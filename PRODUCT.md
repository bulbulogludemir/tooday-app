# Product

## Register

product

## Users

Demir (solo builder) today; later SaaS users. People who plan their day
visually around a clock dial — opening the app several times a day, often in
low ambient light, to check "what now / what's next" and adjust the plan.
Mobile PWA and desktop.

## Product Purpose

tooday is a clock-first daily planner: per-day schedule of activities around
a 24h dial, todos, pomodoro, and an agentic AI assistant that can manage all
of it (with per-action approval). Local-first storage today, SaaS planned.
Success = the user's whole day lives here with near-zero friction.

## Brand Personality

Calm, precise, nocturnal. A quiet instrument, not a productivity cheerleader.
The clock is the hero; everything else recedes into dark glass.

## Anti-references

- Notion/ClickUp-style dense productivity chrome and card walls.
- Default OS widgets (native selects/dropdowns) breaking the glass language.
- Chirpy assistant copy ("How can I help you today? 🎉").
- Light-mode SaaS cream/white dashboards.

## Design Principles

1. The dial is the hero — panels and overlays must never compete with it.
2. One material: dark glass (`glass` + `elev-*`), one accent, generous radius.
3. Every surface is quiet until interacted with; hover/active states carry the energy.
4. AI acts only with consent — approval cards are first-class UI, not modals.
5. English UI copy, terse and lowercase-calm; the model speaks the user's language.

## Accessibility & Inclusion

No formal WCAG target yet. Keep text ≥4.5:1 on glass surfaces, respect
prefers-reduced-motion via the existing MotionProvider patterns, full
keyboard reachability (existing Alt+N shortcuts, Esc to close overlays).
