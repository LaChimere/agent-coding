# Project docs, lessons, decisions and retrospectives

Read before creating or changing a project's `AGENTS.md`, `docs/`, `docs/lessons.md` or `docs/decisions.md`, or before running a retrospective. Templates live in this skill's `templates/` directory.

## Project docs

- Each project keeps its durable knowledge in its own `docs/` directory: architecture, workflows, commands, contracts, lessons and decisions. Start from [templates/docs/README.md](../templates/docs/README.md).
- Write `docs/` for both humans and agents, following the caller's global communication style: conclusion first, concrete subjects and examples, consistent project vocabulary, terms defined where each document first uses them, no reliance on conversation context.
- A project's `AGENTS.md` is a routing table only: "before doing X, read Y" pointers into `docs/` or skills, plus genuinely project-wide constraints that fit on one line. Do not put long rules in it; move them into `docs/` or a skill and link them. Start from [templates/AGENTS.md](../templates/AGENTS.md).
- Global rules and templates belong in the global config and skills, never project-specific content; project-specific content belongs in that project's `docs/`.

## Lessons

Each project keeps `docs/lessons.md` ([template](../templates/docs/lessons.md)) for recurring pitfalls.

- Each entry has: **rule** (what to do or avoid), **reason** (why it matters), **evidence** (links to the PRs, issues, CI runs or transcripts where it happened) and **occurrences** (count).
- When a pitfall recurs, increment the existing entry's count and add the evidence link instead of adding a duplicate.
- When an entry reaches **3 occurrences**, promote it: move the rule into the project's relevant `docs/` page or into the owning skill, add an eval case (or a project test) that would catch the pitfall, and mark the lesson entry as promoted with links to both.

## Decisions

Each project keeps `docs/decisions.md` ([template](../templates/docs/decisions.md)) for settled choices: context, decision, alternatives rejected, consequences, status and links.

- Before implementation, read the decisions that cover the area; a recorded decision is settled until a new explicit decision supersedes it.
- Every review checks whether the change overturns or contradicts an existing decision. If it does without a superseding entry, report it as a finding; overturning a decision needs the owner's explicit decision and a new entry that marks the old one superseded.

## Retrospectives

- Default cadence: **weekly** (a default, not a fixed rule; a project or user may set another cadence in its docs).
- A retrospective reviews the period's lessons, incidents, CI failures and review findings; updates occurrence counts in `docs/lessons.md`; promotes entries that reached 3; and records any new decisions in `docs/decisions.md`.
