---
name: anti-slop
description: Keep coding work free of AI slop — output that looks polished but is unnecessary, wrong, or hard to maintain. This is a companion quality guard that runs alongside the planner/executor skills (pair it with `workflow-orchestrator` / `execute-plan-loop` when an implementation workflow is needed); it does not plan or decide what to build. Use during any code implementation, and especially during long multi-round tasks where an agent commits many times. Enforces hard quality gates on every change before it lands, a keep-it-understandable check as work grows, and independent review at milestones. Trigger on any request to write, change, refactor, or extend code, "keep going until it's done", "implement this feature", long agent loops, or when the user asks to avoid slop, keep quality high, or make sure a change is actually correct and needed.
---

# Operating context

This is an always-on quality guard for coding work. It runs **alongside** the other skills, not instead of them. `execute-plan-loop` and `workflow-orchestrator` decide *what* to build and in what order; this skill governs *whether each change is good enough to keep*. In practice it wraps `execute-plan-loop`'s per-commit loop, and its milestone review (below) satisfies and extends that skill's periodic deep review — run one review, not two.

Do not restate the shared execution rules those skills already own. Atomic-commit discipline, the per-commit verification levels (L1/L2/L3), and boundary-vs-internal defensive coding come from `skills/workflow-orchestrator/references/workflow-contract.md` and `execute-plan-loop`; defer to them. This skill adds only the checks specific to catching slop: can you explain it, have you proven it, is it needed, is it duplicated, is complexity growing, and has an independent viewpoint reviewed it.

If the workflow contract is present, respect its gates and never commit through a red gate just to keep moving. Under the contract's **fast path** (production-down or explicitly urgent work), still run the full pre-commit gate — these checks are cheap and local — and defer only the milestone independent review to backfill.

The user controls **cadence and the review mechanism** — how often the gate and the independent review run, and which reviewers or models to use (for example, "don't gate every tiny commit" or "review only at the end"); honor that. The one thing no override changes: **nothing is landed until it has passed the full pre-commit gate**; a lighter process is only for a throwaway that will not be landed. Defaults when the user says nothing: run the gate on every commit, and get an independent review at every milestone.

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

# The three jobs

This skill does three things at once. All three are required.

1. **Remember (awareness).** Hold the quality bar in mind the whole time. Before adding anything, ask: is this needed, is it correct, will someone be able to maintain it?
2. **Build well (method).** Follow the implementation workflow below so quality is built in step by step, not inspected in at the end.
3. **Guard the gate (review).** By default before each commit, and always before a change lands, run the gate; run the independent review at each milestone. Slop does not get to pass.

# Non-negotiables (hard gates)

These are the slop-specific gates this skill adds. Every change that lands must pass all of them; by default you check them before each commit. If one fails, fix it before the change lands — do not work around it. (Atomic-commit and verification-level discipline come from the workflow contract / `execute-plan-loop`; this list does not repeat them.)

