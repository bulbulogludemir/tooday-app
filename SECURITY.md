# Security Policy

tooday is currently a local-first planner with browser-local persistence. The
planned BYOK and self-host sync work will introduce more sensitive boundaries.

## Reporting

Open a GitHub issue for non-sensitive security concerns. For anything involving
secrets, account access, or exploitable private data exposure, avoid posting
secret material publicly and contact the maintainer through the repository
owner profile.

## Current Boundaries

- No hosted tooday backend is included today.
- Browser data is stored locally by the browser.
- Do not commit provider keys, `.env` files, browser storage exports, or server
  credentials.

## AI Endpoint

`/api/chat` proxies to OpenRouter using the server's `OPENROUTER_API_KEY` and
has no user authentication yet. It is intended for localhost / private
deployments only. If you expose a deployment publicly, set `CHAT_ACCESS_TOKEN`
and inject the matching `x-chat-token` header at your reverse proxy, or anyone
who finds the URL can spend your OpenRouter credits. Client-supplied prompt
context is validated server-side (fixed formats only), and requests are capped
at 100 messages.
