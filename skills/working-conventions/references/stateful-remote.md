# Stateful and remote work

Read before multi-step shell or SSH work that changes local or external state.

- Use a persistent script for multi-step shell/SSH work when interruption could leave partially applied state; duration alone requires neither script nor delegation. Keep it outside the repository unless requested as a deliverable or an explicit write boundary requires an authorized repository path. Reruns detect completed work and apply only the remainder, never delete/recreate state.
- Keep credentials out of scripts and read them from the environment. Show the script and location before its first state-changing run. External mutations retain their authorization requirements; prefer connectors with safer transaction/persistence semantics.
