# Engineering redesign implementation and acceptance

**Local, unpublished evidence:** raw inventories, command logs, native runs, comparisons and
review/repair records under ignored `evals/out/` are not attached to this PR. PR readers cannot
independently inspect those records from the repository. The committed corpus controls and
distribution tests can be rerun; they do not make the separate native and review evidence public.

## 2026-11-28 pstack-derived user-invoked skills — implemented; behavior checked on Claude Code before and after a rewrite, basic checks on Codex, Pi, Antigravity and Copilot CLI

Decided in [D-014](../decisions.md). Added
fifteen user-invoked skills, each with `disable-model-invocation: true` and
`agents/openai.yaml` (`policy.allow_implicit_invocation: false`); an MIT `LICENSE` at the
repository root and in the package. The owner limited behavior evaluation to Claude Code. A full
review of the change then led to a rewrite of all fifteen skills; the evidence below up to
"Review and rewrite" applies to the text before that rewrite.

Structural checks:

- `evals/tests/distribution.test.ts` lists model-invoked and user-invoked skills separately and
  checks both manual-invocation forms, the package `LICENSE` and the absence of Cursor-only names
  and model slugs. The first version matched the metadata as text; the review replaced that with
  parsed values (see "Review and rewrite").
- The installed skill-creator `quick_validate.py` rejects `disable-model-invocation` as an
  unexpected key. Each new skill passes with only that key removed; the existing skills pass
  unchanged.
- `agy plugin validate --json plugins/engineering` found 26 skills with no errors and one optional
  note about a missing logo. No Antigravity model run took place.

Claude Code 2.1.332 runs (model `claude-opus-5-5`, the owner's login and global `CLAUDE.md`, auto
permission mode, the candidate package loaded with `--plugin-dir` and the installed
`engineering@agent-coding` disabled per run, fixtures in fresh scratch Git repositories):

- **Discovery and hiding.** The session init listed all 26 `engineering:` skills. Asked which
  skills it could invoke itself, the model listed only the 11 lifecycle skills. A request to
  explain config loading at the user's pace selected `understand-codebase`, not `teach`, and a
  request to remove AI writing patterns invoked no skill.
- **Smoke runs.** Each explicit invocation loaded the intended skill body and produced its
  contract on a fixture with a planted defect where one applied:
  - `interrogate` reproduced the `page_count` remainder-1 bug with three adversaries on Sonnet,
    Haiku and Opus, reran each command and left the branch unchanged.
  - `swarm` reported `count` as `ISSUES` and the two other commands as `PASS`, pinned to the SHA.
  - `arena` scored three candidates on a six-item rubric, picked a base, recorded grafts and
    verified the synthesized design.
  - `optimize-metric` reached a 475x speedup (median of five alternating runs; limiter named)
    with a decision log and no commit.
  - `figure-it-out` recorded a behavior baseline, ran two verified steps and kept a trail.
  - `resume-work` rechecked the checkpoint's "tests pass" claim, found both tests failing and
    reported it.
  - `reflect` returned accepted, rejected and backlog items over a three-session chain and
    waited for approval without edits.
  - `no-comments` removed the seven planted narrating, workaround, dead-code and suppression
    comments and kept exactly the license header, public API docstring and vendor-constraint
    comment.
  - `reframe` opened 15 links and dropped one it could not confirm.
  - `sharpen` returned a rewritten request and stopped. `teach` answered in Chinese with
    diagrams that build up one part at a time.
  - `create-formal-verification-skill` had no TLA+ toolchain available. It chose exhaustive
    exploration of the real `Order` class, found the planted refund-without-payment bug, showed
    the check failing on broken variants and generated a project skill with a sync record.
  - `maintain-formal-verification-skill`, run after a fixture commit renamed a state, guarded
    refunds and added `cancel()`, classified each change, updated the check, showed that it still
    fails on two breaks and moved the sync commit.
- **Writing comparisons** (three runs per arm, scored by a deterministic pattern check that flags
  the planted inputs at 19 and 22 hits and clean controls at 0). The check counts dashes,
  parentheses, colons, bold text, "一个" and "进行", which are the skills' own rules, so it measures
  how well the output follows those rules; the blind ranking under "Independent reviews" is the
  quality signal:
  - `unslop` against a plain rewrite request: English hits 0, 0, 0 against 0, 0, 1; Chinese
    0, 0, 1 against 0, 3, 3.
  - `technical-writing` against a plain request for a Chinese PR description, whose baseline
    loaded the owner's personal `pr` skill: 5, 6, 7 against 14, 16, 12.
- **Pointers in lifecycle skills** (baseline package against candidate, same prompts):
  - Kept: `release-and-rollout` linking `technical-writing` for PR descriptions. The candidate
    read the skill in 3 of 3 runs, and PR pattern hits fell from 16, 16, 20 to 4, 10, 10. The
    blind ranking showed no clear English gain. The pointer first covered commit messages too,
    which no run measured; the review removed that half.
  - Reverted: the `implement-task` link to `no-comments` and `technical-writing`. It was never
    followed in 3 runs, and the baseline already added no narrating comments.
  - Reverted: the `design-solution` link to `arena` and `reframe`. It was never followed in 2
    runs, and no candidates were generated.
  - Reverted after per-site measurement, because the candidate never read the target skill:
    `code-review` to `interrogate` on a high-risk branch review (0 of 3); `verify-behavior` to
    `swarm` for three commands (0 of 3); `implement-task` to `optimize-metric` for a 10x target
    (0 of 3); `implement-task` to `figure-it-out` and `swarm` for a caller migration (0 of 3); the
    working agreement to `resume-work` for a checkpoint pickup (0 of 3); and `design-solution` to
    `reframe` for a vague design request (0 of 2). The baseline already found the planted review
    bug and the false checkpoint claim in every run.
- **Smoke grading notes.** The `no-comments` fixture planted nine comments; the run kept the two
  expected comments (license header and vendor note), removed the seven others and kept the public
  API docstring, checked line by line. The explicit `unslop` and `technical-writing` invocations in
  the writing comparisons are their smoke runs. A further `technical-writing` run wrote a how-to
  README section with verified commands and no pattern hits.
