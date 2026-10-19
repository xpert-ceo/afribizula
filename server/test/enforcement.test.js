import { test } from "node:test";
import assert from "node:assert/strict";
import { startStack } from "./helpers.js";

test("subscription enforcement (when enabled) blocks writes without an active plan", async () => {
  const s = await startStack({ SUBSCRIPTION_ENFORCEMENT: "true" });
  try {
    const o = await s.owner("enforced@example.com");
    const r = await s.api("POST", "/api/inventory/departments", { token: o.token, body: { name: "X" } });
    assert.equal(r.status, 402);
    assert.equal(r.body.details.code, "SUBSCRIPTION_REQUIRED");
    const read = await s.api("GET", "/api/inventory/departments", { token: o.token });
    assert.equal(read.status, 200, "reads remain available");
  } finally {
    await s.stop();
  }
});
