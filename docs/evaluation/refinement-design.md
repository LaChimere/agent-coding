# Codex Evaluation Refinement Design

> This document records the design direction confirmed by the repository owner
> through Q1–Q7 and the subsequent overfitting discussion on 2026-09-13. It uses
> the Workflow design template. Implementation and new baseline qualification
> are tracked in the [refinement plan](refinement-plan.md), with a
> [coverage map](refinement-coverage.md) and [acceptance report](refinement-acceptance.md).
> The [framework design](design.md), [original implementation
> plan](plan.md), and [acceptance report](acceptance.md) describe the delivered
> framework; this document defines its next corpus and evaluation refinement.

## Background and problem

The repository's Codex configuration, plugins, and skills should help an agent
complete real work while respecting authority and producing verifiable results.
Maintainers now want to simplify those instructions without losing useful
capabilities. An evaluation must distinguish an actual improvement from a shorter
answer, an unnecessary process, or a change that merely satisfies familiar tests.

The existing Bun/TypeScript framework already runs native Codex through
Promptfoo, preserves execution and artifact evidence, grades independently, and
reports quality and resources separately. The main refinement is the measurement
contract: what the cases represent, what their checks require, and which evidence
can support a comparison. Replacing the framework would not resolve these issues.

At the start of this refinement, the corpus contains 330 cases and 1,234 checks:
196 routing cases and 134 task cases. Only one case declares a scripted follow-up
user reply. The preceding case review found unsupported downstream-duty and
presentation requirements, ambiguous routing expectations, conditions that their
fixtures do not exercise, and gaps in checks for otherwise successful executions.
Historical acceptance is useful evidence, but it is not a newly qualified
baseline for revised tasks and grading rules.

