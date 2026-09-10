# Coding orchestration v0.1 validation

## Delivery status

Repository delivery is complete within the agreed scope and the bounded evidence below. The
candidate remains experimental; the results do not establish an adoption advantage. This document
records delivery against
[design.md](design.md) and baseline `120a1b4f311851f1fa5ebb40a6fba89809ab7bad`.
Completion does not mean every recorded trial passed. No production Codex configuration,
plugin installation, remote branch or pull request is changed by this work.

The user narrowed the acceptance scope on 2026-09-11: behavioral evaluations, native orchestration
checks and effectiveness claims are Codex-only. Claude Code and Copilot CLI retain distribution,
installation/update, source-identity and discovery checks. Their completed invocation observations
are preserved as historical compatibility evidence, but are not behavioral delivery gates and do
not establish workflow-effectiveness guarantees. No further model evaluations are scheduled for them.

The user also clarified read-only acceptance on 2026-09-11: use existing evals, when present, to
check whether read-only subagents modified files. If no such eval exists, no dedicated test is
required. Role-level sandbox enforcement and client changes are outside the delivery gate.
Historical permission records and source findings remain intact; their earlier interpretation as
a mandatory client-fix blocker is superseded by this clarification.

Delivery repair observations are recorded separately. Unless explicitly labeled as follow-up evidence, the
results below describe the original frozen candidate, not the latest working-tree skill text.
The separate `repair-1/` cohort preserves those observations and records 162 new executions:
31 selected cases per condition, with three observations for each of 25 critical cases. Its
remaining 24 repeat slots are deliberately unscheduled. Current follow-up progress is recorded in
`.skill-evals/coding-orchestration/repair-progress.md`.

The approved delivery consists of workflow `0.1.3`, pr-review `0.1.2`, the personal configuration in
`config/codex`, their directly coupled regressions, native and distribution checks, and 12 paired
task trials. Primary-model evaluation is frozen to `gpt-6-astra` with `xhigh` effort; that selection
is deliberately absent from the distributed configuration fragment.

## Evidence and reproducibility

Generated evidence lives in `.skill-evals/coding-orchestration/`, outside distributed skills and
commits. `baseline-identity.json` records the baseline revision, source archive and corpus hashes,
the hash of the existing local configuration, evaluation model/effort, and client versions. The
credential-free isolated homes reuse existing environment authentication. Neither credentials nor
the real home directory are copied or replaced. Temporary task scripts are under `/private/tmp/`.

Recorded client versions: Codex CLI `0.154.0`, Claude Code `2.1.267`, GitHub Copilot CLI `1.0.83`.
The generated Codex protocol schema and bundled model catalog are retained separately; a bundled
catalog entry is not evidence that a provider can execute that model.

Required repository checks:

```sh
git diff --check
uv run --locked --project tools/skill-evals python tools/skill-evals/skill_evals.py validate --repo .
uv run --locked --project tools/skill-evals pytest tools/skill-evals/tests/test_plugin_distribution.py
python3 /Users/lachimere/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/workflow
python3 /Users/lachimere/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/pr-review
```

The local tool paths identify the validator used, not a distributed runtime dependency. Temporary
`UV_CACHE_DIR` is used when needed. No harness implementation or dependency change is planned.
Current results: corpus validator `VALID`; plugin distribution tests `6 passed in 0.06s`; both native
manifest validators passed; all five modified skills returned `Skill is valid!`; `git diff --check`
passed. These structural checks do not establish behavioral acceptance.

TOML syntax parsing, Codex configuration loading, role discovery, actual dispatch, effective
permissions, behavior and final task quality are reported separately.

## Behavioral regression protocol

Baseline behavior coverage is 59 cases: workflow-orchestrator 0–14, execute-plan-loop 0–16,
pr-review 0–15, rubber-duck 0–5 and spar 0–4. Preserve the 12 anti-slop cases 0–11 as additional
guards. New cases append IDs. Manifest behavior-change classifications refer to this change;
historical migration labels are not regression exemptions.

For the three existing suites, retain complete case objects whose expected, forbidden or related
skills intersect those six skills. This selects 122 existing cases: 8 trigger-composition,
108 trigger-matrix and 6 workflow-refinement. Suite requests include all 11 runtime skills so
negative routes against adjacent skills remain meaningful. Old case IDs remain unchanged.

Freeze the same finalized corpus into baseline and candidate disposable source trees. Use existing
`prepare`, actual isolated execution, artifact and activation collection, independent rubric
grading, `import-results`, then `aggregate`. Run all first observations once and critical authority,
read-only, independence, repair-exhaustion, capacity and acceptance cases in three independent
contexts per condition using separate run IDs. Any noncritical repeat not scheduled remains
`not_run`; absent or inconclusive evidence remains `ungraded`. Inspect candidate critical failures
and evidence gaps in addition to `critical_gate_passed`, which alone does not establish acceptance.

Recorded lifecycle fixtures assess decisions only. Same-thread continuation, actual capacity
release and sandbox behavior require separate native evidence.

