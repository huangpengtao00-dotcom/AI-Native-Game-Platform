# Security Notes

## Implemented in MVP

- PBKDF2 password hashing with per-password random salt.
- HttpOnly, SameSite=Lax session cookie.
- Session expiry and server-side session records.
- Upload size limit from `MAX_UPLOAD_MB`.
- Upload filename sanitization.
- Object key normalization and path containment.
- API ownership checks for tasks and draft manifest access.
- Sandboxed iframe for generated game bundles.
- CSP on app and object responses.
- Prompt-injection-like phrase detection in the Agent safety step.
- Audit events for auth, uploads, generation, publishing, and seed.

## Known MVP Limits

- Demo OAuth does not perform real provider token exchange.
- No CSRF token yet; SameSite mitigates common cross-site form posts, but production should add CSRF tokens for mutating requests.
- Generated HTML is deterministic and simple; real model output would need static analysis, allowlist packaging, and possibly SES/Web Worker isolation.
- Local object storage is not access-controlled outside the app process; production should use signed URLs or bucket policies.

## Production Hardening

- Add rate limits for login, upload, and generation.
- Add CSRF tokens to all mutating endpoints.
- Add OAuth state/nonce validation.
- Scan uploaded files and generated bundles.
- Enforce stricter bundle capability declarations.
- Add structured server logs and request IDs.