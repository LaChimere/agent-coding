---
name: ado-pr-inspector
description: Inspect Azure DevOps pull requests end to end — status, human comments, iterations, changed files, CI/policy state, and build failure root causes. Use when the user provides an ADO PR URL or PR ID, asks about any aspect of an ADO pull request, wants to know why CI failed, what reviewers said, or needs to understand the current state of a PR before deciding next steps.
compatibility:
  tools: [bash, python3]
  dependencies: [Azure CLI with azure-devops extension and an existing Azure DevOps login]
---

# ADO PR Inspector

## Operating context

This skill is a **read-only inspection tool** — it does not modify code or create plan artifacts. It operates outside the plan mode / approval gate workflow defined in `AGENTS.md`. Its output may feed into research or triage but does not require gates.

## ADO configuration

The three ADO skills (`ado-pr-inspector`, `create-ado-pr`, `fix-ado-pr-ci`) share connection details. Rather than re-discovering or asking for org, project, and repository every time, these values are persisted in `skills/ado-config.json`.

On first use, if `skills/ado-config.json` does not exist, ask the user for the values and create it from the example file `skills/ado-config.example.json`. On subsequent invocations, read the config silently.

The config file is gitignored because it contains environment-specific values.

Use this skill to inspect an Azure DevOps pull request through the local `az` login plus Azure DevOps REST APIs.

This skill is for repository and CI triage, not code modification. It should help answer:

- what state the PR is in
- whether there are human comments versus system / bot / AI comments
- which iterations, commits, and files changed
- which policy gates are pending or rejected
- whether CI actually ran and finished
- which exact job / task / test failed, and why

## Core rule

Prefer the Azure CLI path first.

Do not rely on direct webpage fetches for ADO PR internals. Private ADO pages are often blocked by auth or robots rules even when local `az` access is available.

## Inputs this skill accepts

- a full ADO PR URL like `https://.../_git/.../pullrequest/5013478`
- a numeric PR ID like `5013478`
- optional org / project hints if the local `az` defaults are incomplete

## Workflow

### 1. Confirm Azure CLI access

Check that:

- `az` exists
- the `azure-devops` extension is available
- `az repos pr show --id <PR_ID>` works with the current login

If that fails, stop and report the auth / extension blocker instead of pretending the PR is inaccessible.

### 2. Fetch the PR bundle

Use the bundled script to collect the main PR artifacts:

```bash
python3 <skill-dir>/scripts/fetch_ado_pr.py \
  --pr "<PR URL or PR ID>" \
  --output-dir "<workspace-or-temp-dir>"
```

Add `--org "<collection-or-org-url>"` if needed.

This gathers:

- PR metadata
- threads / comments
- iterations
- changed files
- commits
- statuses
- policy evaluations
- linked build details extracted from status target URLs

### 3. Separate human comments from system chatter

When summarizing comments:

- count non-system comments separately from system comments
- call out AI assistant / GitOps comments separately
- do not describe bot comments as "human comments"

If there are zero non-system comments, say that plainly.

### 4. Summarize change scope

Always include:

- PR title and current status
- source and target branch
- iteration count
- commit count
- changed file count
- changed file list when it is reasonably small

If only one file changed, say so directly.

### 5. Evaluate CI and policy state carefully

Use both `policies` and build data.

Important distinction:

- status text like `Coverage status check succeeded` or `queued` is not the same as the build result
- the build result comes from the build object itself: `status` and `result`

When the user asks whether CI has "all run", answer based on the latest builds by definition:

- `completed + succeeded` means the build finished successfully
- `completed + failed` means it ran and failed
- `completed + canceled` means it did not finish successfully
- any non-completed status means it is still in progress or pending

Also report blocking policy gates that are still pending, queued, running, or rejected.

### 6. Drill into failed builds when needed

If the latest relevant build failed or the user asks "why did CI fail", run:

```bash
python3 <skill-dir>/scripts/fetch_build_failure.py \
  --build-id "<build id>" \
  --project "<project name>" \
  --output-dir "<workspace-or-temp-dir>"
```

Add `--org "<collection-or-org-url>"` if the default from the PR metadata does not apply.

This pulls:

- the build object
- the timeline
- failed / canceled stage, job, and task records
- task logs for failed records
- short root-cause snippets

Prefer the deepest failed unit you can identify:

- stage if the failure is only visible at stage level
- job if the whole job failed with no clearer task
- task if a task clearly failed
- test name / assertion if the task log shows a concrete failing test

### 7. Report succinctly but with evidence

When a failure reason is available, report both:

- the concise explanation
- one concrete evidence line, such as a task name, test name, assertion, or error line

Example:

- `Lumina Sandbox Unit Tests` failed in job `SandboxTerminalServicePythonUT`
- task `Run Sandbox Terminal Service Python tests (excluding exec)` exited with code 1
- failing test: `tests/ci_tests/test_v3_bash_api.py::TestBashExecDebugInfo::test_debug_info_present_on_foreground`
- root cause: `exec_info["bashId"]` was an empty string, so the assertion requiring a non-empty `bashId` failed

## Output structure

Use this structure unless the user asks for something narrower:

## PR summary
- title
- PR status
- source -> target

## Review activity
- thread count
- total comments
- human comments
- system / AI comments

## Changes
- iterations
- commits
- changed files

## CI and policy status
- latest builds by definition
- builds that failed / canceled / are still running
- blocking policies still pending or rejected

## Failure details
- only include when a failed build was inspected
- build id
- failing stage / job / task
- root cause
- evidence

## Notes
- mention any ambiguity, auth caveat, or distinction between status checks and build results

## Gotchas

These are mistakes agents commonly make when inspecting ADO PRs.

- **Confusing status check text with build results.** A status like "Coverage status check succeeded" is a policy evaluation, not the build itself. The actual build result comes from the build object's `status` and `result` fields. Always check both — a policy can report success while the underlying build has failed or is still running.

- **Treating bot and system comments as human feedback.** ADO PRs accumulate system messages, auto-generated policy comments, and AI assistant comments. If you report "the PR has 12 comments," the user will think 12 humans weighed in. Always separate human comments from system/bot chatter.

- **Stopping at the top-level build failure.** When a build fails, the useful information is not "Build 12345 failed" — it is which specific task, test, or assertion within that build broke. Always drill into the timeline to find the deepest concrete failure before reporting.

- **Trying to fetch ADO web pages directly.** Private ADO pages are typically blocked by auth even when `az` CLI access works fine. The CLI and REST API path is almost always more reliable than scraping web pages.

## Practical guidance

- Save artifacts in a temp or session workspace, not in the user's repository.
- If the PR has many builds or statuses, summarize the latest build per definition instead of dumping everything.
- If the user only asks one narrow question like "did Unit Tests pass?", answer that first, then optionally mention the broader context.
