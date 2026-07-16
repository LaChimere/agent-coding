---
name: anti-slop
description: Guard implementation work against unnecessary scope, unsupported correctness claims, unjustified duplication, and accumulating complexity. Use as a companion during code changes or milestone review; it does not decide what to build, own execution cadence, or replace the primary workflow skill.
---

# Operating context

This is an always-on quality guard for coding work. It runs **alongside** the other skills, not instead of them. `execute-plan-loop` and `workflow-orchestrator` decide *what* to build and in what order; this skill governs *whether each change is good enough to keep*. It accompanies the executor's per-slice loop, and its milestone review satisfies the executor's matching review checkpoint — run one review, not two.

Do not restate the shared execution rules those skills already own. Atomicity, verification levels, and boundary-focused error handling come from the active workflow contract and primary executor. This skill adds only the checks specific to catching slop: can you explain it, is the correctness claim supported, is it needed, is any duplication justified, is complexity growing, and has an independent viewpoint reviewed it.

If the workflow contract is present, respect its gates and never commit through a red gate just to keep moving. Under the contract's **fast path** (production-down or explicitly urgent work), still run the full pre-commit gate — these checks are cheap and local — and defer only the milestone independent review to backfill.

The user or active workflow controls cadence and review mechanism. The default is to run the slop checks before a change lands and obtain an independent review at meaningful milestones. Do not create a second review loop when the primary executor already has a matching checkpoint.

This skill itself must not become slop. Keep its use lightweight and concrete: every check must lead to a real action (fix, remove, split, or stop), never a rubber stamp.

# What "slop" means here

Slop is output that passes a quick look but fails on substance. It usually has good names, clear structure, and confident comments — which is exactly why it slips through. The danger is not ugly code; it is plausible code that is:

- **unnecessary** — solves a problem no one has, or adds options/abstractions "for later"
- **wrong** — looks right, but breaks on real inputs or edge cases
- **hard to maintain** — duplicates what already exists, or piles on complexity faster than anyone can follow

The core rule: **looking correct is not the same as being correct or being needed.** Verify behavior and question necessity, not appearance.

# Use this skill when

- Writing, changing, refactoring, or extending code — any language, any size
- Running a long or multi-round implementation loop with many commits
- The user asks to avoid slop, keep quality high, or confirm a change is actually correct and needed
- Reviewing your own or an agent's output before it lands

# The two jobs

This skill has two responsibilities:

1. **Remember (awareness).** Hold the quality bar in mind the whole time. Before adding anything, ask: is this needed, is it correct, will someone be able to maintain it?
2. **Challenge the change (review).** Before it lands, test necessity, evidence, duplication, and complexity. At milestones, seek an independent attempt to find problems.

# Non-negotiables (hard gates)

These are the slop-specific checks this skill adds. Apply them before a change lands. Correctness and scope failures require a fix or stop. Duplication and complexity findings may use a narrow documented exception; otherwise fix, split, or stop.

- **You can explain it.** State, in plain words, what the change does and why it is needed. If you cannot explain it clearly to another person, do not commit it. "An AI wrote it" is not an explanation.
- **The correctness claim is supported.** Reuse verification evidence from the active workflow. Behavioral tests should cover representative inputs beyond a visible example so the change passes for the right reason. "It compiles" or "it looks right" is not enough.
- **It is only what's needed.** Build for the task in front of you, using patterns already in the repo. Avoid speculative options and abstractions.
- **Duplication is absent or justified.** Reuse existing behavior by default. Generated artifacts and bounded compatibility migrations may repeat structure when their source, scope, verification, and removal condition are explicit.
- **You checked for removable complexity.** Look for concrete simplification opportunities. Do not force deletion merely to satisfy a quota.

Use the bundled `templates/pre-commit-slop-gate.md` relative to this installed skill. Record outcomes on the workflow's existing evidence surface; do not create a second tracker just for this companion.

Independent review is also required, but at **milestone** cadence rather than per commit — see "Independent review" below.

