# Lessons

Recurring pitfalls in this repository's prompts, skills, plugins and evals themselves. The
following local rules implement D-008's structural-first prevention policy.

- Each entry has a rule, reason, evidence links and an occurrence count.
- When a pitfall recurs, increment its count and add the evidence link; do not duplicate the entry.
- Choose enforcement from ownership/structure, types/boundaries, executable checks, then prose
  for remaining judgment. Prove a new check rejects the actual mistake and accepts valid work.
- Occurrence counts support root-cause analysis; they are not a waiting threshold. A consequential
  first failure may justify prevention, and repeated symptoms may have different causes.
- Review lessons when relevant work or incidents supply evidence. Periodic reviews use the
  consuming project's chosen cadence; this file does not create a scheduled task.

## L-001: Tests must not depend on an untracked evals cache directory

- Rule: Test scratch directories under `evals/.cache/` are created by the test preload (`evals/tests/setup.ts`, wired in `evals/bunfig.toml`); do not rely on a manual `mkdir`.
- Reason: Tests call `mkdtemp` under `evals/.cache/` and failed with `ENOENT` in a fresh checkout, which looked like a plugin-distribution regression but was a local-environment gap.
- Evidence: branch `lachimere/routing-conventions`, local run on 2026-10-13: 2 fail on unmodified `main`, 3 pass after `mkdir -p evals/.cache`; recurred in the PR #12 worktree.
- Occurrences: 2
- Status: resolved by the test preload; a fresh worktree passes `bun run test` without creating the directory.

## L-002: Use hidden-aware search when verifying a rename

- Rule: Check renames with `rg --hidden -g '!.git'` (or `rg -uu`), not plain `rg`.
- Reason: Plain `rg` skips hidden directories such as `.codex-plugin/` and `.claude-plugin/`, so a rename check reported no matches while both workflow manifests still named `working-conventions`.
- Evidence: [PR #11 review, MAJOR-01](https://github.com/LaChimere/agent-coding/pull/11#issuecomment-6142031183); fix commit `7071aaf`.
- Occurrences: 1
- Status: active; enforced by the `manifests reference only existing skills` case in `evals/tests/distribution.test.ts`, which fails when a plugin manifest names a skill (kebab-case or `$skill`) that has no `skills/<name>/SKILL.md` in that plugin. Hidden-aware search is still required for renames outside manifests.

## L-003: A separate Pi agent directory does not isolate shared skill discovery

- Rule: Qualify each discovered skill's source path, not only its name. In an isolated invocation,
  use Pi's explicit `--no-skills --skill` loading of the complete package when automatic user
  skills would collide; preserve sibling shared references.
- Reason: Pi 1.3.0 still discovered `~/.agents/skills` with a separate `PI_CODING_AGENT_DIR` and
  an existing code-review skill shadowed the package's entry. Package registration alone missed it.
- Evidence: `evals/out/engineering-host-checks/pi-commands.json` and
  `pi-isolated-commands.json`; the second native RPC inventory contains all nine intended source paths.
- Occurrences: 1
- Status: addressed in the Pi adapter and host instructions; native provenance checking remains
  required for each installation, and behavior qualification is separate.

## L-004: Project skill creation needs explicit native scope and discovery evidence

- Rule: Declare exact project-skill input files and writable output directories in an evaluation
  case. Prove intended writes and parent denial during native preparation, and verify discovered
  skills against their declared source identities.
- Reason: The first cold-start run fixed and tested the application but could not write its
  protected `.agents/skills` destination. Separately, discovery rejected an explicitly supplied
  maintenance skill. Broadly granting the `.agents` parent would hide the scope error.
- Evidence: Failed run `ba3829a1-2565-4c23-8403-a013f6cbcb79`; independent review snapshot 1;
  `evals/out/project-skill-native-probe/`; regression cases in
  `evals/tests/preparation/native.test.ts` and `evals/tests/corpus/cases.test.ts`.
- Occurrences: 1 acceptance episode, with separate write and discovery failures.
- Status: enforced by strict case parsing, native provenance checks, exact child permissions and
  executable preparation probes. Read-only profiles downgrade every write entry, and fresh-thread
  handoffs retain the original permission profile through the session boundary.

## L-005: Retiring an entry point does not prove its capabilities were preserved

- Rule: Before retiring or merging guidance, map each useful behavior to its new owner and loading
  condition, or record why it conflicts with the accepted approach. Check personal standing policy
  separately from optional skill invocation. Qualify restored methods with relevant cases.
- Reason: The first engineering redesign retained broad principles but dropped communication and
  authority details, personal runtime settings, detailed review briefs and standalone challenges.
  Its initial passing cases did not exercise those omissions. Independent review also caught a
  lost Claude shared-component confirmation boundary during the correction.
- Evidence: Owner's four diff comments and D-009; `docs/engineering/alignment.md`;
  `evals/out/preservation-independent-review/result.json`; configuration/distribution checks and
  the four capability-preservation cases in the active development collection.
- Occurrences: 1 redesign and its correction episode.
- Status: Structural package/configuration checks now protect the declared surface. PR #15 also
  exposed missing coverage for Pi and Grok adapter files; all supported host artifacts are now
  checked, and isolated deletion controls prove those two omissions fail. Personal host policy
  remains allowed. Behavioral cases cover retained methods; acceptance results remain version-bound
  in the implementation record.
