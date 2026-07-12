/**
 * CQRS read-side PROJECTION.
 *
 * The query model is fully decoupled from the event-sourced write model:
 * it is rebuilt by folding events into a denormalised "shipment view"
 * optimised for reads (list & detail queries hit this map, never the
 * event store). If the schema changes, drop the map and replay the log.
 */
const { EVENT_TYPES } = require("./domain/shipment");

class ShipmentProjection {
  constructor() {
    this.views = new Map(); // shipmentId -> read model
  }

  /** Apply one event to the read model (idempotent per event). */
  apply(event) {
    const id = event.aggregateId;
    switch (event.type) {
      case EVENT_TYPES.PLACED:
        this.views.set(id, {
          id,
          customerId: event.data.customerId || "CUST-ANONYMOUS",
          origin: event.data.origin,
          destination: event.data.destination,
          packageSpec: event.data.packageSpec,
          timeWindow: event.data.timeWindow,
          status: "PENDING",
          droneId: null,
          createdAt: event.occurredAt,
          updatedAt: event.occurredAt,
          history: [{ type: event.type, at: event.occurredAt }],
        });
        break;
      case EVENT_TYPES.CONFIRMED:
        this._patch(id, event, { status: "CONFIRMED" });
        break;
      case EVENT_TYPES.DRONE_ASSIGNED:
        this._patch(id, event, { droneId: event.data.droneId });
        break;
      case EVENT_TYPES.STATUS_CHANGED:
        this._patch(id, event, { status: event.data.status });
        break;
      case EVENT_TYPES.DELIVERED:
        this._patch(id, event, { status: "DELIVERED" });
        break;
      case EVENT_TYPES.CANCELLED:
        this._patch(id, event, { status: "CANCELLED" });
        break;
    }
  }

  _patch(id, event, changes) {
    const view = this.views.get(id);
    if (!view) return;
    Object.assign(view, changes, { updatedAt: event.occurredAt });
    view.history.push({ type: event.type, at: event.occurredAt });
  }

  list() { return [...this.views.values()]; }
  byId(id) { return this.views.get(id) || null; }

  /** Rebuild from scratch by replaying the whole log. */
  rebuild(events) {
    this.views.clear();
    for (const e of events) this.apply(e);
  }
}

module.exports = { ShipmentProjection };
