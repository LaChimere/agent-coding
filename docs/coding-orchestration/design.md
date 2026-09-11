# Codex Global Coding Orchestration v0.1

| Item | Value |
| --- | --- |
| Status | Delivered configuration revised to four roles and eight worker slots; experimental configuration |
| Last updated | 2026-09-11 |
| Runtime foundation | Native Codex harness: the existing agent execution runtime beneath the primary and workers |
| Personal configuration scope | Repository `config/codex` represents the target `~/.codex` configuration |
| Shared plugin scope | Process contracts in `workflow`; review methods and constraints in `pr-review`, `rubber-duck`, and `spar`; no plugin-owned model or effort policy |
| Plugin dependencies | `workflow` and `pr-review` are recommended installations, used on demand rather than required for every task |
| Validation status | Revised native checks, six new portable contexts and 24 new A/B trials are complete. Unchanged plugin behavior reuses preceding evidence; results and limits are recorded in [validation.md](validation.md) |

## 1. Design decision

Use Codex's native multi-agent capabilities, with the primary agent retaining task context and owning requirements, design, planning, delegation, review coordination, integration, and final acceptance. The primary may directly complete small, clear, low-risk tasks. Delegate only when doing so can improve quality or overall delivery efficiency.

Build on the native Codex harness for the agent loop, conversation state, tools, execution events, and configured sandbox and approval mechanisms. Personal policy and plugins supply task decisions and methods on that foundation. Reuse native execution and lifecycle capabilities instead of implementing another agent loop. This applies the separation described in [Codex as a platform](https://developers.openai.com/blog/codex-as-a-platform) to personal development.

The primary uses `workflow` for process constraints, standards, and procedures: phase and authority boundaries, planning, bounded execution, progress, recovery, and completion. It uses `pr-review` for review angles, constraints, standards, and capabilities. The primary remains the actor making decisions and organizing work; neither plugin becomes another coordinator.

Model and reasoning-effort policy belongs to personal orchestration configuration. Both plugins remain model-agnostic and usable across clients without the personal roles. They can require adequate evidence and necessary risk coverage without prescribing a model or effort level.

The recommended installation includes both plugins, but core orchestration can perform simple direct work and ordinary native delegation without them. A plugin becomes a dependency when the task needs its capabilities. Report a missing required capability, leave the dependent work incomplete, and continue unaffected authorized work. Do not recreate the missing plugin workflow or claim its work was completed.

Keep four semantic roles in v0.1, with a model and reasoning-effort mapping for each. Complex work
and takeover after an evidenced ordinary reasoning limitation both use `complex_worker` at Sol/high.
This merges the former separate takeover role at the user's request. A task need not pass through
every role; the current combination is not assumed to be optimal.

This document consolidates the agreed design and defines the implementation contract. Current execution evidence, acceptance limits and delivery status are recorded in [validation.md](validation.md); design statements alone are not runtime proof.

## 2. Terms and priorities

| Term | Meaning |
| --- | --- |
| Primary agent / primary session | The same continuing session working with the user; owns coordination and final judgment |
| Harness | The runtime around the model that manages the agent loop, conversation state, tools, events, and configured execution controls |
| Thread | A continuing Codex conversation containing turns; distinct from a semantic role |
| Turn | One input request and the agent work that follows within a thread; not necessarily a completed task |
| Item / event | A unit of work or content, such as a command or file change / a runtime notification describing execution or progress |
| Worker / subagent | An agent delegated a bounded task, including implementation, investigation, analysis, or review |
| Semantic role | A stable description of task purpose and behavior, such as `complex_worker`; not a model identifier |
| Skill | Methods and constraints used to do a kind of work; selecting a skill does not select a worker or its model |
| Model mapping | The model and reasoning effort assigned to a semantic role |
| Reasoning effort / effort | A model's reasoning setting; not a universal capability scale across models |
| Review aspect | A checking perspective, such as code correctness, tests, or error handling; not necessarily a separate reviewer |
| Critic | A read-only agent looking for substantive blind spots in a supplied proposal or artifact |
| Fallback | An alternative when the intended path is unavailable; not necessarily a capability escalation |
| Eval | A repeatable assessment of specific orchestration behavior or task outcomes |
| Dogfooding | Trying the system in actual development work and collecting feedback |

Decision priorities are:

1. Quality first: satisfy requirements, correctness, security, and necessary acceptance criteria.
2. When quality is comparable, consider complete delivery time and total cost.
3. Include human correction, rework, repeated explanations, and manual recovery in that cost.

Do not lower acceptance standards to save tokens or judge efficiency from the price of one model call. "Lowest sufficient capability" means an executor capable of meeting the task's quality requirements, not automatically trying the cheapest model first.

## 3. Goals and non-goals

### 3.1 Goals

- Preserve the user's currently selected primary model and effort. Task complexity does not automatically change the primary model.
- Keep requirements, shared decisions, approved scope, and final acceptance in the primary session. Isolate exploration, logs, and implementation detail when delegation provides value.
- Choose how to execute a task before selecting its semantic role and model mapping.
- Assess implementation complexity, risk, and the need for independent review separately.
- Classify failures before responding. Escalate capability only with concrete evidence of a reasoning limitation.
- Let the primary use `workflow` and `pr-review` as needed while preserving authority, necessary risk coverage, and evidence requirements.
- Keep plugin dependencies task-specific and one-way; portable plugins do not require personal role mappings or model preferences.
- Use the native harness and the least elaborate official interface that meets an actual execution or evaluation need.
- Start with native configuration and existing skills, then evolve from observed failures and evals.

### 3.2 Non-goals

v0.1 adds no external router service, custom application-level orchestrator built on App Server, custom MCP orchestration layer, task dependency-graph engine, learned classifier, dynamic model registry, or automatic model-benchmarking infrastructure. Using Codex's existing App Server through a native client or for focused runtime verification is within scope; building a new orchestration service is not.

It also adds no standing verifier tier, automatic worktree scheduler, distributed coordination across sessions, separate telemetry database, or cost-optimization service. It does not routinely generate competing implementations or accept results by majority vote. It does not reproduce Grok's persistent Bots, workflow replay engine, or large-scale agent runtime.

Existing authority boundaries remain in force. Orchestration policy, role availability, and a native `/goal` do not expand permission for commits, pushes, publication, external writes, or destructive operations.

## 4. Research basis and selected lessons

The sources below and the official Codex interface documentation linked throughout this document provide the research basis and implementation references. This design adopts mechanisms suitable for individual development; vendor examples do not establish that this configuration works. The table records the selected lessons and their limits.

| Source | Design influence | Limit retained |
| --- | --- | --- |
| [Codex as a platform](https://developers.openai.com/blog/codex-as-a-platform) | Reuse Codex's harness; keep task context, policy, and acceptance with the caller; choose a native interface to fit the actual need | The article motivates the runtime boundary, not our role count or model mappings; its examples do not verify this configuration |
| [Grok Bot](https://x.ai/news/designing-grok-bot) | Give the user one accountable owner; keep context with the relevant responsibility and project | Do not mix unrelated project history into generic roles or equate subthreads with persistent Bots |
| [Grok Build Workflows](https://x.ai/news/workflows) | Preserve execution evidence and identify completed work before resuming | Thread continuation and plan records do not provide deterministic replay or exactly-once external actions |
| [HydraFusion](https://github.blog/ai-and-ml/github-copilot/project-hydrafusion-frontier-quality-via-multi-model-orchestration/) | Select direct execution, conditional escalation, or critique and revision according to the task | Its reported quality/cost trade-offs do not validate this initial role combination |
| [Cursor orchestration experiments](https://cursor.com/blog/agent-swarm-model-economics) | Assign shared decisions to an owner before delegating independent work | Do not copy recursive planners, custom version control, or throughput policies that tolerate broken deliverables |
| [Anthropic long-running harness work](https://www.anthropic.com/engineering/harness-design-long-running-apps) | Define observable acceptance, exercise actual behavior, and evaluate each orchestration component's value | Do not mandate context resets or every evaluation stage for every task |
| [Aider Architect/Editor](https://aider.chat/2024/09/26/architect.html) | Clear decisions and constraints reduce execution ambiguity | Multiple stages add calls and latency; small tasks can remain direct |
| [CooperBench](https://arxiv.org/html/2601.13295), [CodeMonkeys](https://scalingintelligence.stanford.edu/pubs/codemonkeys.pdf) | Avoid overlapping edits and shared mistaken assumptions; choose results using execution evidence | Cooperation, model diversity, and agreement do not themselves guarantee correctness |

Cross-family critique is an optional technique. The agreed Codex policy permits an appropriate available GPT model to act as critic; a different model family is not a prerequisite for independent review.

## 5. Architecture

### 5.1 Orchestration diagram

```text
                           USER
                            |
                            v
+------------------+   +---------------------------------------+
| Global policy    |-->| PRIMARY SESSION                       |
|                  |   |                                       |
| Quality first    |   | Keeps selected model + effort         |
| Routing rules    |   |                                       |
| Authority/limits |   | Understand -> Design -> Plan          |
+------------------+   | Decide scope, execution and review    |
                       |                                       |
+------------------+   |                                       |
| workflow plugin  |-->| Uses workflow skills when needed      |
| Process / scope  |   | Plans and tracks approved work        |
| Recovery / gates |   |                                       |
+------------------+   |                                       |
                       |                                       |
+------------------+   |                                       |
| pr-review plugin |-->| Uses review skills when needed        |
|                  |   | Selects angles, workers and models    |
| Review angles    |   | Judges findings and acceptance        |
| Constraints      |   +-------------------+-------------------+
| Standards        |                       |
| Capabilities     |                       v
+------------------+             Choose how to do the work
                                          |
                     +--------------------+--------------------+
                     |                                         |
                     v                                         v
              DIRECT EXECUTION                          DELEGATED WORK
              by PRIMARY                                bounded task
              Small / clear / low risk                         |
                     |                                         v
                     |      +--------------------------------------------+
                     |      | WORKER POOL - current role/model mapping   |
                     |      |                                            |
                     |      | ordinary_worker        -> Luna  / max      |
                     |      | complex_worker         -> Sol   / high     |
                     |      | critical_reviewer      -> Astra / high     |
                     |      | deep_critical_reviewer -> Astra / xhigh    |
                     |      |                                            |
                     |      | Max 8 open worker threads                  |
                     |      | No worker-to-worker delegation             |
                     |      | Review tasks remain read-only              |
                     |      +----------------------+---------------------+
                     |                             |
                     |                             v
                     |                 Result + evidence + uncertainty
                     |                             |
                     +---------------+-------------+
                                     |
                                     v
                       +-----------------------------+
                       | PRIMARY: inspect and decide |
                       +--------------+--------------+
                                      |
                 +--------------------+--------------------+
                 |                    |                    |
                 v                    v                    v
             ACCEPTED           REVIEW NEEDED         NOT ACCEPTED
                 |                    |                    |
                 v                    v                    v
           Deliver result      PRIMARY uses         PRIMARY classifies
           Close finished      pr-review and         the failure
           worker threads      selects reviewers           |
                                      |                    |
                                      +---------+----------+
                                                |
                                                v
                                     Return to PRIMARY
                                     for the next action

  Shared execution foundation for PRIMARY and all WORKERS:
  +--------------------------------------------------------------------+
  | CODEX NATIVE HARNESS                                               |
  | Agent loop / threads / turns / context / tools / execution events  |
  | Configured sandbox and approval mechanisms                         |
  +--------------------------------------------------------------------+
```

Every PRIMARY label represents the same session. The diagram describes decision and evidence flow, not a mandatory, single-pass sequence. Critical analysis can precede implementation; review can occur during design, implementation, or acceptance.

The harness is their shared execution foundation, not another coordinator or a final workflow stage. Policy determines what work to do and when it is accepted; the runtime carries out the agent interaction and exposes execution state within the actual host's capabilities.

ACCEPTED requires satisfied requirements, necessary validation, and necessary review. Plugin arrows indicate capabilities used when needed and available, not mandatory startup steps. A missing required plugin capability follows the incomplete-work path described below. The primary does not delegate an entire workflow or review coordination role to a subagent that then spawns its own workers.

### 5.2 Responsibility boundaries

| Layer or actor | Owns | Boundary |
| --- | --- | --- |
| Native Codex harness | Agent loop, thread and turn state, context handling, tool execution, execution events, configured runtime controls | Does not decide business acceptance or grant task authority; exposed features and enforcement depend on the client, runtime, and tool path |
| Primary agent | Understanding, design, planning, classification, delegation, review coordination, integration, final acceptance | Sole subagent coordinator; retains its own judgment |
| Global policy | Quality priorities, role selection and capability escalation, authority, concurrency principles | Keeps model/effort policy in personal configuration; does not duplicate plugin procedures |
| Agent TOML | Role behavior, model and effort mapping, default permissions | Not an orchestrator or a second review workflow |
| `workflow` plugin | Process constraints and procedures for scope, authority, planning, progress, recovery, verification, and completion | Used by the primary; imposes no model, effort, or personal-role requirements |
| `pr-review` plugin | Review angles, constraints, standards, specialist checking and critique capabilities | Used by the primary; imposes no model or effort requirements |
| Worker | Bounded implementation, investigation, analysis, or review; evidence-backed results | Does not expand scope, spawn agents, or grant final acceptance |
| Project materials | Project constraints, approved scope, real commands, execution evidence | Keep project knowledge out of generic roles; add no parallel task-state system |

### 5.3 On-demand plugin dependencies

Dependency runs from personal orchestration to the capabilities it uses. Neither plugin requires this personal orchestration policy, the personal Codex roles, GPT availability, or access to `~/.codex/agents`. Neither plugin must be loaded merely because the other is used.

| Task situation | Dependency behavior |
| --- | --- |
| Simple work or ordinary delegation requiring no plugin-specific capability | Proceed using native Codex, available role configuration, and applicable instructions; either or both plugins may be absent |
| Planning or execution needs a `workflow` skill | Use the installed skill for its methods and constraints; the primary retains coordination and model choice |
| Review needs a `pr-review` plugin capability | Use that installed capability under primary-selected scope and allocation |
| A required plugin or skill is unavailable | Report the exact missing capability and affected work; do not reproduce its workflow, silently substitute a weaker check, or claim completion |
| Other authorized work remains independent of the missing capability | Continue that work without treating plugin absence as a global startup failure |

Recommended installation is not automatic installation authority. Basic primary inspection can continue when a plugin is missing, but it does not count as invocation of that plugin or satisfaction of an unmet specialist-review requirement.

### 5.4 Using workflow skills

`workflow-orchestrator` supplies guidance for genuine phase, scope, or authority ambiguity; it is not a mandatory entrypoint or an agent above the primary. Choosing an installed skill identifies the procedure to use. Choosing a semantic worker role identifies the execution capability. Keep these decisions distinct.

For approved work that benefits from `execute-plan-loop`, the primary uses its procedure to select the next bounded slice and retain the whole-scope return boundary. It may implement directly or delegate the slice according to global orchestration policy. The worker receives only its scope, constraints, acceptance criteria, and relevant evidence; receiving context from a larger plan does not authorize completing the rest of that plan.

Workers return results and validation evidence. The primary checks them, integrates the work, maintains the existing plan's progress when a plan is used, and decides whether to continue, repair, or review. Do not add a second plan, worker-owned global progress loop, or separate task ledger. Relevant existing acceptance and ownership fields are sufficient; portable templates do not need mandatory personal-role or model fields.

Workflow procedures can require reassessment after repeated failure, safe ownership boundaries, or review evidence before completion. They do not prescribe a replacement model or reasoning level. The primary applies the global policy to those process requirements. Existing earlier reassessment conditions remain compatible with the maximum repair budget.

Use `plan-parallel-work` for missing parallel implementation arrangements, `decompose-feature` for delivery sequencing, `ensure-atomic-pr` for atomicity, and `refresh-related-docs` for authorized documentation updates. These remain task-specific methods. `anti-slop` contributes necessity, simplicity, and evidence checks without owning cadence or automatically adding another review. Fold relevant findings and still-valid evidence into the same primary-owned checkpoint.

### 5.5 Native runtime and integration boundaries

Continue using the existing Codex App, CLI, or IDE session for interactive development. They build on the same harness, but a shared runtime foundation does not establish identical feature availability across surfaces. Verify the actual client and runtime when a capability matters. [Codex platform architecture](https://developers.openai.com/blog/codex-as-a-platform)

If a concrete automation or evaluation need appears, choose the appropriate official interface:

| Need | Native interface | Design use |
| --- | --- | --- |
| Bounded script, CI job, or one-off task | [`codex exec`](https://developers.openai.com/codex/noninteractive) | Run the bounded task and capture its output and available events |
| Application code needs to start, resume, or stream tasks | [Codex software development kit (SDK)](https://developers.openai.com/codex/sdk) | Use the supported programmatic interface |
| A product needs direct conversation lifecycle, event streaming, interruption, and approval handling | [Codex App Server](https://developers.openai.com/codex/app-server) | Use the documented client protocol when that integration is actually required |

This choice does not add three execution tiers or require a new adapter now. Keep existing working integrations. Verify interfaces against the installed runtime and its supported schemas before implementation; do not assume that a documented API is exposed as a callable tool in every session.

Repository state, approved decisions, task records, and tool-owned data remain the sources of task context. The harness manages conversation execution; it does not replace those records or the primary's responsibility to check them.

## 6. Task classification and role selection

### 6.1 Decide whether delegation is worthwhile

The primary may directly complete and validate small, clear, low-risk tasks. Delegate when isolating substantial exploration or logs, executing independent work in parallel, or using a particular capability improves the outcome.

Judge quality and complete delivery efficiency. Do not dispatch mechanically by file count, line count, or the number of available agent slots. The configured worker limit is not a quota.

### 6.2 Current model mapping

| Semantic role | Model | Effort | Purpose |
| --- | --- | --- | --- |
| `ordinary_worker` | `gpt-5.6-luna` | `max` | Clear, local implementation, fixes, tests, scoped research, and routine review |
| `complex_worker` | `gpt-5.6-sol` | `high` | Complex implementation, difficult diagnosis, synthesis, difficult review, and takeover after a demonstrated ordinary reasoning limitation |
| `critical_reviewer` | `gpt-6-astra` | `high` | Read-only analysis and review of security, critical correctness, and major architectural trade-offs |
| `deep_critical_reviewer` | `gpt-6-astra` | `xhigh` | Read-only analysis of a concrete critical issue left unresolved by the preceding reasoning pass |

The mapping unit is always model plus effort. `high`, `xhigh`, and `max` are not a common capability ladder across different models. Policy refers to semantic roles and task needs; concrete model identifiers live in personal configuration.

These four roles may change through actual use and evals. Defining a role does not require invoking it on every task. Distinct GPT models or roles also do not establish cross-family review.

### 6.3 Separate complexity, risk, and review

Complexity determines the capability needed to execute a task. Risk determines which issues must be analyzed and verified, and whether independent review is necessary. High risk does not turn a read-only reviewer into an implementation worker.

The primary can first commission critical analysis to establish safety boundaries, invariants, and acceptance criteria, then select an executor capable of implementing them correctly. If implementation still requires complex reasoning, choose a suitable strong executor directly. Additional review is not a substitute for a clearly inadequate executor.

`critical_reviewer` and `deep_critical_reviewer` provide critical reasoning capability. For review tasks, they follow the `pr-review` guidance selected by the primary. The roles do not choose review coverage, coordinate other reviewers, or approve delivery.

### 6.4 Execution patterns

For each task, the primary chooses among direct work, one delegated worker, parallel independent work, necessary critique and revision, and targeted failure handling. There is no fixed ordinary-to-complex-to-critical-to-deep pipeline.

Escalation is conditional. Importance, a single mistake, a failed test, or a desire for extra reassurance does not automatically justify it. `deep_critical_reviewer` addresses the identified unresolved issue rather than reopening all settled decisions.

## 7. How the primary uses pr-review

### 7.1 Review ownership and skill capabilities

The primary chooses review timing, target, scope, aspects, workers, models, and allocation. It also confirms findings, coordinates fixes, and makes the final acceptance decision. `pr-review` supplies the review perspectives, constraints, standards, and capabilities the primary uses.

Use the installed `pr-review` skill for a fixed change set that needs its review capabilities: a PR, branch, commit range, file set, or working-tree changes. This is an on-demand dependency, not a requirement to invoke the plugin for every edit. With no change set, ordinary design discussion remains with the primary. A supplied proposal can receive a standalone `rubber-duck` critique or an explicitly requested `spar` analysis. Not every design question becomes a PR review.

### 7.2 Review aspects are not agent counts

The primary can combine code correctness, tests, and error handling in one reviewer, or separate them for a complex task. It selects necessary aspects from the actual risk and records what was covered, what was inapplicable, and what remains incomplete.

Flexible allocation does not weaken checking requirements. A worker covering several aspects receives the corresponding review guidance and enough context. Do not silently omit material risk checks to reduce calls. If a specialist capability is missing, report the gap rather than marking the check covered.

Keep the target stable during a review round. Supply the exact baseline, complete target changes, relevant project rules, and authoritative requirements. Do not review only the last commit of a larger task or invent requirements from the diff. After fixes, scope re-review to actual changes and unresolved risks.

### 7.3 Rubber Duck and SPAR

Codex personal configuration permits the primary to choose an appropriate available GPT model for critique in an independent task context. Consider another model family when available and likely to help. Its absence no longer prevents launching a same-family critic.

The shared plugin imposes no particular model, personal role, or reasoning-effort level. It accepts the caller's suitable model choice within task, host, and authorization constraints, treating family diversity as an optional enhancement. Codex, Claude Code, and Copilot CLI each use their actual available and permitted resources.

Context isolation, model diversity, and family diversity are different properties. Report them accurately. If the user explicitly requires another family and none is available, that requirement remains unmet. A second pass within the primary is not another independent reviewer.

The primary decides when Rubber Duck is useful and honors explicit requests and exclusions. SPAR retains its explicit-request trigger. Optional critique does not become a mandatory stage or automatically add another cross-family review round.

### 7.4 Checking and authority boundaries retained

- Review workers remain read-only, do not implement fixes, and do not spawn agents.
- The primary independently inspects the target and evidence. Worker output contains candidate findings, not final conclusions.
- Confirm findings, remove disproved concerns, and merge shared root causes. Do not decide correctness by vote count.
- Reviewing test coverage and executing tests are different activities. A review does not invent broader command scope or claim unrun checks passed.
- Complete security coverage requires completing the corresponding specialist workflow. A critic's security concern alone does not establish it.
- Report incomplete required validation or independent review accurately, while continuing unaffected authorized work.
- Authorized executors implement fixes. Re-review follows affected scope and existing stop conditions and round limits.

## 8. Delegation, context, and result contracts

### 8.1 Delegated task contract

Every task includes a goal, bounded scope, acceptance criteria, and relevant constraints. Write or parallel tasks also need an action mode, ownership, and a baseline. Repair tasks need previous failure evidence and hypotheses already ruled out.

When a skill informs the task, carry its relevant methods and constraints into that bounded assignment. Do not transfer the primary's authority over the complete plan or require a worker to reconstruct unrelated workflow history.

Small tasks need no mandatory form. The following illustrates a fuller task; the actual project supplies real files and commands:

```text
Goal:
  Implement the agreed idle-timeout behavior.

Scope and mode:
  Implementation within timeout reconciliation and directly related tests.
  Shared APIs and schema decisions remain with PRIMARY.

Acceptance:
  Expired workspaces stop; active workspaces remain unaffected.
  Validate the new behavior and affected existing behavior.

Constraints:
  Preserve the agreed architecture and ownership boundaries.
  No unrelated refactoring, commits, or external actions without authority.

Evidence and context:
  Relevant interfaces, callers, approved decisions and prior failure evidence.

Return:
  Result, files, validation, concrete evidence, uncertainty, acceptance status.
```

Review tasks are read-only and receive a fixed target and selected checking requirements. The primary constructs the necessary context rather than defaulting to the complete conversation, unrelated logs, or other reviewers' conclusions.

### 8.2 Context ownership

| Content | Location |
| --- | --- |
| General collaboration, authority, and orchestration principles | Global `AGENTS.md` |
| Role behavior, model, and effort | Corresponding agent TOML |
| Project domain, interfaces, and testing knowledge | Project-specific materials and instructions |
| Approved scope, decisions, acceptance, and progress | Primary session and an existing plan or task record when used |
| Current investigation, failure, and repair details | Relevant worker thread and evidence files |

Generic roles do not accumulate mixed task memories from unrelated projects. Give a new task clean context when appropriate; continue an existing thread when it holds useful context for the same task. On resumption across sessions, check actual state rather than trusting an old summary alone.

Ground assignments in the actual repository or worktree, relevant baseline and paths, approved constraints, and current evidence. Native conversation history helps preserve context; it does not make a stale file, command result, or prior decision current.

### 8.3 Worker result contract

Workers return the result, relevant or changed files, actual validation commands, the smallest decisive output, unresolved issues or uncertainty, and acceptance-criteria status. Keep detailed logs available by reference rather than copying every intermediate result into the primary context.

Read-only analysis or review may have no changes or executed commands; state that accurately and provide evidence and limitations. "Done," "Tests passed," or "Looks correct" alone is not acceptance evidence.

## 9. Failure handling and thread lifecycle

### 9.1 Failure classification diagram

```text
Failure
  |
  v
PRIMARY classifies
  |
  +-- Implementation mistake -----> Continue same worker
  |
  +-- Missing context ------------> Supply context -> same worker
  |
  +-- Tool / environment issue ---> Resolve within authority -> continue
  |
  +-- Capacity issue -------------> Wait / run in waves
  |
  +-- Incorrect scope ------------> Re-plan / split task
  |
  +-- Ordinary capability limit --> complex_worker
  |
  +-- Actually complex -----------> complex_worker
  |
  +-- Newly discovered risk ------> Reassess required review

Concrete unresolved critical reasoning
  |
  +-------------------------------> deep_critical_reviewer

Implementation repair budget:
initial attempt + at most 2 targeted repairs
Repeated failure without new evidence -> reassess earlier
```

New risk changes the required analysis, review, and validation first; it does not grant implementation authority to a read-only role. The primary uses the necessary `pr-review` capabilities and retains final judgment.

### 9.2 Repairs and escalation

A targeted repair has a concrete correction hypothesis, the corresponding change, and validation. Allow at most two targeted repairs after the initial implementation attempt. Reassess earlier when materially similar failures provide no new evidence.

Tool retries, launch failures, capacity waits, and implementation repairs are distinct events. Redispatching or replanning does not automatically reset the same task's repair budget. A failed test is not itself evidence of insufficient model capability.

Evidence for a capability limitation should identify the necessary constraint being repeatedly misunderstood, whether context was supplied, why targeted correction failed, and whether the task actually needs reclassification. Prefer changing context, decomposition, environment, or strategy before changing models.

When taking over ordinary work, `complex_worker` first confirms the previous implementer has stopped,
inspects its diff and failure evidence, and preserves correct partial work. The same task's repair
history and budget carry forward; an exhausted budget returns to primary re-planning before further
patching. `deep_critical_reviewer` analyzes only the concrete unresolved critical issue. Importance
or extra reassurance alone cannot trigger it.

### 9.3 Concurrency, takeover, and cancellation

Keep at most eight worker threads open, excluding the primary. The primary decides whether to continue or close completed threads. Wait on, continue, or close only actual handles returned by successful launches; a failed launch does not establish an existing worker.

Eight replaces the original limit of four at the user's request, allowing more independent work
to remain open. It is a ceiling for work selected on its merits, not a target dispatch count.
The earlier four-slot evaluation does not establish a speed or stability advantage at eight.

Continue the actual worker thread through the host's supported continuation or steering mechanism. Spawning another `ordinary_worker` selects the same role but does not reuse the previous thread's context. Thread identity, an individual turn's status, and the task's acceptance status are separate facts. Codex's native lifecycle distinguishes threads, turns, and work items. [App Server lifecycle](https://developers.openai.com/codex/app-server)

Parallelize independent research, exploration, reviews, and clearly bounded implementation. Stabilize unresolved shared interfaces and dependencies, or work serially when ownership overlaps. Different files do not necessarily mean independent tasks.

Overlapping implementation needs isolated working copies or explicit serial ownership. Worktrees provide file isolation, not agreement about requirements and design. v0.1 adds no automatic worktree scheduler.

When using `plan-parallel-work`, retain its existing requirement for a separate working copy per concurrent implementer, even when owned paths do not overlap. This procedure's isolation constraint does not require worktrees for read-only research or review and does not introduce a scheduler.

Stop an existing implementer before taking over, inspect its diff and running state, then continue. Cancellation does not promise automatic rollback. Identify completed, incomplete, and still-running work, preserve recovery evidence, and do not discard user changes or perform destructive cleanup to regain a clean tree.

Native host lifecycle controls own any explicitly requested persistent goal. Ordinary tasks do not create a goal automatically, and this design adds no competing goal-state file or background continuation service.

## 10. Configuration layout and model binding

### 10.1 Target file layout

Personal configuration in the repository maps to the target Codex Home:

```text
config/codex/                  -> ~/.codex/
|-- AGENTS.md                     |-- AGENTS.md
|-- config.toml                   |-- config.toml
`-- agents/                       `-- agents/
    |-- ordinary_worker.toml          |-- ordinary_worker.toml
    |-- complex_worker.toml           |-- complex_worker.toml
    |-- critical_reviewer.toml        |-- critical_reviewer.toml
    `-- deep_critical_reviewer.toml   `-- deep_critical_reviewer.toml
```

Merge orchestration principles into `AGENTS.md` while preserving existing communication, authority, scope, verification, Git, and capability boundaries. `config.toml` supplies runtime configuration; `agents/*.toml` supplies role implementations. This document is repository design material, not a runtime dependency for distributed skills.

Install `workflow` and `pr-review` through the host's native plugin mechanism when authorized; they are the recommended companion capabilities, not files copied into the role definitions. Their portable skill trees contain no personal role mapping or required reasoning-effort values.

### 10.2 Global configuration fragment

The following defines the current requested defaults. It is not a complete replacement for a real `config.toml`:

```toml
sandbox_mode = "workspace-write"
approval_policy = "on-request"
approvals_reviewer = "auto_review"

[sandbox_workspace_write]
network_access = true

[agents]
enabled = true
max_concurrent_threads_per_session = 8
default_subagent_model = "gpt-5.6-luna"
default_subagent_reasoning_effort = "max"
```

The sandbox defaults permit workspace writes and network access, with on-request approvals routed
through automatic review. Start a new session to use the updated defaults. This post-merge change
is checked through native configuration loading; it was not part of the earlier frozen A/B.

Orchestration does not fix or switch the primary model. The primary explicitly selects a semantic role and the required configuration for the task. `default_subagent_*` supplies only the fallback when no explicit choice is made; it is not the normal task classifier or specialist-review model selector.

In particular, omitting `model` cannot simultaneously mean "use the global ordinary-worker default" and "inherit the primary model." Dispatch according to the actual decision and verify the effective model and effort when needed. `pr-review` does not need its own model router.

### 10.3 Role files and effective configuration

Each agent TOML defines `name`, `description`, and `developer_instructions`, plus the role's model, effort, and default permissions. Its instructions must fully describe the role's behavior without depending on repository-root paths or an unimplemented shared-instruction loader.

`ordinary_worker` and `complex_worker` can perform authorized implementation and default to `workspace-write`. The two critical roles remain `read-only`. When either implementation role performs review or pure analysis, it must also respect the read-only task boundary; possessing write capability does not grant authority to use it.

Verify the chosen role, model and effort through the required execution evidence. Record effective
permission settings when exposed by those runs; a field in a file alone does not establish a runtime
guarantee. Official documentation describes custom-agent overrides, parent inheritance and live
permission overrides. [Native configuration and inheritance](https://learn.chatgpt.com/docs/agent-configuration/subagents)

For this delivery, assess read-only subagents through existing evals that check whether they
modified files. Reuse those observations and file-change assertions; if no applicable eval exists,
add no dedicated test. Role-level sandbox enforcement is not a delivery requirement. Retain observed
permission inheritance as a platform limitation without requiring client changes or further probes.

Behavioral instructions and enforced permissions are separate controls. Respect the actual host
controls and external tools' authorization boundaries, without adding sandbox-enforcement probes
for this delivery. Do not infer that every reachable integration or tool is sandboxed; the native
protocol also exposes operations outside the thread sandbox. [App Server API boundaries](https://developers.openai.com/codex/app-server)

An explicit model argument must not be assumed to override a role file that binds a model. When choosing a different-family critic, use the host's supported dispatch mechanism, preserve task semantics and read-only constraints, and confirm the effective model. Do not invent availability or silently rewrite persistent role mappings to conceal a mismatch.

### 10.4 Missing capabilities

If a role, model, permission combination, or delegation mechanism is unavailable, report the concrete limitation and choose an authorized available path that meets task quality requirements. Missing plugin-specific capabilities follow Section 5.3: leave dependent work incomplete rather than recreating the plugin or relabeling a substitute as its result. Do not silently downgrade, change the primary model, or label an incomplete independent review as passed.

The primary can continue its own inspection, but must distinguish it from a separate reviewer. Explicitly required family diversity, specialist security review, or other missing necessary capability remains incomplete. Do not automatically install plugins, switch production configuration, or broaden external operations.

## 11. Model and role lifecycle

A model release does not directly change routing. Evaluate the candidate against existing roles for quality, instruction following, tool use, scope discipline, repair rate, complete task latency, and total cost before replacing a mapping.

For ordinary work, prioritize reliable completion of clear tasks. For complex work, examine root-cause reasoning and cross-component invariants, plus use of prior failure evidence and restraint when taking over. For critical review, examine consequential errors, counterexamples, and uncertainty. For deep critical analysis, examine whether it resolves the specific issue left by the preceding pass.

Normally, replace a role mapping in its TOML. If the global fallback is also intended to follow the ordinary role, update `default_subagent_*` accordingly. Do not retain duplicated values while promising that every model replacement changes only one file. Evaluate model and effort together.

Adding a role requires evidence of distinct task semantics, behavior, or verification needs, not merely a new model. Takeover now belongs to `complex_worker`; retain its handoff and repair-history requirements without a separate role. Further role changes should follow actual work and evals.

Architecture changes should address repeated observed failures. Remove support mechanisms when they stop providing value. Do not introduce new services, layers, or persistence because of one anomaly or a new model release.

## 12. Verification and evals

### 12.1 Final acceptance

After worker self-validation, the primary inspects the actual diff, target behavior, necessary tests, review evidence, and integration consistency. Match validation depth to change scope and risk.

A completed runtime turn or item is not task acceptance. For example, App Server emits `turn/completed` with a final status, including after interruption; inspect that status and the task evidence. A well-formed structured response establishes output shape, not that its claims are true. [App Server lifecycle](https://developers.openai.com/codex/app-server), [structured output](https://developers.openai.com/codex/noninteractive)

Reuse accurate existing evidence without rerunning every command unnecessarily. Required integration behavior and independent review must still be checked. Documentation, comments, and pure renames do not acquire unrelated tests. Unrun, ungraded, failed, or necessarily incomplete checks cannot be replaced with a success label.

### 12.2 Orchestration acceptance

These are the acceptance targets. See [validation.md](validation.md) for executed checks and remaining gaps:

| Scenario | Expected behavior or evidence |
| --- | --- |
| Small, clear, low-risk change | The primary may finish directly; no mandatory delegation |
| Neither recommended plugin is installed | Simple work and ordinary native delegation remain available when they need no plugin-specific capability; no automatic installation |
| One plugin is present and the task does not need the other | Use the needed capability without requiring both plugins to load |
| A task needs an unavailable workflow or review skill | Identify the missing capability, leave dependent work incomplete, and continue unaffected authorized work without duplicating the plugin |
| A portable plugin runs without the personal Codex roles | Its methods remain usable with caller-selected available resources; no required GPT mapping or effort value |
| The primary delegates one slice from a larger approved plan | The worker returns only that slice's result; the primary owns integration, overall progress, and the next action |
| Ordinary and complex work | Choose suitable roles and record the actual effective model and effort |
| Primary stability | Delegating different roles does not change the user's primary model or effort |
| High-risk issue | The primary organizes necessary analysis, review, and validation; read-only reviewers do not become implementers |
| Small review covering several aspects | One reviewer may cover multiple aspects with evidence for each |
| Only same-family models available | Rubber Duck / SPAR can perform the requested independent-context analysis without being forced into a primary-only second pass |
| Different-family model available | The primary may select it; no automatic extra review; report actual family and limits |
| Required review capability missing | Report incomplete coverage; do not substitute a lighter check and claim completion |
| A reviewer launch fails after an explicit role, model, or effort choice | Any retry or authorized alternative follows the primary's dispatch decision; verify the effective model, effort, and read-only constraints rather than assuming omitted arguments preserve the choice. Primary inspection cannot satisfy an unmet independent-review requirement |
| Local implementation mistake or missing context | Continue the useful thread with targeted repair or added context |
| Two targeted repairs are exhausted, even though each produced new evidence | Stop patching and return to primary failure classification and re-planning. Preserve the task's attempt history across worker or thread changes; no automatic budget reset. Verify this separately from earlier reassessment after repeated failure without new evidence |
| Tool, environment, or capacity issue | Do not treat it as insufficient reasoning; repair, wait, or run in waves |
| More independent tasks than available worker slots | Preserve the task set and schedule in waves; the plugin does not hard-code the personal concurrency limit |
| Completed workers occupy the configured thread limit and a required reviewer is pending | Preserve returned evidence and context needed for continuation, close completed threads as needed, confirm capacity is released, and launch the pending review within that limit. Do not assume completion frees a slot, wait indefinitely, or drop the pending task |
| Ordinary capability limit or changed complexity | Require evidence for takeover or reclassification; do not endlessly restart the task |
| Permissions and stopping | Reuse existing read-only-subagent evals to check for file modifications; add no dedicated eval if absent. Preserve user work during cancellation and takeover, and manage only actual handles. Role-level sandbox enforcement is outside this delivery gate |
| Global fallback alongside specialist review | Explicit dispatch matches the primary's choice rather than relying on ambiguous inheritance |
| A turn ends while requirements or validation remain unmet | Record runtime status separately; the primary does not accept incomplete work |
| Structured output says acceptance criteria passed | Check the actual result and supporting evidence; schema conformance alone cannot pass the task |
| A claimed runtime control or capability lacks execution evidence | Keep that claim unverified and identify the evidence needed; configuration text or a related host's result is insufficient |

Distinguish configuration parsing, role discovery, actual invocation, permissions and behavior, and final task quality. Asking a model to list role names checks only its ability to describe instructions.

Use actual native execution evidence when the tested surface exposes it. `codex exec --json` emits a JSON Lines event stream; `--output-schema` can constrain the final response. App Server exposes its own lifecycle notifications. Their event names and shapes are not interchangeable: CLI `turn.completed` and App Server `turn/completed` belong to different interfaces. Use the appropriate version's schema and retain status and error information. [Noninteractive execution](https://developers.openai.com/codex/noninteractive), [App Server protocol](https://developers.openai.com/codex/app-server)

Record the client and runtime version, available effective configuration, actual thread or task handles, relevant tool calls, commands and decisive results, final artifacts, and remaining gaps as needed to establish the claim. Capture exposed evidence rather than reconstructing an imagined trace from the final answer. Missing necessary evidence stays unverified; native events supplement artifact inspection and semantic grading.

Behavioral evaluation, native orchestration acceptance and effect claims are scoped to Codex.
Claude Code and Copilot CLI remain distribution targets: verify native manifests, isolated
installation/update, source identity and discovery, without requiring model evaluations or
guaranteeing workflow effectiveness on those clients. Previously recorded invocations remain
historical observations, not effect-acceptance gates. The personal model mappings belong to
Codex. Claim App or other host compatibility only with corresponding evidence.

### 12.3 Actual tasks and model comparisons

Start with a small set of replayable tasks if useful, then observe real development. An optional starting set is 12 tasks with clear acceptance criteria: six ordinary implementation tasks, three complex diagnosis or implementation tasks, and three critical read-only review tasks. Use controlled artifacts for the critical review cases. This is a practical starting sample, not a statistically representative benchmark or a requirement to build a new evaluation platform.

Reuse the repository's [skill evaluation tooling](../../tools/skill-evals/README.md) for its existing corpus, validation, grading, and aggregation responsibilities. Native execution interfaces can supply evidence for focused runs without replacing the provider-neutral evaluation contract or adding another telemetry database. Keep `not_run`, `ungraded`, `failed`, and `passed` distinct. Protocol-level evidence does not by itself verify the App UI, other clients, other models, or long-running recovery.

For the recorded A/B comparison, A is the pre-orchestration workflow at `120a1b4`; B adds the revised personal orchestration and plugin contracts. The exact configurations are recorded in [validation.md](validation.md#revised-fixed-ab). Keep initial commits, requirements, tools, primary model and effort, authority, and necessary checks consistent between conditions. Isolate their solutions so neither condition reads the other's answer. Alternate execution order across tasks and define adoption criteria before examining results. This comparison measures the whole workflow; use a separate controlled comparison to isolate a particular model or effort setting.

Record first-pass and final acceptance, concrete failures, human intervention, complete elapsed time, actual models, repair and review counts, and available end-to-end usage. Include primary work, context transfer, workers, critics, retries, and caching. Retain failed, timed-out, unavailable, unrun, and ungraded outcomes rather than comparing successful tasks alone. Mark unavailable cost data unknown rather than substituting public API prices for subscription or gateway bills.

Adoption first requires acceptable quality and satisfied boundaries. Compare speed and total cost when quality is comparable. Small samples can justify further use, correction, or more evidence, but cannot prove long-term absence of regressions, zero missed findings, or universal optimality.

## 13. Implemented state and delivery boundaries

The repository now contains the configuration fragment, four role files, the primary-owned
workflow contracts and the flexible review/critic contracts. Workflow is `0.1.3`; pr-review is
`0.1.2`, with synchronized native manifests and unchanged marketplace identities and paths.

| Location | Implemented state | Verification and limits |
| --- | --- | --- |
| `config/codex` | Mergeable fragment, preserved primary model, four role mappings, eight worker slots, implementation and intended read-only role defaults | Native loading, eight-active-worker capacity/refusal, completed-context release and pending review passed bounded checks. Later same-handle Sol/high takeover and exhausted-budget handoff passed independent audit; earlier failures remain. The new 24-trial A/B establishes no speed or monetary-cost advantage. Production activation is not authorized. |
| `workflow-orchestrator` and responsibilities | Process skills separated from runtime workers; primary coordination and on-demand dependencies explicit | Behavioral and portable regression results are recorded separately. |
| `execute-plan-loop` | Bounded worker assignments, primary progress and acceptance, caller repair budget, thread evidence and cancellation boundaries | Preceding evidence is retained. Revised native checks confirm interruption, preserved partial work, same-handle complex takeover and a separate exhausted-task refusal without budget reset. Behavioral results remain separate. |
| `pr-review` | Primary-selected aspects and allocation, combined methods, explicit dispatch recovery, incomplete independence reported | Independent source review completed; behavior regression remains separate. |
| Rubber Duck and SPAR | Same-family independent contexts permitted, other families optional, SPAR still explicitly triggered | No cross-family certification is claimed. |
| Anti-slop and other workflow skills | Scope-exclusion and process-override reports clarified; other worker/template behavior retained | Anti-slop guards and related suite routes remain in regression scope. |
| Native lifecycle | Model/effort and fallback, primary stability, continuation and native interruption observed | Runtime automatically unloads a completed child before replacement; explicit primary-driven closure was not exercised. |
| Native plugin distribution | Three isolated CLI installations, upgrades, source identity and discovery exercised | Affected skills have actual Codex invocation and recorded behavior evidence. Claude/Copilot adaptation carries no workflow-effectiveness guarantee. |

The later full-branch review covered all 63 changed files through `30d643b` and found no substantive
issue after independent review and primary confirmation. Its security scan retained a `partial`
coverage label because an earlier pending-discovery record remained in the sealed report.
[Validation](validation.md#full-branch-review) records the exact scope and this report limitation.

The coupled corpus preserves the 59 prior affected-skill cases and 12 anti-slop guards, appends
17 behavior cases, and updates the affected routing and critical assertions without renumbering.
Baseline and candidate use the same frozen revised corpus. Recorded lifecycle fixtures establish
decisions only; native evidence establishes the controls actually exercised.

The current role/model combination, eight-worker setting and ordinary fallback are not measured
optima. The preceding repository delivery completed under the agreed Codex evaluation and existing
read-only-behavior-check scope. Its 24 A/B trials establish no adoption advantage. Historical
failures, four exact-name route misses and additional probe limitations remain recorded rather
than relabeled as passes. [validation.md](validation.md) maps the required deliverables to evidence
without treating configuration text or a comparison gate as acceptance.

This document does not become a new downstream coordination entrypoint. Portable runtime guidance remains in `workflow-orchestrator` and the relevant skills, and the primary uses actually installed and callable capabilities. Synchronizing real `~/.codex`, switching production installations, committing, pushing, and publishing require corresponding authorization.

## 14. Core invariants

1. The primary is the sole coordinator and final acceptance owner, preserving the user's current model and effort.
2. Quality comes first; optimize complete delivery time and total cost when quality is comparable.
3. Delegation must provide value; small tasks may remain direct.
4. Roles are separate from concrete models; configure and evaluate model and effort together.
5. `workflow` supplies process methods and constraints; `pr-review` supplies review methods and constraints. Neither owns model or reasoning-effort policy.
6. The primary flexibly selects review aspects, workers, and models without silently omitting necessary risk checks.
7. Same-family critique is a permitted execution path; different-family availability is not its default launch gate.
8. Workers do not spawn agents, and review tasks remain read-only.
9. Failure does not imply a capability limitation; reuse useful context and escalate only with evidence.
10. Parallel work needs independent tasks and clear ownership; agent count does not resolve shared design disagreements.
11. Worker conclusions are evidence inputs, not substitutes for primary inspection or actual acceptance.
12. Plugin dependencies are on demand and one-way: core orchestration can run without them, while missing task-required capabilities remain explicit gaps; the plugins do not require personal role configuration.
13. Actual use and evals drive role, model, and orchestration changes; hypothetical needs do not justify new infrastructure.
14. Reuse Codex's native harness and appropriate official interfaces; runtime completion and structured output remain evidence inputs, not final acceptance.
