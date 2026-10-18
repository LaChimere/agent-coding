# Installation and host boundaries

Use the complete engineering package. The commands below reference a local candidate until the
new revision is actually published. They do not update production settings automatically.
[Acceptance](implementation.md) records tested versions and observed support separately from these
integration instructions.

## Codex

Register a candidate repository containing the marketplace, then install the package through
Codex's plugin manager:

```sh
codex plugin marketplace add /absolute/path/to/agent-coding
codex plugin add engineering@agent-coding
```

In a fresh session, inspect the installed source/version and discovered skills before invoking
`$engineering:understand-codebase` or another qualified skill. Natural-language tasks can select
skills too. The optional `config/codex` files supply personal standing guidance, worker profiles and a configuration fragment;
merge them deliberately into user settings rather than replacing providers or credentials.
The fragment preserves the owner's selected settings; these are not required defaults for other users. Do not enable capabilities merely to make
a skill appear functional. CLI evidence does not qualify every App, IDE or cloud surface.

## Claude Code

```sh
claude plugin marketplace add /absolute/path/to/agent-coding
claude plugin install engineering@agent-coding --scope user
```

For verification use an isolated configuration directory and a disposable candidate, not personal
settings. Check the installed plugin and a fresh session inventory. Commands include
`/engineering:implement-task` and `/engineering:code-review`; optional `config/claude/CLAUDE.md`
contains native entry guidance. The bundled Claude review command and managed PR review service
are different capabilities with different instruction/loading and execution behavior.

For an Agent SDK handoff, supply the actual working directory and absolute artifact locations in
the task as well as `cwd`. The SDK's minimal default prompt may not communicate the filesystem
context the model needs. Select the Claude Code system preset when that environment is intended,
and validate actual reads rather than treating a completed turn as successful invocation.

## Pi

The engineering root is also a Pi package with an explicit `pi.skills` declaration:

```sh
pi install /absolute/path/to/agent-coding/plugins/engineering
```

Local Pi packages are loaded from the resolved path, not copied. For an acceptance test, register
an isolated candidate copy in a separate `PI_CODING_AGENT_DIR` and verify `pi list` plus the actual
skill inventory. Use `/skill:understand-codebase` or natural-language tasks. Optional
`config/pi/AGENTS.md` provides entry guidance. Review project package declarations before trust.
Pi process permissions need host/container enforcement; project trust is not a sandbox.
Subagents and planning extensions are optional actual capabilities, not assumed defaults.

`PI_CODING_AGENT_DIR` does not isolate automatic user `.agents/skills` discovery. Check source
paths, not only names; a same-name skill can shadow this package. For an isolated invocation:

```sh
pi --no-skills --skill /absolute/path/to/installed/engineering/skills
```

The complete package must remain present so shared references resolve. This is Pi's explicit
native skill loading mode; it does not alter the user's other packages. Qualification records
must say whether package auto-discovery or this explicit loading mode was exercised.

## Grok Bot

Provide the complete `plugins/engineering` tree to an authorized project folder on the Bot's
computer, preserving `skills/` and `references/` together. Configure the Bot with the reviewed
`config/grok-bot/INSTRUCTIONS.md`, pointing it to that package location. Native skill import,
when available, must be checked for preservation of relative dependencies and discovery of all
eleven entries; no universal Grok plugin installation command is asserted here.

A file-backed workflow must actually read the appropriate SKILL.md and its shared reference and
execute the representative task. A successful file upload alone does not qualify use. Where a
native importer cannot preserve the complete package, keep a complete file-backed package and
state the discovery limitation rather than splitting off broken standalone skills.

The Bot may execute directly or use a real available coding-agent integration. Preserve scope,
authority, actual artifacts and evidence on both sides. Optional routine templates in
`config/grok-bot/routines.md` are inactive. Test once and use shadow mode where appropriate;
creation, activation, external posting and production actions require the relevant authorization.

For this redesign's acceptance, the owner deferred native Grok Bot execution to their own Bot.
The prepared self-validation bundle and its hash are recorded in [acceptance](implementation.md).
Keep that native behavior unverified until actual tool actions and resulting files are reviewed.

## Qualification levels

| Level | Required observation |
|---|---|
| Package | Valid metadata and complete installed resources, with content identity |
| Discovery | Actual host inventory identifies the intended skills from that package |
| Invocation | Recorded actions load and use the intended method and shared references |
| Behavior | Outcomes and negative cases pass against actual artifacts and actions |
| Episode | Cold-start, integrated work, recovery or mixed handoff succeeds with evidence |

No level implies the next. Unsupported, missing and unrun observations stay explicit in the
acceptance record. No production installation, routine activation or deployment is necessary to
claim a repository draft exists, and a draft is not a qualification claim.

Distribution checks require the declared host directories and nonempty regular adapter files,
including Pi instructions and Grok Bot instructions/routine templates. They also validate native
package declarations and bundled references. These checks do not prove that a host loads or follows
the guidance. Personal host preferences remain allowed under D-009; they are not portable defaults.

## Primary references

- [Codex plugins](https://developers.openai.com/plugins/build/plugins)
- [Claude plugin reference](https://code.claude.com/docs/en/plugins-reference)
- [Pi packages](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md)
- [Pi skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md)
- [Grok skills and routines](https://docs.x.ai/grok-bot/skills-routines-and-automations)
- [Grok files and results](https://docs.x.ai/grok-bot/files-and-results)

## Copilot guidance retained

`config/copilot/copilot-instructions.md` preserves the existing personal standing policy and points
to the same engineering package. Use the host's actual supported skill/file loading mechanism.
Native installation, discovery and behavior have not been qualified for this revision.