- **You can explain it.** State, in plain words, what the change does and why it is needed. If you cannot explain it clearly to another person, do not commit it. "An AI wrote it" is not an explanation.
- **You have proven it works.** Run the narrowest relevant verification for the change (the contract's L1/L2/L3 levels), and record the command and result as evidence. "It compiles" or "it looks right" is not evidence.
- **It is only what's needed.** Build for the task in front of you, using patterns already in the repo. No speculative config, options, or abstractions, and no second way to do something that already has a way.
- **It is not duplicated.** Nothing in the change is a near-copy of code that already exists; you reused what was there instead.
- **You checked for removable complexity.** You looked at whether this change makes anything deletable or simpler, and acted on it if so. (Making nothing removable is fine for one change; never removing anything across a long task is a warning sign — see the complexity check.)

Run these as the `templates/pre-commit-slop-gate.md` checklist by default before each commit, and always before the change lands. Record the outcome on the change's normal evidence surface — the one-sentence purpose in the commit message, and the verification evidence in whatever status/evidence artifact the workflow already uses (or, when there is none, the commit body). Do not create a new artifact just for the gate; a gate you only tick in your head is not a gate.

Independent review is also required, but at **milestone** cadence rather than per commit — see "Independent review" below.

# Implementation workflow

Build quality in as you go. Do not save it for a final cleanup pass.

## 1) Pin the scope before coding
Write down, for yourself: what you will do, what you will not do, and what "done and verified" looks like. On a long task, do this again for each slice. Keep this visible so "while I'm here" work does not creep in.

## 2) Understand before changing
Read the actual code and tests you are about to touch. Do not guess behavior from file names, test names, or stale notes. If the user named a file or symbol, open it first.

## 3) Take the smallest real step
Pick the smallest change that moves the task forward and leaves the repo working. If the next step is too big for one commit, split it before you start.

## 4) Implement within the existing patterns
Solve the real problem for all valid inputs, not just the values in a test. Reuse what exists instead of pasting a near-copy. For where to put validation (boundaries vs. trusted internals), follow the workflow contract rather than scattering defensive branches.

## 5) Prove it works
Run the narrowest relevant verification for the change and capture the command and result. A green test that only passes because you hard-coded its expected values is not proof — it is slop wearing a test's clothes.

## 6) Run the gate, then commit one thing
Run the pre-commit slop gate, including the complexity check. Fix any failure. Then commit a single change whose purpose you can state in one sentence, and record the verification evidence on the normal status surface (or the commit body when there is none).

# Pre-commit slop gate

Before every commit (default cadence; the user may change it), work through `templates/pre-commit-slop-gate.md` and pass every item. It covers the non-negotiables above plus the complexity check below, and asks you to record the one-sentence purpose and the verification evidence. If any item fails, fix it before committing — do not commit through a failing gate.

# Complexity check

The pre-commit gate checklist owns the per-change complexity items (removable code, duplication, unused abstractions, readability). This section adds the one signal that only shows up **across** commits, not within one:

- A single add-only change is fine. **Add-only across many commits in a row** means complexity is piling up — stop and look for consolidation. Over a long task, keep the shape of the whole diff in mind, not just the current step; a diff that only ever grows is the clearest early sign of accumulating slop.

# Independent review

At each milestone (or the cadence the user set), subject the change to scrutiny from outside the perspective that wrote it, using the strongest mechanism the environment offers. Getting that independent review is the hard requirement; how you satisfy it depends on what is available, in order of preference:

- **Best:** two independent model families (for example, the strongest available Claude reasoning mode and the strongest available GPT reasoning mode), combined. When a second family is available, do not rely on a single one.
- **Next:** any review agent or second model the environment offers.
- **Degraded fallback (only when no second reviewer exists):** run an explicit adversarial self-review from a different stance — actively try to prove the change is wrong, unnecessary, or duplicated — and record that only a single viewpoint was possible, so a human can add a second one later. Do not mark review complete as if a second viewpoint had run.

Whatever the mechanism, ask the reviewer to find what is **wrong, missing, unnecessary, or duplicated** — not to confirm it looks good. A review that only says "looks fine" is not a review. Every finding must lead to an action: fix now, split into follow-up, or stop and escalate with evidence; double-check findings before acting on them. This review satisfies and extends `execute-plan-loop`'s periodic deep review.

# User overrides

The user controls **cadence and mechanism**, and those instructions win over the defaults:

- gate cadence — how often the gate runs on intermediate commits (for example, "don't gate every tiny commit")
- review cadence — "review every N milestones", "review only at the end"
- review mechanism — which models or reviewers to use
- prototypes — "this is a throwaway, keep it light"

The user does **not** get landed code past the hard gate. If the user asks to skip the gate and still land the change, treat it as a request to either (a) fix whatever is failing, or (b) mark the work as an explicit throwaway that will not be landed. A throwaway can use a lighter process while it stays out of the repository, but the moment it is headed to land, the full pre-commit gate applies — there is no reduced tier for landed code.

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
- An independent viewpoint over self-assessment; two model families over one when available.
- When unsure, stop and ask — do not generate more code to cover the doubt.

# Embedding the core principles

For teams that want every agent to carry these habits by default, `references/agents-md-block.md` is a short block to paste into the working repository's own `AGENTS.md` (or `CLAUDE.md`). It is local project policy for that repo — not part of any shared workflow contract. It gives all agents the baseline awareness; the full method and the hard gates live in this `anti-slop` skill, when it is installed.
