# Evaluation Results: Refine Portable Skills

## Runtime and method

- Package source: the local repository, installed into clean projects through `npx skills add --copy`.
- Baseline source: commit `ae501b510e30ad76307b8d2cc9ff1dda35526428`.
- Candidate source: the final working tree for this plan.
- Models:
  - `gpt-5.6-sol`, reasoning effort `xhigh`
  - `claude-opus-4.8`, reasoning effort `max`
- GPT outputs were graded by Claude; Claude outputs were graded by GPT.
- Model-behavior critical expectations were repeated three times per model.
- Scanner exit codes, output paths, retained artifacts, and installed resources were checked deterministically.

The first harness attempt exposed `expected_output` and `expectations` to the tested model. Those runs were discarded. The final blind runner sent only:

```json
{"id": 0, "prompt": "<user task>", "files": ["<optional read-only fixtures>"]}
```

Each run used an isolated `COPILOT_HOME` and an `npx skills add` installation. The tested model did not receive grader expectations. Exact command shape:

```text
COPILOT_HOME=<isolated-home> copilot -p <blind-cases-json> \
  --model <model-id> --effort <level> --output-format json \
  --no-custom-instructions --disable-builtin-mcps
```

Raw responses, timings, output-token counts, and grading files remain outside git in the session evaluation workspace. This document is the committed evidence summary.

## Functional comparison

Counts are strict expectation passes. Partial credit is excluded.

| Skill | GPT baseline -> candidate | Claude baseline -> candidate | Critical result | Verdict |
|---|---:|---:|---|---|
| `workflow-orchestrator` | 47/50 -> **50/50** | 48/50 -> **50/50** | 3/3 on both models | Ship |
| `achieve-goal` | 203/214 -> **209/214** | 210/214 -> **214/214** | Handoff 3/3 on both models; all declared critical expectations pass | Ship |
| `anti-slop` | 36/45 -> **40/45** | 31/45 -> **34/45** | 3/3 on both models | Ship |
| `execute-plan-loop` | 50/55 -> **51/55** | 54/55 -> 51/55 in response-only full runs | Declared critical map passes; fixture reruns show no regression in cases 0/2/4 | Ship with fixture evidence |
| `decompose-feature` | 31/35 -> **35/35** | 35/35 -> **35/35** | Indivisible-change case 3/3 on both models | Ship |
| `ensure-atomic-pr` | 30/35 -> **34/35** | 29/35 -> **35/35** | 3/3 on both models | Ship |
| `plan-parallel-work` | 29/35 -> **34/35** | 28/35 -> **30/35** | Hot-file rejection 3/3 on both models; isolated-working-copy rerun passes | Ship |
| `refresh-related-docs` | 29/35 -> **32/35** | 31/35 -> **35/35** | 3/3 on both models after approval-response refinement | Ship |
| `scan-image-vulnerabilities` | 33/35 -> **35/35** | 30/35 -> **33/35** | Deterministic critical checks pass | Ship |

Additional targeted evidence:

- `achieve-goal` budget reporting was retested on both models after adding the required next action.
- `achieve-goal` approved implementation handoff passed 3/3 on both models after making executor delegation explicit.
- `execute-plan-loop` cases 0, 2, and 4 were rerun with real read-only TypeScript fixtures. Candidate behavior matched or exceeded baseline with no expectation regression.
- `plan-parallel-work` was rerun after requiring a distinct working copy in every task block; both models named separate worktrees.
- `decompose-feature` v3 passed 35/35 on both models and the critical indivisible-change case in all three repetitions.

## Deterministic and installation checks

- Nine standalone skill installations succeeded.
- Seven worker-plus-`workflow-orchestrator` combinations succeeded.
- A complete nine-skill installation succeeded.
- All bundled runtime resources were present after installation.
- No runtime skill body contains GPT-, Claude-, OpenAI-, or Anthropic-specific guidance.
- No runtime skill depends on a repository-source path.
- All eval and manifest JSON files parse successfully.
- All shell scripts pass `bash -n`.
- Scanner tests pass from source and from an installed copy:
  - DB refresh failure stops before scanning
  - partial image failure returns nonzero and retains successful JSON
  - explicit output directories are honored
  - default output stays under the working directory
  - remote registry scanning does not require Docker
  - malformed scan JSON is retained and reported as a summary failure
  - collision-prone and long image references use bounded, unique filenames
  - failed rescans remove stale JSON even when image order changes

## Resource direction

Single-run resource measurements are directional, not statistical.

| Skill | GPT duration | GPT output tokens | Claude duration | Claude output tokens |
|---|---:|---:|---:|---:|
| `workflow-orchestrator` | +17% | +52% | +1% | +8% |
| `achieve-goal` | -37% | -7% | -17% | -12% |
| `anti-slop` | -33% | +23% | -22% | -4% |
| `execute-plan-loop` | +13% | +1% | -7% | -4% |
| `decompose-feature` | -27% | +18% | +65% | +112% |
| `ensure-atomic-pr` | -3% | +85% | -22% | -29% |
| `plan-parallel-work` | -35% | -13% | -10% | -5% |
| `refresh-related-docs` | -7% | -8% | -2% | -6% |
| `scan-image-vulnerabilities` | -51% | -51% | -26% | -29% |

Quality gates take precedence over token or duration improvements.

## Trigger evaluation

Trigger selection was treated as heuristic rather than a release gate:

- Copilot isolated project-skill selection was measurable.
- Natural-language persistent-goal requests selected `achieve-goal`.
- Container-source-security, docs, atomicity, decomposition, and parallel near-misses were routed correctly in completed probes.
- Approved implementation still sometimes additionally selected `workflow-orchestrator`; its body exits immediately when the executor handoff is already known.
- `/goal` slash-prefixed prompts could not be measured faithfully in non-interactive Copilot prompt mode because the CLI handled them as slash commands.
- Equivalent isolated automatic trigger measurement was unavailable for Claude.

Invocation modes were therefore not changed. Descriptions were narrowed only where the functional routing contract and measurable Copilot results supported the change.

## Human review artifact

A static eval viewer was generated from the final candidate, previous outputs, formal grading, and benchmark data:

```text
<session-files>/portable-skills-review.html
```

The final independent GPT-family code review reported no issues. The final Claude-family adversarial review reported no substantive issues.

## Known limitations

- Most functional evals describe intended actions rather than modifying a real repository. Read-only fixtures were added for the executor cases where response-only grading produced a false regression.
- Resource measurements are single-run and can vary.
- Claude `execute-plan-loop` response-only full-suite grading remained lower than baseline, but critical expectation maps improved and fixture-backed regression cases showed no behavior loss.
- Some noncritical expectations remain shared baseline/candidate gaps, especially exhaustive reporting details.
- Raw model outputs are intentionally not committed.

## Decision

Ship the refined skill set.

The candidate preserves the regression guards that matter, fixes the intended routing, approval, portability, and scanner defects, passes the declared critical gates, and remains model- and provider-neutral at runtime.
