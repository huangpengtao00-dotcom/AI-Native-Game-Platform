# Interview Submission

## Project

- Project: ForgePlay 智能体游戏平台 / AI Native Game Platform
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
npm.cmd run smoke:model
npm.cmd run package:delivery
```

`audit:local` runs provider contract tests, end-to-end API tests, and the local project audit. `smoke:model` verifies the optional fighting Responses provider only when model environment variables are present.

## What To Review

- Product and startup: `README.md`
- Delivery checklist: `docs/delivery.md`
- PRD mapping: `docs/prd-alignment.md`
- System design: `docs/system-design.md`
- Data model: `docs/data-model.md`
- Agent workflow: `docs/agent-workflow.md`
- Artifact protocol: `docs/artifact-protocol.md`
- Security review: `docs/security.md`
- API contract: `docs/api-contract.md`
- Operations runbook: `docs/ops-runbook.md`
- Risk register: `docs/risk-register.md`
- Verification evidence: `docs/verification.md`
- Strict screenshot-requirement audit: `docs/strict-requirements-audit.md`
- Completion statement: `docs/completion.md`
- AI collaboration record: `docs/ai-collaboration.md`

## Demo Media

- Video: `delivery/media/demo-walkthrough.webm`
- Screenshots:
  - `delivery/media/01-intro.png`
  - `delivery/media/02-home.png`
  - `delivery/media/03-types.png`
  - `delivery/media/04-create.png`
  - `delivery/media/05-tasks.png`
  - `delivery/media/06-play.png`

The media was generated from the real local browser flow against the running app, including the Opall / 黄澎涛 author intro page and the 15-type game browse section. The optional fighting Responses provider was smoke-tested through `npm.cmd run smoke:model` without committing any API key.

## Submission Boundary

The ZIP package excludes local runtime state and secrets:

- excluded: `.git/`, `data/`, `storage/objects/`, `node_modules/`, `.env`, local output/cache folders
- included: source code, tests, scripts, docs, `.env.example`, final visual assets, screenshots, and demo video

## Rollback Point

A pre-upgrade rollback tag and branch were created before the enterprise/API changes:

- tag: `checkpoint-before-enterprise-20260620-031124`
- branch: `backup/before-enterprise-20260620-031124`
