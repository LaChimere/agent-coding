# Practice alignment and capability preservation

D-009 corrects the first redesign's loss of useful capabilities. Each row identifies a method's
owner and the observation needed to assess it. A short skill or passing unrelated case does not
establish preservation. Current acceptance is tracked in [implementation.md](implementation.md).

## Source principles and their application

| Source | Principle applied | Product owner and evidence |
|---|---|---|
| [Claude Team](https://claude.dev/blog/solving-code-review-at-anthropic/) | Layered verification, independent review, verified findings, risk-based human approval, convergence and post-release learning | implement-task, code-review, release-and-rollout and continuous-work; actual review, permission and release cases |
| [Claude review docs](https://code.claude.com/docs/en/code-review) | Find, verify, rank; trusted project review policy; findings are distinct from approval | code-review method index/report; positive and clean cases plus policy-source checks |
| [Claude best practices](https://code.claude.com/docs/en/best-practices) | Runnable feedback, focused contexts, broad standing rules and on-demand methods | verification skills; retained host standing policy; fresh-context handoff |
| [Lauren/pstack correct](https://github.com/cursor/plugins/blob/main/pstack/skills/correct/SKILL.md) and the owner's supplied inverse-pyramid post | Fix structure, then types/checks, then remaining judgment guidance; prove prior failures are caught | prevent-recurring-mistakes and change-quality; registry and faulty-verifier controls |
| [pstack verification](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md) and [maintenance](https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md) | Drive actual user behavior; maintain a truthful map; retain proof after cleanup | verification creation/maintenance; cold-start and drift/regression cases |
| [pstack architect](https://github.com/cursor/plugins/blob/main/pstack/skills/architect/SKILL.md) | Understand existing reasons, design interfaces/ownership, prototype alternatives and revise a failing shape | understand-codebase, design-solution, SPAR and Rubber Duck; grounded design/critique cases |
| [pstack benchmark checklist](https://github.com/cursor/plugins/blob/6b78e9f4e46c75d1697d837e51f07c2692e60b24/pstack/skills/benchmark-checklist/SKILL.md) | Verify actual work, output correctness, relevant tuning, variability and end-to-end meaning before trusting a measured conclusion | performance-evidence, loaded from design, implementation, verification and review; misleading and valid comparison cases |
| [pstack blast radius](https://github.com/cursor/plugins/blob/6b78e9f4e46c75d1697d837e51f07c2692e60b24/pstack/skills/blast-radius/SKILL.md) | Resolve the material fact a design or correctness argument depends on across real consumers and lifecycle boundaries | assumption-checking with existing review and verification; defect and safe-control cases |
| [pstack ketchup](https://github.com/cursor/plugins/blob/6b78e9f4e46c75d1697d837e51f07c2692e60b24/pstack/skills/ketchup/SKILL.md) | Make every pending human decision understandable without reconstructing the transcript | shared working agreement; complete-choice and no-choice controls |
| [Felix](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/) | Improve the outcome, use professional methods and raw evidence, bring useful outside perspectives and validation | design-solution, SPAR, verification and independent review; scope-preserving experiments and decision challenges |

These are adaptations, not claims to reproduce the authors' infrastructure. Native hosts own
execution and scheduling. Projects choose risk thresholds, human approvals and review budgets.
Voting may screen candidates but does not replace source verification. PR throughput alone is not
quality. A nightly job, merge queue or live incident feed needs separate setup and authorization.

The 2026-10-19 increment deepens those methods without adding public skills or another task
state system. Existing acceptance, caller analysis, ownership, recovery, review, release and
structural prevention remain with their current owners; validate their behavior before adding
duplicate guidance. The formal-verification generator is a future decision following a justified
project pilot, not an imported default. Fewer steps are useful only when necessary depth and
correctness survive. Source alignment is not evidence of improved runtime outcomes.

## Old capabilities and current ownership

| Existing capability | Disposition and rationale | Current entry/resource |
|---|---|---|
| Host standing Communication / Authority | Retained continuously; relevant even without skill invocation | config/codex/AGENTS.md, config/claude/CLAUDE.md and config/copilot/copilot-instructions.md |
| Codex approval, network, discovery, memories, Code Mode, wakefulness and agent settings | Retained as personal host configuration, not universal method defaults | config/codex/config.toml and agents/ |
| Fixed personal worker profiles | Retained as available user-configured choices; portable methods do not require them | config/codex/agents/ |
| Main PR/artifact review and six detailed checking briefs | Integrated, including applicability, scope and double-confirmation | code-review and references/reviewers/ |
| SPAR | Preserved as an explicit standalone challenge; composed into design/review on request | spar |
| Rubber Duck | Preserved as a standalone constructive critic and optional risk-selected review | rubber-duck |
| Future commit decomposition and existing-change atomicity | Preserved as distinct methods under one design owner; independent PR grouping and deployment safety | design-solution/references/change-sequence.md |
| Anti-slop, test-fitting and independent proof | Preserved detailed assessment, reachable from implementation and review | references/change-quality.md |
| Revert/mutation verification | Preserved as selected proof methods; universal execution removed in favor of task/risk scope | verification-evidence and code-review |
| Git authorization, selective staging, exact-head merge and safe failure recovery | Preserved separately from merely reporting review results | release-and-rollout and references/git-publication.md |
| Shared-state interruption recovery | Preserved rerunnable scoped scripts and credential/side-effect boundaries | references/stateful-work.md |
| Cheap classification then stronger investigation | Preserved as a host-configurable strategy; no mandatory model in portable policy | continuous-work and personal Codex routing |
| Project docs, decision/lesson records, explainers and directly related refresh | Preserved; established contracts outrank unauthorized implementation changes | references/project-knowledge.md |
| Three-occurrence promotion threshold | Replaced: consequential first failures can justify structural prevention | prevent-recurring-mistakes and D-008 |
| Claude shared-component confirmation and publication boundaries | Retained as host-specific authority, including inside autonomous work | config/claude/CLAUDE.md |
| Claude/Copilot three-round review budget | Retained as host-specific bounds; exhaustion never becomes approval | Personal host guidance |
| Claude mandatory 3–5 reviewers, two model families and Opus-only document writer | Replaced with proportionate methods and selectable specialist/model capabilities; file count and model labels do not prove quality | independent-review and host guidance |
| Legacy endpoint/model and orchestrator assumptions | Preserve known local exclusions pending revalidation; use observed native capabilities instead of assuming old tool names | Claude personal capability guidance |
| Old plugin names and aliases | Retired; capabilities above survive under their current owners | one engineering package |
| Independent image-scanning specialist | Unchanged; separate domain capability | skills/scan-image-vulnerabilities/ |

The initial four-host scope did not justify deleting other useful host guidance. The retained
Copilot adapter uses the same complete methods without inventing a native installer; it remains
unqualified until exercised in that host. No host's behavior is inferred from another.

## Acceptance rules for further refinement

Before deleting or merging a method, name the old behavior, its new owner/loading condition and
its failure case. If none can be identified, record a real retirement reason rather than claiming
an equivalent migration. Test machine-checkable package/configuration boundaries deterministically;
use behavior cases for judgment. Include positive defects, clean counterexamples, explicit scope,
critic independence and design disagreements. Preserve unsuccessful attempts and current source
identity. Old reports remain evidence for their frozen snapshot, not the newest files.
