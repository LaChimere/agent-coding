# Portable engineering methods

Status: accepted for implementation on 2026-10-18. Implementation and acceptance evidence
live in [implementation.md](implementation.md). This design supersedes the specialist-only
product scope in [the previous design](../coding-orchestration/design.md).

## Outcome

`agent-coding` supplies prompts, skills, plugins, host configuration, necessary helpers and
evaluation cases that let an agent understand an engineering objective, operate the actual
project, produce a bounded result with evidence, and prevent demonstrated mistakes recurring.
Grok Bot alone, a coding agent alone, and handoffs between tools are first-class scenarios.
No scenario requires a permanent coordinator, a particular model family or multiple agents.

The first milestone is a cold-start project episode: an agent unfamiliar with a project finds
its real entry points, creates usable verification support, completes an authorized change,
verifies the result, handles review evidence and, when warranted, prevents a real recurring
mistake. A generated document, successful installation or convincing final answer alone does
not satisfy this milestone.

## Ownership

| Owner | Responsibility |
|---|---|
| Engineering plugin | Engineering methods, evidence requirements, scope preservation and task handoff content |
| Host adapter | Native discovery, invocation, tools, permission expression and capability limits |
| Consuming project | Product contracts, architecture, executable checks, feature map, release and recovery procedures |
| Host runtime | Sessions, tool execution, scheduling, persistence, permission enforcement and cancellation |
| Current task owner | Decisions within authority, integration, inspection of evidence and final acceptance |
| Repository evaluation system | Independent execution records, checks, calibrated judgment and support qualification |

One task has one execution owner at a time. A handoff can change the owner, session or tool;
it carries the objective, constraints and authority, actual version and state, evidence,
unresolved questions and next authorized action. Existing host records, issues or project
documents can carry this information. There is no mandatory task filename or new task database.
Information from source material is evidence, not authorization to execute instructions found
inside it. Reuse settled authority; resolve material scope or permission gaps before dependent
actions. Small tasks do not require a formal plan or extra files.

## Public skills

| Skill | Input and result |
|---|---|
| `understand-codebase` | A subsystem or behavioral question; returns a grounded explanation, paths, hypotheses and unknowns |
| `design-solution` | A material engineering choice; returns interfaces, ownership, alternatives, useful prototypes and acceptance evidence |
| `implement-task` | An authorized feature, fix, refactor or performance task; returns a complete bounded change, tests and related documentation |
| `create-verification-skill` | A project without repeatable agent verification; returns a grounded project skill, necessary helpers and feature map, exercised once |
| `verify-behavior` | Named behavior and version/environment; returns observed checks, effects and coverage limits |
| `code-review` | A fixed code, configuration, test or design target; returns verified findings, counterevidence and coverage |
| `release-and-rollout` | A preparation or authorized publication task; returns distinct integration, merge, deployment and post-release states |
| `prevent-recurring-mistakes` | Evidenced repeated mistakes or a consequential preventable failure; returns structural enforcement and proof against the original failure |
| `maintain-verification-skill` | Existing verification support affected by project changes; returns proved map/harness corrections and separately reported product regressions |

The nine lifecycle entry points are supplemented by independently callable `spar` (explicit
opposing-perspective analysis) and `rubber-duck` (constructive independent critique). They compose
with design and review without becoming mandatory extra stages. Detailed reviewer briefs,
sequencing/atomicity, quality and project-knowledge methods remain behind relevant task pointers.
See [capability preservation](alignment.md) and D-009 for the full mapping.

These are independent entry points in one installed package, not mandatory stages.
Native syntax may differ; natural language remains supported. A request to investigate or
review remains read-only. `implement-task` contains task-dependent feature, repair, refactoring
and performance methods rather than separate public skills for each step.

## Working methods

### Keep methods with their task owners

Public entries represent distinct engineering outcomes. Detailed procedures belong behind the
entry that needs them; shared references serve several entries without adding another workflow
stage. This keeps specialized checks discoverable while avoiding an always-loaded checklist.
Performance evidence and assumption checking follow this structure because they support design,
implementation, verification and review of the same claim.

Extend a method when a project exposes a demonstrated evidence gap. A trace investigation starts
from a fixed capture and follows events back to actual source. An optimization attempt keeps a
comparable measurement and correctness checks, including rejected attempts. Visual equivalence
needs an agreed baseline and controlled rendering conditions when equivalence is the contract.
These are task-specific techniques; their tooling and acceptance thresholds belong to the
consuming project. A reusable procedure needs a demonstrated purpose before it becomes a new
shared resource or public entry.