The approach follows OpenAI's guidance to
[revisit skill descriptions and accumulated instructions](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra),
[calibrate Astra's follow-through and verification](https://developers.openai.com/api/docs/guides/latest-model),
and [remove instruction groups through controlled comparisons](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.6).
These are hypotheses to test in this repository, not evidence that a particular
deletion will improve it. The
[evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
and [skills evaluation example](https://developers.openai.com/blog/eval-skills)
support task-specific cases, retained evidence, and human calibration.

## Goals and non-goals

The first implementation stage has three outcomes:

1. A representative set of tasks with defensible requirements, including separate
   checks of ordinary work and skill mechanisms.
2. Grading that accepts supported correct results, rejects representative incorrect
   results, and explains when the available evidence cannot decide.
3. A new baseline of the unchanged candidate on the development and regression
   collection, with quality, time, token usage, cost, and coverage recorded.

A baseline is the measured performance of a frozen candidate under stated test
conditions. It is a comparison reference, not a requirement that the candidate
pass every task. A holdout is a collection reserved from instruction and rubric
tuning until a candidate is ready for acceptance.

The ordinary-work coverage includes analysis and planning, implementation and bug
fixing, review of changes, and documentation maintenance. Permission handling,
clarification, continuation, recovery, and collaboration are exercised within
these tasks where applicable. The corpus should represent the work, not maximize
the number of cases or require every task to use a workflow skill.

The first stage changes only `evals/` and directly related documentation.
`config/codex/`, `plugins/`, `skills/`, and marketplace sources remain candidate
inputs. Their later optimization is a separate stage based on this measurement
foundation. The design does not authorize production installation changes,
commits, publication, or remote actions.

There is no new evaluation platform, model-simulated user, automatic prompt
optimizer, broad model matrix, weighted quality/resource score, or requirement
for a second model family. New tests and metadata must serve the decisions below;
there is no separate general-purpose policy language or holdout service.

## Constraints

- Codex remains the effectiveness target. Claude Code and Copilot CLI retain
  adaptation and distribution checks without new model-effectiveness evaluation.
- Candidate configuration is repository-owned. The initial imported profile is
  retained as provenance; runs do not silently import current global settings or
  external personal skills and plugins.
- Retain Bun/TypeScript, pinned Promptfoo, native Codex execution, and the
  [frozen quality baseline](../../evals/AGENTS.md#frozen-quality-baseline).
- Keep the independent model grader at `gpt-6-astra` with `high` reasoning effort.
  Candidate and grader configuration remain separate. Relevant effective settings
  require evidence rather than inference from a requested value.
- Record time, tokens, and costs without task time or token budget caps. Concurrency
  and transport failure detection retain their existing operational meaning.
- Keep `passed`, `failed`, and `unknown`, core versus diagnostic checks, immutable
  original evidence, append-only grading, and explicit trial/repetition identity.
- Preserve user policies, including authority, review requirements, role ownership,
  and repair limits. Changing policy is not a grading repair or prompt cleanup.
- Require no owner review of every ordinary case or run. The owner confirms key
  standards and a small set of representative labels; material unresolved
  judgments are presented with concrete evidence for a decision.

## Proposed design

### A task and its separate skill check

Consider a task to repair a retry helper, verify its behavior, and leave the
changes uncommitted. The ordinary task checks the repaired behavior, relevant
regressions, scope, and absence of an unauthorized commit. Codex may handle it
directly. Not invoking an optional execution skill is not a failure when the task
and active policy do not require that skill.

A separate mechanism case explicitly requests the execution skill, or evaluates
a declared skill trigger. It checks discovery and native evidence of the required
use as well as the relevant behavior. Correctly naming the skill in a routing
answer does not establish invocation. A skill mechanism failure remains visible
in its own results without retroactively changing the ordinary task's verdict.

Both cases honor explicit user instructions. If the actual task requires a
particular skill, review, or approval before an action, that process becomes part
of the task contract. The distinction allows valid alternative methods while
preserving real obligations.

### Requirements and task families

Each core requirement needs an identifiable authority, an applicable condition,
and observable evidence. Existing case requirement mappings remain the starting
point. The refinement adds only the information needed to explain these properties
and select coverage; it does not duplicate the full skill text as a scoring oracle.
Evidence descriptions identify stable observation sources. Concrete scoring
conditions belong in versioned assertions/reference, so a grading correction does
not leave a second, frozen copy of the retired rule in the requirement record.

| Work family | Results to protect | Representative situations |
| --- | --- | --- |
| Analysis and planning | Understand the request, resolve material uncertainty, and produce a usable plan within the discussion boundary | A scoped proposal; an unresolved interface; a request that does not authorize implementation |
| Implementation and fixes | Correct behavior, proportionate validation, preserved interfaces and unrelated work | A bug with boundary cases; an authorized small feature; a repairable test failure |
| Change review | Evidence-backed findings, appropriate uncertainty, and no invented defects or unauthorized edits | A real defect; a sound change; an underspecified domain rule |
| Documentation | Accurate updates reflecting actual behavior within the requested scope | A named document; related-document discovery; no completed change to document yet |

Continuation and collaboration are not separate mandatory stages for every case.
Selected cases exercise clarification followed by continuation, new instructions,
scope changes, failure recovery, and actual delegated work. Role-specific evidence
must cover the consumers whose behavior matters; root-agent success alone does
not establish that Luna, Sol, or another configured worker path works.

Maintain a compact coverage table using existing requirement, case, and check IDs.
Map each work family and required cross-cutting capability to its ordinary or
mechanism cases, applicable roles or interactions, and the observed evidence that
supports assessment. Distinguish planned coverage from actually observed coverage.
The primary prepares this mapping from the owner-confirmed standards; it requires
neither owner approval of every case nor a fixed case quota or separate registry.

Case selection starts from real work reduced to isolated, repeatable fixtures.
Reuse sound existing cases, merge duplicate coverage, and remove checks without a
defensible purpose. Never remove a case merely because the candidate fails it.
Synthetic variations may fill a specific boundary gap, but they must still
represent a coherent task and preserve its declared requirements.

Core checks protect outcomes, authority, and essential evidence. Routine process
recitation and presentation preferences are diagnostic unless an explicit
consumer-facing contract makes them essential. A reference answer demonstrates
one valid result; it is not the only acceptable wording or implementation.

### Fair checks and calibrated grading

Use programmatic checks for facts that can be established directly: artifact
content, behavior tests, Git state, structured outputs, and native event identity
or ordering. Use text grading for semantic judgments over retained evidence and
artifact grading when active inspection is necessary. A claimed action or a
started command is not sufficient proof of successful execution.

For important new or corrected checks, maintain a supported correct example and
a representative incorrect example. Where multiple implementations are valid,
include a materially different valid result to detect an over-specific checker.
These examples validate the assessment without requiring multiple full reference
implementations for every simple case.

Initial repairs address the demonstrated classes of problem: route answers being
required to narrate downstream duties; a SPAR question-position rule conflicting
with the required output template; correct planning content rejected for a
heading; and failure or clarification checks that only match a keyword or count
turns. Worker evidence must establish the action rather than reward an answer
already disclosed in the parent prompt.

Expand calibration beyond the current three sample labels, confirmed by the owner
for both text and artifact grading. A full calibration run evaluates those labels
with both methods, producing six method-specific observations. The samples concern
answer `42`, answer `41`, and missing capture; those numbers are answer values,
not counts of graded cases.
New examples cover the relevant task and evidence boundaries, including concise
correct output, elaborate incorrect output, a valid alternative, an unsupported
completion claim, and genuine uncertainty.

The primary prepares the examples and their evidence in plain language. The owner
confirms key standards and representative labels before they are used as human
calibration truth. Routine runs are scored automatically. An important unresolved
requirement or disagreement is returned for a concrete decision, not silently
converted into a new expected label or resolved by model majority vote.

Complete evidence of a violation produces `failed`. Insufficient execution or
grading evidence produces `unknown` for the affected check. A condition that the
scenario never exercises should be moved to a case that exercises it or made
diagnostic where appropriate; it should not automatically pass. Reasonable user
interaction that the script cannot support is an execution limitation, not proof
that the candidate chose incorrectly.

### Development, calibration, and holdout use

The collections have distinct purposes:

| Collection | Use | Exposure rule |
| --- | --- | --- |
| Development and regression | Diagnose changes and protect established capabilities | Cases and results may be inspected and used for tuning |
| Calibration | Check a grader against confirmed judgments | Does not count as candidate task-success evidence |
| Holdout | Check a frozen candidate on tasks not used for tuning | Excluded from routine discovery, feedback, and tuning until acceptance |

The already reviewed corpus is development/regression material. Reorganizing it
does not make it unseen. Holdouts use new task instances and problem structures,
grouped by shared fixture, source, and solution pattern to avoid splitting near
duplicates across collections. They still cover the abilities being preserved;
changing only names or paraphrasing a known task is not sufficient independence.

There are two separate protections. The executing candidate receives its task and
necessary files but not reference answers, hidden verifier implementation, or
grading instructions. The maintainer or agent tuning the candidate also avoids
holdout contents and feedback. Material already viewed or discussed in that
tuning context is treated as seen, even if no deliberate special case was added.
An independent authoring or validation context may inspect holdouts without
passing their content or diagnostic feedback into the tuning context.

Keep a small explicit collection record identifying membership, version, task
provenance/grouping, and known exposure. After a holdout is exposed to tuning,
retain the history and move its future use into development/regression; replenish
holdout coverage with new tasks. The record documents known use, not a guarantee
that the underlying model never encountered related public training data.

Separate holdouts throughout discovery, input freezing, and reporting. Neither
an ordinary development run nor an ordinary development regrade may read, copy,
or expose held-out definitions or holdout-only fixtures and grading references.
Filtering out scheduled trials after parsing or snapshotting those inputs does
not satisfy this boundary.

An explicit acceptance selection is required to run holdouts. Freeze the selected
collection's identity, version, membership, and known exposure alongside its input
snapshot, and link that record from the run and report. Later membership or
exposure changes must not rewrite that frozen record. Qualification must establish
both ordinary-run exclusion and the provenance of an explicit acceptance selection.
Exact layout, CLI spelling, and verification procedures belong to the implementation
plan. Existing case and grading identities still apply; no second scheduler is needed.

Explicit acceptance-scoped regrading may use the frozen selection and retained
evidence to correct a judgment under the regrading rules below. Preserve the
original provenance, record the new grading definition and any subsequent exposure,
and do not treat the correction as restoring a case's independence from tuning.

### Evaluation cadence and the first baseline

For a small change, explicitly select the related development cases and record
the selection. Before accepting a complete version, run the full maintained
development/regression collection. Once the candidate is frozen, use the holdout
for acceptance. Required code-quality checks and hooks are unaffected by this
model-evaluation cadence.

The ordinary full-run default remains one trial per case in the normal
development/regression collection. Holdouts are not part of that default. Explicit
subsets and repetitions retain the existing semantics; there is no automatic
Git-diff selector or mandatory repetition multiplier.

The first-stage baseline runs the unchanged repository candidate against the
refined development/regression collection. Holdouts are prepared and validated
separately but are not used to tune or score that baseline during development.
When a later runtime candidate is ready, the retained baseline candidate and the
new candidate can be executed on the same frozen holdout under matched conditions.
The original baseline does not need prior exposure to those tasks.

Record the candidate snapshot, actual configuration, runtime and tool conditions,
case and grading versions, planned trials, execution evidence, and report IDs.
Preparation currently overlays candidate TOML onto a profile; deleting a key can
leave its effective value unchanged. Comparisons must establish the intended
runtime difference rather than infer it from the source diff alone. Candidate
instructions and role files remain separate from grader configuration.

Quality, time, tokens, and cost remain separate, with preparation, candidate,
verification, and grading consumption identifiable. Report failed and incomplete
work, unknown measurements, decision coverage, and excluded pairs alongside
eligible comparisons. A higher decidable pass rate caused by more unknown
outcomes does not establish an improvement.

### Controls against overfitting

Every later instruction change must address a general task requirement or a
demonstrated failure class. It must not insert a benchmark-specific answer,
constant, or ritual merely to satisfy a familiar case. For example, one task
needing clarification supports asking when a material requirement is missing;
it does not justify requiring a question before every task. Legitimate domain
names, paths, formats, and constants remain valid when the real contract requires
them.

Check changes against new scenarios and equivalent correct outputs. A short
correct answer should not lose core credit solely for omitting procedural prose,
and an elaborate incorrect answer should not gain it. Verify that changing a
decisive fact changes the assessment when no other sufficient evidence remains.
Use targeted counterexamples, not a large random mutation system.

Freeze the comparison requirements, graders, and candidate versions before
measuring an improvement. If a grading error is discovered, correct it and apply
the revised standard to both sides. Regrading is valid only when retained evidence
suffices; changing the task, fixture, authority, or interaction requires new
execution. A score increase caused by fixing the grader is not candidate progress.

The case's `metadata.reference` is versioned grading guidance, not additional
authority for the candidate. It may be corrected or expanded with another valid
example during regrading while preserving the original task obligations; the
reference change receives a new grading definition. It must not introduce a
requirement absent from the frozen task, authorization, or available contract.
Adding such an obligation requires revised candidate-visible inputs and a new
execution, rather than only changing the grader's reference.

Preserve every attempt. Choose repetitions and pairings before observing results;
do not replace failures with favorable reruns. Targeted repeats can investigate
instability but cannot guarantee general reliability. Holdout results are not an
unlimited tuning signal, and absence of observed regression is bounded by the
tested coverage.

## Decisions and trade-offs

| Decision | Reason | Accepted trade-off |
| --- | --- | --- |
| Ordinary outcomes and skill mechanisms are assessed separately | Protects practical capability while allowing simpler valid methods | Requires both end-to-end tasks and focused mechanism cases |
| Real tasks guide corpus refinement; sound old cases are reused | Preserves useful coverage without freezing every historical check | Requires reviewing provenance and removing redundant tests carefully |
| Owner confirmation focuses on standards and representative labels | Keeps the judgment grounded without making every run manual | Material disputes still need a human decision |
| New holdouts are reserved for acceptance | Reduces adaptation to familiar tests | Requires new tasks and explicit exposure discipline |
| Related cases run during iteration, followed by full regression and holdout acceptance | Provides timely feedback while retaining wider checks | An unexpected effect may first appear at the full regression stage |
| The existing framework and record semantics remain | Current preparation, evidence, grading, and comparison address the core infrastructure needs | Collection selection and targeted evidence checks still need local implementation |
| The first baseline preserves runtime content | Separates measurement repairs from candidate changes | Runtime optimization starts after the measurement foundation is qualified |

The first stage is complete when the representative tasks are usable, material
assessment defects affecting its required core capabilities are resolved,
confirmed calibration examples exercise the relevant boundaries, and a new
baseline provides usable evidence for the agreed capability scope. The coverage
table must link that scope to observed checks and evidence; an unmapped or
unassessable required capability prevents qualification. Preparing valid, unexposed
holdout coverage is part of readiness; running it to optimize the first baseline
is not.

A partial baseline may be delivered while a material assessment defect remains,
and independent work may continue. The affected capability remains unqualified;
that partial result neither completes the first stage nor supports runtime
optimization that depends on the defective assessment. A genuine candidate
failure, a justified unknown judgment, or missing resource data is not itself an
assessment defect and need not block completion. An unresolved inability to
assess a required capability must not be described as preservation of it.

Later runtime acceptance uses full regression, new holdout evidence, and explicit
disposition of material differences. Comparable quality with lower time or cost
is a useful improvement even without a higher pass rate. Better scores only on
familiar cases do not establish general improvement; new-task regression requires
investigation before claiming the change preserves capability.

Delivery slices, exact commands, collection layout, and qualification results
belong in a new implementation plan. The completed framework plan and its
acceptance evidence retain their historical meaning.

## Risks and open questions

No further product-policy interview is required before implementation planning.
Concrete tasks and new human labels still need preparation and confirmation;
agreement on this design is not approval of unseen examples.

| Risk or assumption | Consequence and handling |
| --- | --- |
| Skills become their own scoring authority | Trace core requirements to task or owner policy, and test valid alternatives |
| Holdout exposure cannot be inferred reliably from file location | Record known authoring and tuning exposure; treat uncertain independence conservatively and avoid secrecy claims |
| A synthetic task no longer represents real work | Preserve the actual decision, constraints, and meaningful failure while simplifying the fixture |
| A strong judge rewards presentation or shares candidate blind spots | Use confirmed positive, negative, and ambiguous examples with concrete evidence |
| Default corpus discovery leaks holdouts | Require explicit acceptance selection and verify the discovery boundary |
| Scripted interaction rejects a reasonable continuation | Expand only the needed branch or retain incomplete/unknown status with its cause |
| Root-agent success hides a worker regression | Exercise relevant configured roles and inspect their actual native results |
| Several safe-looking deletions remove the last copy of a needed rule | Verify the combined candidate after individual experiments |
| Cache, provider, concurrency, or model drift changes results | Freeze and report conditions; limit claims to eligible comparisons and observed resource coverage |
| New metadata or diagnostics grow into another framework | Add only the collection, provenance, and evidence information required by the agreed decisions |
