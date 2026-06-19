# Data Model

## Tables

- `users`: email identity, PBKDF2 password hash, role.
- `sessions`: HttpOnly cookie session records with expiry and last seen time.
- `oauth_accounts`: provider identity mapping for Google/GitHub expansion.
- `games`: public game metadata, status, counts, author, origin.
- `game_versions`: immutable bundle/manifest keys and model provider per version.
- `generation_tasks`: async Create task state and progress.
- `agent_logs`: readable Agent execution steps.
- `assets`: uploaded files with object key, MIME, size, sha256.
- `audit_events`: security and operational trace records.

## Status Fields

Game status:

- `draft`: generated but not visible on Home.
- `published`: visible and playable by everyone.
- `archived`: reserved for future moderation.

Task status:

- `pending`: accepted but not running.
- `running`: Agent steps are executing.
- `succeeded`: game/version/artifacts have been persisted.
- `failed`: task ended with a recorded error.

## Relationships

- User has many sessions, assets, generation tasks, and games.
- Game has many versions; current version is `latest_version_id`.
- Task may create one game.
- Agent logs belong to task.
- Assets may be linked to a task.