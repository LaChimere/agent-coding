# Process-skill responsibilities

The primary selects methods separately from runtime roles, models and effort. It owns delegation,
integration, overall progress and final acceptance. The skills below supply procedures; they are not
additional coordinators. A worker is a bounded delegate and returns evidence to the primary.

| Skill | Supplies | Result used by the primary |
|---|---|---|
| `execute-plan-loop` | Primary-owned execution and verification through approved scope; bounded worker assignments | Slice results and evidence; primary updates the living plan when used and selects the next action |
| `plan-parallel-work` | Missing parallel implementation decisions during overall planning | An embedded Parallel execution section or a bounded gap correction |
| `decompose-feature` | Designing PR delivery sequence | Independently mergeable purposes, ordering, acceptance and validation |
| `ensure-atomic-pr` | Assessing/recovering existing diff boundaries | Atomicity findings and a recovery proposal |
| `refresh-related-docs` | Evidence-backed broader Markdown refresh | Related documentation updates and consistency evidence |
| `anti-slop` | Necessity, complexity, scope and evidence checks | Findings folded into the current checkpoint; read-only when reviewing |
| `pr-review` | General change-set review from the separate installed plugin | Double-confirmed findings and explicit coverage limits |
| `scan-image-vulnerabilities` | Standalone read-only image inspection | Exact-image findings against fresh vulnerability databases |

## Contested boundaries

- **Goal vs execution:** the host's native goal lifecycle is not a worker skill. It neither owns slice cadence nor replaces implementation verification. Ordinary execution does not require a goal.
- **Parallel tasks vs PRs:** task isolation does not imply a multi-PR delivery sequence. Use `decompose-feature` only if that sequence needs designing. An existing stable base ref can suffice; do not manufacture a base PR.
- **Planning vs allocation:** `plan-parallel-work` describes prospective roles and boundaries inside the overall plan. Actual branch/worktree creation and task dispatch belong to authorized execution. Parallel research/review and creating one worktree do not trigger it.
- **Atomicity vs execution:** assess mixed concerns when needed. A boundary refinement within the same approved outcome is not automatic scope drift; new contracts, risks or scope require alignment.
- **Docs vs execution:** directly coupled docs and plan progress belong to the executor. Broader related documentation uses `refresh-related-docs` without another per-file approval; explicit read-only requests and user exclusions still govern.
- **Inspection vs orchestration:** read-only answers and reviews need no plan files or approval gates unless the user requests such artifacts.

## Companions and availability

A companion adds distinct evidence, not another plan, progress record or review loop. Fold its findings into the current milestone. Only the primary session coordinates delegates; workers do not spawn agents, reviewers remain read-only and files remain stable through each review round. A larger plan supplied as context does not enlarge a worker's assignment.

Route by installed skill name and actual availability, never by source-checkout paths. Dependencies are needed only for the task using them; no personal runtime-role configuration is required. No automatic installations, replacement of missing plugin procedures, or community review chain. If an optional reviewer is unavailable, disclose missing coverage; if independent review is required, report it incomplete. Self-review is useful but is not independent review. Continue safe authorized work unaffected by that missing capability.

Review completion comes from a returned independent assessment of the actual target, not a capability note or an intention to delegate. Keep an unstarted or pending review distinct from a completed one; carry the actual launch/result evidence in the existing checkpoint or inline report, without another tracker.
