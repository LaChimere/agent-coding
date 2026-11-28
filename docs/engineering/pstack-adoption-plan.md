# Plan: expand the engineering package with pstack methods

Status: implemented locally on 2026-11-28 under [D-014](../decisions.md), with behavior
evaluated on Claude Code only, as the owner chose. Results, kept and reverted pointers, and
unverified hosts are recorded in [implementation.md](implementation.md). Nothing is committed;
commits, pushes, PRs, production installs and changes to live personal configuration each need
their own authorization.

## Goal

Make the `engineering` package produce better engineering outcomes by adding the pstack
capabilities it lacks. The aim is effectiveness, not migration: a pstack method enters the
package only when it adds a capability, and it is rewritten for this package's authority model
and for every supported host. A change stays only when evidence shows it works.

The plan is complete when all of these hold:

1. The 15 new skills in [New skills](#new-skills) exist under `plugins/engineering/skills/`,
   written in this package's voice with no verbatim pstack text.
2. Every new skill is manual-only on every supported host, host-neutral and consistent with the
   [shared agreement](../../plugins/engineering/references/working-agreement.md).
3. Structural checks enforce the invariants in [Design rules](#design-rules-for-every-new-skill).
4. Each new skill has a recorded smoke run on Claude Code, and its manual-only behavior is
   observed on Claude Code and Codex. Per-host discovery is recorded where the host allows it.
   Missing evidence stays an explicit gap.
5. A pointer added to an existing skill stays only if a baseline-versus-candidate comparison
   shows an effect.
6. The writing skills cover English and Chinese, with each Chinese rule traced to a verified
   source or to observed model output.
7. Evaluation spending stays at or below USD 80 and is recorded with failed attempts.
8. Decisions, design, alignment, README, implementation record and distribution tests match the
   delivered state.

Non-goals:

- Installing or depending on pstack. It stays installed and disabled at user scope.
- Adopting `poteto-mode`, its autonomy rules, the `principle-*` skills as separate skills, or a
  fixed model roster.
- Periodic synchronization with upstream pstack.
- Qualifying Grok Bot (owner decision, 2026-11-28) or Copilot. Both stay recorded gaps.

## Background and evidence

### pstack source identity

- Reviewed source: [cursor/plugins at `b7b93c3`](https://github.com/cursor/plugins/tree/b7b93c36be9bcc36a74db438e0fd385d660bc559/pstack),
  committed 2026-11-26, pstack 0.15.48, MIT license.
- The earlier adoption recorded in [alignment.md](alignment.md) used `6b78e9f` (2026-10-19).
  Since then upstream added `ketchup-video`, `maintain-formal-verification-skill`, `reframe` and
  `statechart`. It also removed its orchestration store and condensed `architect`, `interrogate`,
  `how` and `why`. The skills this package adopted earlier (`correct`, `create-verification-skill`,
  `maintain-verification-skill`, `benchmark-checklist`, `ketchup`) are unchanged or changed only
  in wording.

### Coexistence finding

pstack can be installed beside `engineering@agent-coding` without a technical conflict. Plugin
names are prefixed, 58 of its 59 skills set `disable-model-invocation: true`, and it ships no
hooks, MCP servers or settings. The conflict is behavioral: the Autonomy section of `poteto-mode`
and `principle-never-block-on-the-human` tell the agent to proceed on reversible work and on some
external actions. That contradicts the owner's authority rules. pstack was installed and then
disabled on 2026-11-28.

### Skill loading evidence

The 2026-11-11 Claude Code measurements in [implementation.md](implementation.md) show that
Claude Code loads only the SKILL.md body. `references/working-agreement.md` was read in 3 of 20
runs, and candidate guidance placed in `project-knowledge.md` was read in 1 of 9 runs. A method
that must take effect therefore belongs in the SKILL.md body, not in a linked reference.

### Manual-invocation mechanisms

Checked on 2026-11-28 in the installed host programs. This is text-level evidence, not behavior.

| Host | Mechanism | Evidence |
|---|---|---|
| Claude Code | Frontmatter `disable-model-invocation: true` | pstack's generated Claude Code copy uses it |
| Codex 0.172.0 | `agents/openai.yaml` with `policy: allow_implicit_invocation: false`; `$skill-name` still works | Codex built-in skill-creator text |
| Pi 1.3.0 | Frontmatter `disable-model-invocation: true`; `/skill:name` still works | Pi CHANGELOG and `dist/core/skills.js` |
| Antigravity (`agy`) | Frontmatter `disable-model-invocation` | The binary parses the key |
| Grok Bot 1.0.70 | Frontmatter `disable-model-invocation` | Grok's bundled documentation |
| Copilot (retained consumer) | Unknown | Not checked |

### Evaluation tooling

The `evals/` runner executes native Codex only. Live runs need an owner-configured gateway in
the ignored `evals/profiles/out/` profile; [implementation.md](implementation.md) records that
no such profile existed for the 2026-11-11 round. Those Claude Code measurements ran `claude`
with `--plugin-dir` in fresh fixture workspaces and graded anonymized runs. That round cost
USD 16.32 for roughly 40 to 55 short runs, about USD 0.30 to 0.40 each.

For this plan the owner chose the installed Codex CLI with its existing login for Codex runs,
in the same way as the Claude Code round, instead of configuring an evaluation gateway.
[hosts.md](hosts.md) installs a Codex candidate through `codex plugin marketplace add` and
`codex plugin add`, which change the user's Codex configuration. Step 1 therefore picks a
loading method first. A method that changes the production Codex install or copies credential
values needs the owner's approval before it runs.

### Same-name skills

The owner keeps personal skills in `~/.agents/skills/`, including `teach` and `code-review`.
Claude Code prefixes plugin skills (`engineering:teach`). [hosts.md](hosts.md) records that Pi
discovers `~/.agents/skills` automatically and that a same-name skill can shadow this package.

## Settled decisions

These come from the planning discussion. Step 0 records the governance changes as D-014.

| # | Decision |
|---|---|
| 1 | `engineering` stays the primary package. pstack is not used directly. |
| 2 | New public skills may be added and existing skills adjusted. D-014 supersedes the fixed inventory in D-008 and D-009 and the design rule that a new public entry needs a prior demonstrated purpose. |
| 3 | Names follow pstack where pstack has a skill. `optimize-metric` and `resume-work` are this package's names. |
| 4 | All pstack-derived content is rewritten in this package's words. No pstack text is copied, so no pstack copyright notice is needed. Provenance is recorded in [alignment.md](alignment.md), pinned to `b7b93c3`. |
| 5 | The repository and the engineering package each get an MIT `LICENSE` with copyright holder `LaChimere`. The package needs its own copy because hosts install only `plugins/engineering/`. |
| 6 | Every new skill is manual-only, as in pstack. Existing skills keep model invocation. |
| 7 | Skills do not name models. Per-host preferences live in `config/<host>/`. |
| 8 | The writing skills cover English and Chinese. |
| 9 | The same name `teach` is accepted. Pi shadowing is checked in step 2. |
| 10 | No upstream tracking after the one-time provenance record. |
| 11 | Evaluation budget cap: USD 80, with a progress report at USD 40. |
| 12 | The skills are written for every supported host: Antigravity, Claude Code, Codex, Pi and Grok Bot, plus the retained Copilot consumer. |
| 13 | Codex evidence uses the installed Codex CLI and the owner's existing login. No evaluation gateway is configured. |
| 14 | Grok Bot is not qualified in this plan. Its gap stays recorded. |
| 15 | `unslop` keeps the style rules listed in [unslop style rules](#unslop-style-rules). |
| 16 | No per-host model preferences for now. Workers use the host's default model. |
| 17 | `no-comments` is adopted as a new manual skill without the persona. The `comment-sicko` brief becomes its worker brief; no separate agent is shipped. The owner delegated this choice. |
| 18 | Behavior evaluation runs on Claude Code only, superseding decision 13 (owner, 2026-11-28). Codex runs are not performed. The other hosts still get basic verification without evaluation. |
| 19 | Pi's default discovery lets the personal `~/.agents/skills/teach` shadow the package's `teach`. Under decision 9 the name stays; on Pi the package is loaded with `pi --no-skills --skill <package>/skills`, as `config/pi/AGENTS.md` and `hosts.md` record. |

## Design rules for every new skill

1. **Self-contained body.** The method lives in SKILL.md. A pstack principle that the method
   needs is written as one sentence in the body, not as a link to another skill. Shared
   references may be linked for depth, but the core method must work without them.
2. **Host-neutral wording.** Replace Cursor terms as follows.

   | pstack term | Wording in this package |
   |---|---|
   | `Task`, `subagent_type: generalPurpose` | The host's subagent or delegation mechanism |
   | `readonly: true` | A read-only brief, followed by a check that nothing was written |
   | `environment: "cloud"` | An isolated worktree or scratch copy |
   | `run_in_background: true` | The host's asynchronous launch, when it has one |
   | `AskQuestion`, todolist tool | The host's question and task-list tools, or plain text |
   | `~/.cursor/rules/pstack-models.mdc`, model slugs | Removed; see rule 4 |
   | `~/.cursor/projects/<slug>/agent-transcripts/` | The host's session records for the active workspace only; paths live in `config/<host>/` |
   | `.cursor/skills/` | The host's project or user skill location |
   | Bugbot, Cursor Automations, `cursor-team-kit` | Removed |

3. **Authority.** No automatic commits, pushes, PRs or external writes. A material choice goes
   to the user; reversibility is not delegation. pstack's never-block and autonomy rules are
   not carried over. Candidates, adversaries and workers write only to isolated locations, and
   their results enter the real tree only within implementation authority.
4. **Models.** One sentence: use the models the host offers; a different model family can help
   but is not required; report which models actually ran. No per-host preferences for now.
5. **Manual-only metadata.** Frontmatter `disable-model-invocation: true`, plus
   `agents/openai.yaml` with `policy: allow_implicit_invocation: false` for Codex.
6. **Description.** State when to use the skill and what it returns. Slash menus show it even
   for manual-only skills. pstack's "Use for /name" alone is not enough. The description must
   also be safe if a host ignores the manual-only key and lets the model invoke the skill.
7. **Language.** SKILL.md text is English, like the existing skills. Output follows the user's
   language.

## New skills

| Skill | pstack sources | Responsibility in this package | Main adaptations |
|---|---|---|---|
| `arena` | `arena`, current `architect` | Generate two or more independent candidates for any artifact in isolation. Score them against a 3 to 6 item rubric that candidates do not see. Pick the base a maintainer can extend most easily, graft one or two strengths from each other candidate by hand, then verify the result. Convergence confirms the shape; wide divergence means the framing was wrong. | No model roster or vendor rule. An optional fresh-context judge uses another model family when available. The owner reads every candidate. |
| `swarm` | `swarm` | Fan out workers by slice, race or both, with the race selection rule declared before launch. Each brief names exact SHAs and the method. Workers report PASS, ISSUES or BLOCKED with evidence. A result without its SHA and method is respawned once, then recorded as a gap. A gap is not a pass. | Uses the launch rules of [independent review](../../plugins/engineering/references/independent-review.md) inline: a live handle before waiting, at most one retry. |
| `interrogate` | `interrogate`, `in-your-own-words` | State the change's intent first. Adversaries try to break the change in isolated copies and must report the command, its output and the output the intent requires. The owner reruns each command, keeps reproduced failures that break the intent, merges them by root cause and reports how many were dropped and why. No fixes. | Read-only toward the target. Default scope: branch diff from its merge base, including the working tree. |
| `optimize-metric` | Hillclimb playbook, `benchmark-checklist`, `show-me-your-work` log format | Move one measurable metric toward a target. Reproduce the complaint, fix the metric, direction and stop predicate, then prove the harness can tell cases apart before freezing it. Each iteration tests one mechanism-grounded hypothesis, measures before and after with the regression gate, and keeps the change only past noise. Every attempt gets a decision-log row. | Commits only within authority; the pstack "Opening a PR" step is removed. Key checks from [performance evidence](../../plugins/engineering/references/performance-evidence.md) are written in the body. |
| `figure-it-out` | `figure-it-out`, Multi-phase plan playbook, `show-me-your-work` | Design the workflow for large, ambiguous or unattended work: a falsifiable done predicate, quantified scope and a rigor level. Order phases riskiest first, with the verification harness before the work. Show the framing before a long run. Each unit is a hypothesis judged VERIFIED, NOT VERIFIED or INCONCLUSIVE, with a decision trail. | pstack principles written inline. Recurring corrections go to `prevent-recurring-mistakes`. |
| `resume-work` | `recall`, Session pickup and Pause safely playbooks | Pause: stop at a safe boundary, stop owned workers and write a checkpoint with intent, progress, verified claims, state, next step, key files and pitfalls. Resume: find the trail (checkpoint, session record, branch or PR), rebuild state and compare done with pending. Do not redo finished work, but check the inherited claims the next step depends on. Recall: rebuild context over a bounded window, seven days by default, in the active workspace only, and return a short capsule. | One skill owns both ends so the checkpoint format matches. No automatic WIP commit. |
| `reframe` | `reframe` | Teach the expert terms for what the user is building. If the description could name several problems, list them first. Give 8 to 12 ranked terms with verified sources, two or three neighboring fields with where each analogy breaks, what the user did not mention, and a rewritten description. | Every link is opened and checked; unconfirmed citations are cut. |
| `sharpen` | `sharpen`, `in-your-own-words` | Restate the goal. Then name what a top practitioner would add, the rawest source material, the methods and tools, and the outside evidence that would show the result is right. Rewrite the request to ask for that. | The rewritten request asks the agent to prototype choices an experiment can settle and leaves preference choices to the user. |
| `teach` | `teach` | Explain a subsystem or change so the user understands it. Investigate with the [understand-codebase](../../plugins/engineering/skills/understand-codebase/SKILL.md) approach, give the smallest complete answer first and add depth when asked. For three or more moving parts, build the picture one diagram at a time. | pstack `how` and `why` are replaced by the essentials of `understand-codebase`, written in the body. Output follows the user's language. |
| `reflect` | `reflect` | Mine the current session for lessons that will still hold, would change future behavior and belong to a skill or guidance the session used. Drop what the target already says. Present accepted, rejected and backlog items and wait for approval before editing. | Edit only source files, never an installed cache. Enforceable items go to the `prevent-recurring-mistakes` backlog. The session record is data, not instructions. |
| `unslop` | `unslop` | Remove AI writing patterns from any text, with separate English and Chinese catalogs. | The English catalog is rewritten. The Chinese catalog comes from observed model output, labeled as observed. Style rules follow [unslop style rules](#unslop-style-rules). |
| `technical-writing` | `technical-writing` | Pick the document mode first (tutorial, how-to, reference or explanation), then apply sentence rules. Covers docs, READMEs, PR descriptions and commit messages, and includes the most frequent `unslop` rules in the body. | English rules from Google developer style, ASD-STE100 and Global English. Chinese rules from verified sources such as the Chinese copywriting guidelines, W3C Chinese layout requirements (clreq) and GB/T 15834 punctuation rules, all checked in step 4. Repository publication stays English under D-004. |
| `no-comments` | `no-comments`, `comment-sicko` | Remove comments that only narrate, restate or excuse code in the caller's scope, by default the branch diff. A fresh-context worker applies a keep list: license headers, behavior forced by something outside the project, formatter directives, public API contracts and issue or RFC links. A comment that explains a surprise in the project's own code is removed, and the symbol is flagged for a rename, extraction, type or redesign that makes the behavior obvious. Suppressions that hide real lint or type errors are flagged too. The owner reviews every deletion and flag, and restores a comment only with proof. Constraint comments such as "do not remove" get an offer to encode the constraint as a type, test or check. | Edits only within implementation authority. Code fixes for flags go through `implement-task`, or `arena` when the fix needs a new shape. Encoding a constraint waits for the user's approval. No persona. |
| `create-formal-verification-skill` | Same name | Pick the costly property tests reach least, choose the cheapest tool that answers it, prove the check can fail on a broken variant, report findings without weakening them, and generate a project skill with a coverage record and sync commit. | pstack `statechart` is an optional external capability: use it if installed, otherwise run TLC directly and draw Mermaid by hand. Formal verification stays conditional, not a lifecycle gate. |
| `maintain-formal-verification-skill` | Same name | Bring a project's formal verification back in line after code changes. Find commits that touched verified code, update the model or harness, rerun, and classify each failure as verification drift or a code bug. | Same `statechart` treatment as above. |

### unslop style rules

The owner chose these style rules on 2026-11-28. They apply to English and Chinese unless a
rule names one language. General rules, such as cutting filler, vague attributions and chatbot
closers, are kept without a separate choice.

| Rule | Before | After |
|---|---|---|
| No dashes as punctuation, and no parentheses standing in for them. Use a period or a comma. | 缓存——它是共享的——每小时过期。 | 缓存是共享的。它每小时过期。 |
| A colon goes only before a list or an example, never as a connector inside a sentence. | 原因很简单：缓存过期了。 | 缓存过期了。 |
| At most one hedge: "may" in English, "可能" in Chinese. | 这或许可能会导致问题。 | 这可能会失败。 |
| Straight quotes in English. Chinese keeps the “” quotes that GB/T 15834 specifies. | “cache” | "cache" |
| Sentence-case headings, as in pstack. English only. | Skill Loading Evidence | Skill loading evidence |
| Spell out arrows and abbreviations. | A → B | A 调用 B |
| No abstract metaphor nouns such as substrate, wedge, vector, nexus, primitive, surface, scaffolding, paradigm, ratchet, north star or flywheel. An established domain or project term stays allowed: "harness" is the normal word for verification and evaluation harnesses. | the verification surface | the commands and pages the check drives |

### Not created

- `in-your-own-words`: merged into `sharpen` and `interrogate`.
- `show-me-your-work`: its decision-log format is written into `optimize-metric` and
  `figure-it-out`.
- `how` and `why`: `understand-codebase` covers both.
- `bro`: the owner's personal `wait-what` covers it.
- `statechart`: optional external capability, not copied or rewritten.
- `poteto-mode`, `principle-*`, `setup-pstack`, `poteto-help`, Babysit, Shipping, Autopilot and
  the other playbooks not merged above.
- `benny` automations, `tdd`, `typescript-best-practices`, `make-bot-ui`, `ketchup`,
  `ketchup-video`, `automate-me`, `blast-radius`, `correct` and `architect` as separate skills.
- `comment-sicko` as a separate agent: its brief lives inside `no-comments`.

## Changes to existing skills and host configuration

Each pointer is one sentence in the caller's SKILL.md body and is measured in step 3. A pointer
without an effect is reverted with its cases and docs. Outcome: only the `release-and-rollout`
pointer to `technical-writing` showed an effect and was kept; the others were reverted, as
recorded in [implementation.md](implementation.md).

| File | Pointer |
|---|---|
| `skills/design-solution/SKILL.md` | A consequential choice with two or more viable shapes can use `arena`; suggest `reframe` when the problem vocabulary is unclear |
| `skills/code-review/SKILL.md` | A high-risk change can use `interrogate` |
| `skills/implement-task/SKILL.md` | A sustained metric target uses `optimize-metric`; large or unattended work uses `figure-it-out`; parallel slices can use `swarm`; documentation changes can use `technical-writing`; before review, its own diff can use `no-comments` |
| `skills/verify-behavior/SKILL.md` | Parallel coverage of many features can use `swarm` |
| `skills/release-and-rollout/SKILL.md` | PR descriptions and commit messages can use `technical-writing` |
| `references/working-agreement.md` | Handoff and interruption can use `resume-work`. Expect a low read rate, as with other references. |

Host configuration:

- Routing tables exist in `config/claude/CLAUDE.md`, `config/codex/AGENTS.md` and
  `config/antigravity/AGENTS.md`; `config/copilot/copilot-instructions.md` mentions the package.
  Add the new skills as user-invocable entries, not as "Before you X, read Y" rows; a reading
  instruction would make the model load them and defeat the manual-only setting.
- `config/pi/AGENTS.md` and `config/grok-bot/INSTRUCTIONS.md` have no skill table. Add only a
  short manual-invocation note if a step shows it helps.
- Record session-record locations for `resume-work` in each `config/<host>/`. No model
  preferences are added (decision 16).
- The owner's live `~/.claude/CLAUDE.md` mirrors `config/claude/CLAUDE.md` under D-011. Updating
  the live copy is a production configuration change and needs separate authorization.

## Host coverage

| Host | Manual-only setting | Discovery evidence | Behavior evidence | Known gaps |
|---|---|---|---|---|
| Claude Code | Frontmatter key | Fresh isolated session with `--plugin-dir` on a candidate copy | Smoke run per skill; check that the model does not invoke a manual-only skill | None planned |
| Codex | `agents/openai.yaml` policy | Candidate copy loaded into the installed Codex CLI by the method step 1 selects | Negative auto-invocation check and smoke runs with the owner's existing login | The loading method may need the owner's approval |
| Pi | Frontmatter key | `pi --no-skills --skill <candidate>/skills` | Discovery plus `teach` shadowing check against `~/.agents/skills/teach` | Behavior smoke optional |
| Antigravity | Frontmatter key | Isolated candidate install as described in [hosts.md](hosts.md) | Discovery only unless cheap | Manual-only behavior unverified |
| Grok Bot | Frontmatter key | Not planned (decision 14) | Not planned | Recorded as a gap |
| Copilot | Unknown | Not planned | Not planned | Recorded as a gap |

Candidate copies stay isolated. No production install switches, and no credential values are
copied.

## Measurement and budget

| Tier | Applies to | Checks | Cost |
|---|---|---|---|
| 0 | Every change | Distribution test, skill-creator validator, link resolution, manual-only metadata in both forms, no Cursor residue, `LICENSE` in the package | Free |
| 1 | Each new skill | One explicit-invocation smoke run on Claude Code that checks the skill's contract; a negative auto-invocation check on Claude Code and Codex per mechanism, not per skill | Low; multi-agent skills cost several times a single run |
| 2 | Writing skills | A deterministic pattern-check script plus a blinded comparison of baseline and skill output | Moderate |
| 3 | Pointers in existing skills | Baseline and candidate, three runs each, on the same cases | Moderate |

Rules:

- The cost basis is the 2026-11-11 round, about USD 0.30 to 0.40 per short run.
- Stop and report at USD 40. Never exceed USD 80 without the owner's approval.
- Record usage, failed attempts and refused preparations. Missing telemetry is not zero.
- A new skill whose smoke run does not produce its contract is fixed or dropped.
- A pointer without an effect is reverted completely, keeping only a short evidence record.
- Results from different case populations are not aggregated. Holdouts stay untouched.

## Implementation sequence

Each step ends with the tier 0 checks, its tier 1 to 3 evidence, an `implementation.md` entry
and a report to the owner. Each step can be one commit containing its skills, tests and directly
coupled docs. No commit is made without authorization.

| Step | Deliverables | Evidence | Budget |
|---|---|---|---|
| 0. Foundation | Root and package `LICENSE` (`package.json` `files` includes it); D-014 in `docs/decisions.md`; Public skills and working-method updates in `design.md`; provenance rows in `alignment.md`; README inventory; structural checks in `evals/tests/distribution.test.ts` | Tier 0 | USD 0 |
| 1. Parallel and long-running work | `arena`, `swarm`, `interrogate`, `optimize-metric`, `figure-it-out` | Tier 0 and 1; Claude Code and Codex negative checks | About USD 25 |
| 2. Single-agent skills | `reframe`, `sharpen`, `teach`, `reflect`, `resume-work`, `no-comments`; session-record paths in `config/` | Tier 0 and 1; Pi `teach` shadowing check; `no-comments` smoke on a fixture diff with planted narration comments and comments the keep list protects, graded by which comments remain | About USD 8 |
| 3. Integration | Pointers in existing skills; routing entries | Tier 3 | About USD 20 |
| 4. Writing | Chinese source research, then `unslop` and `technical-writing` | Tier 0 and 2 | About USD 15 |
| 5. Formal verification | `create-formal-verification-skill`, `maintain-formal-verification-skill` | Tier 0 and 1 | About USD 10 |

Validation commands, from [validation.md](../validation.md):

```sh
git diff --check
cd evals
bun run start -- validate
bun run check && bun run test:coverage && bun run build
bun test --isolate tests/distribution.test.ts
```

Also run the installed skill-creator validator on each new skill.

## Documentation and governance updates

- `docs/decisions.md`: D-014. It covers the admission rule for new skills (distinct outcome,
  distinct invocation, independently callable, own evidence), the manual-only convention, the
  rewrite-not-copy rule and the formal-verification skills shipping as conditional methods.
- `docs/engineering/design.md`: Public skills table, the lifecycle text that names the entry
  points, and the formal-verification section.
- `docs/engineering/alignment.md`: one row per adopted capability with its owner, evidence and
  pstack source pinned to `b7b93c3`.
- `docs/engineering/implementation.md`: one entry per step.
- `docs/engineering/hosts.md`: the manual-only mechanism per host, once observed.
- `README.md`: skill inventory and the "nine lifecycle skills and two challenge skills" sentence.
- `evals/tests/distribution.test.ts`: the expected skill list and the new structural checks.
- `docs/lessons.md`: only if a step produces a real recurring pitfall.

## Risks

| Risk | Mitigation |
|---|---|
| Models may not follow pointers from existing skills, given the measured reference read rates | Step 3 measures it. If a pointer is ignored, write the one key rule in the caller's body or revert. |
| A host may ignore the manual-only key | Observe per host. Descriptions stay safe for automatic invocation. |
| Pi may shadow `engineering`'s `teach` with the personal `teach` | Check in step 2. If it shadows, the owner chooses between renaming and accepting the shadowing on Pi. |
| Users may confuse the challenge skills (`spar`, `rubber-duck`, `code-review`, `interrogate`) | Descriptions state each skill's distinct output. |
| Rewriting can lose method details | Review each rewritten skill against a checklist of its pstack source's method items. |
| Multi-agent skills cost more than estimated | Budget checkpoint at USD 40; reduce smoke cases before exceeding the cap. |
| Loading a candidate into the installed Codex CLI can change the production install | Step 1 chooses a method that leaves the install unchanged, or asks the owner first. Without an approved method, record the Codex behavior gap. |
| No authoritative source exists for Chinese AI writing patterns | Derive the catalog from observed output and label it as observed. |

## Open items for the owner

1. Authorization for commits, PRs and the live `~/.claude/CLAUDE.md` update. Implementation
   was authorized on 2026-11-28.
2. A Pi model reply. Only the `github-copilot` provider is logged in, and it rejected every listed
   model. Another provider login, or restored model access, is the owner's to set up.
