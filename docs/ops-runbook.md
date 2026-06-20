# Operations Runbook

## Local Start

```powershell
npm.cmd start
```

Open `http://127.0.0.1:4173`.

## Verification

```powershell
npm.cmd run audit:local
npm.cmd run smoke:model
```

`smoke:model` exits as skipped unless model environment variables are configured.

## Optional Fighting Provider

Use runtime environment variables only. Do not commit `.env` with real secrets.

```powershell
$env:MODEL_PROVIDER='fighting'
$env:MODEL_WIRE_API='responses'
$env:MODEL_BASE_URL='<provider-base-url>'
$env:MODEL_NAME='gpt-5.5'
$env:MODEL_REASONING_EFFORT='high'
$env:MODEL_DISABLE_RESPONSE_STORAGE='true'
$env:MODEL_API_KEY='<temporary-key>'
npm.cmd run smoke:model
npm.cmd start
```

## Health Checks

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173/api/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173/api/ready
```

## Rebuild Delivery Package

```powershell
npm.cmd run package:delivery
```

The package excludes `.git/`, `.env`, `data/`, `storage/`, `node_modules/`, and `output/`.

## Reset Local Demo State

Stop the server, then remove only project-local runtime folders if a clean demo is required:

```powershell
Remove-Item -LiteralPath .\data,.\storage -Recurse -Force
npm.cmd start
```