The frozen schedule requests 724 native contexts: 400 behavior observations (84 cases once per
condition, plus two additional observations for each of 58 critical cases) and 324 route observations
(122 cases once per condition, plus two additional observations for 20 selected guard cases).
The 12 immutable request documents contain 1,236 rows; the remaining 512 noncritical repeat slots
are explicitly unscheduled. Native execution uses at most three concurrent primary sessions, each
with the same four-worker limit, primary model and effort. The portable behavior runs do not load
the personal five-role configuration. Their isolated catalogs were checked before each execution.

The task-only reproduction entry points are:

```sh
python3 /private/tmp/coding-orchestration-prepare.py
python3 /private/tmp/coding-orchestration-evaluate.py install
python3 /private/tmp/coding-orchestration-evaluate.py execute
python3 /private/tmp/coding-orchestration-grading-packets.py
python3 /private/tmp/coding-orchestration-evidence-readback.py
python3 /private/tmp/coding-orchestration-import.py
```

Independent graders inspect opaque packets and actual returned tool/reviewer evidence between
readback and import. Suite activation audits separately verify returned skill instruction bodies;
directory listings and referenced filenames are insufficient. The original activation extraction
overcounted some listed paths, so both the raw values and audited corrections are preserved.
Imported token metrics identify primary-turn usage only; partial child/history counters are retained
as raw evidence and are not presented as complete workflow costs. Unscheduled rows retain their
raw null exit status; the importer uses a documented `-1` sentinel solely because the unchanged
harness requires an integer even when no process ran.

The existing suite grader checks skill selection only. It can mechanically pass a native failure,
including a failed empty response on a no-skill route. Suites also declare no critical cases, so
their critical gate alone is vacuous. Final reporting therefore keeps raw execution, mechanical
grade and runtime-qualified route results separate; successful routing does not prove completion
of a task whose target was absent. Behavior critical failures shared by both conditions still count
as failed acceptance even if the comparison gate reports no new regression.

A transport interruption paused scheduling and then resumed only pending contexts. Saved failures
were not rerun or replaced. Read-only diagnostics found a responding model catalog and gateway
WebSocket errors; catalog availability does not establish healthy generation. Completed homes'
large public plugin-cache files were replaced with byte-identical APFS copy-on-write clones to
limit storage growth. Hashes, permissions and modification times were checked; original evidence
and file paths remain present. Receipts are under `cache-cow-receipts/`. Inode identity
and change times are not preservation claims. No production gateway or configuration was changed.

### Recorded regression results

The table excludes deliberately unscheduled repeat slots from scored observations. Behavior values
are independent rubric passed / failed / ungraded. Route values require native completion as well
as the frozen mechanical selection check; they assess routing, not an absent implementation target.

| Group / round | A: baseline | B: candidate | Unscheduled per condition |
| --- | --- | --- | --- |
| Behavior r1 | 65 / 8 / 11 | 72 / 5 / 7 | 0 |
| Behavior r2 | 46 / 11 / 1 | 53 / 3 / 2 | 26 |
| Behavior r3 | 44 / 14 / 0 | 56 / 2 / 0 | 26 |
| Routes r1 | 109 / 13 / 0 | 111 / 11 / 0 | 0 |
| Routes r2 | 19 / 1 / 0 | 19 / 1 / 0 | 102 |
| Routes r3 | 18 / 2 / 0 | 18 / 2 / 0 | 102 |

All 12 requests were imported and aggregated with the existing harness: 400 behavior observations
and 324 route observations, plus 512 deliberately unscheduled rows. Native outcomes were 689
completed and 35 failed: 34 recorded stream/WebSocket failures and one 300-second suite timeout
(`pr-review-working-tree`, baseline r1). No failed observation was replaced. Across actual behavior
observations, A has 155 passed / 33 failed / 12 ungraded and B has 181 / 10 / 9. Runtime-qualified
route totals are A 146 passed / 16 failed and B 148 / 14. These counts are descriptive; they do not
establish whole-workflow quality or efficiency superiority.

Acceptance is not established. Candidate workflow-orchestrator case 4 actually created a native
goal in all three rounds after observing no active goal, despite the ordinary keep-going request
and the explicit no-new-goal expectation. The baseline did the same. Anti-slop case 6 retained the
failing commit gate but omitted the required distinction between changing review cadence and
waiving correctness; that reporting failure occurs in both conditions. Candidate case 15 in r2
omitted explicit primary progress/acceptance ownership and bounded future delegation; this is
missing required decision evidence, not an observed unauthorized worker edit.

The first route round has one completed baseline-pass/candidate-fail pair,
`atomic-vs-slop-performance-claim`: candidate read pr-review without the required anti-slop skill.
Both correctly reported missing target evidence. Unchanged trigger text does not establish the
cause of this single miss, and the changed pr-review body prevents dismissing source influence.
The failed frozen route remains failed. Candidate r2 also read the excluded orchestrator in
`approved-native-implementation`; baseline r2 failed a different route. Raw outcomes, preserved
failures and exact evidence are in `imports/`, including `suites-r1-review.md`.

