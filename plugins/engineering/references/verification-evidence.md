# Verification evidence

Use this reference when designing or running checks. Start from the acceptance claim, then
choose the smallest checks that can actually establish it and the affected existing contracts.

| Work | Useful evidence |
|---|---|
| Bug repair | The original input fails for the expected cause, then succeeds after the fix |
| Feature | User scenarios and boundary conditions derived from requirements |
| Refactor | Preserved observable contracts and the intended structural improvement |
| Performance | Comparable workload, environment and measurements before/after; preserved correctness |
| Documents/configuration | Correct source facts, resolved references, parsed or exercised settings as applicable |
| Critical state/data | Invariants, failure/recovery paths and risk-appropriate properties or fault injection |

Inspect what a command runs before interpreting it. Test expectations must come from the
contract rather than the implementation under test. Mocks can isolate a genuine boundary;
they must not supply the very behavior being claimed. A compilation result does not establish
an unexercised user journey. Use a mutation, reverted implementation or negative control when
needed to establish that a check detects the relevant failure; do not add them as ceremony.

For real-app checks, reach the actual user entry point. Confirm prerequisites and the running
build, perform the action, observe the resulting state and relevant side effects. Internal
setters, test-only endpoints and a final screenshot alone may omit the behavior under test.
Include alternate mapped entry points when the claim covers them. A reachable but untested
feature remains untested; an unreachable one needs its attempted route and concrete prerequisite.

Record enough to reproduce the result: code/artifact identity, environment and inputs, exact
command or interaction, decisive output, and evidence location. Keep large logs outside the
summary and exclude secrets or unnecessary private data. Preserve evidence after cleanup.
Health-check a new or surprising instance; reset or relaunch a wedged interaction even if its
process is healthy. Clean up only resources created by the run, including failed attempts;
never terminate by broad process name or overwrite the user's session.

Do not change expectations, suppress failures or substitute another environment merely to get
green checks. Investigate the cause. If a substitute is useful, state what it proves and which
target-only conditions remain untested. Required missing evidence leaves acceptance incomplete.

Differentiate completion scopes: a verification tool exercised once, a named feature verified,
the complete mapped surface covered, and a release verified are distinct claims. Report only
the scope supported by the observations.
