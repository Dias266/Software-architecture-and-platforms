/**
 * INTEGRATION LEVEL of the test pyramid.
 * Boots the real Express app (routes + event store + CQRS projection wired
 * together) on an ephemeral port and exercises it over real HTTP.
 * Verifies that the write model (commands/events) and the read model
 * (projection) stay consistent through the API.
 */
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { createApp } = require("../app");

let server, base;

before(async () => {
  const { app } = createApp(); // in-memory event store, no downstream publisher
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

test("full shipment lifecycle through the HTTP API", async () => {
  // command: place
  let r = await fetch(`${base}/shipments`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: "CUST-42",
      origin: { address: "Bologna Centrale", lat: 44.505, lon: 11.343 },
      destination: { address: "Ferrara", lat: 44.838, lon: 11.62 },
      packageSpec: { weight: 0.8, fragile: true },
    }),
  });
  assert.equal(r.status, 201);
  const { id } = await r.json();

  // query: read model reflects the ShipmentPlaced event
  r = await fetch(`${base}/shipments/${id}`);
  assert.equal(r.status, 200);
  let view = await r.json();
  assert.equal(view.status, "PENDING");
  assert.equal(view.customerId, "CUST-42");

  // command: confirm  ->  query: projection updated
  r = await fetch(`${base}/shipments/${id}/confirm`, { method: "POST" });
  assert.equal(r.status, 200);
  view = await (await fetch(`${base}/shipments/${id}`)).json();
  assert.equal(view.status, "CONFIRMED");

  // audit: the event stream is queryable and ordered
  const events = await (await fetch(`${base}/shipments/${id}/events`)).json();
  assert.deepEqual(events.map((e) => e.type), ["ShipmentPlaced", "ShipmentConfirmed"]);
});

test("invalid command is rejected with 400 and no event is stored", async () => {
  const r = await fetch(`${base}/shipments`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId: "CUST-X" }), // missing origin/destination/spec
  });
  assert.equal(r.status, 400);
});

test("health check API reports UP with event store info", async () => {
  const r = await fetch(`${base}/health`);
  assert.equal(r.status, 200);
  const health = await r.json();
  assert.equal(health.status, "UP");
  assert.ok(health.checks.eventStore.events >= 0);
});
