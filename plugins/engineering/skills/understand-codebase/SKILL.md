---
name: understand-codebase
description: Explain a subsystem, trace actual behavior, investigate a failure or recover the rationale for a design from source, runtime evidence and relevant history.
---

# Understand a codebase

Read [the shared agreement](../../references/working-agreement.md). Answer the actual engineering
question; explanation and investigation remain read-only unless a specific experiment or artifact
is authorized. A question does not authorize fixing the problem found.

## Ground the question

Identify the outcome the reader needs: understanding, diagnosis, impact or rationale. Name the
target, relevant version/environment and what is already known. Resolve material ambiguity from
available sources before asking. Select the raw evidence and methods that can answer the question;
an expert label is not a substitute for inspecting them.

Start at the actual entry point and follow data, calls, ownership and failure handling through
the affected path. Inspect callers, contracts and tests when they establish reachability or intent.
Search narrowly, expand on concrete dependencies, and stop collecting once the answer is supported.
Use separate investigation contexts only when they reduce noise or answer independent questions.

## Explain or diagnose

For **how**, connect inputs, state transitions, outputs and side effects. Show who owns each
important decision and where a caller crosses an interface. A short diagram helps relationships;
a file list alone does not explain behavior.

For **why**, consult relevant decisions, changes, issues and review discussions when accessible.
Distinguish a recorded rationale from an inference; historical context is not current truth.
Check whether the original constraint still applies without silently overturning it.

For **a failure**, reconstruct the exact input and user/controller path. Preserve timestamp,
version, symptom and decisive logs. Seek a reproducible cause and test competing hypotheses.
Use an authorized local experiment or the existing harness; adjacent CLI/API success does not
prove a failing UI path works. An unavailable reproduction is a limitation, not a diagnosis.

## Return usable knowledge

Lead with the supported explanation or diagnosis and decisive evidence. Connect source locations
to behavior, define project terms and separate facts, hypotheses, counterevidence and unknowns.
Include the smallest next experiment or decision that would close a material gap. Persist an
explainer only when useful and authorized; update existing project knowledge rather than create
disconnected copies. Implementation, if requested next, uses the same established facts.
