# Security Notes

## Implemented in MVP

- PBKDF2 password hashing with per-password random salt.
- HttpOnly, SameSite=Lax session cookie.
- Cookie-backed auth protected by CSRF double-submit token on authenticated mutating requests.
- Session expiry and server-side session records.
- Fixed-window rate limits for auth and write endpoints.
- Upload size limit from `MAX_UPLOAD_MB`.
- Upload MIME allowlist.
- Upload filename sanitization.
- Object key normalization and path containment.
- API ownership checks for tasks and draft manifest access.
- Sandboxed iframe for generated game bundles.
- CSP on app and object responses.
- Request IDs on every response plus structured rejection/error logs.
- `/api/health` and `/api/ready` endpoints for liveness/readiness checks.
- Prompt-injection-like phrase detection in the Agent safety step.
- Audit events for auth, uploads, generation, publishing, and seed.

## Known MVP Limits

- Demo OAuth does not perform real provider token exchange.
- Generated HTML is deterministic and simple; real model output would need static analysis, allowlist packaging, and possibly SES/Web Worker isolation.
- Local object storage is process-local; production should use object-store policies, signed URLs, or an isolated artifact domain.
- App-level fixed-window rate limiting is suitable for the internship MVP; public production deployments should add a gateway or WAF layer.

## Production Hardening

- Replace demo OAuth with provider authorization-code exchange plus state/nonce validation.
- Scan uploaded files and generated bundles.
- Enforce stricter bundle capability declarations.
- Move object storage to S3/OSS-compatible storage with bucket policy and audit logs.
- Keep `TRUST_PROXY=false` unless a controlled reverse proxy overwrites forwarded headers.
- Set `COOKIE_SECURE=true` only when served over HTTPS.
