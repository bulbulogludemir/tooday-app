# LLMiki Schema

This wiki records durable knowledge for tooday.

## Layout

- `wiki/sources/`: summaries of project or code sources.
- `wiki/concepts/`: reusable product and technical concepts.
- `wiki/syntheses/`: higher-level product and architecture conclusions.
- Public README screenshots live in `docs/assets/`.

## Naming

- lowercase hyphenated filenames;
- date suffixes as `YYYY-MM-DD` when state may drift;
- stable concept names without dates unless the concept itself is time-bound.

## Page Style

- Use Markdown that works in GitHub and Obsidian.
- Use `[[Wiki Links]]` for wiki navigation when helpful.
- Cite local source pages with relative Markdown links.
- Separate source claims from synthesis or roadmap assumptions.

## Index Categories

`wiki/index.md` groups pages into Sources, Concepts, Syntheses, Outputs, Open
Questions, and Health.

## Log Format

Append entries in this format:

```markdown
## [YYYY-MM-DD] action | Title
```

Keep `wiki/log.md` append-only.

## Update Rule

When a task creates durable product, architecture, source, or investigation
knowledge, update the relevant wiki page, `wiki/index.md`, and `wiki/log.md`.
