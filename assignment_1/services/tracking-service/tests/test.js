const { test } = require("node:test");
const assert = require("node:assert/strict");
const { TrackingServiceImpl, InMemoryTrackingRepository } = require("../index.js");

function buildService() {
  const repo = new InMemoryTrackingRepository();
  return new TrackingServiceImpl(repo);
}

test("getTrackingRecord returns the seeded record for SHP-001", async () => {
  const service = buildService();
  const record = await service.getTrackingRecord("SHP-001");
  assert.equal(record.droneId, "DRN-07");
  assert.equal(record.progress, 62);
});

test("getTrackingRecord throws 404 for an unknown shipment", async () => {
  const service = buildService();
  await assert.rejects(
    () => service.getTrackingRecord("SHP-NOPE"),
    (err) => err.status === 404
  );
});

test("getEvents returns the seeded event log in order", async () => {
  const service = buildService();
  const events = await service.getEvents("SHP-001");
  assert.equal(events.length, 4);
  assert.equal(events[0].type, "ORDER_PLACED");
  assert.equal(events[3].type, "WAYPOINT_REACHED");
});

test("addEvent appends a new event and updates progress/location", async () => {
  const service = buildService();
  await service.addEvent("SHP-001", {
    type: "DELIVERED",
    description: "Package delivered",
    progress: 100,
    location: { lat: 43.77, lon: 11.25, alt: 0 },
  });

  const events = await service.getEvents("SHP-001");
  assert.equal(events.length, 5);
  assert.equal(events[4].type, "DELIVERED");

  const record = await service.getTrackingRecord("SHP-001");
  assert.equal(record.progress, 100);
  assert.equal(record.currentLocation.alt, 0);
});

test("addEvent rejects a request missing type or description", async () => {
  const service = buildService();
  await assert.rejects(
    () => service.addEvent("SHP-001", { type: "DELIVERED" }), // no description
    (err) => err.status === 400
  );
});

test("addEvent creates a new tracking record on first event for an unseen shipment", async () => {
  const service = buildService();
  await service.addEvent("SHP-NEW", { type: "ORDER_PLACED", description: "New order" });

  const record = await service.getTrackingRecord("SHP-NEW");
  assert.equal(record.events.length, 1);
  assert.equal(record.progress, 0);
});

test("getEta returns eta and progress without the full event log", async () => {
  const service = buildService();
  const eta = await service.getEta("SHP-001");
  assert.equal(eta.shipmentId, "SHP-001");
  assert.equal(eta.progress, 62);
  assert.ok(eta.eta);
});
