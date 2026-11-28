# Practice alignment and capability preservation

The project assigns each capability an owner and an observable check. Shorter guidance or an
unrelated passing case does not establish preservation. Current acceptance is tracked in
[implementation.md](implementation.md).

## Capabilities, owners and evidence

| Capability | Project owner and method | Evidence to inspect | Supporting references |
|---|---|---|---|
| Engineering delivery | `implement-task`, `code-review`, `release-and-rollout` and continuous work compose verification, review, approval and learning | Actual review, authorization, rollout and recovery episodes; total human effort where measured | [Claude team workflow](https://claude.dev/blog/solving-code-review-at-anthropic/) |
| Review decisions | `code-review` selects applicable methods, verifies candidates against trusted policy and deduplicates findings | Supported findings, valid counterexamples and policy-source checks; findings remain separate from merge approval | [Review methodology](https://code.claude.com/docs/en/code-review) |
| Focused working context | Host standing rules remain available; task-specific methods load when needed | Runnable verification and fresh-context handoff with preserved constraints | [Working practices](https://code.claude.com/docs/en/best-practices) |
| Structural prevention | `prevent-recurring-mistakes` and change quality prefer ownership, types and executable checks before judgment guidance | Prior failure rejected and valid behavior accepted; registry and faulty-verifier controls | — |
| Project verification | Creation and maintenance skills drive the actual product and maintain its feature map | Cold-start journeys, drift and regression cases, retained evidence after cleanup | — |
| Grounded design | `understand-codebase` and `design-solution` recover rationale, inspect callers, examine existing solutions when evidence is insufficient and test consequential alternatives | Source-grounded choices, applicability and adoption boundaries, interfaces, ownership and experiments; SPAR and Rubber Duck when applicable | [Existing-solution method](../../plugins/engineering/skills/design-solution/SKILL.md#examine-existing-solutions) |
| Performance conclusions | `performance-evidence` is shared by design, implementation, verification and review | Actual completed work, correct outputs, relevant conditions, variability and end-to-end meaning; misleading and valid controls | — |
| Empirical assumptions | `assumption-checking` follows real versions, state owners and consumers | A reachable defect or concrete counterevidence, without invented callers or unnecessary probes | — |
| Human decisions | The shared working agreement makes every pending choice understandable in the current response | Older unresolved choices, options, consequences, evidence and unknowns; no fabricated approval when settled | — |
| Useful ambition | Design, verification and independent review consider better outcomes, professional methods and outside evidence within selected scope | Scope-preserving experiments and substantive challenges to assumptions | [Outcome and methodological depth](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/) |

These references explain the methods' provenance. Project decisions define the architecture:
native hosts own execution and scheduling, while consuming projects choose risk thresholds,
approval rules and review budgets. Agreement between reviewers remains a screening signal;
source and runtime evidence establish findings. PR throughput alone is not a quality measure.

## Extending the methods

Deepen an existing owner when a demonstrated gap needs more specific guidance. Add a public
entry only under the D-014 admission rule: a distinct outcome, a distinct invocation, independent
use and its own evidence. Add a state mechanism only for a distinct project need, with its own
maintenance and verification case. Acceptance, caller analysis, ownership, recovery, review,
release and structural prevention retain their existing owners.

Formal verification starts with a justified project property and coverage gap. The D-014
formal-verification skills keep that condition and report a no-target result when none exists.
D-014 ships them as a generator and its upkeep pass without first exercising maintenance on a
real project.
Scheduling, integrations and publication retain their explicit authority boundaries. Fewer
steps are useful only when necessary depth and correctness survive; source alignment alone
does not establish improved runtime outcomes.

## User-invoked skills (D-014)

Each skill's method is in its SKILL.md. The skills use host-neutral wording and the shared
authority rules, and name no models. Evidence for each skill is recorded in
[implementation.md](implementation.md).

| Capability | Owner | Main design choice |
|---|---|---|
| Multi-candidate synthesis | `arena` | Any model the host offers; the owner reads and scores every candidate |
| Parallel fan-out with proven results | `swarm` | Host delegation; at most one relaunch; gaps are not passes |
| Run-proven adversarial challenge | `interrogate` | Read-only target; isolated reproductions |
| Measured metric climbing | `optimize-metric` | No automatic commits or PRs; measurement checks inline |
| Workflow design for large or unattended work | `figure-it-out` | Framing checkpoint before long runs; append-only decision log |
| Pause, resume and recall | `resume-work` | One checkpoint contract; no automatic WIP commit; host session records |
| Expert vocabulary | `reframe` | Output in the user's language |
| Deeper requests | `sharpen` | Restatement first; preference choices stay with the user |
| Paced explanation | `teach` | Investigation follows `understand-codebase` |
| Session lessons | `reflect` | Source edits only, after approval; enforceable items to `prevent-recurring-mistakes` |
| Comment removal | `no-comments` | The worker edits an isolated copy and returns a patch; flags named `RESHAPE`; fixes through `implement-task` |
| Prose cleanup | `unslop` | Owner-chosen style rules; the Chinese list combines patterns seen in model output during this work with the two Chinese style guides |
| Technical documents | `technical-writing` | Chinese rules from the Chinese copywriting guidelines and Ruan Yifeng's style guide; “” quotes are the owner's choice and the ellipsis follows GB/T 15834 |
| Formal verification creation and upkeep | `create-formal-verification-skill`, `maintain-formal-verification-skill` | Conditional methods, not lifecycle gates; the cheapest tool that answers the question, chosen with the user before any install |

## Supporting methods and host policy

| Capability | Responsibility | Entry/resource |
|---|---|---|
| Host standing Communication / Authority | Retained continuously; relevant even without skill invocation | config/antigravity/AGENTS.md, config/codex/AGENTS.md, config/claude/CLAUDE.md and config/copilot/copilot-instructions.md |
| Codex approval, network, discovery, memories, Code Mode, wakefulness and agent settings | Retained as personal host configuration, not universal method defaults | config/codex/config.toml and agents/ |
| Fixed personal worker profiles | Retained as available user-configured choices; portable methods do not require them | config/codex/agents/; Claude keeps only the reviewer in config/claude/agents/; Antigravity uses built-in `research` / `define_subagent` (D-013) |
| Main PR/artifact review and six detailed checking briefs | Integrated, including applicability, scope and double-confirmation | code-review and references/reviewers/ |
| SPAR | Preserved as an explicit standalone challenge; composed into design/review on request | spar |
| Rubber Duck | Preserved as a standalone constructive critic and optional risk-selected review | rubber-duck |
| Future commit decomposition and existing-change atomicity | Preserved as distinct methods under one design owner; independent PR grouping and deployment safety | design-solution/references/change-sequence.md |
| Anti-slop, test-fitting and independent proof | Preserved detailed assessment, reachable from implementation and review | references/change-quality.md |
| Revert/mutation verification | Preserved as selected proof methods; universal execution removed in favor of task/risk scope | verification-evidence and code-review |
| Git authorization, selective staging, exact-head merge and safe failure recovery | Preserved separately from merely reporting review results | release-and-rollout and references/git-publication.md |
| Shared-state interruption recovery | Preserved rerunnable scoped scripts and credential/side-effect boundaries | references/stateful-work.md |
| Cheap classification then stronger investigation | Preserved as a host-configurable strategy; no mandatory model in portable policy | continuous-work and personal Antigravity/Codex/Claude routing |
| Project docs, decision/lesson records, explainers and directly related refresh | Preserved; established contracts outrank unauthorized implementation changes | references/project-knowledge.md |
| Claude shared-component confirmation and publication boundaries | Removed by D-011; the Codex-aligned Authority rules and the Git reference apply | None |
| Copilot three-round review budget | Retained as a host-specific bound; exhaustion never becomes approval. Removed for Claude by D-011 | config/copilot/copilot-instructions.md |
| Independent image-scanning specialist | Unchanged; separate domain capability | skills/scan-image-vulnerabilities/ |

The Copilot adapter uses the same complete methods without inventing a native installer; it remains
unqualified until exercised in that host. No host's behavior is inferred from another.

## Acceptance rules for further refinement

Before deleting or merging a method, name the old behavior, its new owner/loading condition and
its failure case. If none can be identified, record a real retirement reason rather than claiming
an equivalent migration. Test machine-checkable package/configuration boundaries deterministically;
use behavior cases for judgment. Include positive defects, clean counterexamples, explicit scope,
critic independence and design disagreements. Preserve unsuccessful attempts and current source
identity. Old reports remain evidence for their frozen snapshot, not the newest files.
