# Review aspects

Use these briefs to select and prompt ordinary reviewers. `all` selects every applicable aspect and
is not itself a finding source.

## code

Always applicable unless the user explicitly requests only other aspects. Check changed behavior,
logic, concurrency, performance, compatibility, accessibility, and maintainability. Enforce the
repository's documented rules and cite the exact rule. Do not turn personal preference into a
standard or repeat issues that tooling already enforces.

Use the following Fowler-style smells only as labelled judgement calls. A documented repository
rule overrides them, and a smell is not a defect without a concrete cost:

- Mysterious Name
- Duplicated Code
- Feature Envy
- Data Clumps
- Primitive Obsession
- Repeated Switches
- Shotgun Surgery
- Divergent Change
- Speculative Generality
- Message Chains
- Middle Man
- Refused Bequest

## comments

Applicable when comments, docstrings, README/API guidance, or explanatory prose changed, or when the
user requests it. Verify factual claims against current behavior, important assumptions and side
effects, misleading examples, stale references, comment rot, and prose that merely repeats obvious
implementation. Treat a design document as both documentation and a design-focused review input.

## tests

Applicable when behavior or tests changed, or when the user requests it. Map changed behavior to
tests and find consequential gaps in success, failure, boundary, negative, async, and concurrency
paths. Prefer behavior/contract coverage over line coverage. Identify brittle tests coupled to
implementation details and explain the regression each proposed test would catch.

## errors

Applicable when the change touches exceptions, result/error values, callbacks, retries, fallbacks,
defaults on failure, optional access that may hide absence, logging, or user-facing failures. Find
swallowed errors, broad catches, success-shaped fallbacks, missing context, incorrect propagation,
and cleanup/resource failures. Judge fallbacks against the actual product contract rather than a
blanket rule that every fallback is wrong.

## types

Applicable when types, schemas, data models, public interfaces, or state machines changed, or when
the user requests it. Identify invariants, then assess encapsulation, illegal states, construction
and mutation boundaries, compile-time versus runtime enforcement, usefulness, compatibility, and
complexity cost. Preserve domain-specific analysis rather than forcing a numeric score.

## spec

Applicable only when an authoritative specification is available. Check missing or partial
requirements, behavior that was not requested, and implementations that appear to satisfy a
requirement but do so incorrectly. Cite the specification evidence for every candidate. Skip this
aspect when no authoritative source exists.

## security

Applicable when explicitly requested or when the change affects authentication, authorization,
sessions, secrets, cryptography, signatures, untrusted input, parsing, deserialization, uploads,
dynamic execution, shell/process boundaries, filesystem paths or permissions, storage, network
boundaries, webhooks, sensitive data, dependencies, CI/CD, deployment, infrastructure permissions,
or controls named by `SECURITY.md`.

Security is handled only through `$codex-security:security-diff-scan` when available. Ordinary
reviewers may still report an obvious correctness issue with security impact, but that does not
constitute completion of the security aspect.
