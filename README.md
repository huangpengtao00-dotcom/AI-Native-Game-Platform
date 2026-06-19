# ForgePlay Agent Platform

AI Native interactive game platform MVP for the AI Agent full-stack system design test.

Repository: https://github.com/huangpengtao00-dotcom/AI-Native-Game-Platform

Demo address:

- Local: http://127.0.0.1:4173
- If deployed online, use the deployment URL plus the same seeded accounts below.

The project implements a complete business loop:

1. Player discovers published games on Home.
2. Creator registers or logs in.
3. Creator uploads reference material and submits a natural-language idea.
4. Local Agent Orchestrator creates an async generation task.
5. The task emits readable logs, creates a portable HTML game bundle, writes a manifest and bundle into object storage, and persists metadata in SQLite.
6. Creator previews and publishes.
7. Published game appears on Home and Play dynamically loads the manifest and remote bundle into a sandboxed iframe.

## Quick Start

```bash
cd C:\Users\hpt\Desktop\AI-Native-Game-Platform
npm.cmd start
```

Open http://127.0.0.1:4173

Demo accounts:

- creator@example.com / password123
- player@example.com / password123

Run verification:

```bash
npm.cmd test
npm.cmd run audit:local
```

## Interview Package

Start with `INTERVIEW_SUBMISSION.md` for the final handoff checklist. Demo screenshots and video are under `delivery/media/`, including `delivery/media/demo-walkthrough.webm`.
For strict screenshot-requirement mapping, see `docs/strict-requirements-audit.md`.

## Tech Stack

- Node.js native HTTP server, no external runtime dependencies
- Node 24 `node:sqlite` for SQLite persistence
- Cookie session auth with PBKDF2 password hashing
- Local object storage adapter under `storage/objects`
- Vanilla HTML/CSS/JS frontend
- Sandboxed iframe Play runtime

## Why This Architecture

The target machine has Node 24 and Git, but no Docker. A zero-dependency Node implementation reduces install risk and makes the demo reproducible under a short delivery window. The code still keeps clear migration boundaries:

- `LocalObjectStorage` can be replaced by S3/OSS.
- `AgentOrchestrator` can be replaced by OpenAI, LangGraph, OpenClaw, Hermes, Pi Agent, or another harness.
- SQLite can be migrated to Postgres through the data access layer.
- The Play page consumes a manifest contract instead of hardcoded local components.

## Important Files

- `server.mjs`: app entrypoint
- `src/http.mjs`: routing, auth endpoints, API, static/object serving
- `src/db.mjs`: schema and data access
- `src/agent.mjs`: async generation workflow and bundle builder
- `src/storage.mjs`: object storage adapter
- `public/app.js`: frontend app workflow
- `tests/run-tests.mjs`: end-to-end API test
- `docs/delivery.md`: checklist mapped to required submission items
- `docs/prd-alignment.md`: product roles and page acceptance mapped to implementation
- `docs/verification.md`: automated and manual validation evidence
- `docs/strict-requirements-audit.md`: screenshot-requirement compliance matrix
- `docs/ai-collaboration.md`: AI assistance, review, test, and human-fix record
- `docs/`: system design and delivery evidence

## Environment Variables

See `.env.example`. The demo works without editing it.

## Delivery Boundary

All project-created runtime files are inside this directory:

- Database: `data/app.sqlite`
- Object storage: `storage/objects`
- Source/docs/tests: this project folder

The app does not require global installs, system setting changes, Docker, or external services for the MVP.
