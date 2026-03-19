---
name: fix-ado-pr-ci
description: Drive an existing Azure DevOps pull request to a reviewable green CI state by monitoring build and policy results, inspecting failures, and applying narrow fixes on the PR branch. Use when the user asks to get an ADO PR green, fix CI on a PR, resolve build failures, or keep pushing small follow-up fixes until the PR is ready for human review. Also trigger when the user mentions red CI, failing builds, or policy blockers on an existing PR. Never create a draft PR, never set auto-complete, and never merge.
compatibility:
  tools: [bash, git]
  dependencies: [Azure CLI with azure-devops extension and an existing Azure DevOps login]
---

# Fix ADO PR CI

## Operating context

This is a **side-effectful PR lifecycle skill**. Use it only when an Azure DevOps PR already exists and the branch is in the CI-fixing / stabilization phase.

This skill may:

- inspect PR status, CI, and policy state
- apply **narrow, plan-consistent fixes** on the PR branch
- push follow-up commits to the same PR branch

This skill must not:

- create a new PR
- update PR title or description
- create a draft PR
- enable auto-complete
- merge, abandon, or re-target the PR
- make design-changing fixes without going back through the recovery flow

If the required fix would change the approved plan or design, stop and use the acceptance-criteria recovery flow from `AGENTS.md` instead of improvising.

## ADO configuration

The three ADO skills (`ado-pr-inspector`, `create-ado-pr`, `fix-ado-pr-ci`) share connection details. Rather than re-discovering or asking for org, project, and repository every time, these values are persisted in `skills/ado-config.json`.

On first use, if `skills/ado-config.json` does not exist, ask the user for the values and create it from the example file `skills/ado-config.example.json`. On subsequent invocations, read the config silently.

The config file is gitignored because it contains environment-specific values.

## Core rules

- Prefer `ado-pr-inspector` for PR / CI / build diagnosis instead of ad hoc ADO page scraping.
- Prefer `create-ado-pr` for PR creation or PR metadata updates.
- Fix only failures that are narrow and local to the current PR.
- Re-run the narrowest relevant local verification before each push.
- Keep fixes atomic; if the branch now mixes concerns, stop and use `ensure-atomic-pr`.
- Cap autonomous repair attempts. After a small number of reasonable tries, stop and report the blocker.
- Never treat remote CI as a substitute for local verification.

## Inputs this skill accepts

- an ADO PR URL or PR id
- the local branch corresponding to that PR
- optional org / project hints
- an instruction such as "get this PR green", "fix the failing CI", or "repair this PR"

## Failure types this skill may fix directly

Examples of appropriate narrow fixes:

- lint or formatting failures
- typecheck or compile failures
- clear test regressions in code already within the PR scope
- obvious build-script or path issues local to this PR
- missing mocks, fixtures, or config changes required by the approved plan

## Failure types that should stop the skill

Examples of blockers that should be escalated instead of repeatedly patched:

- flaky or nondeterministic CI with no clear code-side cause
- environment, permission, secret, or agent pool problems
- policy gates blocked by missing approvals or branch settings
- reviewer comments that change product direction or design intent
- failures whose fix would materially change the approved plan or design
- repeated failures after a few narrow repair attempts

## Repair log

To avoid repeating failed approaches, maintain a repair log at `skills/fix-ado-pr-ci/repair-log.jsonl`. Each line is a JSON object recording one repair attempt:

```json
{"pr_id": 12345, "timestamp": "2025-06-10T14:32:00Z", "failure": "lint: unused import in auth.py", "fix": "removed unused import", "result": "success"}
{"pr_id": 12345, "timestamp": "2025-06-10T14:45:00Z", "failure": "test_login flaky timeout", "fix": "none - identified as flaky", "result": "blocked"}
```

Before starting a repair cycle, read the log for the current PR id. If previous attempts exist, use them to avoid re-trying the same fix and to decide whether the repair-attempt cap has been reached.

The log file is gitignored. It persists across sessions but may be cleared when the skill is upgraded — this is acceptable since repair history for merged or abandoned PRs has no ongoing value.

## Workflow

### 1. Confirm local and remote context

Check that:

- the PR exists
- the current local branch matches the PR source branch, or can be switched safely
- the working tree is clean enough to reason about what will be pushed
- Azure DevOps access is available

