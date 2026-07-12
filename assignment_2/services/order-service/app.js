/**
 * Order Service — command side (Event Sourcing) + query side (CQRS).
 *
 * COMMANDS (writes)                  QUERIES (reads)
 *  POST   /shipments                  GET /shipments
 *  POST   /shipments/:id/confirm      GET /shipments/:id
 *  POST   /shipments/:id/drone        GET /shipments/:id/events  (audit log)
 *  PATCH  /shipments/:id/status
 *  DELETE /shipments/:id
 *
 * Every accepted command appends an event to the event store; the CQRS
 * projection and the outbound integration publisher are event-store
 * subscribers, so they stay consistent with zero coupling to handlers.
 *
 * OBSERVABILITY: /health (liveness + dependency info) and /metrics
 * (Prometheus exposition format via prom-client).
 */
const express = require("express");
const cors = require("cors");
const { randomUUID } = require("crypto");
const client = require("prom-client");

const { EventStore } = require("./eventstore");
const { ShipmentProjection } = require("./projection");
const { decide, rehydrate, DomainError } = require("./domain/shipment");

function createApp({ eventStoreFile = null, trackingUrl = null } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── Event Sourcing wiring ──────────────────────────────────────────────
  const store = new EventStore({ file: eventStoreFile });
  const projection = new ShipmentProjection();
  projection.rebuild(store.all());          // recover read model on boot
  store.subscribe((e) => projection.apply(e)); // keep it in sync

  // ── Observability: Prometheus application metrics ─────────────────────
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry });
  const httpRequests = new client.Counter({
    name: "order_service_http_requests_total",
    help: "HTTP requests to the order service",
    labelNames: ["route", "method", "status_code"],
    registers: [registry],
  });
  const httpDuration = new client.Histogram({
    name: "order_service_request_duration_seconds",
    help: "Latency of order service HTTP handlers",
    labelNames: ["route", "method"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [registry],
  });
  const eventsAppended = new client.Counter({
    name: "order_service_events_appended_total",
    help: "Domain events appended to the event store",
    labelNames: ["event_type"],
    registers: [registry],
  });
  const publishFailures = new client.Counter({
    name: "order_service_event_publish_failures_total",
    help: "Failed event notifications to downstream services",
    registers: [registry],
  });
  store.subscribe((e) => eventsAppended.inc({ event_type: e.type }));

  app.use((req, res, next) => {
    const end = httpDuration.startTimer({ route: req.path.split("/").slice(0, 2).join("/") || "/", method: req.method });
    res.on("finish", () => {
      end();
      httpRequests.inc({ route: req.route?.path || req.path, method: req.method, status_code: res.statusCode });
    });
    next();
  });

  // ── Integration: notify tracking service of every domain event ────────
  // (event-carried state transfer over HTTP; replaced by Kafka in A#03)
  if (trackingUrl) {
    store.subscribe(async (event) => {
      try {
        await fetch(`${trackingUrl}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });
      } catch {
        publishFailures.inc(); // observable, non-blocking failure
      }
    });
  }

  // ── Helper: run a command against the rehydrated aggregate ────────────
  function execute(shipmentId, commandFn) {
    const state = rehydrate(store.streamOf(shipmentId));
    const event = commandFn(state);
    return store.append(event);
  }

  // ── COMMAND endpoints (write model) ────────────────────────────────────
  app.post("/shipments", (req, res) => {
    const shipmentId = "SHP-" + randomUUID().slice(0, 6).toUpperCase();
    try {
      execute(shipmentId, (s) => decide.place(s, { shipmentId, ...req.body }));
      res.status(201).json({ id: shipmentId, status: "PENDING" });
    } catch (err) { handleError(err, res); }
  });

  app.post("/shipments/:id/confirm", (req, res) => {
    try {
      execute(req.params.id, (s) => decide.confirm(s, { shipmentId: req.params.id }));
      res.json({ id: req.params.id, status: "CONFIRMED" });
    } catch (err) { handleError(err, res); }
  });

  app.post("/shipments/:id/drone", (req, res) => {
    try {
      execute(req.params.id, (s) => decide.assignDrone(s, { shipmentId: req.params.id, droneId: req.body.droneId }));
      res.json({ id: req.params.id, droneId: req.body.droneId });
    } catch (err) { handleError(err, res); }
  });

  app.patch("/shipments/:id/status", (req, res) => {
    try {
      execute(req.params.id, (s) => decide.changeStatus(s, { shipmentId: req.params.id, status: req.body.status }));
      res.json({ id: req.params.id, status: req.body.status });
    } catch (err) { handleError(err, res); }
  });

  app.delete("/shipments/:id", (req, res) => {
    try {
      execute(req.params.id, (s) => decide.cancel(s, { shipmentId: req.params.id }));
      res.json({ message: "Shipment cancelled", id: req.params.id });
    } catch (err) { handleError(err, res); }
  });

  // ── QUERY endpoints (read model — CQRS projection, not the event log) ─
  app.get("/shipments", (req, res) => res.json(projection.list()));

  app.get("/shipments/:id", (req, res) => {
    const view = projection.byId(req.params.id);
    if (!view) return res.status(404).json({ error: "Shipment not found" });
    res.json(view);
  });

  // Audit query: raw event stream of one aggregate (event sourcing bonus)
  app.get("/shipments/:id/events", (req, res) => {
    const events = store.streamOf(req.params.id);
    if (events.length === 0) return res.status(404).json({ error: "Shipment not found" });
    res.json(events);
  });

  // ── Observability endpoints ────────────────────────────────────────────
  app.get("/health", (req, res) => {
    res.json({
      service: "order-service",
      status: "UP",
      version: "2.0.0",
      checks: { eventStore: { status: "UP", events: store.all().length } },
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/metrics", async (req, res) => {
    res.set("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  });

  function handleError(err, res) {
    if (err instanceof DomainError) {
      const code = err.message.includes("not found") ? 404 : 400;
      return res.status(code).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }

  return { app, store, projection };
}

module.exports = { createApp };
