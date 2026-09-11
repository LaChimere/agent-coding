# Evals

Bun and TypeScript scaffold for the repository's Codex evaluation project.
The evaluation runner is not implemented yet.

## Setup

Run these commands from this directory with Bun 1.4.2:

```sh
bun install --frozen-lockfile
bun run start
```

The [frozen quality baseline](AGENTS.md#frozen-quality-baseline) requires the
repository owner's explicit approval before any validation or code-style rule is
weakened or bypassed.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Run the entry point in watch mode. |
| `bun run start` | Run `src/index.ts`. |
| `bun run build` | Rebuild `dist/index.js` for Bun. |
| `bun run check` | Run TypeScript checking and Biome checking. |
| `bun run lint` | Check formatting, imports, and lint rules; warnings fail. |
| `bun run lint:fix` | Apply Biome's safe fixes; remaining warnings fail. |
| `bun run test` | Run local tests under `tests/`. |
| `bun run test:coverage` | Run those tests with coverage reporting. |

The scaffold has no behavioral tests yet. Test commands explicitly allow an empty
test suite; a successful empty run does not establish behavior or coverage.
Tests belong under `tests/` so future evaluation fixtures are not collected as
framework tests. The configured line-coverage threshold is 80% when coverage is
measured. Generated files and dependencies remain ignored inside this project.

## Git hooks

`lefthook.yml` lives in this directory. The `hooks` package script sets
`LEFTHOOK_CONFIG` relative to the Git root so no root-level configuration is needed.
The launcher preserves the Git worktree root before entering the package directory.
Pre-commit runs `lint` when staged files affect `evals/`. Pre-push runs `check`
and local `test` in parallel when outgoing changes affect `evals/`. Hooks do not
modify or stage files, run model evaluations, or access a model provider.

To install the hooks explicitly:

```sh
bun run hooks install
```

Git worktrees share hooks by default. In a linked worktree, configure a
[worktree-specific hooks path](https://git-scm.com/docs/git-worktree#_configuration_file)
such as `evals/.cache/git-hooks`, preserving any existing hooks. Once
`core.hooksPath` is set, use `bun run hooks install --force` to install into that
selected directory. Installation is explicit rather than a package setup script.

To check the hook configuration and run its commands without installing hooks:

```sh
bun run hooks validate
bun run hooks run pre-commit --no-auto-install --file evals/src/index.ts
bun run hooks run pre-push --no-auto-install --file evals/src/index.ts
```
