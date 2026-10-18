# Git and publication

Read before committing, pushing, changing a pull request, merging or recovering from a Git failure. Authorization requirements in the caller's `AGENTS.md` still apply.

- Commit only on an explicit request or explicit acceptance of a proposal including commits. Make small atomic commits with one independently meaningful purpose; split independently reviewable/revertible parts, coupling only their tests/docs. Stage only this session's changed or directly regenerated files you can account for; never use `git add -A`, `git add .` or `commit -a`.
- Push, PR creation/update, merges, pipeline triggers, force-push, branch deletion and remote-history rewriting each require authorization for that action class. "Push" excludes force-push, branch deletion and rewriting remote commits.
- Merge only the commit that was reviewed and whose CI passed under the [release gates](../skills/release-and-rollout/SKILL.md): always `gh pr merge --match-head-commit <reviewed sha>` (plus the repository's merge method flag). If the head moved, re-review and re-check instead of merging.
- Before merging, confirm the review checked the PR against `docs/decisions.md` when the project has one; see [project knowledge](project-knowledge.md).
- Diagnose unexpected Git failures non-destructively; retry only a clear, authorized correction. Before recovery that risks work, history or another session, or lacks credentials/authority, stop and show the decisive error. Treat documented non-zero statuses representing normal query results as expected outcomes. Never discard work to recover: no `reset --hard`, destructive `checkout`/`restore`, `clean`, dropped stashes or deleted lock files.
