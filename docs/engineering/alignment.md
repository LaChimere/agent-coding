# Practice alignment and capability preservation

D-009 corrects the first redesign's loss of useful capabilities. The project assigns each
capability an owner and an observable check. Shorter guidance or an unrelated passing case does
not establish preservation. Current acceptance is tracked in [implementation.md](implementation.md).

## Capabilities, owners and evidence

| Capability | Project owner and method | Evidence to inspect | Supporting references |
|---|---|---|---|
| Engineering delivery | `implement-task`, `code-review`, `release-and-rollout` and continuous work compose verification, review, approval and learning | Actual review, authorization, rollout and recovery episodes; total human effort where measured | [Claude team workflow](https://claude.dev/blog/solving-code-review-at-anthropic/) |
| Review decisions | `code-review` selects applicable methods, verifies candidates against trusted policy and deduplicates findings | Supported findings, valid counterexamples and policy-source checks; findings remain separate from merge approval | [Review methodology](https://code.claude.com/docs/en/code-review) |
| Focused working context | Host standing rules remain available; task-specific methods load when needed | Runnable verification and fresh-context handoff with preserved constraints | [Working practices](https://code.claude.com/docs/en/best-practices) |
| Structural prevention | `prevent-recurring-mistakes` and change quality prefer ownership, types and executable checks before judgment guidance | Prior failure rejected and valid behavior accepted; registry and faulty-verifier controls | [Lauren Tan’s inverse-pyramid model](https://x.com/poteto/status/2111133080526495985), [structural correction](https://github.com/cursor/plugins/blob/6b78e9f4e46c75d1697d837e51f07c2692e60b24/pstack/skills/correct/SKILL.md) |
| Project verification | Creation and maintenance skills drive the actual product and maintain its feature map | Cold-start journeys, drift and regression cases, retained evidence after cleanup | [Verification creation](https://github.com/cursor/plugins/blob/6b78e9f4e46c75d1697d837e51f07c2692e60b24/pstack/skills/create-verification-skill/SKILL.md), [maintenance](https://github.com/cursor/plugins/blob/6b78e9f4e46c75d1697d837e51f07c2692e60b24/pstack/skills/maintain-verification-skill/SKILL.md) |
| Grounded design | `understand-codebase` and `design-solution` recover rationale, inspect callers and test consequential alternatives | Source-grounded interfaces, ownership and experiments; SPAR and Rubber Duck when applicable | [Architecture method](https://github.com/cursor/plugins/blob/6b78e9f4e46c75d1697d837e51f07c2692e60b24/pstack/skills/architect/SKILL.md) |
| Performance conclusions | `performance-evidence` is shared by design, implementation, verification and review | Actual completed work, correct outputs, relevant conditions, variability and end-to-end meaning; misleading and valid controls | [Benchmark method](https://github.com/cursor/plugins/blob/6b78e9f4e46c75d1697d837e51f07c2692e60b24/pstack/skills/benchmark-checklist/SKILL.md) |
| Empirical assumptions | `assumption-checking` follows real versions, state owners and consumers | A reachable defect or concrete counterevidence, without invented callers or unnecessary probes | [Boundary analysis](https://github.com/cursor/plugins/blob/6b78e9f4e46c75d1697d837e51f07c2692e60b24/pstack/skills/blast-radius/SKILL.md) |
| Human decisions | The shared working agreement makes every pending choice understandable in the current response | Older unresolved choices, options, consequences, evidence and unknowns; no fabricated approval when settled | [Decision handoff](https://github.com/cursor/plugins/blob/6b78e9f4e46c75d1697d837e51f07c2692e60b24/pstack/skills/ketchup/SKILL.md) |
| Useful ambition | Design, verification and independent review consider better outcomes, professional methods and outside evidence within selected scope | Scope-preserving experiments and substantive challenges to assumptions | [Outcome and methodological depth](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/) |

These references explain the methods' provenance. Project decisions define the architecture:
native hosts own execution and scheduling, while consuming projects choose risk thresholds,
approval rules and review budgets. Agreement between reviewers remains a screening signal;
source and runtime evidence establish findings. PR throughput alone is not a quality measure.

## Extending the methods

Deepen an existing owner when a demonstrated gap needs more specific guidance. Add a public
entry or state mechanism only for a distinct project need, with its own maintenance and
verification case. Acceptance, caller analysis, ownership, recovery, review, release and
structural prevention retain their existing owners.

Formal verification starts with a justified project property and coverage gap. A successful
project method and a subsequent maintenance exercise can inform a later generator decision.
Scheduling, integrations and publication retain their explicit authority boundaries. Fewer
steps are useful only when necessary depth and correctness survive; source alignment alone
does not establish improved runtime outcomes.

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
