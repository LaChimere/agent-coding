---
name: create-ado-pr
description: Create a normal Azure DevOps pull request from the current branch after local acceptance criteria and required gates have passed. Use when the user asks to open, create, or submit an ADO PR, kick off ADO CI for the current branch, or send a small or atomic PR for review. Also trigger when the user says the branch is ready, wants to push for review, or asks to get CI running on their changes. If a PR already exists for the same source branch, update its metadata instead of creating a duplicate. Never create a draft PR, never set auto-complete, and never merge.
compatibility:
  tools: [bash, git]
  dependencies: [Azure CLI with azure-devops extension and an existing Azure DevOps login]
---

# Create ADO PR

## Operating context

This is a **side-effectful delivery skill**. Use it only when the branch is already ready for review:

- acceptance criteria have passed
- required local verification has passed
- any required Gate 3 review is complete

This skill creates a **normal** Azure DevOps PR. If a PR already exists for the same source branch, it may update that PR's title or description instead of creating a duplicate. It does not perform PR-branch stabilization; that belongs to `fix-ado-pr-ci`. It does not replace human review, and it must never merge or enable auto-complete.

## ADO configuration

The three ADO skills (`ado-pr-inspector`, `create-ado-pr`, `fix-ado-pr-ci`) share connection details. Rather than re-discovering or asking for org, project, and repository every time, these values are persisted in `skills/ado-config.json`.

On first use, if `skills/ado-config.json` does not exist, ask the user for the values and create it from the example file `skills/ado-config.example.json`. On subsequent invocations, read the config silently.

The config file is gitignored because it contains environment-specific values.

## Core rules

- Never create a draft PR.
- Never set auto-complete.
- Never merge or abandon a PR.
- Never use this skill to bypass Gate 1, Gate 2, Gate 3, or the acceptance gate.
- Prefer updating an existing PR for the same source branch over creating duplicates.
- If an existing PR needs code-side fixes to get green, stop and use `fix-ado-pr-ci` instead of widening this skill's scope.
- If the branch still mixes concerns, stop and use `ensure-atomic-pr` first.
- If the user needs deeper PR or CI diagnosis after creation, use `ado-pr-inspector`.

## Inputs this skill accepts

- the current checked-out branch
- optional ADO org / project / repository hints
- optional target branch
- optional PR title and description overrides
- optional `plans/{slug}/` artifacts to help build the PR body
- an instruction such as "open a PR", "create the ADO PR", or "send this branch for review"

## Workflow

### 1. Preflight repository state

Check that:

- the current branch is not `main`, `master`, or the target branch
- the branch has committed changes that are intended for this PR
- the working tree is clean enough that the PR reflects committed work, not uncommitted local edits
- the branch has an upstream remote, or can be pushed safely

If the local state is ambiguous, stop and explain the blocker instead of creating a confusing PR.

### 2. Confirm Azure DevOps access

Check that:

- `az` exists
- the `azure-devops` extension is available
- Azure DevOps login works for the current repository
- org / project / repository information can be derived or supplied

If that fails, stop and report the auth / extension / repository blocker.

### 3. Confirm the branch is PR-ready

Creating a PR before local acceptance is met turns remote CI into a trial-and-error debugging tool. This wastes CI capacity, generates noisy red builds on the PR, and trains reviewers to ignore early CI failures. The PR should represent work that the agent believes is correct.

Before creating or updating a PR, confirm:

- all acceptance criteria for this PR are met with evidence
- the applicable verification level has been executed
- the diff is consistent with the approved plan
- any required Gate 3 review is complete

Do **not** create a PR just to discover whether CI fails. CI is a remote validation layer, not a substitute for local acceptance.

### 4. Determine PR metadata

Prefer these sources, in order:

1. explicit user input
2. approved `plan.md` / `todo.md`
3. repository default branch and current branch naming

Build the PR body from the bundled template and include:

- summary / context
- key changes
- out-of-scope
- acceptance criteria status
- verification evidence
- risks / rollback notes
- review guidance when helpful

### 5. Push and create the PR

If the source branch is not on the remote yet, push it first.

Then:

- check whether an active PR already exists for the same source branch
- if one exists, update only its title and description instead of creating a duplicate PR
- otherwise create a **normal** PR

For the exact `az` CLI commands for creating, updating, and listing PRs, see `references/az-cli-reference.md`.

Do not:

- create a draft PR
- enable auto-complete
- queue an automatic merge
- silently add reviewers unless the user explicitly asked

### 6. Report the initial remote state

Always report:

- whether the PR was created or updated
- PR id and URL
- source -> target branch
- PR title
- whether ADO policies / CI appear to have started, are pending, or are missing

If CI or policy state looks wrong, say so plainly and recommend `ado-pr-inspector` for deeper inspection.

## Gotchas

These are mistakes agents commonly make when creating ADO PRs.

- **Creating a PR before pushing the branch.** If the source branch does not exist on the remote, `az repos pr create` will fail with a confusing error. Always verify the branch is pushed first.

- **Creating duplicate PRs.** If a PR already exists for the same source → target branch pair, creating another one is almost always wrong. Check first with `az repos pr list --source-branch`.

- **Using CI as a first-pass verification tool.** The purpose of creating a PR is to get human review and remote validation, not to discover whether the code compiles. Local acceptance criteria and verification must pass before creating the PR. Treating remote CI as a substitute for local checks wastes CI resources and creates noise.

- **Leaving uncommitted changes behind.** If the working tree has uncommitted changes when the PR is created, the PR will not reflect the developer's latest intent. Always check for a clean working tree or explicitly staged state.

- **Silently adding reviewers.** Unless the user explicitly asked for specific reviewers, do not add them. Adding reviewers sends notifications and creates review obligations that the user may not intend.

## PR body guidance

Prefer the bundled template:

`templates/pr-description-template.md`

Fill it from `plan.md`, `todo.md`, and local verification evidence when available. If those artifacts do not exist, still keep the same structure and say what is missing.

## Output structure

Use this structure unless the user asks for something narrower:

## PR action
- created, or existing PR metadata updated
- PR id
- PR URL

## Branches
- source -> target

## PR summary
- title
- key scope
- out-of-scope

## Verification and acceptance
- acceptance criteria status
- local verification already completed
- Gate 3 status when relevant

## Initial ADO state
- policies / CI queued, pending, running, passed, failed, or missing

## Notes
- blockers
- follow-up suggestions
