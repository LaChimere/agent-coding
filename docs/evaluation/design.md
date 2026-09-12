# Codex Evaluation Framework Design

> The repository owner approved the evaluation scope, framework, grading, interaction, and aggregation policies during the design discussion on 2026-09-11. This document incorporates those decisions and the subsequent requirement to use the Workflow design template in English. Current implementation and qualification evidence is tracked in [the implementation plan](plan.md); design approval is separate from execution evidence.

## Background and problem

The agent-coding repository distributes skills, plugins, and Codex configuration intended to improve coding work. Maintainers need to know whether a change helps Codex complete real tasks, preserves required behavior, and changes the time, token usage, or cost of doing the work. A plausible final response is insufficient: the agent can claim completion while leaving an invalid artifact, skipping required review, or exceeding its authorized scope.

Earlier evaluations used separate corpus tooling and external execution scripts, as recorded in [coding orchestration validation](../coding-orchestration/validation.md). The TypeScript/Bun project at [evals/](../../evals/) now connects the central cases and fixtures to actual Codex execution, complete evidence, independent grading, and interpretable resource measurements. Cases and fixtures remain separate from distributed runtime content.

The current [Codex configuration](../../config/codex/config.toml) is a mergeable orchestration fragment, accompanied by instructions and role files. It preserves the user's provider, credentials, and primary model settings rather than specifying a complete standalone environment. Establishing the evaluation baseline therefore requires more than copying the current repository fragment into a temporary directory.

