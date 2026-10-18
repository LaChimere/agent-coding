# Repository model and distribution

This page governs contributions to `agent-coding`; downstream projects use the installed
engineering methods and their own product contracts. The [accepted design](engineering/design.md)
and [acceptance record](engineering/implementation.md) define the current redesign.

## Repository model

- `plugins/engineering/` owns the complete portable engineering package: task skills, shared
  references, task-specific resources and native metadata. It does not implement another runtime.
- `config/` owns host adapters and retained personal settings for Codex, Claude Code, Pi, Grok Bot
  and the existing Copilot consumer. Standing policy, native syntax and capability differences
  belong here; reusable product methods remain in the plugin.
- `skills/` holds independently useful standalone specialists and their bundled resources.
- `evals/` owns development cases, inert fixtures, versioned profiles, execution and grading.
  Runtime packages exclude these materials. Follow `evals/AGENTS.md` and preserve its quality baseline.
- `docs/` owns this repository's purpose, accepted design, decisions and qualification evidence.
  The root `AGENTS.md` routes contributors here; distributed skills never rely on it.
- `docs/engineering/implementation.md` records this redesign's progress. There is no mandatory
  downstream task filename or repository-root plans directory.

## Distribution contract

Users install the complete engineering plugin, even to invoke one skill. All relative runtime
links must resolve inside the installed package; shared references may live at its root.
Standalone specialists remain usable when installed alone. Required optional external capabilities
must be identified, not silently installed or imitated.

Codex uses `.agents/plugins/marketplace.json`; Claude Code uses `.claude-plugin/marketplace.json`.
Their native manifests share package identity and version. Pi reads the engineering package's
`package.json` resource declarations. Grok Bot uses the complete methods on its computer through
its actual available import/file mechanisms; do not invent a native plugin command or qualify
Grok from a CLI test. Details and evidence levels are in [hosts.md](engineering/hosts.md).

Native managers may live-load a registered local package. Verify that path through an isolated
candidate copy, rather than manually pretending an unregistered checkout is installed. Do not
switch production installs or copy credential values for acceptance.

Each supported host needs its own source identity, loading, invocation and behavior evidence.
Mixed-tool work also needs actual handoff evidence. Missing capability remains explicit. Historical
results, frozen profiles and holdouts are retained separately from the active redesign's cases.
