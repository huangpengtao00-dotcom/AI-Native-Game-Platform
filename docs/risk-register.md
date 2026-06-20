# Risk Register

| Risk | Impact | Current Control | Next Production Step |
| --- | --- | --- | --- |
| External model provider outage | Create task could fail or slow down | Agent logs warning and falls back to deterministic local design | Queue retries with exponential backoff and provider status dashboard |
| Model returns malformed JSON | Broken game metadata | Response parsing, normalization, fallback design | JSON schema validation and provider eval fixtures |
| Generated code execution | XSS or data access risk | Bundle runs in sandboxed iframe with restrictive CSP | Static bundle scanning and isolated artifact domain |
| Uploaded material abuse | Storage bloat or unsafe content | Size limit, MIME allowlist, sanitized names, object key containment | Malware scanning and signed upload URLs |
| Demo OAuth only | Not production identity | Explicit docs and demo endpoint naming | Authorization-code flow with state/nonce validation |
| SQLite single-node storage | Limited concurrency and ops tooling | WAL mode, small MVP scope | Postgres migration and migration tooling |
| Local object storage | Not durable across machines | Adapter boundary and object-key protocol | S3/OSS-compatible bucket with audit logs |
| Secret leakage | Public repo exposure | `.env` ignored, audit script scans tracked text for API-key patterns | Secret scanning in CI and key rotation policy |
