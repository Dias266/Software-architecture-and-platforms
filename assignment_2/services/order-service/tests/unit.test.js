/**
 * UNIT LEVEL of the test pyramid.
 * Pure domain logic: no HTTP, no I/O, no framework — the event-sourced
 * Shipment aggregate is tested by replaying events and issuing commands.
 */
const { test } = require("node:test");
const assert = require("node:assert");
const { decide, rehydrate, evolve, initialState, EVENT_TYPES, DomainError } = require("../domain/shipment");

const place = (id = "SHP-TEST01") =>
  decide.place(initialState(), {
    shipmentId: id,
    customerId: "CUST-01",
    origin: { address: "Bologna", lat: 44.49, lon: 11.34 },
    destination: { address: "Modena", lat: 44.65, lon: 10.93 },
    packageSpec: { weight: 1.2, fragile: false },
  });

test("placing a shipment emits ShipmentPlaced and state becomes PENDING", () => {
  const event = place();
  assert.equal(event.type, EVENT_TYPES.PLACED);
  const state = rehydrate([event]);
  assert.equal(state.exists, true);
  assert.equal(state.status, "PENDING");
});

test("state is fully rebuilt by replaying the event stream (event sourcing)", () => {
  const e1 = place();
  const s1 = rehydrate([e1]);
  const e2 = decide.confirm(s1, { shipmentId: "SHP-TEST01" });
  const s2 = rehydrate([e1, e2]);
  const e3 = decide.assignDrone(s2, { shipmentId: "SHP-TEST01", droneId: "DRN-ALPHA" });
  const state = rehydrate([e1, e2, e3]);
  assert.equal(state.status, "CONFIRMED");
  assert.equal(state.droneId, "DRN-ALPHA");
  assert.equal(state.version, 3);
});

test("weight above drone payload limit is rejected", () => {
  assert.throws(
    () => decide.place(initialState(), {
      shipmentId: "SHP-HEAVY", origin: {}, destination: {}, packageSpec: { weight: 12 },
    }),
    DomainError
  );
});

test("a DELIVERED shipment cannot be cancelled (invariant)", () => {
  const e1 = place();
  const delivered = { type: EVENT_TYPES.DELIVERED, aggregateId: "SHP-TEST01", data: {}, occurredAt: new Date().toISOString() };
  const state = [e1, delivered].reduce(evolve, initialState());
  assert.throws(() => decide.cancel(state, { shipmentId: "SHP-TEST01" }), DomainError);
});

test("illegal status transition PENDING -> DELIVERED is rejected", () => {
  const state = rehydrate([place()]);
  assert.throws(
    () => decide.changeStatus(state, { shipmentId: "SHP-TEST01", status: "DELIVERED" }),
    DomainError
  );
});

test("unknown event types are ignored (forward compatibility)", () => {
  const state = rehydrate([place(), { type: "SomethingNew", aggregateId: "SHP-TEST01", data: {} }]);
  assert.equal(state.status, "PENDING");
});
