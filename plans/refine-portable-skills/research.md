# Research: Refine Portable Skills

## Objective

Refine the nine skills distributed by this repository so they remain useful with strong current models while preserving a provider-neutral runtime contract.

## Confirmed distribution contract

- Users consume these skills only through `npx skills add`.
- Source-checkout execution is unsupported.
- Runtime resources must be bundled under the skill that uses them.
- Workflow-managed dependencies must be explicit and tested in installed combinations.

## Current evidence

- `workflow-orchestrator` owns the shared portable workflow contract.
- Existing functional eval coverage:
  - `achieve-goal`: 41 cases
  - `anti-slop`: 8 cases
  - `execute-plan-loop`: 7 cases
  - `workflow-orchestrator`: 7 cases
- The other five skills have no functional eval definitions.
- Local repository input works with `npx skills add`.
- `npx skills add --copy` preserves each selected skill's bundled files.
- The installed scanner includes `SKILL.md` and its script.
- A workflow combination install preserves the orchestrator contract, templates, worker evals, and anti-slop resources.
- Copilot can run against an isolated installed skill set when `COPILOT_HOME` is isolated.
- Claude CLI is not authenticated in this environment; the available Claude task runner is the candidate execution path for Claude-family evals.

## Known behavior problems

- The shared workflow sequence looks universal even where design and lessons are conditional.
- `achieve-goal`, `execute-plan-loop`, and `anti-slop` have overlapping trigger language.
- `anti-slop` repeats execution rules and names model vendors in its review policy.
- `execute-plan-loop` assumes commit authorization and a fixed review cadence.
- `decompose-feature` defaults to base scaffolding and a fixed PR template.
- `ensure-atomic-pr` separates tests despite later saying tests should stay with behavior.
- `plan-parallel-work` fixes the template at three agents and lacks a handoff payload.
- `refresh-related-docs` repeats approval and assumes `docs/` is canonical.
- The scanner uses a repository-root command example, defaults to `/tmp`, and exits successfully after partial scan failure.

## Evaluation constraints

- Run selected scenarios on GPT-5.6 Sol at `xhigh` and the latest available Claude at `max`.
- Model-behavior critical cases require 3/3 passes on both families.
- Deterministic critical checks run once per candidate state.
- Existing cases that encode intentionally changing behavior must be classified as behavior-change cases before candidate runs.
- Final acceptance evidence must come from installed copies.

## Open items

- Confirm the Claude task runner exposes sufficient completion metadata for the committed evaluation summary.
- Confirm installed-skill trigger selection can be isolated from user-global skills on both model families.
- Decide invocation-mode changes only after the trigger feasibility checks.
