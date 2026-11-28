---
name: resume-work
description: Pause work at a safe boundary with a checkpoint a fresh agent can resume from, resume from a checkpoint or earlier session, or recall recent work across sessions. User-invoked for pausing, picking up and "where did I leave off" requests.
disable-model-invocation: true
---

# Pause, resume and recall work

Read [the shared agreement](../../references/working-agreement.md), in particular its handoff
rules. The checkpoint below is the contract between the agent that pauses and the agent that
resumes.

## Checkpoint

A checkpoint is a Markdown note with these sections:

- **Goal and authority:** the objective, scope and what the user has authorized.
- **Work in progress:** what was being done when the work stopped.
- **Progress:** completed units and verified claims, each with an evidence pointer.
- **State:** branch, worktree, uncommitted files, running processes and external operations in
  flight.
- **Open decisions:** choices still waiting for the user.
- **Next action:** the first authorized step on resume.
- **Key files and pitfalls:** paths that matter, failed hypotheses and gotchas.

Point at an existing decision log instead of copying it.

## Pause

Pause only on an explicit request; a request to keep going is not a pause.

1. Stop at a safe boundary: finish or back out of the current atomic step and start nothing new.
   Stop the workers you launched and record their state.
2. Pause with reversible actions only. Leave uncommitted edits in place unless a commit is
   authorized, and list them in the checkpoint.
3. Write the checkpoint where the user names, otherwise in an existing task record or a scratch
   file outside the repository, and give its absolute path.

Reply with where the work stopped, what is on disk versus only in this session, the tree state and
the first action on resume. A pause is not a final report.

## Resume

1. **Find the trail:** a checkpoint, the host's session records for the active workspace only, a
   branch or a PR. Session records live where the host keeps them; host instructions may name
   the location. Read the metadata and last messages first, then scan back for decision points.
2. **Rebuild state** from Git history and the diff against the base, worktrees, open tasks and
   recorded decisions. The trail is authoritative input: keep completed work and skip rerunning
   its reproduction.
3. **Compare** what is done with what was planned and name the resume point.
4. **Recheck** the inherited claims the next step depends on against current files and external
   state. A self-report or timeout is not proof; observe external state before retrying an
   external action.
5. **Route** the remaining work to the matching skill.

Reply with where the earlier work stopped, what you inherited and what you redid, ideally nothing,
what you rechecked and the resume point.

## Recall

Use this for "what have I been working on" across sessions.

1. **Lock the scope** before searching: a time window, the last seven days by default; the topic
   if one is named; the active workspace only. State the scope back to the user.
2. **Mine the session records** inside that scope, newest by modification time. Search for the
   topic first and read only the matching regions. Skip this session and evaluation or test
   sessions. A large corpus can go to read-only workers by slice.
3. **Sweep the shared record** by default when the topic names a feature, file, subsystem or bug:
   the PRs, issues, review threads and incidents available within access. Ask each source what
   has been tried and did not hold, and what users are still reporting. A source with no result
   is a finding; name a source you could not reach.
4. **Check live state** with Git and the forge.

Return:

- **Capsule:** at most five bullets on what the work is and where it stands.
- **Threads:** one line each with exactly one tag: `[merged #N]`, `[open PR #N]`,
  `[in flight <branch>]`, `[verified, uncommitted]`, `[reverted #N]` or `[planned, not started]`.
- **Problems:** at most five recurring ones, including symptoms users keep reporting and fixes
  that shipped and were reverted.
- **Next move:** the single most useful concrete action.

Cite session findings by session id and shared-record findings by PR, issue or file. Remove
private details before any output leaves the user's machine.
