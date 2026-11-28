# Installation and host boundaries

Use the complete engineering package. The commands below reference a local candidate until the
new revision is actually published. They do not update production settings automatically.
[Acceptance](implementation.md) records tested versions and observed support separately from these
integration instructions.

## Antigravity

`plugins/engineering/.antigravity-plugin/plugin.json` exposes the complete engineering package
natively to Antigravity without copying `skills/` or `references/`. Install the published revision
directly from GitHub with the Antigravity CLI (`agy`):

```sh
agy plugin install https://github.com/LaChimere/agent-coding
```

`agy plugin install` detects the repository's `plugins/` directory, copies `plugins/engineering`
(all 11 skills and `references/`) into `~/.gemini/config/plugins/engineering`, and syncs it to
both the Antigravity CLI (`agy plugin list --json`) and the Antigravity App (`GetAllPlugins`).
To test an unpublished local checkout instead, run `agy plugin validate ./plugins/engineering`
and install locally or register the local `plugins/` directory in `~/.gemini/config/plugins.json`
using `config/antigravity/plugins.json` as a template:

```json
{
  "entries": [
    {
      "path": "/absolute/path/to/agent-coding/plugins",
      "include_only": ["engineering"]
    }
  ]
}
```

The optional `config/antigravity` files supply personal standing guidance aligned with
`config/codex/AGENTS.md` and `config/claude/CLAUDE.md` (`AGENTS.md`), plus the `PreToolUse`
Git guard (`hooks.json` and `hooks/git-guard.py`). Copy `AGENTS.md` to `~/.gemini/AGENTS.md`
(works across Antigravity App, CLI, and IDE extensions; `~/.gemini/config/AGENTS.md` is also
supported by App and CLI, so keep only one copy to avoid duplicate loading). Copy `hooks/` into
`~/.gemini/config/`, and merge `hooks.json` into `~/.gemini/config/hooks.json` rather than
replacing existing entries. Copy `hooks/` before merging `hooks.json`: `hooks.json` runs
`./hooks/git-guard.py` relative to its own directory, and a missing script exits nonzero on every
`run_command` call.

The hook needs `python3` 3.9 or later and shares the exact same script as Claude Code
(`config/claude/hooks/git-guard.py`), handling Antigravity's `run_command` payload. For broad
staging, discarding, forced branch deletion and force/deleting pushes it returns
`{"decision": "force_ask", "reason": "..."}` — `"force_ask"` rather than `"ask"` is required
because Antigravity's default sandbox auto-approves sandboxed `run_command` calls under `"ask"`,
bypassing the guard. In non-interactive `agy -p` runs nobody can confirm, so guarded commands are
denied. For non-guarded `run_command` calls it returns `{"decision": "allow"}`, matching
Antigravity's required `PreToolUse` `decision` contract and delegating to the next hook or default
permission policy (distinct from `"auto_approve"`). Like Claude Code, it guards against mistakes
rather than deliberate evasion: commands inside quoted strings (`bash -c '...'`), `eval` or scripts
are not inspected.

