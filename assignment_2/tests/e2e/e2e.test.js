/**
 * END-TO-END LEVEL of the test pyramid.
 * Runs against the full dockerised system (docker compose up) and drives
 * the business scenario exclusively through the API GATEWAY — exactly as
 * a real client would: place -> confirm -> mission -> track -> deliver.
 *
 *   docker compose up -d --build
 *   node --test tests/e2e/e2e.test.js
 */
const { test } = require("node:test");
const assert = require("node:assert");

const GATEWAY = process.env.GATEWAY_URL || "http://localhost:8080";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("customer journey: ship a package from Bologna to Modena", async () => {
  // 0. the platform is healthy (aggregated health check via the gateway)
  const health = await (await fetch(`${GATEWAY}/health`)).json();
  assert.equal(health.status, "UP", "all services should be UP before the journey");

  // 1. place a shipment (through the gateway -> order service)
  let r = await fetch(`${GATEWAY}/api/shipments`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: "CUST-E2E",
      origin: { address: "Bologna Centrale", lat: 44.505, lon: 11.343 },
      destination: { address: "Modena", lat: 44.647, lon: 10.925 },
      packageSpec: { weight: 1.5, fragile: false },
    }),
  });
  assert.equal(r.status, 201);
  const { id } = await r.json();

  // 2. confirm it
  r = await fetch(`${GATEWAY}/api/shipments/${id}/confirm`, { method: "POST" });
  assert.equal(r.status, 200);

  // 3. create a drone mission (mission service calls order service back)
  r = await fetch(`${GATEWAY}/api/missions`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shipmentId: id, weightKg: 1.5 }),
  });
  assert.equal(r.status, 201);
  const mission = await r.json();
  assert.ok(mission.droneId, "a drone must be assigned");

  // 4. shipment is now IN_TRANSIT with a drone (order service callbacks done)
  await wait(500);
  const view = await (await fetch(`${GATEWAY}/api/shipments/${id}`)).json();
  assert.equal(view.status, "IN_TRANSIT");
  assert.equal(view.droneId, mission.droneId);

  // 5. tracking service received the events (event-carried state transfer)
  const trackingInfo = await (await fetch(`${GATEWAY}/api/tracking/${id}`)).json();
  assert.equal(trackingInfo.status, "IN_TRANSIT");
  assert.ok(trackingInfo.timeline.length >= 3, "timeline should contain the event history");

  // 6. deliver and verify final state on both read models
  r = await fetch(`${GATEWAY}/api/shipments/${id}/status`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "DELIVERED" }),
  });
  assert.equal(r.status, 200);
  await wait(500);
  const final = await (await fetch(`${GATEWAY}/api/tracking/${id}`)).json();
  assert.equal(final.status, "DELIVERED");
  assert.equal(final.etaMinutes, 0);
});
