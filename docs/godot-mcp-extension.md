# Godot MCP Extension Decision

Date: 2026-06-20

## Decision

Keep the current web-native HTML Canvas generation path as the MVP default. Do not integrate Godot MCP into the interview delivery package yet.

Godot MCP is valuable as a future adapter for richer 2D/3D production pipelines, but adding it now would move the demo from a zero-install web platform into a workstation-dependent engine workflow. The current delivery already proves the required product loop: prompt to async Agent task, visible progress, generated bundle, preview, publish, and playable sandboxed runtime.

## Research Notes

- `Coding-Solo/godot-mcp` is a Node/TypeScript MCP server that can launch the Godot editor, run projects, capture debug output, inspect projects, and create or modify scenes. It is configured through `npx @coding-solo/godot-mcp` and requires Godot Engine plus Node/npm on the host.
- `DaxianLee/godot-mcp` is a Godot editor plugin. It exposes an HTTP MCP endpoint at `http://127.0.0.1:3000/mcp` by default and documents Codex CLI connection through `codex mcp add --transport http godot-mcp http://127.0.0.1:3000/mcp`.
- `tugcantopaloglu/godot-mcp` is a broader fork that advertises 149 tools across runtime inspection, scene manipulation, file I/O, input simulation, animation, physics, and project configuration.
- Godot Web export can publish games to the browser, but it adds export-template management, WebAssembly/WebGL 2.0 browser requirements, MIME/header concerns, and cross-origin isolation complexity for threaded or extension-enabled exports.

References:

- https://github.com/Coding-Solo/godot-mcp
- https://github.com/DaxianLee/godot-mcp
- https://github.com/tugcantopaloglu/godot-mcp
- https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html
- https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html

## Integration Options

### Recommended: Optional Godot Export Adapter

Add Godot as a secondary artifact target behind the existing Agent manifest contract:

1. Agent creates a normalized game spec from the user prompt.
2. Existing HTML generator continues to create the default playable web bundle.
3. A future `GodotAdapter` can translate the same spec into a Godot project folder.
4. Godot MCP can open the project, generate scenes/scripts, run the editor or project, capture errors, and export a web build when local Godot prerequisites are present.
5. The platform stores the exported HTML/WASM/PCK files through the same object-storage adapter and manifest system.

This path preserves the current reliable web loop while creating a clean route for richer engine-backed games.

### Alternative: Godot-First Generation

Make every generated game a Godot project. This would improve engine depth but would require Godot installation, export templates, project-level artifact storage, larger bundles, and more complex browser hosting. It is too risky for the current interview package.

### Alternative: Local Developer Tool Only

Use Godot MCP only for offline prototyping, then manually port the result back into the web runtime. This can help exploration but does not improve the platform's user-facing Create-to-Play loop.

## Acceptance Criteria For Future Work

- Godot is optional: the default MVP still runs with `npm.cmd start` and no external engine.
- The web Play page still consumes a manifest and sandboxed object URL, not local source imports.
- Exported Godot builds are treated as generated artifacts with object keys, version metadata, and ownership checks.
- The UI clearly shows long-running engine generation states: queued, designing, building project, running Godot validation, exporting web bundle, publishing.
- Local setup failures are user-readable and do not break HTML Canvas generation.
- Verification includes a headless or scripted Godot run, export artifact inspection, browser load check, and playable input smoke test.

## Current Recommendation

Stop current delivery changes after documenting this decision. The highest-value improvements already landed: Chinese visible running state, generated game preview/play path, latest-task Play selection, real model smoke, closed-loop browser validation, clean packaging, and pushed checkpoint.

Further work should be treated as a new iteration, not a last-minute patch, unless a reviewer explicitly asks for Godot output.
