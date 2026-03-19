# Azure CLI Reference for ADO PR Operations

Use these command patterns when executing PR operations. Adapt flags and values based on the shared `skills/ado-config.json` and the current branch context.

## Check for existing PR

```bash
az repos pr list \
  --source-branch "<source-branch>" \
  --status active \
  --org "<org>" \
  --project "<project>" \
  --output json
```

## Create a new PR

```bash
az repos pr create \
  --source-branch "<source-branch>" \
  --target-branch "<target-branch>" \
  --title "<title>" \
  --description @<body-file> \
  --org "<org>" \
  --project "<project>" \
  --repository "<repo>"
```

Do not add `--auto-complete`, `--draft`, or `--merge-commit-message`.

## Update an existing PR

```bash
az repos pr update \
  --id "<pr-id>" \
  --title "<title>" \
  --description @<body-file> \
  --org "<org>" \
  --project "<project>"
```

## Push the branch first (if not on remote)

```bash
git push --set-upstream origin "<branch-name>"
```

## Check initial PR status after creation

```bash
az repos pr show --id "<pr-id>" --org "<org>" --output json
az repos pr policy list --id "<pr-id>" --org "<org>" --output json
```

## Common pitfalls

- `az repos pr create` fails silently if the source branch does not exist on the remote.
- `--description` with `@<file>` reads the file contents as the body; without `@` it treats the string as literal.
- If `--repository` is omitted and the org has multiple repos in the project, the command may pick the wrong one.
