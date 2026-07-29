import assert from "node:assert/strict";
import { advanceFromRequest } from "../src/http/checkout-request";

assert.equal(advanceFromRequest("pending", { action: "authorize" }), "authorized");
assert.throws(() => advanceFromRequest("pending", { action: "unknown" }));
