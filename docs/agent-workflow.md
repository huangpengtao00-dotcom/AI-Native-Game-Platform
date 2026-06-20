# Agent Workflow

## Current MVP Harness

The local Agent Orchestrator is deterministic so the demo works without external model credentials. It still follows the engineering shape expected from a real Agent system.

Steps:

1. `queued`: task accepted from Create page.
2. `intent-analysis`: classify creator prompt into adventure, memory, reaction, or quiz.
3. `safety-screen`: detect prompt-injection-like requests and neutralize unsafe intent.
4. `artifact-build`: create portable HTML bundle and manifest.
5. `persistence`: write game metadata, version keys, and logs to SQLite.
6. `ready-to-preview`: creator can preview or publish.

## Extending to Real Agents

Replace `AgentOrchestrator.run()` with a provider-backed graph while preserving the same task/log/artifact contract.

The implementation now includes an optional OpenAI-compatible model-design step before artifact build. The default remains `local-deterministic-agent`, so the demo works without credentials. When configured with `MODEL_PROVIDER`, `MODEL_WIRE_API`, `MODEL_BASE_URL`, `MODEL_NAME`, and `MODEL_API_KEY`, the Agent requests a compact JSON design plan from the model, normalizes it, records the provider result in Agent logs, and still falls back to the local deterministic design if the provider fails.

Candidate integrations:

- OpenAI Responses API with tool calls
- LangGraph or another state graph
- OpenClaw/Hermes/Pi Agent style harness
- Self-hosted model worker

Required invariants:

- Agent output must be written to object storage, not injected directly into frontend code.
- Every significant step writes an `agent_logs` row.
- Task status is updated on both success and failure.
- Unsafe generated code must run in a sandboxed runtime.
- API keys must stay in environment variables or local `.env` files ignored by git.

## Optional Provider Smoke Test

```powershell
npm.cmd run smoke:model
```

Without model environment variables this exits successfully as skipped. With a configured provider, it calls the model endpoint and verifies that a normalized design JSON can be produced.
