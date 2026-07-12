/**
 * UNIT LEVEL (gateway): circuit breaker state machine in isolation.
 */
const { test } = require("node:test");
const assert = require("node:assert");
const { CircuitBreaker, STATES } = require("../circuit-breaker");

const failing = () => Promise.reject(new Error("boom"));
const ok = () => Promise.resolve("ok");

test("opens after the failure threshold and fails fast", async () => {
  const cb = new CircuitBreaker({ name: "t", failureThreshold: 3, resetTimeoutMs: 60000 });
  for (let i = 0; i < 3; i++) await assert.rejects(() => cb.exec(failing));
  assert.equal(cb.state, STATES.OPEN);
  await assert.rejects(() => cb.exec(ok), (err) => err.circuitOpen === true); // no call reaches upstream
});

test("half-opens after the reset timeout and closes on success", async () => {
  const cb = new CircuitBreaker({ name: "t", failureThreshold: 1, resetTimeoutMs: 20 });
  await assert.rejects(() => cb.exec(failing));
  assert.equal(cb.state, STATES.OPEN);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(await cb.exec(ok), "ok"); // trial call succeeds
  assert.equal(cb.state, STATES.CLOSED);
});

test("re-opens if the half-open trial call fails", async () => {
  const cb = new CircuitBreaker({ name: "t", failureThreshold: 1, resetTimeoutMs: 20 });
  await assert.rejects(() => cb.exec(failing));
  await new Promise((r) => setTimeout(r, 30));
  await assert.rejects(() => cb.exec(failing));
  assert.equal(cb.state, STATES.OPEN);
});