If the local branch and the PR do not line up, stop and explain the mismatch.

### 2. Inspect the current PR state

Use `ado-pr-inspector` first.

Always identify:

- PR status and source -> target branch
- latest build per definition
- failed, canceled, or unfinished builds
- blocking policy gates
- human comments that might affect what is safe to change

If the user asked a narrow question like "why did CI fail", answer that first, then continue only if the user wants stabilization.

### 3. Decide whether the failure is safe to fix

Classify the current blocker:

- **safe narrow fix** — continue
- **plan drift** — stop and update `plan.md`, then re-enter Gate 2
- **design drift** — stop and update `design.md`, then re-enter Gate 1 → Gate 2
- **external blocker** — stop and report

Be conservative. When in doubt, stop rather than silently widening scope.

### 4. Apply one narrow fix at a time

Applying fixes one at a time makes it possible to attribute success or failure to a specific change. Stacking multiple speculative fixes before re-checking CI means you cannot tell which fix worked, which was unnecessary, and which might have introduced a new problem.

For each repair attempt:

1. make one focused change
2. run the narrowest relevant local verification
3. commit or otherwise prepare the branch cleanly
4. push to the same PR branch
5. re-check the PR with `ado-pr-inspector`

Do not stack multiple speculative fixes before re-checking CI.

### 5. Stop conditions

Knowing when to stop is as important as knowing how to fix. Continuing past these thresholds usually means the agent is guessing rather than diagnosing, which creates noise on the PR branch and wastes CI capacity.

Stop when any of these is true:

- the latest relevant builds are green and blocking policies are satisfied or no longer waiting on code changes
- the remaining blocker is not code-fixable by the agent
- the branch now needs a plan / design update
- the repair-attempt limit is reached

### 6. Hand off clearly

A clear hand-off prevents the next person (or the same agent in a future session) from repeating work or misunderstanding the PR state. Ambiguous endings like "I pushed some fixes" force the reader to re-diagnose everything from scratch.

When stopping, say which of these states the PR is in:

- **green** — ready for human review
- **waiting** — CI / policies still running
- **blocked** — needs human help or process follow-up
- **re-plan required** — fix would change plan
- **re-design required** — fix would change design

## Gotchas

These are failure patterns that come up when agents try to stabilize CI on an existing PR.

- **Repeatedly patching the same flaky test.** If a test fails intermittently with no clear code-side cause, the right action is to stop and report it as a flaky test, not to keep tweaking the code hoping it will pass next time. Three attempts at the same failure with no new insight is a strong signal to stop.

- **Scope creep through "helpful" fixes.** When investigating a CI failure, it is tempting to also fix an unrelated warning, refactor a nearby function, or clean up imports. Each of these additions widens the PR scope and can introduce new failures. Fix only the specific failure that is blocking CI.

- **Stacking multiple fixes before re-checking CI.** Making three speculative fixes and pushing them all at once makes it impossible to know which fix worked (or which one broke something new). Apply one fix, push, wait for CI, then decide the next step.

- **Ignoring human review comments.** Before pushing a code fix, check whether any human reviewer has left comments that change direction or request design-level changes. Pushing code fixes while a reviewer is asking fundamental questions creates confusion.

- **Not pulling remote changes first.** If another person or agent has pushed commits to the PR branch, pushing a local fix without pulling first will either fail or create a confusing merge. Always sync with the remote branch before applying a fix.

## Practical guidance

- Prefer fixing the deepest concrete failure first: failing task or test, not a high-level build label.
- If several builds fail, start with the first blocking failure that is clearly within the PR scope.
- If a policy gate is pending because CI has not rerun yet, say that instead of inventing a code fix.
- If human comments request non-trivial behavior changes, stop and confirm whether the approved plan should be updated.

## Output structure

Use this structure unless the user asks for something narrower:

## PR status
- PR id / URL
- source -> target
- current overall state

## Current blockers
- failing builds / tasks / tests
- blocking policies
- relevant human comments

## Action taken
- fix applied, or why no fix was applied
- local verification run
- whether a new push was made

## Result
- green / waiting / blocked / re-plan required / re-design required

## Next step
- what the human or agent should do next