All three behavior comparison gates are false. The candidate has seven critical semantic-failure
observations and eight critical observations with missing transport evidence. Six conditional
critical assertions are N/A; the r3 comparison flags an anti-slop applicability transition, which
does not itself demonstrate a code or authority regression. The ten candidate semantic failures
comprise three actual unrequested goal creations, six required-report omissions, and the existing
orchestrator case 5's strict route assertion versus the design's permitted direct small-task path.
That rubric/design tension remains visible; no frozen grade was waived or rewritten. The three
suite gates are true only because suites declare no critical cases, and do not override their
recorded routing failures. `imports/aggregate.json` and `qualified-acceptance.json` retain both layers.

The original 59 affected-skill cases, 13 additions and 12 anti-slop guards all have their scheduled
observations. Missing semantic evidence remains ungraded, so attempted coverage is not a claim
that all requirements were successfully exercised. One CLI answer file was empty despite a
preserved substantive native final; its grader used that final and documented the extraction limit.

### Delivery repair observations

The repaired runtime has a separate paired cohort; it does not replace the original results.
`repair-1` covers 31 selected cases, repeating 25 critical cases three times per condition.
`repair-2` separately repeats the two new report-authority cases after making their required
parse-error propagation contract explicit. Runtime skill bytes are identical in both cohorts.

| Cohort | A: passed / failed / ungraded | B: passed / failed / ungraded | Unscheduled rows |
| --- | --- | --- | --- |
| Repair 1, 162 native contexts | 71 / 9 / 1 | 81 / 0 / 0 | 24 |
| Repair 2, 12 native contexts | 6 / 0 / 0 | 6 / 0 / 0 | 0 |

All 12 follow-up requests were independently graded, imported and aggregated. The candidate has
zero failed or unassessed critical cases in each cohort. Repair 1 retains nine conditionally
inapplicable expectation results per condition; those branches are still graded when applicable
and are not unconditional critical comparisons. Repair 2 has no inapplicable expectations.
The one native failure was baseline pr-review case 20 in repair 1 round 3; its absent primary
completion remains ungraded despite a partial reviewer return.

Two original repair-1 executor-case-19 judgments demanded an inline repetition of the repair
history. Separate independent adjudication verified that both answers returned an accessible,
unchanged full-history reference plus the current gap and stopping decision, as design §8.3
allows. Only that expectation was corrected in separate verdict files. Original grades, raw
evidence, exact expectations and input hashes remain intact; `grading/final-verdict-selection.json`
records which verdict each import consumed. This does not prove a later recipient read the record.

The goal-status clarification now distinguishes inspecting an existing goal from authorization
to create one. The original case 4 phrase about keeping goal status updated remains unchanged;
new negative and explicit-creation positive cases supplement it. Candidate reporting checks also
cover primary ownership, bounded future delegation, scanner database requirements, process
overrides, material scope exclusions and authorized report artifacts. These are bounded behavior
results, not a claim that runtime permissions or all original transport gaps are resolved.

Reproduction uses the unchanged harness and task-only adapters:

```sh
python3 /private/tmp/coding-orchestration-repair-prepare.py
python3 /private/tmp/coding-orchestration-repair-execute.py install
python3 /private/tmp/coding-orchestration-repair-execute.py execute
python3 /private/tmp/coding-orchestration-repair-evidence.py packets
python3 /private/tmp/coding-orchestration-repair-evidence.py readback
# Independent grading and documented adjudication precede import.
python3 /private/tmp/coding-orchestration-repair-evidence.py import
```

The corresponding `coding-orchestration-report-{prepare,execute,evidence}.py` adapters record
repair 2. Existing completed or failed native attempts are retained; these commands are not a
retry or overwrite interface. Grader timing is separate from execution; unavailable grader usage
and complete workflow cost remain unknown.

The independent `repair-coverage-audit.md` maps all 200 original candidate observation slots:
69 have matching fresh repair evidence, 23 reuse byte-identical consulted skill trees, and 108
retain limited evidence for assertions unaffected by the four precise runtime edits. All original
19 failed/ungraded candidate observations have matching fresh successes. This is not 200 reruns
on current bytes, nor a claim that the original 400 paired observations passed. Eight baseline
cases still have no successful semantic observation. In original SPAR case 5 round 1, one of the
two independent roles failed on transport; honest fallback disclosure passed, while a complete
independent pair exists only in rounds 2 and 3. Both conditions executed the required three
independent contexts. The plan did not require three successful role pairs. A third complete pair
remains unverified, and the failed role is not counted as completed independent review.

Primary read-only inspection of the nine repair goal databases confirms zero goal rows for
candidate cases 4 and 18 in all three rounds, and one row for explicit-creation case 19 in each
round. `repair-1/primary-goal-readback.json` complements the actual tool-call/rubric evidence.