# Pre-commit slop gate

Before a change lands, work through the bundled checklist. The user or active workflow may request more frequent checks. Correctness and scope failures require a fix or stop; duplication and complexity findings may use only the checklist's narrow exceptions.

# Complexity check

The pre-commit gate checklist owns the per-change complexity items (removable code, duplication, unused abstractions, readability). This section adds the one signal that only shows up **across** commits, not within one:

- A single add-only change is fine. Add-only growth across many slices is a signal to inspect the whole diff for duplication, dead scaffolding, missed consolidation, and whether a new reader can still follow the design. Consolidate when evidence supports it; otherwise record why the additions remain necessary.

# Independent review

At each milestone, use the strongest review mechanism that is independent from the perspective that produced the change. Independence may come from a dedicated review agent, a separately prompted model, a different model, or a human reviewer. Model vendor alone neither proves nor prevents independence.

When no independent reviewer is available, run an explicit adversarial self-review and record that limitation. Do not present self-review as independent review.

Whatever the mechanism, ask the reviewer to find what is **wrong, missing, unnecessary, or duplicated** — not to confirm it looks good. A review that only says "looks fine" is not a review. Every finding must lead to an action: fix now, split into follow-up, or stop and escalate with evidence; double-check findings before acting on them. This review satisfies the matching `execute-plan-loop` milestone review.

# User overrides

The user controls **cadence and mechanism**, and those instructions win over the defaults:

- gate cadence — how often the gate runs on intermediate commits (for example, "don't gate every tiny commit")
- review cadence — "review every N milestones", "review only at the end"
- review mechanism — which models or reviewers to use
- prototypes — "this is a throwaway, keep it light"

If the user asks to land a change with unsupported correctness, surface the missing evidence and stop or fix it. Other slop checks may have justified exceptions, but correctness, safety, and scope claims still need evidence appropriate to the change.

An explicit throwaway that will not be landed may use a lighter process. Do not describe it as ready to land, and run the full checks before it becomes part of the repository.

When the user asks to skip a failing gate, make the distinction explicit:

- cadence and review mechanism may change
- landed correctness, safety, and scope evidence may not be waived
- a confirmed non-landed throwaway may use a lighter process

Independent review is complete only after findings are checked and each one is fixed, split, or escalated with evidence.

# Gotchas

- **Clean-looking slop.** The most common miss. Good names and tidy structure are what models are trained to produce; they say nothing about whether the code is correct or needed. Judge behavior and necessity, never appearance.
- **Review theater.** A second model that says "looks good" has not reviewed anything. Ask it to break the change, not bless it.
- **Always adding, never removing.** Over a long task, watch the shape of the diff. If it only grows, complexity is accumulating even if each step looked fine.
- **Building for an imagined future.** Options, flags, and abstractions added "for later" are slop today. Build for the task you actually have.
- **Fix-on-fix loops.** If a fix creates new problems and you keep patching the patches, stop — the approach is probably wrong. Step back instead of generating more.
- **Test-fitting instead of solving.** Hard-coding the values a test checks, or writing a throwaway script to make a test pass, is slop. Solve the real problem.
- **Committing through a red gate.** Skipping the gate to "keep moving" is the exact failure this skill exists to stop.
- **Turning the checks into ceremony.** The gate and the review are only worth running if they can actually stop or change a commit. If they never do, you are not really running them.

# Strong preferences

- Fewer, well-understood lines over more plausible-looking ones.
- Deleting and consolidating count as real progress, not overhead.
- An independent viewpoint over self-assessment.
- When uncertainty affects correctness, safety, or scope, stop rather than generating more code to cover it.

# Embedding the core principles

For teams that want every agent to carry these habits by default, `references/agents-md-block.md` is a short block to paste into the working repository's own `AGENTS.md` (or `CLAUDE.md`). It is local project policy for that repo — not part of any shared workflow contract. It gives all agents the baseline awareness; the full method and the hard gates live in this `anti-slop` skill, when it is installed.
