/**
 * Mission Service — drone fleet & mission orchestration (from A#01,
 * upgraded with the observability patterns: health check API + metrics).
 *
 * When a mission is created it calls back the order service to assign the
 * drone and move the shipment to IN_TRANSIT — this synchronous dependency
 * is exactly what the API gateway protects with the Circuit Breaker.
 */
const express = require("express");
const cors = require("cors");
const { randomUUID } = require("crypto");
const client = require("prom-client");

const app = express();
app.use(cors());
app.use(express.json());

const ORDER_URL = process.env.ORDER_URL || null;

// ── Fleet (in-memory, as in A#01) ────────────────────────────────────────
const drones = [
  { id: "DRN-ALPHA", model: "SkyCarrier X2", maxPayloadKg: 3.0, batteryPct: 96, status: "IDLE" },
  { id: "DRN-BETA", model: "SkyCarrier X2", maxPayloadKg: 3.0, batteryPct: 81, status: "IDLE" },
  { id: "DRN-GAMMA", model: "HeavyLift H1", maxPayloadKg: 5.0, batteryPct: 100, status: "IDLE" },
];
const missions = [];

// ── Prometheus metrics ────────────────────────────────────────────────────
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });
const missionsCreated = new client.Counter({
  name: "mission_service_missions_created_total",
  help: "Missions created", registers: [registry],
});
const dronesAvailable = new client.Gauge({
  name: "mission_service_drones_available",
  help: "Idle drones in the fleet", registers: [registry],
});
dronesAvailable.set(drones.filter((d) => d.status === "IDLE").length);

// ── API ───────────────────────────────────────────────────────────────────
app.get("/drones", (req, res) => res.json(drones));
app.get("/missions", (req, res) => res.json(missions));

app.post("/missions", async (req, res) => {
  const { shipmentId, weightKg } = req.body;
  if (!shipmentId) return res.status(400).json({ error: "shipmentId is required" });

  const drone = drones.find((d) => d.status === "IDLE" && d.maxPayloadKg >= (weightKg || 0));
  if (!drone) return res.status(409).json({ error: "No suitable drone available" });

  drone.status = "ON_MISSION";
  dronesAvailable.set(drones.filter((d) => d.status === "IDLE").length);

  const mission = {
    id: "MSN-" + randomUUID().slice(0, 6).toUpperCase(),
    shipmentId, droneId: drone.id, phase: "TAKEOFF", startedAt: new Date().toISOString(),
  };
  missions.push(mission);
  missionsCreated.inc();

  // Callback to the order service: assign drone + move to IN_TRANSIT
  if (ORDER_URL) {
    try {
      await fetch(`${ORDER_URL}/shipments/${shipmentId}/drone`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ droneId: drone.id }),
      });
      await fetch(`${ORDER_URL}/shipments/${shipmentId}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_TRANSIT" }),
      });
    } catch (err) {
      console.error("[mission-service] order service callback failed:", err.message);
    }
  }

  res.status(201).json(mission);
});

app.post("/missions/:id/complete", (req, res) => {
  const mission = missions.find((m) => m.id === req.params.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });
  mission.phase = "COMPLETED";
  mission.completedAt = new Date().toISOString();
  const drone = drones.find((d) => d.id === mission.droneId);
  if (drone) drone.status = "IDLE";
  dronesAvailable.set(drones.filter((d) => d.status === "IDLE").length);
  res.json(mission);
});

// ── Observability ─────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    service: "mission-service", status: "UP", version: "2.0.0",
    checks: { fleet: { status: "UP", idleDrones: drones.filter((d) => d.status === "IDLE").length } },
    timestamp: new Date().toISOString(),
  });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`[mission-service] listening on :${PORT}`));