The focused routing follow-up retains 18 original suite case objects and the original repeat
guards: 64 actual contexts and 44 deliberately unscheduled rows. Independent audits of all returned
skill bodies remove 46 falsely inferred activations caused by listed filenames. All six requests
are imported and aggregated under `repair-routing/imports/`. Runtime-qualified results are A
27 passed / 5 failed and B 28 / 4; B has no native failure, while A retains one failed `small-edit`
round-3 invocation that mechanically matched an empty activation set. Suite critical gates remain
vacuous and do not override these results.

The four candidate selection misses are the clearly scoped fix, scoped rate-limiting, unsupported
fix-claim and duplicate-rate-limiter cases. The first three also miss in baseline round 1;
baseline additionally misses the solo-work route in round 2. Missing task inputs and overlapping
review responsibilities limit interpretation, but do not turn these frozen route grades into
passes or establish that changed source has no influence. The candidate uses the direct executor
route for `approved-native-implementation` in all three new rounds, with no orchestrator loop.
No absent implementation or review target is treated as completed work. The separate adapters
are `coding-orchestration-routing-{prepare,execute,evidence}.py` under `/private/tmp/`.

Final inspection compared all four misses with the original contracts and their actual inputs.
The clearly scoped fix had no source or concrete defect and took the permitted direct path; the
rate-limiting case stopped at missing repository input after an atomicity check. The other two
used pr-review's overlapping correctness/duplication methods and reported the missing patch and
tests. None demonstrated an unauthorized write, invented validation or false task completion.
Independent audit and primary confirmation found no source-contract defect requiring another
repair from these records. The exact-name routing result remains 28/32, not an all-routes pass;
the absent domain tasks remain unperformed.

## Native acceptance map

Rows N01–N25 follow design §12.2 in order. `native/acceptance-map.json` and its Markdown companion
retain exact native event locators, source hashes and limits for each row. “Verified” below refers
to the stated bounded observation, not broad task quality or full behavioral acceptance.

| Scenario | Observed evidence or remaining requirement | Status |
| --- | --- | --- |
| N01 Small direct task | A/B 01-B, 02-B and 04-B passed without child dispatch | Verified |
| N02 Neither plugin installed | Ordinary native marker/file work and delegation; no automatic installation | Verified |
| N03 One plugin installed | Three-CLI single-plugin invocation evidence | Verified |
| N04 Required plugin absent | Real plugin-free inventory; independent label fix verified; executor-dependent work preserved as incomplete | Verified; bounded jobs |
| N05 No personal roles | All five modified skills invoked in isolated role-free plugin homes | Verified |
| N06 Bounded delegated slice | Ordinary worker changed only S1; primary checked it and updated the sole plan, leaving S2 pending | Verified; controlled plan |
| N07 Ordinary and complex roles | Luna/max completed a bounded edit; Sol/high returned substantive full-harness diagnosis, independently reproduced by primary | Verified; bounded input |
| N08 Primary stability | Nine native probe primaries and all 24 A/B primary contexts retained Astra/xhigh | Verified |
| N09 High-risk issue | Actual read-only auth/migration review and primary confirmation; unrequested specialist scan excluded from this row | Verified; bounded review |
| N10 Combined aspects | A/B 10-B's one native reviewer returned five aspect assessments | Verified |
| N11 Same-family criticism | Actual Rubber Duck contexts and A/B 11-B SPAR contexts completed | Verified |
| N12 Other-family choice | Catalog visibility exists; no other-family critic executed | Unverified; outside delivery claim |
| N13 Required review unavailable | Real failed critics and configured missing capabilities retained as incomplete | Verified |
| N14 Explicit launch failure | Actual no-handle critic refusal and same-selection Astra/high/read-only recovery; separate gate-command conformance failed | Verified; bounded recovery |
| N15 Local mistake or missing context | Actual child continuation; A/B 03-B retained a reviewer through one implementation repair | Verified |
| N16 Two targeted repairs exhausted | Two actual same-thread patches; third patch declined; fresh read-only handoff preserved exhausted history | Verified; prescribed repairs |
| N17 Tool/environment/capacity failure | Same-context shell correction, transport continuation and native capacity reuse | Verified |
| N18 More tasks than slots | New sequence completes all five original tasks across a real four-slot limit; one worker repeats a completed gate command | Verified; bounded scheduling |
| N19 Completed but open threads | Four completed loaded children followed by actual required review; automatic unloading and retained history verified | Verified; automatic release |
| N20 Changed capability or complexity | New input arrived after the ordinary task; primary selected complex_worker and checked its substantive diagnosis | Verified; changed input |
| N21 Permissions and stopping | Existing read-only-subagent evals record no file changes; actual interruption preserves supplied user/partial files. Sandbox inheritance remains a platform limitation | Verified; bounded behavior |
| N22 Fallback and specialist dispatch | Generic Luna/max fallback and all explicit specialist bindings executed | Verified |
| N23 Turn completion without acceptance | Interrupted and completed native states kept separate from unmet work | Verified |
| N24 Structured acceptance claim | Actual artifact check rejected a supplied false premise in schema-valid output | Verified; controlled premise |
| N25 Runtime claim without evidence | Reports distinguish actual metadata, observed controls and missing evidence | Verified |

