# Validation

Use checks that match the changed surface and preserve the frozen quality rules in
`evals/AGENTS.md`. The accepted product requirements are tracked in
[engineering/implementation.md](engineering/implementation.md); a structural pass is not
behavioral acceptance.

## Local checks

Use the repository-pinned Bun 1.4.2 with the frozen lockfile. Keep disposable tool downloads and
caches in an authorized scratch directory; do not change production runtimes for this task.

- `git diff --check`: whitespace and patch structure.
- In `evals/`, `bun run start -- validate`: active development corpus and grading bindings.
- In `evals/`, `bun run check && bun run test:coverage && bun run build`: full framework checks.
  Run tests through package scripts with `--isolate`; the preload creates `evals/.cache/`.
- In `evals/`, `bun test --isolate tests/distribution.test.ts`: native manifests, complete package,
  shared resource links, skill identities and Pi declarations. This does not prove host discovery.
- Validate each new skill's frontmatter and placeholders with the installed skill-creator validator.
  Inspect actual methods and outcomes separately; a formatting pass cannot prove good judgment.

Tests that start loopback servers need an execution environment that allows binding. If an outer
sandbox blocks them, run the unchanged checks in a permitted environment and preserve their own
isolation assertions. Do not skip tests or reduce scope to obtain a passing result.

## Native acceptance

The active collection is `engineering-v1`; the default run profile is `engineering`.
For the first cold-start episode, create and configure the ignored local profile as described in
`evals/README.md`, then from `evals/`:

```sh
bun run start -- run --profile out --case engineering/cold-start-exporter --concurrency 1
```

A complete acceptance run also exercises the negative cases and other required episodes.
Native preparation must prove isolation, install the actual candidate and record discovery
before a candidate turn. A refused preparation is `not-run`, not a failed skill or a pass.
Preserve every failed/refused run and its configuration. Correct environment declarations with
concrete evidence, never by disabling the isolation probes.

Qualify Codex, Claude Code, Pi and Grok Bot separately using the levels in
[hosts.md](engineering/hosts.md). Use isolated configuration and candidate copies. Record versions,
source identity, discovery, invocation, actual behavior and gaps. Native App/IDE/cloud coverage
needs its own evidence. Installing a package or exercising a CLI does not qualify another host.
Do not switch production plugins, copy secrets or activate routines during local acceptance.

Original collections and `profiles/default` remain historical baselines. The new collection's
results do not overwrite or directly aggregate with old task populations. Holdout contents remain
outside tuning and require their explicit collection boundary. Model evaluations consume real
resources; record usage and failed attempts rather than treating missing telemetry as zero.
