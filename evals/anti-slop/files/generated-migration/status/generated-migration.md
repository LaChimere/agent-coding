# Generated client and migration status

`src/generated/client.js` is reproducible output from the owned
`scripts/generate-client.js` generator and `api/openapi.json` input. The scoped generation
check is `node --test test/client-compat.test.js`.

`src/compat/legacy-user-adapter.js` is a compatibility path for the v3 migration release
only. Remove it when legacy callers have moved to `getUser`; the compatibility test must
remain green until then.