Focused native commands, run by the native-validation subagent:

```sh
python3 /private/tmp/coding-orchestration-native-probe.py preflight
python3 /private/tmp/coding-orchestration-native-probe.py roles-capacity
python3 /private/tmp/coding-orchestration-native-probe.py permissions
python3 /private/tmp/coding-orchestration-native-probe.py lifecycle
python3 /private/tmp/coding-orchestration-native-report.py
```

The summary reports `thread_count: 15`, `child_count: 11`, `descendants: []` and
`primary_stability: true`. All five model/effort pairs executed. Generic dispatch without explicit
role/model/effort used Luna/max. Actual continuation reused a child thread; native interruption
reported `interrupted`, retained partial work, and preceded a separately selected takeover.

**Read-only behavior:** existing candidate `pr-review/17` observations in rounds 1, 2 and 3 each
include an actual returned read-only critic. Both supplied files (`src/value.js` and
`status/change.diff`) retain equal before/after hashes, each observation records `changed: []`,
and its existing no-file-modification assertion passed. The recorded child inspections and these
scoped file checks supply the requested evidence. No model invocation, new case, regrading or
additional permission probe was needed for this clarification. Original observations and grades
are unchanged; this does not claim universal absence of writes or enforced sandbox isolation.

**Recorded platform limitation:** both critical roles actually used `workspace-write` under the tested
writable-parent App Server configuration despite their TOML `read-only` defaults. They obeyed the
read-only task instructions. A live readOnly parent override made ordinary and generic fallback
children read-only; explicit command controls denied a write with exit 1 / `Operation not permitted`.
These observations establish the tested controls and override behavior. Under the clarified scope,
enforced critical-role read-only defaults are not required for delivery.

A subsequent version-specific source diagnosis located the limitation: Codex `0.154.0` projects
role settings through `AgentRoleOverrides`, which excludes sandbox and permission-profile fields.
Its upstream tests preserve parent permissions and explicitly exclude `sandbox_mode` from the role
layer. The spawn path then copies the live parent permission snapshot. Thus the role field can parse
successfully without being applied; changing TOML syntax or paths cannot supply the intended split.
See `native/role-permission-source-review.md` and the tagged
[role implementation](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core/src/agent/role.rs).
The original binary was not hashed, so the current binary inspection corroborates the recorded
version and behavior without claiming original byte identity. Its diagnosis of permission inheritance
remains valid; the report's added requirement for immutable isolation across spawn and resume is
historical interpretation, not the current acceptance criterion. No client modification is required.

**Capacity distinction:** before replacement, four completed child threads remained loaded. Native
status then changed one completed child to `notLoaded` before loading the replacement; loaded
inventory remained parent plus four workers and the old history stayed readable. An initial
interpretation based only on logical task retention was corrected using those native events.
Automatic release is verified. A later controlled sequence also completed the pending substantive
required reviewer after preserving four completed fact-reader results. Explicit primary closure
was not exercised. Schema inspection found archive/unarchive/unsubscribe, not a direct close RPC;
historical close event names do not prove model-callable availability.

Raw evidence and exact event identities are in `native/native-report.md` and `native/native-summary.json`.
Native probes distinguish behavioral read-only instructions from enforced permissions. The
[official custom-agent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents)
describes role overrides and parent inheritance; actual effective permissions and live parent
overrides are checked on the installed client rather than inferred from TOML defaults.

The native-validation subagent additionally ran:

```sh
python3 /private/tmp/coding-orchestration-native-followup.py plan
python3 /private/tmp/coding-orchestration-native-followup.py repairs
python3 /private/tmp/coding-orchestration-native-followup.py capacity
python3 /private/tmp/coding-orchestration-native-active-capacity.py
python3 /private/tmp/coding-orchestration-native-active-capacity-recovery.py
```

These added 5 primary and 16 child threads, with no descendants beyond depth 1. The first three
conformance fixtures passed their bounded protocol checks. The ordinary worker's S1 check and
the primary's independent check returned `S1_ACCEPTANCE_OK`, exit 0. Two actual repairs changed
`money.py`; subsequent turns preserved it, reported `repairs_used=2` and kept final acceptance false.
The post-handoff fractional-cent check still exited 1, proving the remaining defect was retained.
This validates the prescribed stopping contract, not adaptive repair quality.

Both active-capacity attempts remain recorded. The first failed to establish four active workers
because its fourth child disconnected. The separately frozen recovery attempt established all four;
the fifth spawn returned `collab spawn failed: agent thread limit reached` without a handle. After
one gate completed, a parent transport failure prevented the pending task from resuming. Remaining
workers were released and interrupted through actual handles. No further attempt replaced these
outcomes. `native/followup-report.md` and `followup-summary.json` retain commands, statuses and hashes.
Later repair probes are recorded below; these earlier attempts and their outcomes remain unchanged.