The design follows [OpenAI's evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices): define task-specific success, collect representative cases, use explicit criteria, calibrate automated judgments, and improve coverage from observed failures. OpenAI's [Skills evaluation example](https://developers.openai.com/blog/eval-skills) provides a closely related pattern: execute Codex, preserve its records and artifacts, run programmatic checks, and use a separate read-only Codex pass for qualitative artifact assessment.

## Goals and non-goals

The intended result is one evaluation workflow that a maintainer can use to run the repository's Codex suite, inspect why a case passed or failed, compare explicitly selected versions, and understand the resources consumed by both execution and grading. A report must be traceable to the actual configuration, inputs, tool results, and artifacts behind its conclusions.

The system must cover single-turn tasks, scripted multi-turn conversations, authorization behavior, skill selection, plugin composition, and subagent coordination where those capabilities are part of the case. It must preserve partial observations and explain uncertainty instead of treating missing evidence or infrastructure errors as ordinary quality failures.

Quality, time, token usage, and cost are separate dimensions. The initial design has no composite score mixing them and no requirement that every case pass. Framework correctness means faithfully executing the selected evaluation and producing accurate, inspectable results; it does not mean making the candidate succeed on every task.

The system under evaluation is limited to repository-owned skills/, plugins/, and config/codex/. External personal skills and plugins are excluded initially. Required CLI versions, language runtimes, tools, and services are execution conditions, not additional subjects of effectiveness evaluation.

Codex is the model execution and effectiveness target. Claude Code and Copilot CLI retain necessary distribution, installation, discovery, and adaptation checks, but their routine model-effectiveness evaluations are removed. Desktop UI, IDE, and cloud compatibility need separate evidence.

The initial design does not introduce a general agent platform, multiple interchangeable evaluation frameworks, a model that simulates the user, automatic Git-diff-based case selection, or a separate hosted management service. It also does not switch production installations or authorize commits, publication, or remote pipeline actions.

## Constraints

The repository is the authority for the evaluated configuration. Its initial non-secret baseline comes from the user's current ~/.codex, but subsequent runs use explicit versioned repository content rather than silently merging the latest global settings. Credentials and login state remain runtime dependencies and do not enter ordinary snapshots or evaluation fixtures.

Promptfoo is the primary framework. Native Codex remains responsible for the agent loop, conversation state, tools, and configured execution controls. Project code supplies the preparation, scripted interaction, evidence interpretation, and measurements that are specific to this repository.

A normal invocation evaluates the current candidate against the full Codex suite once per case. A/B comparisons, subsets, and additional repetitions are explicit. Every report shows its planned scope and sample counts.

The initial system records elapsed time, token usage, and cost without imposing time or token budgets. Finite concurrency and transport error detection remain necessary execution controls; neither should be presented as an implicit task budget.

Each quality check reports passed, failed, or unknown, with reasons and evidence. Explicit core criteria determine case success. Diagnostic criteria and resource measurements remain separate. There is no initial all-cases-must-pass gate or weighted overall quality score.

Model grading uses gpt-6-astra with reasoning effort high in an independent context and fixed grading configuration. Text grading prefers an available model API; if authentication or model availability requires Codex, the corresponding provider route is used after validation. Artifact inspection uses an independent read-only Codex grader. These settings do not determine the candidate's primary or subagent models, which come from the candidate configuration.

Multi-turn cases declare the user's responses and authorization scope in advance. The evaluation supplies those responses at the appropriate interaction points while Codex produces all assistant behavior and tool activity itself.

## Proposed design

The system uses Promptfoo to connect a versioned case corpus to prepared Codex environments, preserve execution evidence, apply the necessary graders, and produce quality and resource reports. The project-specific code is kept behind the framework's existing configuration and extension interfaces wherever possible.

### A concrete case from request to result

Consider a case evaluating a workflow skill on a small repository containing a retry bug. The task asks Codex to fix the behavior while preserving the exported interface and performing local work only. One edge condition is deliberately unspecified, and the case requires clarification before implementation.

The case contains the initial repository fixture, the task prompt, a scripted answer defining the missing behavior, and the permitted operation scope. Its core criteria require the target behavior to pass the relevant tests, the public interface to remain compatible, the clarification requirement to be respected, and no unauthorized commit or publication. The quality of the final explanation is recorded separately unless the case explicitly makes a particular disclosure essential.

Preparation freezes the case and candidate content, creates an isolated workspace, installs the required skill or complete plugin, and records the effective Codex configuration and discovery results. Promptfoo then starts real Codex execution.

When Codex asks the declared clarification question, the driver provides the scripted answer in the same native thread. The wording can vary; the interaction condition identifies the question's purpose and relevant state rather than requiring an exact sentence. If Codex requests an operation outside the allowed scope, the driver does not invent authorization.

During execution, the system preserves tool requests and results, assistant messages, file changes, native identifiers, and available usage. It also records any subagent activity without requiring delegation merely because the framework supports it.

After execution, the system freezes the resulting artifacts. Programmatic checks establish test results, interface constraints, and repository state. A text grader can assess whether the final explanation is supported by the recorded evidence. If a declared criterion needs active inspection across files, an agent grader receives read-only access to the artifact copy.

The report links each verdict to its evidence and shows candidate and grading consumption separately. A proven unauthorized commit fails the case even if the code works. A grading-service failure leaves the affected judgment unknown rather than turning it into a claim that Codex produced incorrect code. Missing token data marks measurement coverage as incomplete without invalidating an otherwise supported task result.

This example illustrates the general contract: real execution produces evidence; independent checks interpret that evidence; reporting keeps task quality, execution problems, and measurement coverage distinct.

### Responsibilities and information flow

~~~mermaid
flowchart LR
    A[Versioned cases and candidate configuration] --> B[Freeze inputs and prepare workspace]
    B --> C[Promptfoo drives native Codex]
    C --> D[Preserve events, tool results, and artifacts]
    D --> E[Programmatic checks]
    D --> F[Text model grading]
    D --> G[Read-only Codex artifact grading]
    E --> H[Quality and resource report]
    F --> H
    G --> H
    H -. Observed failures inform cases .-> A
~~~

Promptfoo owns the general case expansion, execution and grading scheduling, result output, and inspection workflow. The project owns the meaning of its cases, environment preparation, interaction scripts, original evidence, and the interpretation of resource data.

The main interfaces are between a selected case and its prepared environment, between native execution and persisted evidence, and between that evidence and a grader. A grader receives the evidence required by its criterion rather than reconstructing an execution from a final answer.

These responsibilities do not require separate services or a generic module hierarchy. If one project command is needed to perform mandatory preparation, it composes the necessary operations and invokes the framework; it does not implement another case scheduler or grading engine.

Promptfoo's [Codex App Server provider](https://www.promptfoo.dev/docs/providers/openai-codex-app-server/) was the first native route identified for integration because the project needs thread identity, permission requests, plugin behavior, and execution events. The implemented route uses Promptfoo's public provider interface with a repository adapter to native Codex App Server. This adapter supplies the case's prepared environment, scripted user responses and retained evidence; Codex still owns the agent loop and tools. Concrete qualification is recorded in [the acceptance report](acceptance.md), rather than inferred from the existence of a documented provider.

### Records and ownership

A case is a task with a stable identifier, inputs, initial conditions, and success criteria. A suite is a selected collection of cases. A run is an evaluation invocation with a candidate selection, suite, repetition count, and execution conditions. A trial is one actual attempt at one case under one candidate configuration.

A run owns its planned trial manifest. Each trial identifies its case version, candidate snapshot, initial environment, native threads and turns, and execution records. Multiple turns and subagents belong to that trial; they are not additional independent samples.

A grading record belongs to a trial but has its own identity, rubric version, model and reasoning settings, effective configuration, evidence references, and consumption. Regrading adds a record. Rerunning adds a trial. Repeating identical inputs must not overwrite a previous observation simply because its content hash matches.

A report fixes its trial manifest, grading definitions, selected grading-record identifiers for each trial and check, and resource-accounting scope. Selected records must belong to the referenced trial and match the report's grading definition. Selection follows a declared rule rather than choosing favorable verdicts. Applying a later grading record produces a new report or an explicit report version; an existing report never silently resolves its checks against the latest available grades.

New generated records live under evals/out/runs/ and retain references to their original inputs and evidence. Cases, suites, fixtures, rubrics, reference materials, and TypeScript preparation, interaction, collection, and reporting code belong to the evals/ subproject. Historical .skill-evals/ evidence retains its original meaning. This document and the implementation plan belong in docs/evaluation/.

Each run uses its own local Promptfoo SQLite database for native exports. The owner approved this integration refinement after Promptfoo 0.123.0's JSON/HTML export path was observed querying SQLite even with persistence disabled. Project JSON records and original evidence remain authoritative; the database is an export aid, not a shared history store or service. Each run executes in a fresh process because Promptfoo caches its database connection.

Distributed skills and plugins do not include the central evaluation corpus. The repository's contributor instructions are not a runtime dependency for downstream installations.

### Configuration baseline and isolation

The first baseline import captures relevant non-secret settings from the user's current ~/.codex: primary model and reasoning settings, provider selection, global instructions, roles, sandbox and approval behavior, repository-owned capability activation, and required environment references.

The import records its time, included scope, path transformations, and exclusions. Machine-specific paths become portable repository references or explicit runtime inputs where possible. Unresolved dependencies remain visible. The current mergeable configuration fragment retains its downstream purpose; an evaluation snapshot must not accidentally become an installer that overwrites unrelated user settings.

Each run freezes the actual participating content, including relevant uncommitted changes and new files, rather than relying on a Git commit alone. It records configuration, cases, fixtures, grading definitions, CLI versions, dependencies, and a content inventory. Unrelated generated output, caches, and credentials are excluded.

Runtime content and evaluation material are frozen separately. The candidate receives the case fixture and the selected candidate's repository-owned runtime capabilities, subject to its configured activation. A case's required capabilities are prerequisites, not an instruction to hide other repository capabilities from trigger evaluation. Hidden tests, rubrics, reference answers, and human labels are not made available through a mounted copy of the central corpus.

Each trial starts from an independent workspace and native conversation. Install standalone skills and complete plugins through their supported native mechanisms, and record source identity and actual discovery. An isolated CODEX_HOME is only one part of isolation: personal discovery paths, parent-directory instructions, plugin caches and registrations, and inherited environment can also affect behavior.

Candidate and grader configurations are independent. Requested values are not substituted for unobserved effective values. If the actual model, reasoning effort, permission policy, or capability identity cannot be established, the affected observation remains unknown.

Authentication uses controlled runtime references. Credentials and login state do not enter baseline files, fixtures, reports, or ordinary snapshots, and production credentials are not copied to manufacture an isolated test environment.

### Cases and scripted conversations

Each case states its objective and requirement mapping, initial prompt and fixture, necessary tools and capabilities, mandatory execution conditions, core and diagnostic criteria, required evidence, and grading method. Multi-turn cases additionally state their user responses, interaction conditions, and authorization scope. Calibration material is attached where it is useful.

Map this information to Promptfoo's cases, variables, assertions, and metadata rather than creating another configuration language. The case contract rejects missing requirements, duplicate identifiers, invalid references, and an empty core-criteria set that would otherwise pass automatically.

Coverage includes explicit and implicit skill triggers, near misses, real task outcomes, scope and authorization, plugin combinations, role selection and handoffs, completion claims, and failure behavior. Each maintained case declares its own requirements and their grading criteria. The shared case loader validates those bindings, and the corpus inventory test rejects unused fixture payloads.

Tool ordering is a constraint only when it is part of the behavior being tested. A valid alternative implementation is not a failure merely because it differs from a reference trajectory. For workflow skills, however, required clarification, review, authorization, and acceptance are themselves task requirements.

The interaction driver provides only the user's side of the conversation. Codex generates all assistant messages and tool activity. The driver distinguishes natural-language clarification, ordinary confirmation, and native approval requests, keeping the case's turns in the same thread.

Unmatched requests preserve the current state without expanding permission. A proven contract violation can fail its check. If a reasonable branch cannot be handled by the script or execution facilities, the trial is incomplete and judgments depending on the missing continuation remain unknown.

### Execution state, concurrency, and recovery

Preparation must identify the inputs, establish the workspace, and make configuration and installation evidence available before candidate execution starts. During execution, evidence is retained incrementally so a failure or manual interruption does not erase the work already observed. Original artifacts are frozen before verification and grading.

Mandatory execution conditions are prerequisites for a valid trial, not candidate-quality assertions. Preparation must establish them before launching the candidate; otherwise the trial is not run, with the unmet conditions and refusal reason recorded. These conditions include required network isolation, fixture-tool PATH precedence, and executable fixture files. The ability to report an observation as unknown does not permit starting without these prerequisites. Preparation consumption remains recorded even when execution is refused.

Concurrency is finite, configurable, and recorded. Each concurrent trial retains independent mutable state; shared runtime or cache reuse must not mix configurations, workspaces, or conversations. Concurrency is an experimental condition rather than a resource budget.

Fresh execution disables Promptfoo response reuse. Server-side input-token caching is a separate resource measurement. Repeating a candidate version still performs a new Codex execution.

Transport retries, Codex self-correction within a trial, and a whole-case rerun are distinct events. The default single trial does not include silent reruns. Explicit reruns create new trial records while retaining the prior attempt and its consumption.

A connection failure does not establish that a request never executed. Establish the original state before resubmission; otherwise preserve incomplete or unknown status. The initial system does not promise crash recovery without duplicated or omitted work.

Manual interruption preserves available evidence. There is no overall task time or token budget. Explicit connection, startup, and protocol error-detection timeouts can still exist, but their purpose and effect must be recorded separately. A large finite task timeout is not unlimited execution.

Interruption stops new candidate and grader work and signals owned operations.
The batch waits for running callbacks to persist their terminal or incomplete
records before exporting or aggregating resources. Ledger readers preserve the
publication dependency between operations and their results or grades, and reject
record identities or operation references that disagree with their run.
Report reads check that the published record inventory is unchanged across the
read and bind their accounting cutoff to that interval. A concurrent publication
can make reporting refuse the read; a fresh report command is sufficient and
must not trigger another candidate execution. Completion state and export links
use the same observed inventory.

### Grading, evidence, and calibration

Programmatic checks establish mechanically verifiable facts such as test outcomes, file or configuration structure, and repository state. Use model judgment when the required property cannot be expressed reliably by such checks.

[llm-rubric](https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/llm-rubric/) is the default model-grading method when relevant evidence can be supplied directly. Its input can include the task, conversation, tool results, and file content; it is not limited to the final answer. Reading a tool trajectory does not require the judge to execute tools.

[agent-rubric](https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/agent-rubric/) is used when the grader needs to locate or inspect artifacts actively. It receives an explicit evidence workspace and read-only Codex configuration. Its default temporary directory does not automatically expose the candidate repository.

Both model paths use gpt-6-astra with reasoning effort high. Keep their configuration fixed and record the actual provider route. Do not let available environment credentials silently select a different judge model or reasoning setting.

Evidence references identify concrete events, files, differences, or verification output. Installation, discovery, invocation, and successful task completion are separate observations. A tool request is not proof of a successful action, and an assistant completion claim is not proof of a valid artifact.

Where skill use can only be inferred from paths or text, preserve the inference and its uncertainty. Missing telemetry must not become an empty activation list or proof that a skill was unused. Summaries and selected excerpts support grading and display, while raw records remain available for inspection. Truncation that affects a criterion is disclosed.

Candidate AGENTS.md, SKILL.md, comments, and outputs are data for the grader, not startup instructions. The grader must not inherit new instructions or authority from the candidate being assessed. Verification that needs writable files uses a separate copy associated with the frozen artifact identity.

Programmatic graders are checked against known correct and clearly incorrect results. Model rubrics are calibrated with a small human-labeled set covering success, failure, and ambiguous boundaries. Inspect disagreement and evidence quality before broad use. Human work concentrates on calibration, changed grading standards, and disputes rather than every routine evaluation.

Regrading uses existing evidence and adds a new grading record and its consumption. It does not modify artifacts, overwrite old verdicts, or execute the candidate again. If a revised criterion requires evidence that was not captured, its result is unknown until an explicitly requested new execution supplies that evidence.

### Quality status and aggregation

Execution, quality, and measurement are separate dimensions. Execution can be not run, completed, erroneous, or incomplete. Quality can be passed, failed, or unknown. Time, token, and cost coverage can each be complete, partial, or unknown. Grading execution and grading-service errors are recorded as well.

Completed execution does not imply success. Incomplete execution may still establish some check results. A network or grader error is not automatically a candidate-quality failure, and missing cost data does not invalidate an otherwise supported verdict.

Within a report, each trial and check contributes at most one selected judgment. A missing selected judgment is unknown; historical or superseded grading records do not contribute additional observations or veto the selected result. Invalid record references or mismatched grading definitions are rejected when constructing the report.

A case passes when its explicit core criteria are supported by the report's selected judgments. A known failure of a core criterion fails the case. If no core failure is known but at least one core criterion remains unknown, the case is unknown. Diagnostics cannot compensate for a failed core requirement, and they do not become mandatory merely because they are present. Regrading does not increase the execution sample count or change an existing report's planned denominator.

The suite reports these results without an initial all-cases-must-pass threshold. Every displayed rate includes its denominator, sample count, and coverage. Decidable pass rate is passed divided by passed plus failed; decision coverage is decidable observations divided by planned observations. A zero denominator produces an unavailable rate.

For example, an illustrative run with 10 planned trials, 6 passes, 2 failures, and 2 unknowns has a 75% decidable pass rate and 80% decision coverage. Both values and the reasons for the unknowns are needed. Execution and grading errors are explanatory dimensions, not extra mutually exclusive buckets to add to the trial count.

Promptfoo's native pass, score, and reason fields do not automatically express these semantics. Use native per-check results and metadata where possible, and derive the missing summary. An unconverted framework success percentage must not replace the project rate when unknown or error handling differs. Internal numeric fields do not become a new weighted quality score.

### Resource measurement and reports

Record preparation, queueing, candidate execution, programmatic verification, model grading, and overall wall-clock duration. Define intervals from actual events and identify nesting or overlap. The sum of parallel durations is not the run's elapsed time.

Preserve provider usage fields with their available request, thread, turn, trial, and actor identities. Establish whether notifications contain cumulative values or increments before aggregation. Determine whether parent usage includes child usage; do not add children again when the parent already includes them.

Input, output, cached, and reasoning token categories retain their provider-defined relationships. A subset is not added again to the total. Missing values are unknown with a reason, distinct from a real zero. When child coverage or deduplication cannot be established, report known details and partial coverage rather than inventing a complete total.

Cost estimates record the price source, version or date, currency, model mapping, and token assumptions. Actual charges require attributable provider evidence. Shared-account, subscription, or gateway charges that cannot be allocated reliably remain unknown. Local computation cost and model charges are distinct; initially, programmatic verification duration is recorded without inventing a price for local computation.

The implementation ships a dated OpenAI Standard text-token reference price book
inside `evals/`. New runs freeze it; older records can receive a new priced report
without new candidate execution or rewritten history. Explicit price overrides
create a new report. Unobserved service-tier, cache-write and request-context
conditions keep the reference estimate partial and visible; cumulative thread
usage must not select a per-request long-context price bracket. This implements
the owner's 2026-09-12 pricing request without claiming actual gateway charges.

Failures, incomplete work, retries, interruption, and grader errors retain consumption already incurred. Report candidate and grader costs separately before any coverage-qualified total. Efficiency comparisons show quality and measurement completeness alongside resource differences.

Resource accounting is independent of verdict selection. The report identifies the execution and grading operations included in its accounting scope and counts each actual operation once, including failed or superseded grading attempts within that scope. It must not omit their consumption merely because their verdicts were not selected. Later grading operations remain recorded in their own scope and can be included in a new report; they do not retroactively change a saved report's totals.

The report exposes run identity and conditions, scope and coverage, case and check verdicts, evidence links, errors, resource breakdowns, and explicit A/B differences. Promptfoo provides the primary local inspection and export workflow. Project reporting supplements only the missing state, evidence-index, or accounting semantics.

### Comparison and corpus ownership

An explicit A/B comparison holds the tested cases, fixtures, grading definitions, and judge configuration constant while declaring the intended candidate differences. Candidate models, roles, or permissions may themselves be experimental variables; requiring those settings to match would prevent the intended comparison.

Declare the pairing rule using case version, initial fixture and interaction conditions, authorization scope, and the intended mapping of repetitions. Each trial contributes to at most one pair within a comparison. Do not select pairs or substitute successful reruns based on observed outcomes.

Paired quality differences use only pairs whose selected judgments are decidable on both sides. Each resource metric uses its own jointly valid pair set with matching units, measurement scope, and aggregation semantics; comparable quality groups are identified when interpreting efficiency. Report the eligible pair count, planned denominator, excluded observations and reasons for each comparison. If no eligible pairs exist, the paired difference is unavailable, not zero.

Matching selected grader configuration is required for core criteria that define
the case judgment. A missing or different diagnostic grade does not invalidate an
otherwise decidable core-quality pair; diagnostic definitions remain part of the
declared comparison conditions.

Keep one-sided quality summaries and whole-run resource totals, including failed and unpaired work, alongside the paired view. They describe what happened on each side but must not automatically become paired improvement claims. For example, if A reports pass/fail/unknown and B reports pass/unknown/pass for the same three cases, their one-sided decidable pass rates are 50% and 100%, but the only jointly decidable pair is unchanged. Equal coverage percentages do not establish equal observation sets.

If only grading rules or grading configuration change, both sides can be regraded with the same version when saved evidence is sufficient. If task inputs, fixtures, interaction conditions, or authorization change, old records are not execution evidence for the revised case. Mark them as not directly comparable or explicitly execute the revised case. Relabeling historical output cannot produce new experimental evidence.

The maintained corpus consists of the case files under evals/cases/ and their referenced payloads under evals/fixtures/. Each case directly declares its requirements, criteria, execution conditions and fixture bindings. Tests validate that corpus and reject unused fixture payloads. Import maps, transition aliases and migration-specific checks are not part of the maintained implementation. Historical reports retain their original case identities and frozen inputs; changing current case identities does not rewrite earlier observations or make them eligible for regrading against different inputs.

Claude/Copilot effectiveness runners can be retired while retaining their required adaptation checks. Old JSON formats are not a permanent compatibility requirement. Detailed delivery slices, verification commands, and execution progress belong in the implementation plan rather than this design.

## Decisions and trade-offs

### One framework with native Codex execution

Promptfoo is selected because it combines a documented Codex connection with case management, assertions, grading, and result inspection. Retaining the existing harness alone would still leave native execution and collection maintained separately. Rebuilding the entire workflow would duplicate capabilities the framework already supplies.

[Pydantic Evals](https://ai.pydantic.dev/evals/) with the official Codex SDK is a credible alternative, especially for a Python-centric custom execution function. It would require the project's Codex and evidence integration alongside its grading and reporting. The choice of Promptfoo prioritizes available integration and maintenance convenience; no project measurements establish a speed, cost, or accuracy advantage.

The trade-off is dependency on Promptfoo's provider behavior and its alignment with the evolving Codex interfaces. Pinning versions and keeping project semantics explicit limits that risk. A documented gap may justify focused extension code, but not a speculative second framework.

### Different graders for different evidence needs

Programmatic checks provide specific, inspectable signals. Text grading handles semantic judgments over available evidence. Agent grading can investigate artifacts but adds tool activity, latency, permissions, and another source of variation.

The design therefore selects grading capability per criterion rather than running all methods for every check. Using Codex for every text judgment remains a possible authentication choice, not an industry requirement or a proven optimization.

This division is consistent with [Anthropic's agent evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) and [LangChain's distinction between deterministic trajectory matching and model assessment](https://docs.langchain.com/oss/python/langchain/test/evals). The [Terminal-Bench task review process](https://github.com/harbor-framework/terminal-bench/blob/main/docs/TASK_REVIEW_AUTOMATION.md) also illustrates why the tasks and graders themselves need validation.

### Scripted users and explicit experimental scope

Scripted responses keep supplied user information and authorization reproducible without adding a second model's behavior to every conversation. The cost is authoring and maintaining the branches that a case needs. An unexpected but reasonable branch may expose a script limitation instead of a candidate defect, so incomplete execution remains visible.

Full-suite, single-trial execution provides a clear default with bounded duplication of work, but it does not estimate reliability well. Explicit repetitions provide additional observations when needed. Selecting the full suite also costs more than automatic impact-based selection; the initial design accepts that cost to keep coverage explicit.

### Separate quality and resource observations

Core task criteria determine success while diagnostics and resource measurements explain how the result was obtained. This keeps partial achievement visible and prevents a low token count or several easy checks from compensating for a failed task.

No initial time or token budget is imposed, and no suite-wide all-pass threshold is invented. This supports establishing a baseline first, but requires honest reporting of long trials, unknown results, and failed work. Resource optimization is driven by comparable-quality observations rather than an assumed cheaper execution path.

Preserving raw evidence and grading versions adds storage and bookkeeping. It enables review, diagnosis, and regrading without automatically paying for another candidate execution. That value depends on capturing sufficient evidence and maintaining its identity.

## Risks and open questions

No product-policy question remains open. The implementation has completed the qualifications recorded in [the acceptance report](acceptance.md). The following risks remain relevant when changing runtime integration, case inputs or grading contracts.

| Risk or assumption | Impact and resolution direction |
| --- | --- |
| Native provider fidelity | Runtime upgrades must preserve qualified same-thread turns, scripted replies, approvals, event retention and terminal states. Recheck affected native capabilities before relying on a changed runtime. |
| Baseline and authentication isolation | The configuration fragment is incomplete, and isolated configuration does not by itself exclude personal skills or instructions. Establish effective configuration and discovery while keeping credentials outside snapshots. |
| Judge availability | The chosen model and high reasoning setting must work through the selected API or Codex route. Verify actual identity and parameters; do not silently substitute another judge. |
| Evidence independence | Candidate files may be loaded as grader instructions, or verification may mutate artifacts. Separate grader startup context from evidence and preserve immutable originals with writable verification copies where needed. |
| Usage attribution | Parent-child overlap, cumulative counters, missing fields, and cache semantics can distort totals. Preserve raw data and publish partial coverage until attribution is established. |
| Result semantics | Framework booleans and errors may not map directly to passed, failed, and unknown. Preserve the report's selected grading records, fixed denominator, and metric-specific pair sets before treating native summaries as project results. |
| Regrading sufficiency | A new rubric may need evidence that was never captured. Preserve unknown results and require explicit new execution when the task or its conditions change. |
| Grader calibration | Strong models can still disagree with intended criteria or cite insufficient evidence. Use human-labeled cases and known correct and incorrect artifacts to refine the grading contract. |
| Concurrency and interruption | Shared state or uncertain request completion can contaminate trials or duplicate work. Validate isolation and failure handling under the selected concurrency; preserve incomplete records when recovery is uncertain. |
| Corpus coverage | Case edits may omit behavioral requirements, mandatory execution conditions or adaptation checks. Validate the requirements and criteria declared in each case, check fixture usage, and preserve the proof-or-refusal rule. |

Current tooling versions and commands are documented in [the evaluation guide](../../evals/README.md); qualification results and limits are recorded in [the acceptance report](acceptance.md). Recheck affected behavior when those conditions change. Expanding scope, changing agreed behavior or accepting substantial new maintenance cost requires an explicit design revision.
