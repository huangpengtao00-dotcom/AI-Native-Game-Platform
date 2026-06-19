# Remote Artifact Protocol

## Manifest

A generated game is represented by a manifest stored in object storage:

```json
{
  "schemaVersion": 1,
  "gameId": "...",
  "title": "...",
  "entry": "/objects/games/.../bundle.html",
  "bundleKey": "games/.../bundle.html",
  "runtime": "sandboxed-html-v1",
  "generatedBy": "local-deterministic-agent",
  "assets": [],
  "capabilities": {
    "network": false,
    "storage": "ephemeral",
    "eval": false
  }
}
```

## Play Contract

1. Play calls `/api/games/:id/manifest`.
2. API validates game visibility.
3. Frontend validates that `manifest.entry` starts with `/objects/`.
4. Frontend mounts an iframe with `sandbox="allow-scripts"` and `referrerpolicy="no-referrer"`.
5. Object responses include strict CSP.

## Storage Migration

Current keys are local filesystem paths under `storage/objects`. Because database rows only store object keys, migration to S3/OSS means:

- Implement a new object adapter.
- Keep manifest key and bundle key semantics.
- Update `/objects` serving or return signed URLs.