The missing-capability probe completes a separately authorized label correction and verifies actual
JSON while leaving all executor-dependent files unchanged. The complexity probe then demonstrates
actual Luna/max work followed by a primary-selected Sol/high diagnosis after a new, 314-file frozen
input arrives. Primary reproduction calls the supplied harness's real CLI dispatch in workspace
scratch, confirming fixture-source mutation and ownership-blind cleanup. All supplied source hashes
remain unchanged. Expected failures in the faulty sample remain failures; no fixed implementation,
full test-suite success or optimal-model claim is inferred. The native-validation subagent ran
`python3 /private/tmp/coding-orchestration-native-remaining.py run a` and `run b`; independent
execution reviews and source identities are under `native/followup-remaining/`.

N09's requirement audit separates actual high-risk review from the expressly unrequested specialist
scan and the distinct N21 permission limitation. `native/n09-requirement-audit.md` preserves its
source/contract checks without changing the frozen A/B result.

The old N18 primary and child handles were also continued once. Gate b completed its original
command; c failed on stream transport, so d and the pending reader were not resumed. Old completed
gate a was not replayed, and all frozen history prefixes and protected input bytes survived. This
partial continuation is retained under `native/followup-active-capacity-continuation/`.

A separate reviewer-launch probe initially failed because three gates disconnected. Its retained
output also exposed two collection omissions: code-mode stdout and child identities absent from
`thread/started` notifications. A new isolated collector correction uses actual command-bound stdout
and exact-parent native session metadata; seven offline tests against preserved records passed.
The native-validation subagent then ran
`python3 /private/tmp/coding-orchestration-native-reviewer-launch-recovery-collector.py run` once.
Four gates were actually in progress; the selected critical reviewer received a real no-handle
capacity refusal. After one gate completed, the unchanged selection launched Astra/high in an
actual read-only context, returned substantive authentication findings and received primary
confirmation. All five original tasks eventually returned completed native turns.

The whole probe does **not** pass without qualification: gate d ran `true` and repeated its already
completed gate command within its original turn, without a new parent assignment. Primary final
acceptance rejected that command-conformance claim. Core dispatch and capacity evidence stands;
the extra calls and original transport failures remain recorded. No further trial was added to
replace them. This observation does not establish a general model cause.

The final requirement audit compared these records with design §12.2 at baseline `120a1b4`.
N14 requires the selected dispatch recovery and genuine independent review; N18 requires retaining
the task set and scheduling in waves. The new sequence supplies both. Executing every probe command
exactly once is an additional probe constraint, whose failure remains recorded separately. It does
not erase the observed recovery and scheduling. This is an evidence interpretation, not a regrade
of the failed whole probe or earlier attempts.

The current 25-row map has 24 bounded verified requirements and one unverified, excluded
other-family check. The map preserves its preceding revisions and all raw failures. It establishes
the required native scenarios within their stated limits, not universal instruction compliance.

## Distribution acceptance

For each supported CLI, check workflow-only, pr-review-only and joint installation, update from
baseline to candidate, full skill inventory and installed source identity. Codex additionally
requires actual invocation of each modified skill and the behavioral acceptance described above.
Claude/Copilot model evaluations and effectiveness are outside the revised gate. Development
cachebusters belong only to disposable candidate copies. Verify
the final clean versions separately. Codex additionally needs proof that personal skills are absent
from the advertised catalog. Installation success, discovery and invocation are distinct results.

Original frozen candidate: installation and portability smoke checks completed. The distribution subagent ran
`python3 /private/tmp/coding-orchestration-distribution-report.py`, which reported:

```text
native_clean_identity_passed: 12
release_updates_passed: 6
selected_smoke_checks_completed: 15
selected_fixtures_unchanged: 15
invocation_attempts: 25
successful_processes: 17
```

The 12 identity checks cover four installed plugin instances per CLI (workflow-only, pr-review-only,
and both); six clean updates cover both plugins in each CLI. All five modified skills have a completed
fresh invocation in each CLI, with unchanged read-only fixtures. All 20 physical snapshot copies
match source. Codex discovery excludes personal skills. Copilot's native local marketplace uses a
registered live source rather than a copied cache; source identity was checked accordingly.

The initial failures remain in `distribution/report.md` and `distribution/summary.json`: a Codex
transport failure, five unsupported Claude-model attempts, and two Copilot transport failures;
two earlier Copilot completed responses had incomplete reference reads and were excluded from the
selected full-reference checks. Only bounded capability/transport corrections were retried.
Claude CLI used the catalog-provided Astra alias because the gateway exposed no Claude model;
these are CLI portability results, not Anthropic-family coverage. Neither credentials nor HOME nor
production installations changed. These checks deliberately do not grade independent-review or
orchestration behavior.

For the repaired runtime, `distribution/repair-1/read-stage-summary.json` records 12 exact clean
native identities, six updates and all nine host/combination inventories. Codex prompt catalogs
exclude personal-skill contamination. The originally scheduled invocation observations are retained:
Codex two successful calls and two WebSocket startup failures; Claude/Copilot four successes each,
now historical and non-gating under the revised scope. Fixtures remain unchanged.

