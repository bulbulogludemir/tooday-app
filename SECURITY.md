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
- BYOK AI is not implemented yet.
- Do not commit provider keys, `.env` files, browser storage exports, or server
  credentials.
