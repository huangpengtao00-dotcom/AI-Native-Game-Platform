# Verification

## Automated Checks

Run:

```bash
npm.cmd test
npm.cmd run audit:local
```

The test starts the server on an ephemeral port and verifies:

- Health endpoint works.
- Readiness endpoint confirms database and object storage access.
- Every API response includes `X-Request-Id`.
- Seed creates at least three published games.
- Unauthenticated task access returns 401.
- Registration creates a creator session and CSRF token.
- Authenticated mutating requests without CSRF return 403.
- Unsupported upload MIME types return 415.
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
- CSRF, request ID, rate limit, readiness, proxy-trust, and encoding markers are checked by `scripts/project-audit.mjs`.

## Final Local Verification - 2026-06-20

`npm.cmd run audit:local` passed after enterprise hardening. The run verified health, readiness, request IDs, 401 unauthenticated task access, 403 missing CSRF rejection, 415 invalid upload MIME rejection, upload sha256 persistence, Create task success, publish, manifest loading, object bundle fetch, and Home visibility for the newly published game.

## Delivery Media Verification - 2026-06-20

Generated final visual evidence under `delivery/media/`:

- `01-home.png`
- `02-login.png`
- `03-create.png`
- `04-tasks.png`
- `05-play.png`
- `demo-walkthrough.webm`

The screenshots were captured from the real local browser flow. The video was assembled from those captured screenshots to keep the interview package reproducible without external video tooling.

## Premium UI And Closed Loop Verification - 2026-06-21

A fresh browser/CDP closed-loop smoke was run with temporary data and storage under `C:\tmp\forgeplay-closed-loop\...`.

Verified results:

- Home renders Chinese UI copy, the 4K hero asset, and the playable library.
- Create submits a real generation task.
- During model delay, Tasks shows a visible running state: status, step, percent progress, pipeline runway, and auto-refresh copy.
- The generated task reaches `succeeded` and exposes preview/publish actions.
- Publish moves the generated game into the Play flow.
- Play loads `/objects/.../bundle.html` through the manifest and mounts it in the sandboxed iframe.
- Keyboard input changes the rendered game frame; screenshot byte diff was above 190k, proving the game is not a static preview.
- No runtime exceptions were reported by the CDP smoke.

Delivery screenshots were regenerated from a clean local instance at `http://127.0.0.1:4274` and stored in `delivery/media/`.