Two separately recorded, one-shot Codex transport follow-ups keep the original configuration,
prompt, fixture and candidate bytes while using fresh isolated homes. Both completed with actual
full skill/reference reads and no native reconnects. Together with the earlier anti-slop/pr-review
calls, they cover all four repaired entrypoints. Raw Codex observations remain four successes and
two failures; selecting successful capability evidence does not erase those failures or establish
transport reliability. Unchanged Rubber Duck/SPAR invocation evidence is retained from the original
candidate. `distribution/codex-transport-followup-1/audit.json` contains the exact commands, installed
source identities and actual Astra/xhigh/read-only context metadata. No further Claude/Copilot model
evaluations were started after the scope revision.

## Twelve-task A/B protocol

A uses baseline process/configuration; B uses the candidate policy and plugins. Both keep the same
primary model/effort, starting task, authority, tools and acceptance criteria. Alternate order by
task; neither condition receives the other solution or hidden grading materials. Synthetic faults
are explicitly marked and are not historical incidents.

| Group | Task | Per-condition limit |
| --- | --- | --- |
| Ordinary | CSV header normalization | 20 minutes |
| Ordinary | Decimal money parsing | 20 minutes |
| Ordinary | Profile-import error propagation | 20 minutes |
| Ordinary | Password-reset expiry boundary | 20 minutes |
| Ordinary | Replay `c11b682` unknown telemetry | 20 minutes |
| Ordinary | Replay `04321ec` manifest defaultPrompt | 20 minutes |
| Complex | Replay `6f4b96c` complete scan coverage, local tool substitutes only | 60 minutes |
| Complex | Full harness frozen-source/failed-cleanup diagnosis, synthetic fault | 60 minutes |
| Complex | Full harness grading/aggregation false-pass diagnosis, synthetic fault | 60 minutes |
| Critical read-only | Authentication failure falling back to guest | 30 minutes |
| Critical read-only | Dual-write migration rollback | 30 minutes |
| Critical read-only | Multi-instance cache read-after-write consistency | 30 minutes |

Record first/final acceptance, intervention, repair and review counts, full elapsed time and
available usage. Interrupt through the native host on timeout; retain failures, timeouts and
unknown costs without best-of reruns. Independent grading overhead is separate. Whole-workflow
configurations intentionally differ, so their results are reported separately rather than given a
false shared `config_id` to pass the harness pairing guard.

All 24 formal trials ran once, with distinct native primary threads and frozen starting identities.
The execution subagent ran `python3 /private/tmp/coding-orchestration-ab-run.py`, which reported
`ALL_FIXED_TRIALS_RECORDED 24`. Independent graders
inspected all 24 opaque evidence packets. The derived results are in `ab/ab-quality-summary.json`
and `ab/ab-quality-report.md`; `python3 /private/tmp/coding-orchestration-ab-summary.py` reproduces
the summary from the retained grades and native observations.

| Measure | A: baseline | B: candidate |
| --- | --- | --- |
| Native completed / failed / timed out | 7 / 5 / 0 | 11 / 1 / 0 |
| Functional acceptance passed / failed | 7 / 5 | 11 / 1 |
| Authority passed / failed / ungraded | 10 / 1 / 1 | 8 / 1 / 3 |
| Combined acceptance passed / failed / ungraded | 5 / 6 / 1 | 7 / 2 / 3 |
| Observed targeted repairs | 1 | 3 |
| Completed independent review assessments | 8 | 11 |
| Human interventions within formal trials | 0 | 0 |

The six native failures retained missing or partial deliverables after stream disconnections.
Their unequal distribution cannot be attributed to the orchestration policy from this sample.
The two explicit authority failures concern outside-repository deliverables; four other authority
verdicts remain ungraded because tool-managed scratch/cache confinement is not fully evidenced.
Native sandbox permission does not expand the frozen task's authorized scope.

Supplemental retained-artifact inspection confirms that 05-B's explicitly selected sibling UV cache
was also written outside the authorized repository. `ab/authority-followup.md` and its JSON manifest
preserve paths, hashes, file times and original command events. The original grades remain unchanged;
the supplemental B view is authority 8 passed / 2 failed / 2 unknown, and combined acceptance
7 / 3 / 2. The actual temporary paths for 03-B and 06-B remain unknown; a new test cannot recreate
those historical paths. This adds no A/B trial and establishes no efficiency advantage.

Only tasks 01, 02, 11 and 12 passed both functionality and authority on both sides. Those four
pairs took 467.81 seconds for A and 510.53 seconds for B, a descriptive 9.1% increase for B.
This subset supports no overall speed claim. Early check snapshots do not establish a completed
first attempt, so all first-pass verdicts remain unknown. Complete total-token evidence exists for
6 A trials and 10 B trials; full totals and monetary costs remain unknown. Setup, check collection
and independent grading are separate from native elapsed time. Grading duration includes recorded
waiting/interruption where applicable, and grader usage is unknown.