No static `agents/reviewer.md` file is maintained for Antigravity: use the built-in `research`
subagent (read-only sandbox with no shell network access; retains command execution inside that
sandbox) or `define_subagent` with `EnableWriteTools: false` (omits file-write and
command-execution tools) for independent read-only review.

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
claude plugin marketplace add LaChimere/agent-coding
claude plugin install engineering@agent-coding --scope user
```

The GitHub source installs the published revision. After pushing a refinement, run
`claude plugin marketplace update agent-coding` and `claude plugin update engineering@agent-coding`.
To verify an unpublished candidate, register the local path in an isolated configuration
directory, not personal settings. Check the installed plugin and a fresh session inventory.
Commands include `/engineering:implement-task` and `/engineering:code-review`.

The optional `config/claude` files supply personal standing guidance aligned with the Codex
`AGENTS.md`, one subagent, `reviewer` (read-only review, inherited model), and one `PreToolUse`
hook. Copy `CLAUDE.md`, `agents/` and `hooks/` into `~/.claude/`, and merge the `hooks` key of
`settings.json` into `~/.claude/settings.json` rather than replacing that file. Copy `hooks/`
first: if the script is missing, `python3` exits with status 2 and every Bash call is blocked.
The hook needs `python3` 3.9 or later. `git-guard.py` returns `ask` for broad staging, discarding,
forced branch deletion and force/deleting pushes, so the owner confirms each one; in `claude -p`
nobody can confirm, so those commands are denied. It guards against mistakes, not evasion:
commands inside quoted strings (`bash -c '...'`), `eval` or scripts are not inspected. Built-in
Explore, Plan and general-purpose subagents cover the Codex worker roles; select a cheaper model
per call where useful. The reviewer lacks Edit/Write, but retains Bash, so its read-only boundary
is partly instructed. The bundled
Claude review command and managed PR review service are different capabilities with different
instruction/loading and execution behavior.

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

The owner ran the cold-start bundle in their Bot and supplied the resulting project. Its
[artifact audit](grok-acceptance.md) records file-based loading, local reproduction, verifier
corrections and limits. Native import, routine execution and the revised methods remain unverified;
the maintainer's local corrections are not another Grok run.

## User-invoked skills

D-014 skills are hidden from model invocation and run when the user names them. Each host has
its own mechanism; the package carries both forms for every such skill.

| Host | Mechanism | Explicit invocation | Evidence level |
|---|---|---|---|
| Claude Code | Frontmatter `disable-model-invocation: true` | `/engineering:<skill>` | Discovery, explicit invocation and hidden-from-model behavior observed on 2.1.332 |
| Codex | `agents/openai.yaml` with `policy.allow_implicit_invocation: false` | `$engineering:<skill>`; `$<skill>` for repository skills | On 0.172.0, an isolated `CODEX_HOME` install cached all 26 skills and showed only the 11 lifecycle skills to the model. With the candidate temporarily installed as the owner's plugin, `codex exec` ran `$engineering:sharpen` from the plugin cache and followed it; the install was then restored byte for byte. Repository skills in `.agents/skills` behaved the same |
| Pi | Frontmatter `disable-model-invocation: true` | `/skill:<skill>` | With `--no-skills --skill`, Pi 1.3.0 loaded all 26 skills and its real system prompt listed only the 11 lifecycle skills; `/skill:sharpen` expanded the package skill. Pi 1.3.0's provider calls failed with `model_not_supported`; after Pi updated itself to 1.7.0, `gpt-6.1-sol` followed `/skill:sharpen` |
| Antigravity | Frontmatter `disable-model-invocation` | `/engineering:<skill>` for plugin skills; `/<skill>` for workspace skills | An install under a temporary `HOME` listed all 26 skills and `agy plugin validate --strict` passed. With the candidate temporarily installed as the owner's plugin, the model did not list `sharpen`, `teach` or `arena`; `/sharpen` was not found, and `/engineering:sharpen` expanded the plugin skill and was followed. The install was then restored byte for byte. Workspace skills in `.agents/skills` respond to `/sharpen` |
| Grok Bot | Frontmatter `disable-model-invocation` | Slash command | Grok 1.0.70 bundled documentation only |
| Copilot CLI | Frontmatter `disable-model-invocation` | `/<skill>` in interactive sessions | On 1.0.117 with an isolated `COPILOT_HOME`, `copilot skill list` found all 26 skills placed in a fixture's `.agents/skills`. The model listed only the lifecycle skills, and its own attempt to call `sharpen` failed with "Skill model invocation disabled". `-p` mode did not expand `/sharpen`; an interactive session did and recorded `skill.invoked` |

Pi's default discovery loads `~/.agents/skills` before a `--skill` package, and the first name
wins. On the owner's machine the personal `teach` and `code-review` shadow the package's skills of
the same name. Use the isolated `pi --no-skills --skill <package>/skills` invocation to load the
package's versions. Claude Code keeps both names apart (`teach` and `engineering:teach`), and
Antigravity lists the personal and package `code-review` side by side. Details and commands are in
[implementation.md](implementation.md).

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

- [Antigravity plugins](https://antigravity.google/docs/plugins)
- [Antigravity hooks](https://antigravity.google/docs/hooks)
- [Antigravity rules](https://antigravity.google/docs/rules)
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
