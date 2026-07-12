/**
 * Shipment aggregate — EVENT SOURCING pattern.
 *
 * The aggregate never stores current state directly: state is *derived*
 * by folding (replaying) the full stream of domain events. Commands are
 * validated against the rehydrated state and, if legal, produce new events.
 *
 *   command --> decide(state, command) --> event
 *   state   = events.reduce(evolve, initialState)
 */

const EVENT_TYPES = Object.freeze({
  PLACED: "ShipmentPlaced",
  CONFIRMED: "ShipmentConfirmed",
  DRONE_ASSIGNED: "DroneAssigned",
  STATUS_CHANGED: "ShipmentStatusChanged",
  DELIVERED: "ShipmentDelivered",
  CANCELLED: "ShipmentCancelled",
});

const STATUS = Object.freeze({
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
});

const initialState = () => ({ exists: false, status: null, droneId: null, version: 0 });

/** Left-fold one event onto the aggregate state (pure function). */
function evolve(state, event) {
  const next = { ...state, version: state.version + 1 };
  switch (event.type) {
    case EVENT_TYPES.PLACED:
      return { ...next, exists: true, status: STATUS.PENDING };
    case EVENT_TYPES.CONFIRMED:
      return { ...next, status: STATUS.CONFIRMED };
    case EVENT_TYPES.DRONE_ASSIGNED:
      return { ...next, droneId: event.data.droneId };
    case EVENT_TYPES.STATUS_CHANGED:
      return { ...next, status: event.data.status };
    case EVENT_TYPES.DELIVERED:
      return { ...next, status: STATUS.DELIVERED };
    case EVENT_TYPES.CANCELLED:
      return { ...next, status: STATUS.CANCELLED };
    default:
      return state; // unknown events are ignored (forward compatibility)
  }
}

/** Rebuild aggregate state from its event history. */
const rehydrate = (events) => events.reduce(evolve, initialState());

/** Command handlers: validate invariants, emit events (no side effects). */
const decide = {
  place(state, { shipmentId, customerId, origin, destination, packageSpec, timeWindow }) {
    if (state.exists) throw new DomainError("Shipment already exists");
    if (!origin || !destination || !packageSpec) {
      throw new DomainError("origin, destination and packageSpec are required");
    }
    if (typeof packageSpec.weight !== "number" || packageSpec.weight <= 0 || packageSpec.weight > 5) {
      throw new DomainError("weight must be a number in (0, 5] kg (drone payload limit)");
    }
    return makeEvent(EVENT_TYPES.PLACED, shipmentId, {
      customerId, origin, destination, packageSpec,
      timeWindow: timeWindow || { earliest: new Date().toISOString(), latest: null },
    });
  },

  confirm(state, { shipmentId }) {
    assertExists(state);
    if (state.status !== STATUS.PENDING) throw new DomainError(`Cannot confirm shipment in status ${state.status}`);
    return makeEvent(EVENT_TYPES.CONFIRMED, shipmentId, {});
  },

  assignDrone(state, { shipmentId, droneId }) {
    assertExists(state);
    if (state.status !== STATUS.CONFIRMED) throw new DomainError("Drone can only be assigned to a CONFIRMED shipment");
    return makeEvent(EVENT_TYPES.DRONE_ASSIGNED, shipmentId, { droneId });
  },

  changeStatus(state, { shipmentId, status }) {
    assertExists(state);
    const legal = {
      [STATUS.PENDING]: [STATUS.CONFIRMED, STATUS.CANCELLED],
      [STATUS.CONFIRMED]: [STATUS.IN_TRANSIT, STATUS.CANCELLED],
      [STATUS.IN_TRANSIT]: [STATUS.DELIVERED],
    };
    if (!(legal[state.status] || []).includes(status)) {
      throw new DomainError(`Illegal transition ${state.status} -> ${status}`);
    }
    if (status === STATUS.DELIVERED) return makeEvent(EVENT_TYPES.DELIVERED, shipmentId, {});
    if (status === STATUS.CANCELLED) return makeEvent(EVENT_TYPES.CANCELLED, shipmentId, { reason: "requested" });
    return makeEvent(EVENT_TYPES.STATUS_CHANGED, shipmentId, { status });
  },

  cancel(state, { shipmentId }) {
    assertExists(state);
    if ([STATUS.DELIVERED, STATUS.CANCELLED].includes(state.status)) {
      throw new DomainError(`Cannot cancel shipment in status ${state.status}`);
    }
    return makeEvent(EVENT_TYPES.CANCELLED, shipmentId, { reason: "requested" });
  },
};

class DomainError extends Error {}

function assertExists(state) {
  if (!state.exists) throw new DomainError("Shipment not found");
}

function makeEvent(type, shipmentId, data) {
  return { type, aggregateId: shipmentId, data, occurredAt: new Date().toISOString() };
}

module.exports = { EVENT_TYPES, STATUS, initialState, evolve, rehydrate, decide, DomainError };
