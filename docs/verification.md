# Verification

## Automated Checks

Run:

```bash
npm.cmd test
npm.cmd run audit:local
```

The test starts the server on an ephemeral port and verifies:

- Health endpoint works.
- Seed creates at least three published games.
- Registration creates a creator session.
- Upload writes an asset with sha256.
- Create task is accepted.
- Agent task reaches `succeeded`.
- Agent logs are visible.
- Draft game is created.
- Publish changes game to `published`.
- Manifest entry points to `/objects/`.
- Bundle can be fetched and contains playable runtime markup.
- Published Create game appears in Home API.

## Manual Smoke Test

1. Start the app.
2. Login as `creator@example.com` / `password123`.
3. Open Create.
4. Submit a prompt.
5. Watch Tasks until status is `succeeded`.
6. Preview generated game.
7. Publish it.
8. Return Home and verify it appears.
9. Click Play and verify the iframe game runs.

## Self-Audit Notes

During implementation, an early interactive PowerShell write caused character splitting in source files. The final workflow switched to non-interactive bounded writes and `node --check` after each batch. Final acceptance depends on automated tests, not on unchecked file creation.
## Live Local Verification - 2026-06-19

Against `http://127.0.0.1:4173`:

- Logged in as `creator@example.com`.
- Created task `Strict Audit Demo`.
- Task reached `succeeded` with 6 persisted Agent log rows.
- Published generated game.
- Manifest endpoint returned `/objects/games/create-a-quiz-game-for-a-strict-reviewer-that-pr-gameartifact_fba1802f81710138f05d/bundle.html`.

Additional audit hardening added after review:

- All source JavaScript files are checked with `node --check` inside `scripts/project-audit.mjs`.
- Frontend icons were changed to ASCII to avoid Windows shell encoding corruption.
- Home login button now binds auth handlers after rendering the auth view.