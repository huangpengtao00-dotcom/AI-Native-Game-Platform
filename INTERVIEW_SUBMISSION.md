# Interview Submission

## Project

- Project: ForgePlay Agent Platform / AI Native Game Platform
- GitHub: https://github.com/huangpengtao00-dotcom/AI-Native-Game-Platform
- Branch: `main`
- Local demo: `http://127.0.0.1:4173`

## Quick Start

```powershell
npm.cmd start
```

Open `http://127.0.0.1:4173`.

Demo accounts:

- Creator: `creator@example.com` / `password123`
- Player: `player@example.com` / `password123`

## Verification

```powershell
npm.cmd run audit:local
```

This runs the automated functional tests and the local project audit.

## What To Review

- Product and startup: `README.md`
- Delivery checklist: `docs/delivery.md`
- PRD mapping: `docs/prd-alignment.md`
- System design: `docs/system-design.md`
- Data model: `docs/data-model.md`
- Agent workflow: `docs/agent-workflow.md`
- Artifact protocol: `docs/artifact-protocol.md`
- Security review: `docs/security.md`
- Verification evidence: `docs/verification.md`
- Strict screenshot-requirement audit: `docs/strict-requirements-audit.md`
- Completion statement: `docs/completion.md`
- AI collaboration record: `docs/ai-collaboration.md`

## Demo Media

- Video: `delivery/media/demo-walkthrough.webm`
- Screenshots:
  - `delivery/media/01-home.png`
  - `delivery/media/02-login.png`
  - `delivery/media/03-create.png`
  - `delivery/media/04-tasks.png`
  - `delivery/media/05-play.png`

The media was generated from the real local browser flow against the running app.

## Submission Boundary

The ZIP package excludes local runtime state and secrets:

- excluded: `.git/`, `data/`, `storage/objects/`, `node_modules/`, `.env`, local output/cache folders
- included: source code, tests, scripts, docs, `.env.example`, final visual assets, screenshots, and demo video