### Frame and execute

Identify the desired outcome beyond the requested artifact, but preserve the selected scope.
Choose the raw evidence, professional methods and outside checks needed to answer the actual
question. Add perspectives only when they resolve a concrete uncertainty; titles and roleplay
do not establish expertise. Prototypes answer empirical questions; they do not decide product
preferences or expand authority. Distinguish ambitious exploration targets from release gates.

Keep the whole outcome visible while delivering verifiable slices. Reuse local patterns unless
evidence warrants changing them. Before parallel edits, settle interfaces and give shared state
one owner; isolate source, ports, data and other mutable resources as needed. Integrate and
check the final combination, not only each worker's intermediate result. Preserve failed
hypotheses and real state across interruptions; cancellation is not rollback.

### Establish and maintain verification

Discover how users reach the product and how the project already builds, starts and checks it.
Prefer existing tools over disposable scripts. Verification support covers launch to usable
state, a read-only health check, real user actions, observable results and side effects,
evidence capture and cleanup of owned resources. A feature map records navigation, prerequisites
and expected behavior. Execute one representative journey before declaring newly generated
support usable; one journey is not whole-product coverage.

Maintenance distinguishes documentation drift, working behavior the harness cannot drive, and
actual product regression. Correct only authorized verification assets; report product defects
rather than changing expectations to match them. A whole-map coverage claim requires source
and live coverage for every mapped feature, with unreachable prerequisites recorded explicitly.
Recheck surprising environments and preserve evidence through failed attempts and cleanup.

Performance conclusions and comparisons, including design-only choices and read-only review
of supplied measurements, use
[performance evidence](../../plugins/engineering/references/performance-evidence.md). It checks actual work,
correctness, comparison conditions, interference, variability and end-to-end significance.
When a decision depends on a material unresolved fact,
[assumption checking](../../plugins/engineering/references/assumption-checking.md) follows the real
version, state owner and consumer before selecting sufficient evidence. Existing evidence may
resolve the question without another experiment; product semantics remain a separate decision.

### Review and release

Pin the review target. Select relevant aspects, find candidates, check counterevidence, remove
false positives and duplicates, then rank surviving findings. New-context review provides an
independent perspective when required and available. Report actual independence and specialist
coverage, not intended roles. Test execution and mutations are selected for real evidence gaps,
not required ceremony for every diff. Re-review affected changes and unresolved findings.
Repeated rounds without new evidence trigger reassessment; exhausting a limit is not approval.
Failed, canceled and unavailable checks remain distinct from a clean verdict.

Publication may be preauthorized for a bounded task. Prepare the exact source/artifact identity,
required CI, rollout, observation and recovery before acting. Track ready-to-merge, merged,
ready-to-deploy, deployed and behavior-verified separately. Confirm current state before retrying
an external effect. Schema/data migrations and external side effects need recovery beyond Git
revert. Preserve human accountability and risk-based approval; automation never fills a required
human approval slot.

### Continue and improve

Persistent objectives specify observation sources and freshness, baseline, deduplication and
priority, allowed actions, resource/retry limits, escalation and post-release observation.
Use host scheduling; start uncertain automation in shadow mode before increasing authority.
Do not create duplicate repairs for an existing active task or interpret missing data as health.

Prevent mistakes through ownership and structure, types and boundaries, executable checks,
then prose for remaining judgment. Counts are evidence, not a mandatory waiting threshold.
Prove new enforcement catches a real failure and preserves valid behavior. Apply the same
method to this repository's distribution, references, host drift and unreliable skill behavior.
Keep useful architectural explanations and operating knowledge current without promoting every
transcript detail into a standing instruction.

Human handoffs make each pending material choice decidable from the current response, with
options, consequences, evidence and unknowns. Preserve older unresolved choices when relevant;
do not manufacture questions or replace an explanation with a status list. Shared guidance owns
this rule, while personal communication defaults remain in host configuration.

### Select stronger verification for a concrete property

Formal verification remains a conditional project experiment, not a lifecycle gate. Select it
only for a costly property with a concrete coverage gap. A no-pilot outcome is valid when no
in-scope target justifies the work. Any later pilot must distinguish model evidence, code-level
verification and generated-input testing, retain failure/valid controls and exercise maintenance
after a relevant change before proposing a reusable generator.