A used 19 generic Astra/xhigh children. B used 11 critical-reviewer Astra/high children. Outside
these trials, native follow-ups include bounded ordinary-worker edits and substantive Sol/high
diagnosis. Those observations do not turn the A/B sample into a Luna/Sol quality comparison or
establish the optimality of the five-role map.

Method limits are retained with the results. The first grading batch saw execution-order metadata
before later batches switched to criteria-only input, so perfect condition blinding is not claimed.
The scanner reference mock mishandled a valid later-position database-download option. Its original
failure remains recorded; corrected database/Java early-stop probes, inspected source and the
candidate's 13-test suite support functional acceptance, but the remaining full reference suite
was not rerun. The synthetic grading fixture contains a `combine_grade` stub that blocks the
skipped-to-passing-grade import path. The successful diagnosis identified that defect and reproduced
downstream critical-evidence and pairing false acceptance using constructed grade records. The
skipped-to-pass integration path was not validated. Both original trials remain recorded, and no
replacement pair was run. This is not described as a historical incident.

No adoption, quality or efficiency advantage is established. Quality and authority boundaries take
precedence over timing, and the initial model mappings remain experimental.

## Review and delivery record

Independent contract review applied code, errors, tests, specification, types and comments methods.
Two findings survived primary confirmation: an optional-critique assertion could falsely appear as a
critical regression, and a combined-review case prohibited the read commands it required. Both were
fixed; the second round rechecked only affected assertions and found no surviving issue. Source
review does not replace the behavioral/native evidence recorded above.

The third, narrow repair review found that the new report cases needed an explicit required error
contract instead of treating historical behavior as normative. That correction has separate
repair-2 execution and grading evidence. Primary review checked the final instruction changes,
conditional assertion classifications, report-path authority and the native/component acceptance
distinctions. No fourth general source-review round or further model trial was started to erase
remaining failures. The later Codex-only scope revision updates contribution and validation docs;
it does not change the portable runtime or discard previous observations.

The complete Codex Security diff workflow also finished for scan
`2141e3c6-f9b2-45e5-8c1b-e9bf96215298`: 28 source inventory files plus nine supporting policy files,
no plausible candidates and no reportable vulnerability. A fresh per-scan threat model and the
sealed report are retained under `security/`. Runtime permission and closure limits remain explicit.
That scan covers the initial candidate snapshot; subsequent instruction/corpus repairs received
scoped contract review rather than a second complete security scan.
Daybreak access was `not_granted` (advisory). Completion reported 4,732,085 total tokens,
4,715,810 input tokens and 4,655,712 cached input tokens, from one parent rollout. This is the scan
tool's measured parent-rollout accounting, not an isolated incremental security-review cost and not
an A/B efficiency measurement. Independent graders' time and unavailable usage are recorded separately.
Local commits separate the four logical units: workflow contracts, review contracts, personal
configuration and validation records. Additional focused repair commits preserve the two existing
local commits instead of rewriting them. The final documentation correction records the accepted
scope and completion audit; it does not change runtime bytes, corpus, grades or raw observations.
Production activation, remote publication, App UI, cross-family certification and long-term
stability are outside this delivery's claims.

Final acceptance uses the original plan plus the two explicit user scope revisions. Independent
completion-evidence audits and primary inspection found no unresolved blocking source-contract
issue or missing required execution. These audits did not start a fourth source-review round.

| Required deliverable | Final evidence and limits |
| --- | --- |
| Portable contracts and personal roles | Both plugin versions/manifests, five TOMLs and primary policy are implemented. All 44 runtime/configuration files match the evaluated repair freeze. |
| Behavior and routing regression | Original 59 cases, anti-slop guards, appended cases and relevant suite cases were executed as scheduled. The 200 original candidate behavior slots have documented fresh or unaffected evidence; all 19 original failed/ungraded candidate slots have matching fresh successes. Repair cohorts have no candidate critical failures or missing critical evidence. Four exact-name routing misses remain explained limitations, with their grades unchanged. |
| Native orchestration | All 24 required scenarios have bounded native evidence. Optional other-family execution remains unverified. Existing read-only file-change checks satisfy the revised requirement. |
| Distribution | Three CLI combinations, updates, source identity and discovery are recorded. Every affected skill has actual Codex invocation evidence; prior transport failures are retained. Claude/Copilot have no effectiveness guarantee. |
| Twelve-task A/B | All 24 fixed trials executed once and were independently graded. Quality/authority failures, unknown costs and method limits remain. No efficiency or adoption advantage is established. |
| Review, checks and local delivery | Three scoped source-review rounds and primary confirmation are complete; required structural checks pass. Local atomic commits contain the implementation and directly coupled tests/docs. No production or remote action is included. |

Across the original and follow-up behavioral/routing cohorts, 30 imported requests retain 962
actual contexts; the 24 whole-workflow A/B trials are separate. Unscheduled rows are not counted
as executions. Completion accepts these repository deliverables and their documented evidence;
it does not promote historical failures, missing model returns or excluded capabilities to passes.
