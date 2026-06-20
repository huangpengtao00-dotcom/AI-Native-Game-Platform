# API Contract

## Authentication

- `POST /api/auth/register`: creates a creator account and returns `{ user, csrfToken }`.
- `POST /api/auth/login`: creates a session and returns `{ user, csrfToken }`.
- `POST /api/auth/logout`: clears the server session and cookies.
- `GET /api/me`: returns the public user and a CSRF token for authenticated sessions.

Authenticated mutating requests must include `X-CSRF-Token` matching the `csrf` cookie.

## Games

- `GET /api/games?status=published&q=&tag=` returns database-backed game cards.
- `GET /api/games/:id` returns one game.
- `GET /api/games/:id/manifest` returns the object-storage manifest. Draft games are only visible to their author.
- `POST /api/games/:id/publish` publishes an owned draft.

## Generation

- `POST /api/assets` uploads an allowed file with `X-Filename` and a supported MIME type.
- `POST /api/tasks` starts an Agent generation task from prompt/title/assets.
- `GET /api/tasks` lists the current user's tasks.
- `GET /api/tasks/:id` returns task progress and Agent logs.

## Health

- `GET /api/health`: liveness plus dashboard stats.
- `GET /api/ready`: database and object-storage readiness checks.

## Errors

Errors are JSON: `{ "error": string, "requestId": string }`. Every response includes `X-Request-Id` for log correlation.
