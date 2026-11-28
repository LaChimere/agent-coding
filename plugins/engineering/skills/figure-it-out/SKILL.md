---
name: figure-it-out
description: Design an auditable workflow for large, unclear or unattended work, such as a big migration or a change in many parts, with rigor matched to risk and a log of every decision, then run it. Use it when no narrower skill fits.
disable-model-invocation: true
---

# Figure it out

Read [the shared agreement](../../references/working-agreement.md). Deliver the workflow before you
write any code. The workflow grants no authority for commits, publication or other external effects;
they keep their own authorization.

## Frame the work

Before starting, write down:

- **Done:** a condition that could be shown false, checked on the real product.
- **Scope:** the approximate units and effort, and the blockers found while grounding.
- **Rigor:** high for decisions that are hard to undo or reach many users, lower for reversible
  steps with small stakes. Rigor is the number of gates and the artifacts each step must leave.

Before a run of several hours, show this framing and its trade-offs to the user and wait for a
go-ahead, unless the user already asked for an unattended run. Product choices wait for the user
while independent authorized preparation continues.

## Design the workflow

Before planning, answer the open questions that a prototype can settle. Split the work into small
units that can each land alone and end in a state you can check. Schedule the riskiest unknown
first. Build the checks and record the starting values before any change, so every check compares
an old value with a new one. For a consequential design choice inside the work, use
[design-solution](../design-solution/SKILL.md) or [arena](../arena/SKILL.md); mechanical work with
a settled shape needs neither. Run units in parallel only along real boundaries, each worker in its
own worktree as in [swarm](../swarm/SKILL.md), and no wider than those boundaries allow.

Write the plan down; the human reviews it. It starts with what will change, the units in landing
order and how they depend on each other: which can run independently, which must wait and which
files each may touch. Then each unit states its dependencies, the files it edits, its single change,
the result a user can see and how it is checked. Tests alone do not check a unit. A unit with a
visible effect also gets a live check that drives the real product through a concrete scenario with
a pass condition; an internal unit gets that check through its nearest real caller. When performance
matters, the unit also gets a measurement that names the metric, the probe, the starting value taken
first and the value that counts as failure. A unit that changes how users interact with the product
waits for the user's review before it lands. Commit and PR boundaries follow
[change sequencing](../design-solution/references/change-sequence.md).

## Run the units

Treat each unit as an experiment. State what it should show, make the smallest change and check it
against the done condition on the real artifact. Keep it if it moved the work forward; otherwise undo
exactly that unit's change without touching other edits. Check each unit before starting the next. A
unit that stays `NOT VERIFIED` or `INCONCLUSIVE` after two attempts is undone, logged as blocked and
reported; units that depend on it stop, and independent units continue.

- Look at the artifacts, not the summaries. When something passes too easily, doubt the check before
  you trust the system.
- Check every delegated result. If a worker games a gate, discard its result and tighten the brief.
  If the gate itself is wrong, fix the gate as its own logged step.
- Give each verdict as `VERIFIED`, `NOT VERIFIED` or `INCONCLUSIVE`, and count `INCONCLUSIVE` as
  not passed.

## Keep the decision log

Keep a TSV log with the columns `ts`, `phase`, `decision`, `why`, `evidence` and `result`. Evidence
is a pointer such as a SHA, a `file:line` or an artifact path, never prose, and each cell fits on one
line. Add a row as each decision or checkpoint happens: a choice between options, a checked unit, a
change of direction or an undo and its cause, a blocker, a corrected gate. Rows are only appended. A
wrong decision gets a new row that replaces it, and the old row stays. Record negative results as
they happened. Leave the log untracked unless a reviewer needs it, and then commit it with
authorized work. A later run reads the latest rows first and appends a `start` row.

## Check and hand back

Check the whole result against the done condition on the real product. Compare the log with what
happened in the session; a choice, undo, change of direction or gate fix that is missing from the
log is a gap, so add its row, and fix any row whose evidence pointer does not resolve. Then have a
fresh-context reader review the log and the diff, as in
[independent review](../../references/independent-review.md), and report what it says the human
should look at. Your own reading does not count as that review, and without delegation say the
review was not independent. Send a correction that keeps recurring to
[prevent-recurring-mistakes](../prevent-recurring-mistakes/SKILL.md).

Report the workflow, the rigor level and the reason for it, the log's path, what was checked against
the done condition and what is still open.
