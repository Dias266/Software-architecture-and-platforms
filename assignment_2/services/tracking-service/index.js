/**
 * Tracking Service — cross-service CQRS read model.
 *
 * Consumes domain events pushed by the order service (event-carried state
 * transfer) and maintains a tracking timeline per shipment: the query side
 * that customers poll ("where is my package?"). It never talks back to the
 * order service — reads are served entirely from its own local model.
 */
const express = require("express");
const cors = require("cors");
const client = require("prom-client");

const app = express();
app.use(cors());
app.use(express.json());

// shipmentId -> { status, timeline[], etaMinutes }
const tracking = new Map();

// ── Prometheus metrics ────────────────────────────────────────────────────
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });
const eventsConsumed = new client.Counter({
  name: "tracking_service_events_consumed_total",
  help: "Domain events consumed from the order service",
  labelNames: ["event_type"],
  registers: [registry],
});
const httpRequests = new client.Counter({
  name: "tracking_service_http_requests_total",
  help: "HTTP requests to the tracking service",
  labelNames: ["route", "method", "status_code"],
  registers: [registry],
});
app.use((req, res, next) => {
  res.on("finish", () => httpRequests.inc({ route: req.path, method: req.method, status_code: res.statusCode }));
  next();
});

const ETA_BY_STATUS = { PENDING: null, CONFIRMED: 45, IN_TRANSIT: 20, DELIVERED: 0, CANCELLED: null };

// ── Event intake (called by order service on every appended event) ───────
app.post("/events", (req, res) => {
  const event = req.body;
  if (!event?.type || !event?.aggregateId) return res.status(400).json({ error: "Malformed event" });

  eventsConsumed.inc({ event_type: event.type });
  const id = event.aggregateId;
  if (!tracking.has(id)) tracking.set(id, { shipmentId: id, status: "PENDING", timeline: [], etaMinutes: null });

  const entry = tracking.get(id);
  const statusByEvent = {
    ShipmentPlaced: "PENDING", ShipmentConfirmed: "CONFIRMED",
    ShipmentStatusChanged: event.data?.status, ShipmentDelivered: "DELIVERED", ShipmentCancelled: "CANCELLED",
  };
  if (statusByEvent[event.type]) {
    entry.status = statusByEvent[event.type];
    entry.etaMinutes = ETA_BY_STATUS[entry.status] ?? entry.etaMinutes;
  }
  if (event.type === "DroneAssigned") entry.droneId = event.data?.droneId;
  entry.timeline.push({ event: event.type, at: event.occurredAt, details: event.data });

  res.status(202).json({ accepted: true });
});

// ── Queries ───────────────────────────────────────────────────────────────
app.get("/tracking/:shipmentId", (req, res) => {
  const entry = tracking.get(req.params.shipmentId);
  if (!entry) return res.status(404).json({ error: "No tracking info for this shipment" });
  res.json(entry);
});

app.get("/tracking", (req, res) => res.json([...tracking.values()]));

// ── Observability ─────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    service: "tracking-service", status: "UP", version: "2.0.0",
    checks: { readModel: { status: "UP", shipmentsTracked: tracking.size } },
    timestamp: new Date().toISOString(),
  });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`[tracking-service] listening on :${PORT}`));
