const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ShipmentServiceImpl, InMemoryShipmentRepository } = require("../index.js");

// Each test builds its own fresh repository + service, so tests never share
// state with each other or with the running app's module-level instances.
function buildService() {
  const repo = new InMemoryShipmentRepository();
  return new ShipmentServiceImpl(repo);
}

const validDto = () => ({
  customerId: "CUST-01",
  origin: { address: "Bologna Centrale", lat: 44.505, lon: 11.343 },
  destination: { address: "Modena", lat: 44.647, lon: 10.925 },
  packageSpec: { weight: 1.5, fragile: false },
});

test("getAllShipments returns the seeded shipments", async () => {
  const service = buildService();
  const shipments = await service.getAllShipments();
  assert.equal(shipments.length, 2);
  assert.ok(shipments.find((s) => s.id === "SHP-001"));
  assert.ok(shipments.find((s) => s.id === "SHP-002"));
});

test("getShipmentById returns the matching shipment", async () => {
  const service = buildService();
  const shipment = await service.getShipmentById("SHP-002");
  assert.equal(shipment.customerId, "CUST-02");
});

test("getShipmentById throws 404 for an unknown id", async () => {
  const service = buildService();
  await assert.rejects(
    () => service.getShipmentById("SHP-DOES-NOT-EXIST"),
    (err) => err.status === 404
  );
});

test("createShipment creates a new PENDING shipment with a generated id", async () => {
  const service = buildService();
  const created = await service.createShipment(validDto());
  assert.match(created.id, /^SHP-[A-F0-9]{6}$/);
  assert.equal(created.status, "PENDING");
  assert.equal(created.customerId, "CUST-01");

  const all = await service.getAllShipments();
  assert.equal(all.length, 3); // 2 seeded + 1 new
});

test("createShipment rejects a request missing origin/destination/packageSpec", async () => {
  const service = buildService();
  const dto = validDto();
  delete dto.origin;
  await assert.rejects(
    () => service.createShipment(dto),
    (err) => err.status === 400
  );
});

test("updateShipmentStatus updates an existing shipment", async () => {
  const service = buildService();
  const updated = await service.updateShipmentStatus("SHP-002", "CONFIRMED");
  assert.equal(updated.status, "CONFIRMED");
  assert.ok(updated.updatedAt);
});

test("updateShipmentStatus rejects an invalid status value", async () => {
  const service = buildService();
  await assert.rejects(
    () => service.updateShipmentStatus("SHP-002", "NOT_A_REAL_STATUS"),
    (err) => err.status === 400
  );
});

test("updateShipmentStatus returns 404 for an unknown shipment", async () => {
  const service = buildService();
  await assert.rejects(
    () => service.updateShipmentStatus("SHP-NOPE", "CONFIRMED"),
    (err) => err.status === 404
  );
});

test("cancelShipment sets status to CANCELLED", async () => {
  const service = buildService();
  const result = await service.cancelShipment("SHP-001");
  assert.equal(result.message, "Shipment cancelled");

  const shipment = await service.getShipmentById("SHP-001");
  assert.equal(shipment.status, "CANCELLED");
});
