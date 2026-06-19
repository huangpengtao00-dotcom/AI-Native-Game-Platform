# PRD Alignment

## Product Goal

ForgePlay is an AI Native interactive game platform for ordinary players and interactive content creators. Players discover and play community-published interactive games. Creators use natural-language ideas and multimodal reference material to collaborate with an Agent, generate a playable game, preview it, and publish it.

## User Roles

| Role | Required capability | Implementation evidence |
| --- | --- | --- |
| Player | Browse published interactive games. | Home calls `/api/games?status=published` and renders database-backed cards. |
| Player | Click a game and immediately play. | Home `Play` button calls `/api/games/:id/manifest`; Play mounts the manifest entry in a sandboxed iframe. |
| Player | See title, cover, author, summary, tags, and publish time. | `mapGame` returns metadata and `public/app.js` renders game cards. |
| Creator | Login and enter Create. | Auth endpoints create HttpOnly cookie sessions; protected Create route redirects unauthenticated users to Auth. |
| Creator | Enter creative text and upload reference material. | `/api/assets` stores uploads with sha256 and safe object keys; `/api/tasks` accepts prompt/title/asset IDs. |
| Creator | Wait for Agent to generate a runnable game. | `AgentOrchestrator` runs async steps and persists task progress plus logs. |
| Creator | Preview, publish, edit, or regenerate. | MVP supports preview and publish; edit/regenerate are documented in `docs/completion.md` as the next iteration. |
| Platform maintainer | Monitor generation stability. | Tasks, logs, audit events, request IDs, `/api/health`, and `/api/ready`. |
| Platform maintainer | Manage game metadata and object files. | SQLite metadata tables plus `LocalObjectStorage` adapter boundary. |
| Platform maintainer | Handle unsafe content, abnormal packages, and failed tasks. | Prompt-injection phrase screen, upload allowlist, task failure state, CSP, sandbox iframe, and security docs. |

## Page And Function Acceptance

### Auth

| Function | Acceptance | Implementation |
| --- | --- | --- |
| Email registration | User can create an account with email/password; failures return clear errors. | `/api/auth/register`, password validation, duplicate email 409. |
| Email login | User can log in and refresh while session remains recognized. | `/api/auth/login`, `/api/me`, server-side session records. |
| Third-party login | Google/GitHub design exists; demo mode can skip real exchange. | `/api/auth/oauth/:provider`, `oauth_accounts` schema, security known-limit note. |
| Logout | User can actively log out and lose access to protected pages. | `/api/auth/logout`, cleared session and CSRF cookies. |

### Home

| Requirement | Implementation |
| --- | --- |
| Show all `published` games. | `store.listGames({ status: 'published' })` and `/api/games`. |
| Each card shows cover, title, summary, author, tags, publish time. | `public/app.js` `gameCard`. |
| Click card enters Play. | `data-play` action loads manifest and navigates to `/play`. |
| Home data comes from backend/database. | The frontend never owns the seeded array; tests verify published Create output appears in Home API. |
| At least three examples; one from Create-publish loop. | `src/seed.mjs` seeds at least three published games, including one `create-agent` origin game with a succeeded task/log trail; tests also create and publish one additional game. |

### Play

| State | Acceptance | Implementation |
| --- | --- | --- |
| Loading | Shows that game files or runtime are loading. | `playFrameContent()` loading state. |
| Loaded | Game is operable and proves file source is remote artifact/object URL. | Manifest entry must start with `/objects/`; iframe uses that entry. |
| Failed | Displays a unified error state, no blank screen. | `playState.status === 'failed'`. |
| End or exit | User can go back or reload. | Back home and reload manifest actions. |

## Explicit Non-Acceptance Avoidance

- This is not CRUD-only: Create produces Agent tasks, logs, artifacts, manifests, and published games.
- Play is not a local static component: it dynamically loads object-storage-backed manifest entries.
- Object storage is isolated behind an adapter and object-key contract, so it can migrate to S3/OSS-compatible storage.
- Agent generation is deterministic for reproducibility, but it is structured as a replaceable harness with model-provider metadata and documented upgrade path.
- README and docs contain startup, testing, data, architecture, security, and completion evidence.