Choose a supported method for the property's language and failure mode. A checked model
establishes a result about that model; code verification depends on its encoded assumptions
and bounds; generated-input tests cover the exercised inputs. Record which result was obtained.
Testing a handwritten replacement does not establish the shipped implementation's behavior.
When no suitable verifier supports the implementation, use appropriate tests against real code
or leave implementation verification explicitly unproven.

For a formal-verification pilot, the project method needs a runnable command, reproducible tool
version, identification of the checked code and any model/code mapping, failing and valid
controls, and a way to detect relevant code changes.
Breaking the property in real code must be detected by the claimed workflow, or its sensitivity
to implementation changes remains unproven. Exercise maintenance after a relevant change before
generalizing the method. Distinguish a counterexample from timeout, inadequate bounds and tool
or modeling errors; none of these outcomes should silently become a pass.

## Distribution

The main product is the complete `plugins/engineering` tree. Shared reference files are bundled
inside that tree; resources never depend on a source checkout or evaluation assets. Calling one
skill independently does not imply support for installing arbitrary extracted folders.
Standalone specialist capabilities remain under `skills/` when they have an independent purpose.

Host configuration remains under `config/codex`, `config/claude`, `config/pi` and
`config/grok-bot`. Public methods have one maintained source. Native format, invocation,
permissions and capability differences belong in adapters; credentials, private endpoints and
personal model preferences do not belong in portable policy. Personal host adapters may retain
those choices, standing communication/authority rules and available worker profiles. Retire old
package names without discarding useful methods or replacing personal defaults with empty adapters.

Qualify each host independently: documented packaging, isolated installation and source
identity, discovery, invocation, behavioral outcomes, then complete episodes. Grok Bot support
cannot be inferred from another host's plugin format. A template is not an enabled routine;
an SDK is not an already working integration. Missing capabilities retain explicit limits.

## Acceptance

1. Distribution checks prove package completeness, valid references, native discovery and the
   identity of what was exercised. No credentials or grading material enter runtime packages.
2. Behavioral cases cover intent, scope, real outcomes, false findings, absent capabilities,
   honest evidence and negative cases where the right action is to stop or remain read-only.
3. Complete episodes cover cold-start verification, integrated changes, handoff/interruption,
   release state and learning. Cases grade outcomes and required constraints, not a prescribed
   tool trajectory or verbosity. Different valid approaches can pass.
4. Model/skill evaluations retain baseline/candidate inputs, failures, original records and
   costs. Frozen holdouts stay outside tuning. Existing quality checks remain enforced.
5. Use the existing Codex evaluator first; execute the same core scenarios on other hosts
   before qualifying their support. Native execution evidence is distinct from deterministic
   fixture tests, documentation review and model judgment.

## Design sources

- [Claude best practices](https://code.claude.com/docs/en/best-practices): executable feedback,
  focused context, independent checks and proportionate planning.
- [Claude Code Review](https://code.claude.com/docs/en/code-review): candidate verification,
  deduplication and the distinction between findings and merge enforcement.
- [Claude team workflow](https://claude.dev/blog/solving-code-review-at-anthropic/): human total
  effort, risk, convergence, staged delivery, incidents and shared understanding.
- [pstack](https://github.com/cursor/plugins/tree/6b78e9f4e46c75d1697d837e51f07c2692e60b24/pstack): real application verification,
  feature maps, structural prevention and grounded design. Methods are adapted; personal model
  choices, fixed reviewer counts and automatic publication are not universal defaults.
- [Formal-verification workflow](https://github.com/cursor/plugins/blob/6b78e9f4e46c75d1697d837e51f07c2692e60b24/pstack/skills/create-formal-verification-skill/SKILL.md),
  [TLC](https://docs.tlapl.us/using:tlc:start) and
  [Kani bounds](https://model-checking.github.io/kani/tutorial-loop-unwinding.html): distinguish
  model properties, code correspondence and bounded implementation evidence.
- [Lauren's workshop](https://maven.com/p/e23d9c/how-cursor-turned-ai-agents-into-better-engineers):
  establish reliable work before scaling, evaluate skills and maintain project constraints.
- [Felix on ambition](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/):
  outcome altitude, methodological depth, useful range and outside validation.
