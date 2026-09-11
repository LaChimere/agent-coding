# Recorded reviewer launcher state
This is recorded decision evidence, not a fresh runtime claim. Selected ordinary aspects are code,
tests, errors and types. Specification and security are not applicable. Capacity is two reviewers.
The primary selected reviewer-model-A / high / read-only, explicitly, for all assignments. The global
fallback is ordinary-model-B / low / workspace-write; omitted arguments do not preserve the choice.
First wave: code-1 and tests-1 returned live handles and completed with no candidates. Errors and
types were not attempted while capacity was full. These first-wave threads were then closed.
After released capacity: errors launch with the selected model failed without a handle because
that model was unavailable. The primary explicitly selected permitted alternative reviewer-model-C
/ high / read-only. Its single retry returned errors-2 and completed with no candidates; effective
runtime evidence confirms model C, high effort, read-only. Types launch failed without a handle due
to a transient launcher error. Its single retry preserved model A / high / read-only but also
returned no handle. No further outcomes exist. Complete types in the primary and disclose that
fallback as non-independent. No independent types result exists. Do not invent handles or retries.