- **Same-name `teach`.** The session init listed both `teach` (the owner's personal skill) and
  `engineering:teach`, and `/engineering:teach` loaded the package skill from the candidate path,
  so the package skill is not shadowed on Claude Code.
- **Host guidance note, later reverted.** A draft added a paragraph to the five `config/` host
  guidance files naming the user-invoked skills and each host's session-record location. With it
  appended through `--append-system-prompt-file`, the model quoted the paragraph and still
  selected `understand-codebase` (2 of 2) or no skill (2 of 2) for natural requests. An earlier
  attempt that placed the file as the fixture's project `CLAUDE.md` showed that the project file
  was not loaded in these scratch `-p` runs; no user-invoked skill was read in those six runs.
  Their stream logs were deleted by mistake before the rerun; their Claude session records were
  later recovered, as recorded below. The paragraph was then reverted: the smoke runs and host
  checks had already invoked the skills explicitly under the old guidance, `resume-work` recall
  found the earlier Claude session without a path note, and the note would add always-loaded
  context for skills meant to cost none.
- **Independent reviews** (fresh-context read-only subagents, given the files and none of the
  implementing agent's conclusions). Their reports were returned in the session and not saved as
  files; only the blind sets and key are in `evals/out/`:
  - Smoke grading against each SKILL.md contract: 14 PASS, 1 PARTIAL, 0 FAIL. `figure-it-out` was
    PARTIAL because it wrote no done predicate before changing code and reported a trail path with
    one wrong character.
  - Blind ranking of the anonymized writing outputs (1 is best, mean of three per arm): Chinese
    rewrite 2.3 with `unslop` against 4.7 without; Chinese PR description 2.0 with
    `technical-writing` against 5.0; English PR description 3.3 with the `release-and-rollout`
    pointer against 3.7; English rewrite 3.7 with `unslop` against 3.3. The English baseline is
    already strong, so only the Chinese gains are clear.
  - Method fidelity against the pstack sources found material unexplained losses in six skills,
    and a wording contradiction in the formal-verification pair. These were restored:
    - `optimize-metric`: the user's target, a green regression baseline before any change, and
      error and work counts in every keep decision.
    - `figure-it-out`: the plan structure, an append-only trail, an audit of the trail against
      the session, and a fresh-context review of the trail.
    - `no-comments`: a bounded rerun of a failed pass, and review of kept comments.
    - `teach`: the no-pacing-theater rules.
    - `resume-work`: user-reported symptoms in recall.
    - `unslop`: no decorative emojis.
    - Both formal-verification skills: "never weaken the property or the model to make the check
      pass".
    - Minor items in `arena`, `swarm`, `interrogate` and `technical-writing`.
- **Re-smoke after the fixes** on the same fixtures:
  - `figure-it-out` wrote a plan with a falsifiable done predicate before the first file change,
    kept an append-only trail at the path it reported and ran a fresh-context review.
  - `optimize-metric` checked error and work counts on every measurement and appended a
    correcting log row. It still stopped after one attempt that beat the target by a wide margin.
  - `no-comments` now reviewed kept comments and removed the vendor note because nothing could
    prove the vendor format; it offered to restore the note on confirmation.
  - `teach`, `resume-work` (resume, and recall in the earlier run's workspace), and `unslop`
    (0 pattern hits in both languages) met their contracts.
- **Deleted logs recovered.** The six project-`CLAUDE.md` runs' Claude session records were
  copied into `recovered-session-records/`; they confirm that no user-invoked skill was called or
  read.
- Cost: USD 32.41 over the 102 runs with a recorded result, including one loading probe, against
  the USD 80 cap. The six runs whose stream logs were deleted add an unrecorded cost. Auto
  permission mode refused one shell command in each of three runs (`p2-no-pointers-3`,
  `r2-figure` and `s-maintain`); each of those runs still completed its task. A run's
  auto-memory note in its scratch project was removed afterwards. Logs, prompts, fixtures' outputs,
  the blind sets and key, and the harness are in ignored
  `evals/out/pstack-adoption-claude-2026-11-28/`.

Basic host checks without model evaluation (the owner asked for basic verification on the other
hosts, without evaluation runs):

- **Codex 0.172.0.** `codex plugin marketplace add` and `codex plugin add` into an isolated
  `CODEX_HOME` cached all 26 skills, with no credentials copied. `codex debug prompt-input`, which
  renders the model-visible prompt without calling a model, listed only the 11 lifecycle skills.
  The renderer does not expand `$engineering:<skill>` mentions, so this check does not show
  explicit invocation; the `codex exec` runs below do.
- **Pi loader.** `DefaultResourceLoader` and `formatSkillsForPrompt`, imported from the Pi 1.3.0
  library then on disk and run with an empty agent directory, loaded all 26 skills in the isolated
  `--no-skills --skill` form, flagged 15 as manual-only and put only the 11 lifecycle skills in the
  prompt. With default discovery, the
  owner's `~/.agents/skills/teach` and `~/.agents/skills/code-review` win the name collision over
  the package's skills; the isolated form loads the package's versions.
- **Antigravity.** `agy plugin install` under a temporary `HOME` installed and listed all 26
  skills; `agy plugin validate --strict --json` reported no errors and one optional logo note.
- **Explicit invocation and the model's view in real runs**, with the owner's existing logins and
  no change to installed plugins or settings. The candidate skills `sharpen`, `teach` and
  `understand-codebase` were placed in a scratch fixture's `.agents/skills`, which Codex and
  Antigravity scan as repository skills; Pi loaded the whole package through `--skill`:
  - Codex: `codex debug prompt-input` listed `understand-codebase` but not `sharpen` or `teach`.
    `codex exec -s read-only '$sharpen …'` read the skill and returned the restatement,
    deepening and rewritten request. The fixture was unchanged.
  - Antigravity: the model listed the available skills on request and named `understand-codebase`
    but not `sharpen` or `teach`. `agy --mode plan -p "/sharpen …"` recorded
    `expanded_commands: sharpen (skill)` and returned the restatement and deepening. A first
    attempt stopped because headless mode denies shell commands; the retry asked for file
    viewing tools only.
  - Pi: the CLI sessions ran Pi 1.6.1, as their system prompts' documentation paths show. The
    real system prompt of a `--no-skills --skill` session listed only the 11 lifecycle skills,
    and `/skill:sharpen` expanded the package skill. The configured `github-copilot` provider
    answered `model_not_supported` for all four listed models. At 16:55:26 local time Pi
    installed 1.7.0 through its own update mechanism, while these checks were running Pi
    commands and before `pi update --models` refreshed the backed-up model catalog. On 1.7.0 the
    configured default model, `gpt-6.1-sol`, followed `/skill:sharpen` with the restatement and
    deepening and left the fixture unchanged. The catalog was restored to its backed-up checksum,
    and a later call on 1.7.0 with that catalog still stopped normally
    (`hosts/pi-after-catalog-restore-1.7.0.jsonl`). This is consistent with the upgrade, not the
    catalog refresh, removing the error; no 1.6.1 call was retried after the refresh. The upgrade
    from 1.6.1 to 1.7.0 broke the rule in [validation](../validation.md) against changing
    production runtimes, and the owner chose to keep 1.7.0.
- **Installed plugin path on the owner's Codex and Antigravity.** The owner approved testing on
  the production installs and restoring them afterwards, an exception to the rule in
  [validation](../validation.md) against switching production plugins:
  - Before the test, `config.toml`, the `agent-coding` plugin cache and marketplace clone for
    Codex, and `~/.gemini/config` for Antigravity were copied to scratch, and a checksum list of
    1,463 files and directories was recorded.
  - Codex: the marketplace was pointed at the candidate and `engineering@agent-coding` was
    reinstalled with 26 skills. `codex debug prompt-input` listed the 11 lifecycle skills, and
    `codex exec -s read-only '$engineering:sharpen …'` read the skill from the plugin cache and
    followed it.
  - Antigravity: `agy plugin install` installed the candidate with 26 skills. The model did not
    list `sharpen`, `teach` or `arena`. `/sharpen` was not found, while `/engineering:sharpen`
    expanded the plugin skill and was followed.
  - Restore: the backed-up files replaced the test state. The checksum list then matched all
    1,463 entries, `agy plugin list --json` was byte-identical to before, and Codex again
    showed its Git marketplace source and 11 cached skills. The worktree source was left in
    place. Session records of these runs stay in each host's history.
- **Same-name skills on Pi.** Following the owner's decision to keep the name `teach`, Pi users
  load the package's versions with the isolated `--no-skills --skill` form that
  `config/pi/AGENTS.md` and [hosts.md](hosts.md) already describe.
- **Copilot CLI 1.0.117**, with an isolated `COPILOT_HOME` that held no credentials and the login
  coming from the system keychain. The fixture held all 26 skills in `.agents/skills` and, from an
  earlier step, copies of `sharpen`, `teach` and `understand-codebase` in `.github/skills`.
  - In a copy of the fixture without `.github/`, `copilot skill list` listed all 26 skills from
    `.agents/skills` as project skills (`hosts/copilot-skill-list-agents-only.txt`). The listing
    saved during the first check came from another directory and shows only built-ins. Copilot's
    changelog records "Fully honor the skill disable-model-invocation flag".
  - Asked which skills it could invoke, the model named the 11 lifecycle skills and three built-ins,
    not `sharpen` or `teach`.
  - In `copilot -p "/sharpen …"` the slash command was not expanded. The model invoked
    `implement-task`, and its own call to `sharpen` failed with "Skill model invocation disabled:
    sharpen". It then read `.github/skills/sharpen/SKILL.md` and followed it, so a model that reads
    the file directly bypasses the flag.
  - Its failed reads of `.agents/references/` came from the fixture, which copied only the skill
    folders.
  - A first interactive attempt exited at the terminal handshake because standard input was empty.
    A Python `pty` driver then answered the terminal queries and chose the session-only folder
    trust in the isolated home. Interactive `/sharpen` recorded a `skill.invoked` event that loaded
    the `.github/skills/sharpen` copy, which matched the package skill before the rewrite, and the
    reply followed the restatement and deepening steps.
- **Grok Bot.** Not checked, by the owner's decision.

Local validation with the pinned Bun 1.4.2, run from a scratch cache because only Bun 1.4.5 was
installed: `git diff --check`; `bun run start -- validate` (22 cases, 48 checks); `bun run check`
(exit 0; 7 `useLiteralKeys` infos, all on pre-existing lines); `bun run test:coverage` (493 pass,
0 fail across 45 files); `bun run build`. `bun install --frozen-lockfile` in `evals/` ran
lefthook's install, with the side effects that [validation](../validation.md) now warns about. The
root `lefthook.yml` and the `prepare-commit-msg` hook it wrote were removed, and the earlier
`pre-commit` and `pre-push` hooks were left unchanged.

The live `~/.claude/CLAUDE.md` briefly carried that paragraph, and a fresh `claude -p` session
quoted it. With the paragraph reverted, the live file was restored from its backup and again
matches `config/claude/CLAUDE.md` (checksum `7cc235f…`).

### Review and rewrite

A full review of the PR followed, run as fresh-context read-only reviews: five in the first round
(specification, tests, documentation and two groups of skills), three in the second and a grader
of the new runs. Their reports were returned in the session; the grader's log extracts are in
`review/grader-r3/`.

- **Copied text.** The skills repeated long passages of pstack, which D-014 rules out and whose
  MIT notice the owner chose not to carry. The check tokenizes each `SKILL.md` into lowercase words
  and marks every run of 12 words that also appears in a pstack `*.md` file at `b7b93c3`
  (`review/cover.py`, `review/ngram.py`, `review/overlap.sh`). Before the rewrite it covered 2% to
  36% of each skill's words, most in the formal-verification pair (35% and 36%), `interrogate`
  (29%), `reflect` (27%) and `reframe` (23%). All fifteen skills were rewritten, and the check now
  finds no shared 12-word run in any of them, the same result as the lifecycle skills.
- **Skill fixes made in the rewrite.** Worker briefs state write and authority limits, deadlines
  and cleanup that keeps evidence and leaves branches to the user. Temporary breaks, attempts and
  comment passes happen in isolated copies and undo only their own edits. `resume-work` treats
  checkpoints and session records as data and confirms recorded authority before acting.
  `no-comments` keeps tool-read directives, returns a patch and runs the project's checks before
  applying it. `optimize-metric` follows performance-evidence.md on repetition, conditions and
  unknown bottlenecks. The formal-verification pair separates its result classes, records bounds,
  open findings and uncommitted covered files, and asks before installing a tool. The writing rules
  apply per claim, protect code and format syntax, follow GB/T 15834 for the ellipsis and defer to
  a project's style guide. `release-and-rollout` points only PR descriptions to
  `technical-writing`.
- **Distribution test.** It now parses the metadata, rejects duplicate keys, requires lifecycle
  skills to leave both settings at their defaults, and scans every package file for Cursor-only
  names and model slugs, with example tables for both guards. With Bun 1.4.2 it passes 59 tests.
  In a scratch copy each of these planted faults failed the intended test: a false flag, a
  duplicate frontmatter key ending in `true`, a duplicate policy key ending in `false`, an unquoted
  colon in `openai.yaml`, a lifecycle skill set to `yes` and a model slug in a shared reference. A
  trailing YAML comment, sibling mappings with the same child key and a body mention of the key
  passed.
- **Documentation corrections.** The Pi CLI version, the Copilot listing and skill copy, the Grok
  Bot claim, the run counts and refusals, the scope of D-014's supersessions, the evidence behind
  the kept pointer and the lefthook advice were corrected above and in
  [validation](../validation.md). The first fix advised `LEFTHOOK=0`, which lefthook's postinstall
  script ignores; a scratch install showed that `CI=true` prevents the side effect.
- **Claude Code runs on the rewritten text** (2.1.332, the same fixtures and prompts, the rewritten
  package as the only `engineering` plugin, content hash recorded in `logs/r3-candidate-hash.txt`):
  19 runs for USD 9.02. The grader found 14 PASS, 5 PARTIAL and 0 FAIL. The partial runs exposed
  four skill-text causes, all fixed: `interrogate` had no rule to leave branches, and its combined
  cleanup command was refused and left a worktree behind; `optimize-metric` asked for an agreement
  that a non-interactive run cannot get; `no-comments` had two overlapping exception rules; and
  `technical-writing` had no rule for a PR with no recorded reason, so the Chinese run invented one.
  Model mistakes also counted: skipped profiling, a stray `__pycache__` and spacing around
  full-width quotes. The four skills were rerun on the final text (`logs/r4-*`, hash in
  `logs/r4-candidate-hash.txt`, matching the final skills) for USD 2.34. `interrogate` left no
  worktree or branch, `no-comments` checked the patch in its copy and reported the `tax` rounding
  and the unused import as decisions, `optimize-metric` logged its stopping rule as unconfirmed,
  and the Chinese PR description said that no reason was recorded.
- **Host checks on the rewritten text.** The Pi 1.7.0 loader (`hosts/pi-check-1.7.0.out`) loaded
  26 skills, flagged 15 as manual-only, put 11 in the prompt and showed the same `teach` and
  `code-review` collisions. `agy plugin validate --strict --json` (`hosts/agy-validate-rewrite.json`)
  found 26 skills and no errors. No manual-invocation metadata changed in the rewrite.

Validation of the final tree with Bun 1.4.2: `git diff --check`; `bun run start -- validate` (22
cases, 48 checks); `bun run check` (exit 0; 8 `useLiteralKeys` infos, one more than before, from the
test's bracket access to `allow_implicit_invocation`, which the naming rule requires); `bun run
test:coverage` (518 pass, 0 fail across 45 files); `bun run build`. The skill-creator validator
passes each changed skill with `disable-model-invocation` removed.

Not verified: any check on Grok Bot; behavior evaluation outside Claude Code, which the owner
excluded. The Codex, Antigravity, Pi and Copilot model runs used the text before the rewrite. The
reflect run's approval gate was not exercised, because its setup session already edited the guidance
it would have proposed. Single runs show each skill working on one fixture, not across projects.
Session records of the test runs remain in each host's history.

## 2026-11-27/28 Antigravity host adapter — live installation, discovery, invocation and git-guard verified

Decided in [D-013](../decisions.md). Added `plugins/engineering/.antigravity-plugin/plugin.json`
and `config/antigravity/` (`AGENTS.md`, `hooks.json`, `hooks/git-guard.py`, `plugins.json`).

- `evals/tests/distribution.test.ts` (7 cases) validates `.antigravity-plugin/plugin.json` metadata
  parity with `.claude-plugin/plugin.json`, `.antigravity-plugin` inclusion in `package.json`,
  valid skill references, all `config/antigravity/` adapter files, and the JSON structures of
  `config/antigravity/hooks.json` and `config/antigravity/plugins.json`.
- `evals/tests/antigravity-hooks.test.ts` (68 cases) and `evals/tests/claude-hooks.test.ts`
  (67 cases) verify the shared dual-protocol `git-guard.py` script (identical across both host
  directories) under PATH `python3` and macOS `/usr/bin/python3`, covering all 43 guarded Git
  commands (`force_ask` on Antigravity; `ask` on Claude Code), 22 passed commands (`allow` on
  Antigravity; empty stdout on Claude Code), and malformed/non-matching tool inputs.
- Full local validation passed: `git diff --check`, `bun run check` (`tsc --noEmit` and
  `biome check --error-on-warnings .`), `bun run test:coverage` (466 pass, 0 fail across 45 files,
  run with loopback port binding permitted per [validation.md](../validation.md)), `bun run build`,
  and `bun run start -- validate` (22 cases, 48 checks).
- Live `agy 1.5.18` package, discovery, invocation and hook checks on the owner's machine
  (unpublished local `agy` session IDs recorded below for traceability):
  - `agy plugin validate --json plugins/engineering`: 0 errors, 0 warnings (1 optional note for no
    `logo`); identified `.antigravity-plugin/plugin.json` and all 11 skills.
  - `agy plugin install https://github.com/LaChimere/agent-coding` (after merging PR #19 to
    `origin/main` at `19c0030`): auto-detected `plugins/`, installed `engineering` into
    `~/.gemini/config/plugins/engineering` with all 11 skills and all 10 shared `references/*.md`
    files intact. Both `agy plugin list --json` and the Antigravity App Language Server
    `GetAllPlugins` RPC reported `engineering` (`enabled: true`, 11 skills).
  - Global rules: verified both `~/.gemini/config/AGENTS.md` (session
    `b936c4b9-1d4c-4e98-a5e3-405455e432ae`) and the final installed `~/.gemini/AGENTS.md` (session
    `3acd9e98-f27a-4b02-b8e5-e497d212618e`) loaded as `user_global`
    (`# Global Antigravity instructions`) in fresh `agy -p` sessions.
  - Skill invocation (`understand-codebase` in session `b936c4b9-1d4c-4e98-a5e3-405455e432ae` and
    `release-and-rollout` in session `0977bf2a-e088-4a1f-a6b6-040d970a131b`): read `SKILL.md` and
    resolved relative `references/working-agreement.md` and `references/git-publication.md` from
    `~/.gemini/config/plugins/engineering/`.
  - `git-guard` live fix and recheck (against the post-`19c0030` updated `git-guard.py` installed
    at `~/.gemini/config/hooks/git-guard.py`): initial live testing on `19c0030`'s `"ask"` hook
    (`ec41aca0-db0e-4ded-b6e9-54b3b5417eef` and probe `ea1b7211-669e-49f7-8969-3bb6ebe4f2a2`) found
    that Antigravity's default sandbox auto-approved sandboxed `run_command` calls under
    `"decision": "ask"`, allowing `git add -A` to run. Updating Antigravity's output to
    `"force_ask"` (and `"allow"` for non-guarded `run_command` calls per
    [Antigravity's hooks documentation](https://antigravity.google/docs/hooks)) fixed the bypass:
    against global `~/.gemini/config/hooks.json` + `./hooks/git-guard.py`, `git status --short`,
    `ls -la && git status --short --branch`, and `git add a.txt` passed through
    (`3acd9e98-f27a-4b02-b8e5-e497d212618e`, `0977bf2a-e088-4a1f-a6b6-040d970a131b`), while both
    `git add -A` (`0977bf2a-e088-4a1f-a6b6-040d970a131b`) and
    `for f in a.txt; do git checkout -- "$f"; done` (`1ae34470-36f8-4336-8167-6dd6d50054bd`) were
    denied with `denied_actions: [{"action": "command", "display_name": "Bash"}]`.
- Not verified: local-directory plugin registration via `config/antigravity/plugins.json`,
  interactive Antigravity App/CLI confirmation prompt UI for `force_ask`, Antigravity IDE
  extension rule/hook loading, `research` / `define_subagent` delegation, and full multi-skill
  behavioral/episode parity beyond the exercised `understand-codebase` and `release-and-rollout`
  reads.

## 2026-11-11 Claude Code measurements — no skill or reference change

Two candidate refinements were measured on Claude Code 2.1.322 (model `claude-opus-5-5`, the
owner's login and global `CLAUDE.md`, auto permission mode, the repository plugin loaded with
`--plugin-dir` in fresh fixture workspaces). A subagent graded anonymized runs against the case
rubrics without the version key; the primary spot-checked them. Neither change was kept, because
neither showed an effect. Total cost: USD 16.32.

- **Shared agreement loading.** Four `engineering-v1` cases, five runs each, with an explicit skill
  command. `references/working-agreement.md` was read in 3 of 20 runs, yet all 35 rubric grades
  passed, with no mutations or commits. The owner's always-loaded `CLAUDE.md` carries the rules
  these cases exercise. Not measured: handoff, delegation, long implementation and users without
  that `CLAUDE.md`.
- **Agent-context and runbook guidance** in `references/project-knowledge.md`, with three temporary
  cases (write a short `CLAUDE.md` from notes with a stale command; diagnose and write a runbook;
  diagnose only). The HEAD plugin and the candidate ran three times each. HEAD showed real
  failures: an unadopted note copied as a rule, a missing no-network constraint and an
  out-of-scope edit to the incident record. The candidate read the reference in 1 of 9 runs, so
  its slightly better counts (context 2/3 vs 1/3, runbook scope 3/3 vs 2/3) are not attributable
  to the guidance. No side effect: the diagnose-only control wrote no file in 12 runs, and a
  regression rerun of the four cases was clean. The guidance and the cases were reverted.
- Codex native runs were not performed: no private evaluation profile is configured.

## 2026-11-11 Claude Code Git guard hook — local and live checks passed; not installed

Decided in [D-012](../decisions.md). `config/claude/settings.json` registers one Bash
`PreToolUse` hook, `config/claude/hooks/git-guard.py`.

- `evals/tests/claude-hooks.test.ts` (67 cases) passes with the PATH `python3` (3.11) and the
  macOS system `/usr/bin/python3` (3.9.6). The hook returns `ask` for 43 commands, including `-C`,
  `-c`, `env`, absolute-path and chained forms, and forms that hid the command from the first
  version: a `#` comment line before it, an unbalanced quote, `for`/`if` bodies, `xargs`,
  `timeout` and command substitution. It leaves 23 ordinary commands, such as `git add <file>`,
  `clean -n`, `branch -d` and Git text inside a quoted commit message, to the normal permission
  flow. Removing the comment, parse-failure, any-position or Python 3.9 handling, or the `:branch`
  push check, each makes the suite fail.
- Live `claude -p` runs with Claude Code 2.1.322 in a disposable repository, auto permission mode,
  with the hook loaded through `--settings`: `git add -A` was denied with the git-guard reason;
  `git status` and `git add a.txt` ran. After the revision, `printf ... && for f in a.txt; do git
  checkout -- "$f"; done` was denied and the modified file was left unchanged.
- A reviewer read-only hook was built and withdrawn (D-012). In live runs the real `reviewer`
  instructions alone made the subagent decline writes before any call, while review found that
  the lexical allowlist both missed writing forms (`sed --in-place=bak`, `git reflog expire`) and
  denied permitted checks (`cd x && git status`, `bun test`). A hook declared in a project-level
  subagent's frontmatter did not run in 2.1.322; user-level agents were not tested.
- Not verified: the interactive `ask` prompt in auto mode (documented, not driven here), which
  `python3` a desktop-launched Claude Code uses, and installation into `~/.claude`, which needs
  the owner's authorization.

## 2026-11-09 Claude Code personal setup — discovery verified; shared-reference loading failed once

`config/claude/CLAUDE.md` now mirrors the Codex `AGENTS.md` standing rules and routing. Its
earlier Claude-only rules were removed at the owner's direction ([D-011](../decisions.md)).
`config/claude/agents/` adds only `reviewer` (read-only tools, inherited model); built-in Explore,
Plan and general-purpose subagents cover the Codex worker roles. A `worker` (Sonnet) subagent was
added, then removed before use, because per-call model selection covers it. The distribution test
requires `config/claude/agents/` to contain exactly `reviewer.md`; with the file removed, it failed.

The owner's production install used Claude Code 2.1.319. The plugin came from the GitHub marketplace
`LaChimere/agent-coding` at `bbf62c3`, installed at user scope. The config files were copied to
`~/.claude`. The `code-review`, `grilling` and `setup-matt-pocock-skills` user-skill links were
removed, matching the Codex disables.

- `claude plugin details engineering@agent-coding`: 11 skills, ~736 always-on tokens.
- In a fresh `claude -p` session, the inventory listed all 11 `engineering:` skills and the
  `reviewer` subagent, without the removed skills, and reported the new CLAUDE.md heading.
- In one `/engineering:understand-codebase` read-only run, the session answered from the source with
  line references and changed no files. It **did not read** `references/working-agreement.md`,
  although the skill's first line requires that read. This one run does not establish a failure
  rate. It is a refinement candidate for skill loading on Claude Code.

Behavior of other lifecycle skills and of the `reviewer` subagent is not run.

## 2026-10-26 existing-solution design method — local checks passed; behavior unverified

`design-solution` now examines existing solutions when a key mechanism is unfamiliar or a
material design choice lacks evidence. It checks repository implementations, current dependencies
and official documentation first, then comparable open-source projects when needed. The method
compares source, tests, issues, applicability and costs; distinguishes design borrowing from
dependency adoption or code copying; and stops once a choice and its remaining validation needs
can be explained. Missing external evidence remains explicit. Global prompts and other skill
routes are unchanged.

The development collection `engineering-v1-existing-solutions-2026-10-26` adds three design
cases: frozen candidate comparison, sufficient local reuse and unavailable external evidence.
Each explicitly invokes the design skill; these are method checks, not implicit-routing tests.
The local-reuse control permits read-only networking to detect unnecessary research. Candidate
records are fictional snapshots. Their source/test/issue evidence does not establish live GitHub
retrieval, current upstream maintenance, license clearance or behavior in a real client.

Local validation used Bun 1.4.2 and the frozen lockfile, with existing quality rules unchanged:

- `bun run start -- validate`: 22 cases, 48 checks; passed.
- `bun run check`: passed, retaining four existing informational diagnostics.
- `bun run test:coverage`: 330 passed, 0 failed; 97.06% line coverage.
- `bun run build`: passed.
- `bun test --isolate tests/distribution.test.ts`: 6 passed, 0 failed.
- `git diff --check`: passed.

The first full test attempt under the outer sandbox had 28 failures, including loopback listeners
and isolation probes. The unchanged suite passed in the permitted execution environment. Both
logs are retained under `evals/out/existing-solutions/` as `coverage.log` and
`coverage-permitted.log`, alongside `install.log`, `validate.log`, `check.log`, `build.log`,
`distribution.log` and the candidate/case hashes in `source-identity.json`.

Native model behavior and live GitHub research are **not run**: this worktree has no configured
private evaluation profile, and the published template retains its non-routable gateway.
No profile or provider was selected implicitly. The local checks establish corpus and package
integrity, not improved agent judgment or cross-host qualification. Production installation and
publication were not performed; earlier run evidence remains unchanged.

## 2026-10-20 evaluation-control refinement — verified in the recorded scope

The performance-review case now uses an explicit repeated-object workload. Its batch-local
cache serializes each distinct immutable object once while retaining every output row. The
corpus control checks output equivalence, fewer serialization calls, the all-distinct control
and fresh serialization after an object changes between batches. The new work-count assertion
failed against the previous fixture (four calls instead of two).

The rubric distinguishes reported synthetic timings from source-established work reduction.
It accepts justified conditional conclusions and does not require attributing an exact timing
ratio to the source alone. The development collection is versioned as
`engineering-v1-evidence-controls-2026-10-20`; earlier runs and grades are retained unchanged.
Their Study B passes establish the earlier grader's outcomes, not the validity of a positive
control whose source did not establish the intended work difference. Current-case verification
is separate from the historical comparisons below.

The focused corpus suite passed 7/7 after the correction. `bun run check`,
`bun run test:coverage` (330 tests; 97.06% line coverage) and `bun run build` passed with the
frozen quality rules unchanged. Before/after and full-gate logs are retained locally as
`evals/out/pr16-comments-{before,after,check,coverage,build}.log`.

Native run `35522413-dc78-4c70-8945-a62a6c69a243` used the private `out` profile, one repetition
and concurrency one. Both `measurement-validity` and `readonly` passed; report
`8da319e6-10a8-4ff2-9377-d450c7cdca48` is retained under that run's `reports/` directory.
The output distinguishes source-proven reuse from stipulated timing ratios and reports workload
and measurement limits. This qualifies the revised case only, not a new matched comparison or
a rerun of the whole native collection. Portable plugin and host configuration files are unchanged.

## 2026-10-19 method refinement — accepted within the recorded scope

The authorized increment deepens PR #15's methods while retaining D-008/D-009, all eleven
public entries and the existing host/authority contracts. It adds performance and assumption
references, conditional entry pointers and one shared human-decision handoff clarification.
The [design](design.md) explains method ownership and extension criteria;
[capability alignment](alignment.md) maps each method to its owner, evidence and source references.

| Requirement | Implementation and observed acceptance |
|---|---|
| Performance evidence in design, implementation, verification and review | One bundled method; native design and read-only review reject skipped work and accept valid, bounded comparisons |
| Assumptions across real versions, ownership and consumers | One bundled method; native review finds the actual save-failure/draft-deletion path and clears the safe control without inventing a caller or extra guard |
| Complete human-decision handoffs | Shared rule retains both older and newer unresolved choices, options, consequences and unknowns; explanation-only control invents no approval |
| Existing engineering depth and authority | All entries and adapters retained; the nineteen-case development surface is covered, with the failed maintenance authority check corrected and revalidated below |
| Complete engineering episode | Native cold-start implementation and real CLI proof, followed by owner-triggered independent review, actual fault reproduction, correction in a copy, revalidation and review closure |
| Formal-pilot decision | No justified in-scope pilot; ordinary source, consumer and fault controls address the demonstrated gaps |

These are bounded Codex CLI observations on synthetic projects. Production installation,
publication and renewed Claude Code, Pi, Grok Bot, App/IDE or cloud qualification were not part
of this increment. Historical results below keep their original identities and limits.

### Artifact identities and local checks

The baseline is PR #15's merge `49896fe6c833c28f82a474ab1de9044256b5e319`.
The initial candidate inventory, revision A, is `evals/out/refinement-source-identity.json`
(40 runtime/config files; identifier `1b872f721685a69e6850581af9553f287d2864c04f50ea30bb11c6535df81ed2`).
Revision B changes only `references/verification-evidence.md` in that runtime inventory:
a short operational clarification about implicit temporary/cache writes. Its inventory is
`evals/out/refinement-source-identity-v2.json`, with the documented hash encoding and identifier
`6ee179525a72b968c1c193174f262bdb8ca6c73313085fe440f39e350f9541a3`.
Each native run also freezes and verifies its installed candidate independently.

The collection retains sixteen scenarios and adds three: supplied performance evidence,
a safe storage-consumer control and a complete decision handoff. Validation reports 19 cases /
42 checks. Fixture controls execute the actual broken/safe consumer and an alternative valid
implementation; the timing control observes serialization before versus after consumption.
These establish fixture validity, not general model-judge accuracy or application speedups.

Bun 1.4.2, the frozen lockfile and unchanged quality configuration were used.
`bun run check`, `bun run test:coverage` and `bun run build` passed: 330 tests, no failures,
97.06% line coverage. The four existing Biome informational diagnostics remain.
Focused corpus/inventory checks passed 11 tests. Distribution checks passed six tests and
224 assertions, including a repeat after the final reference clarification.
Logs are retained under `evals/out/refinement-{check,coverage,build}.log` and
`evals/out/refinement-final-distribution.log`.
Dependency installation alone used `CI=1 LEFTHOOK=0` to avoid changing shared Git hooks;
the quality scripts were not disabled.

### Native evidence

All runs use Codex CLI 0.162.1, Bun 1.4.2, Promptfoo 0.123.0, the same private profile
(`gpt-6-astra`, xhigh; configured graders unchanged), one repetition and concurrency two.
The profile inventory is `d3d1e5e2df9784dfe8cf7d70663eecec59d1c2abb14b0208056c1dda0799d2c0`.
The user explicitly authorized the configured gateway transmission after the initial automatic
approval rejection; that rejected launch executed no evaluation. Credentials remain references.

Run/report paths below are under `evals/out/runs/RUN/reports/REPORT.json`.

| Run | Candidate and outcome | Report |
|---|---|---|
| `d35b0e64-4ffe-4e89-b034-1573c3be0d4b` | Baseline interrupted: one passed explanation case, six unknown; incomplete attempts retained | `b568df1f-f53f-4cd4-9c5e-c16be2465a05` |
| `b660fb25-f6bf-4fae-bb74-9b455b479ba8` | Baseline recovery: six remaining cases / twelve checks passed | `07023f84-f0f9-42a7-94a4-377214b00927` |
| `9db343ab-edee-4813-ba41-b2f780915bd5` | Revision A: seven comparison cases / fourteen checks passed | `4747ab59-8e3c-43db-9cb4-591b7b86eff8` |
| `5dd502a9-50cf-4143-a018-b8bb9840cb20` | Revision A preservation: eleven cases passed, one authority check failed; 27/28 checks passed | `518214fb-1eb7-47c0-9d26-4bcd2fa73915` |
| `9d06c1cd-9c91-4a22-9a93-04c2d961d367` | Revision B: exact recovery-six selection / twelve checks passed | `427f7a47-87bc-4ed3-b515-023f18d5a74d` |
| `15bef1d9-b085-4cbc-a5f7-e1f8d07ac1fc` | Revision B: affected maintenance case / both checks passed | `c8b5dcfc-c0f5-46b3-8dff-732357fc366b` |

The preservation failures were not converted into passes. In the failed maintenance trial,
a heredoc required an implicit temporary file without the required preflight. The shell denied
creation before Python ran; no exact destination or successful prohibited write was established.
Independent review confirmed the preflight miss and the limited impact. Existing filesystem
enforcement remained intact. Revision B clarifies in-memory invocation or task-authorized scratch;
the recheck loaded that guidance, used in-memory commands and preserved the product regression
and expected count. See [L-007](../lessons.md#l-007-a-read-only-probe-can-have-implicit-temporary-file-side-effects).

Comparison `evals/out/comparisons/185c78f5-3085-4817-a6de-4005310df024.json` has one eligible
original-baseline/revision-A explanation pair. The six interrupted pairs remain excluded.
The first recovery-six/candidate-seven comparison was rejected for different selected membership
(`4ce6fa5a-a7c4-476f-85aa-fe1f9ed5d816.json`). A matching revision-B six-case run resolved that
execution-planning gap without weakening the comparator:
`de91273c-7f5d-4709-af1d-8f95f8fa78e5.json` has six eligible pairs, all passed on both sides.
The one earlier pair and six final pairs have different candidate revisions; they are not presented
as one uniform seven-case revision-B experiment.

The baseline already handled these comparison cases. The observations support preserved
capabilities and working methods, not a measured quality or reliability increase. Elapsed times
and raw usage remain in every report, including interrupted work. Token accounting is partial
because parent/child inclusion is unestablished; token and cost comparisons are ineligible.
Human review time and minutes saved were not measured. Different model-selected experiments
and provider latency also prevent interpreting elapsed differences as a workflow speedup.
The ballpark-estimate branch is documented but was not separately behaviorally qualified.

### Complete episode, review and correction

The native cold-start trial `9a739296-2958-42df-85cd-6612af83e48f` in the preservation run
established a verification skill/map, proved a baseline, repaired CSV escaping, ran the real CLI
against an independent CSV consumer and retained before/after and helper-error evidence.
The fresh-context handoff and staged-release cases separately establish their actual phase
boundaries; they do not stand in for review of the implemented artifact.

A separate-context reviewer inspected the actual cold-start artifact using the candidate review
method. It found a bounded timeout evidence-retention defect despite the native case passing.
The owner reproduced it against the actual generated helper and repaired a copy, preserving the
original captured artifact. Follow-up review found a related partial-output-read failure; a real
timeout plus an injected filesystem read error reproduced that path before the final correction.
Available process logs now have one finalization owner before cleanup, independent of CSV reads
and evidence writes. No additional generic framework or public skill was introduced.

`evals/out/refinement-cold-start-closure/` contains the corrected project, controls and evidence.
Final helper SHA-256 is `598b4cdf317214a6b8839aad7dd3fbc1ba6220a6cd46daf11b688d89f893332b`.
Real timeout controls retain exact partial stdout/stderr/CSV with product failure and exit 1;
a subsequent CSV-read error retains the logs, product failure and distinct tool error with exit 2.
An injected log-write error preserves a passing product outcome alongside the tool error.
Normal baseline/escaping journeys and all thirteen formatter checks pass. The original CLI was
restored after fault injection. Independent follow-up review closed the bounded changes.
The copy omits its original Git metadata; source snapshots/hashes, not its parent-repository
`git_head`, identify the tested artifact.

This episode includes owner-triggered review and correction; it does not claim the native author
automatically initiated independent review or repaired the reviewer findings. The initial package
review, acceptance-coverage audit and follow-up reviews used separate contexts. They are recorded
conversation evidence, not published reviews or specialist security qualification.

### Formal-pilot assessment and remaining scope

No new stateful production mechanism or costly uncovered invariant justified a formal pilot.
The runtime changes are guidance; executable additions are synthetic fixtures and controls.
Existing execution-owner tests cover stale/absent ownership, and the demonstrated helper gaps
were reproduced and corrected with ordinary fault controls. No verifier dependency, model or
generator was added. This is a scoped no-pilot decision, not a proof that the repository has no
defects or that formal verification would never help another project.

The implementation and recorded local acceptance are complete. Single-run observations do not
qualify arbitrary projects or every branch of each method. Other-host history remains historical,
and commits, publication and production installation require their own authorization.

## Package and host qualification

Current implementation: nine lifecycle skills plus `spar` and `rubber-duck`, six detailed
review briefs, sequencing/atomicity, quality, publication, stateful and project-knowledge methods.
The [alignment map](alignment.md) identifies capability ownership and composition.
Codex standing Communication/Authority rules, its runtime fragment and worker profiles remain
personal host configuration. Claude and Copilot personal rules remain separate from the portable
methods, including their review budgets and Claude's shared-component confirmation boundary.

### Recorded qualification (2026-10-18)

The native host checks used Codex CLI 0.162.1, Claude Code 2.1.251 and Pi 1.3.0.
These versions identify the observations below; they are not guarantees for other installations.

- Eleven skill validators passed. Distribution checks passed after expanding the declared skill
  surface; the configuration regression test checks the owner's retained native settings and roles.
- Full `bun run test:coverage`: 323 passed, 0 failed, line coverage 97.06%:
  `evals/out/preservation-coverage.log`. `bun run check` and `bun run build` passed. The initial
  test literal used native snake_case keys and violated the frozen naming rule; it was rewritten
  as a parsed native TOML expectation without disabling or suppressing the rule.
- Forced existing pre-push hook completed check and all 323 tests:
  `evals/out/preservation-pre-push.log`. Frozen validation files remain unchanged.
- `evals/out/preservation-independent-review/result.json` found the lost Claude shared-component
  boundary. After correction, `preservation-independent-review-2/result.json` passed the selected
  static scope, comparing current and previous source. Six detailed reviewer briefs match their
  predecessors; 32 package files and 70 local references resolve. This is not runtime acceptance.
- Full native run `7e60f7c2-0402-48a6-a4ad-9749400898f4` ran 16 cases / 36 checks against
  the revised methods, including the four new preservation cases. It completed successfully:
  16/16 cases and 36/36 checks passed with zero failed or unknown cases. Report:
  `evals/out/runs/7e60f7c2-0402-48a6-a4ad-9749400898f4/reports/fbf6fd35-6320-40e5-a34d-c7fa7514d1aa.json`.
  These are one observed execution per synthetic development case, not a reliability estimate.
- Fresh Claude Code and Pi installations matched the recorded 32-file package. Pi's native RPC
  inventory contains all eleven skills. Both hosts completed the read-only false-finding scenario
  with actual detailed-method reads, no project mutations and honest scope limits. A fresh
  Claude-to-Pi artifact handoff also completed. Records:
  `evals/out/preservation-host-checks/qualification.json` and sibling host event/tool-gate files.
- These host probes do not load personal standing configuration as production policy or qualify
  every lifecycle skill on Claude/Pi. Copilot guidance remains unqualified. SPAR and Rubber Duck
  real independent-context forward checks completed separately from the deliberately
  non-independent fallback cases in the full native collection. SPAR launched two distinct
  stakeholder contexts; Rubber Duck returned a verified persistence-failure finding. The primary
  inspected all returned results and raw artifacts. Evidence: `evals/out/preservation-independent-forward.md`.
- The owner completed Grok file-loaded cold-start execution. The returned artifact was audited
  and locally reproduced; corrections and remaining limits are recorded in
  [Grok acceptance](grok-acceptance.md). Native import and routines remain unqualified.

### D-009 final acceptance boundary

All selected correction and verification work is complete. The primary inspected the positive
review's reachable persistence failure, its separate asynchronous-test gap and rejected policy
suppression; checked the SPAR decision analysis and atomicity proposal; and integrated the actual
independent-forward results. Final active-document links and package links resolve, `git diff --check`
passes, and the frozen quality configuration is unchanged. Existing pre-commit lint also passed;
its initial elevated approval review timed out, so the same hook was run successfully in the normal
sandbox without changing the check or requiring elevated access.

The published methods retain choices about scope, evidence and independence; they do not enable
services, configure a live merge queue, automate incident collection or relax required human approval.
Grok qualification is limited to the file-loaded cold-start artifact; native import, routines and
revised methods remain unverified. Copilot native behavior remains unqualified. Claude/Pi evidence
is limited to package installation/loading, read-only review and artifact handoff. The supplied
personal configurations were inspected and preserved as repository artifacts, not applied to production installations.
These acceptance exercises did not commit, push, change a PR or activate a routine.


### PR publication boundary

Before publication, the configured gateway URL was removed from the public engineering profile
and replaced with a reserved non-routable placeholder. The actual profile is retained only in
Git-ignored `evals/profiles/out/`; live runs select `--profile out`. Earlier frozen runs retain
what they actually used. Their method/runtime results are unchanged; the public template does
not claim an operational gateway. The unpublished commit was replaced so the private address
would not appear in the PR's commit history either.

### PR #15 comment refinement

The owner retained this PR's grouping and waived the proposed commit split. The three inline
comments were addressed without rewriting history:

- The shared review report now handles a completed specialist security result from any available
  host workflow. It does not mandate a Codex-specific product or claim a security scan ran.
- Final `output` is selected only from the last execution-owner thread. Missing current-owner
  output stays empty; all earlier messages remain available as conversation/evidence. This avoids
  stale answers without asserting that native Codex normally reorders events.
- Distribution checks cover every declared host directory and its nonempty regular adapter files,
  including Pi and Grok Bot. These are artifact checks, not keyword-based claims that instructions
  were followed, and they retain D-009's permitted personal host preferences.

Validation for this follow-up:

- Two new evidence regressions failed before the fix and passed after it: late first-seen old-owner
  output and absent current-owner output. The existing-item late-completion control still passes.
  Logs: `evals/out/pr15-evidence-before.log` and `pr15-focused-after.log`.
- **Local, unpublished evidence:** the current projector replayed saved native handoff records
  from `abcb255e` and `7e60f7c2` with unchanged successful answers. The records remain in ignored
  `evals/out/` and are not attached to this PR, so PR readers cannot independently inspect this
  replay. This is recorded-protocol replay, not a new live-model run.
- In an isolated copied fixture, deleting `config/pi/AGENTS.md` or
  `config/grok-bot/INSTRUCTIONS.md` fails the actual distribution suite; the complete and restored
  copies pass. Logs: `evals/out/pr15-adapter-{baseline,pi,grok,restored}.log`.
- Full coverage run: 326 passed, 0 failed, 97.06% line coverage (`evals/out/pr15-coverage.log`).
- **Local, unpublished evidence:** an independent read-only source review found no consequential
  defect in the scoped correction. Its record is not attached to this PR and cannot be independently
  inspected from the repository. It did not rerun the primary-executed tests or mutation controls.

The committed regression and distribution tests can be rerun from the PR. They do not make the
separate unpublished replay and independent-review records publicly inspectable.

Earlier native and cross-host observations retain their recorded scope and source identities.
No new comprehensive trigger benchmark, GitHub CI workflow, specialist security scan or production
qualification is claimed. Grok native execution remains user-deferred. Review-depth selection,
noise/incident feedback and review limits are already represented by the methods; their long-term
production effectiveness remains unverified. The known install-generated lefthook artifact is a
separate tooling issue, not introduced by this correction.
