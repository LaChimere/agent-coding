---
name: figure-it-out
description: Design and run an auditable workflow for large, ambiguous or unattended work such as a big migration or a multi-part change, scaling rigor to risk and leaving a decision trail. User-invoked when no narrower skill fits.
disable-model-invocation: true
---

# Figure it out

Read [the shared agreement](../../references/working-agreement.md). The first deliverable is the
workflow itself, before any code. A workflow does not grant commits, publication or other
external effects; those keep their own authorization.

## Frame

Before the run starts, write down:

- **Done:** a falsifiable predicate checked on the real product.
- **Scope:** rough units and effort, and the blockers grounding has surfaced.
- **Rigor:** biased high for one-way decisions and wide blast radius, lower for reversible,
  low-stakes steps. Rigor means gates and artifacts.

Show the framing and its trade-offs to the user before a multi-hour run; that is the run's
checkpoint. Material choices wait for the user while independent authorized preparation
continues.

## Design the workflow

Settle open questions that an experiment can answer with a prototype before writing the plan. Break
the work into atomic units that can each land on their own and end in a verifiable state. Put the
riskiest unknown first. Build the verification harness and capture the pre-change baseline before
the work, so every check reads as old value against new value. For a consequential design choice
inside the work, use [design-solution](../design-solution/SKILL.md) or [arena](../arena/SKILL.md);
mechanical work with a settled shape needs neither. Fan out only across real seams, each worker on
its own worktree or branch, as in [swarm](../swarm/SKILL.md), and only as wide as the seams allow.

Write the plan down; it is what the human reviews. It opens with what changes, the units in landing
order and their dependencies: which units are independent, which wait for which, and the files each
may touch. Each unit then lists what it depends on, the files it edits, the one change it makes, the
result a user can see and its verification. Tests alone do not verify a unit: it also needs a live
check that drives the real product with a concrete scenario and a pass condition, and, when
performance matters, a measurement with the metric, the probe, a baseline taken first and the number
that fails. A unit that changes how users interact waits for the user's review before it lands.
Commit and PR boundaries follow
[change sequencing](../design-solution/references/change-sequence.md).

## Run the loop

Treat each unit as an experiment: state the hypothesis, make the smallest change, check it
against the predicate on the real artifact, keep it when it advanced and revert it when it did
not. Verify each unit before starting the next.

- Inspect artifacts rather than reports. When something passes too easily, suspect the
  observation before the system.
- Pair delegated work with a check. If a worker games a gate, reset it and harden the brief. If
  the gate itself is wrong, fix the gate in its own recorded step.
- Each verdict is `VERIFIED`, `NOT VERIFIED` or `INCONCLUSIVE`. An inconclusive verdict is not a
  pass.

## Keep the decision trail

Keep a TSV log with the columns `ts`, `phase`, `decision`, `why`, `evidence` and `result`. Evidence
is a pointer such as a SHA, `file:line` or artifact path, never a paragraph, and every cell stays
on one line. Log decision points and checkpoints as each one lands: a fork chosen, a unit verified,
a pivot or revert and its trigger, a blocker, a fixed gate. The log is append-only: a wrong call
gets a new row that supersedes it, and earlier rows stay. Record negative results as they are.
Keep the log untracked by default and commit it with authorized work when a reviewer needs the
trail. A later run reads the last rows first and adds a `start` row.

## Verify and hand back

Check the whole result against the done predicate on the real product. Audit the log against the
session: a fork, revert, pivot or gate change missing from the log is a gap, so add its row. Then
give the trail and the diff to a fresh-context reader, as in
[independent review](../../references/independent-review.md), and report what it says needs the
human's attention; your own reading does not replace it, and without delegation say the review
was not independent. Route a recurring correction to
[prevent-recurring-mistakes](../prevent-recurring-mistakes/SKILL.md).

Report the workflow you designed, the rigor level and why, the trail's path, what is verified
against the predicate and what remains open.
