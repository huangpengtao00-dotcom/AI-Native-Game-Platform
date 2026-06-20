# ADR 0001: MVP Architecture

## Status

Accepted for interview delivery.

## Context

The project must demonstrate an AI Native interactive game platform, run reliably on the reviewer machine, and avoid hidden external setup requirements.

## Decision

Use a zero-dependency Node 24 application with native HTTP, `node:sqlite`, local object storage, vanilla frontend, and an optional OpenAI-compatible model provider step.

## Consequences

- The default demo is reproducible without Docker, package install, cloud buckets, or model credentials.
- The Agent boundary still supports real provider integration through `MODEL_WIRE_API`, `MODEL_BASE_URL`, `MODEL_NAME`, and `MODEL_API_KEY`.
- Local storage and SQLite are intentionally MVP-grade and documented with migration paths.
