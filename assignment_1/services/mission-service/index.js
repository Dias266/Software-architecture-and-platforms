const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

// In-memory missions store (replace with PostgreSQL in production)
const missions = [
  {
    id: "MSN-001",
    shipmentId: "SHP-001",
    droneId: "DRN-07",
    status: "IN_PROGRESS",
    route: {
      waypoints: [
        { order: 1, lat: 45.4654, lon: 9.1866,  alt: 100, label: "Milan Central (origin)" },
        { order: 2, lat: 44.6488, lon: 10.9255,  alt: 120, label: "WP-2 (en route)" },
        { order: 3, lat: 43.8,    lon: 11.2,     alt: 120, label: "WP-3 (current)" },
        { order: 4, lat: 41.9009, lon: 12.5007,  alt: 100, label: "Rome Termini (destination)" },
      ],
    },
    startedAt: "2025-10-20T13:12:00Z",
    eta: "2025-10-20T14:32:00Z",
    completedAt: null,
  },
];

// Available drones (simplified fleet)
const drones = [
  { id: "DRN-07", model: "DJI Matrice 300", battery: 72, maxPayload: 2.7, status: "ON_MISSION" },
  { id: "DRN-03", model: "DJI Matrice 300", battery: 88, maxPayload: 2.7, status: "ON_MISSION" },
  { id: "DRN-12", model: "Parrot Anafi USA", battery: 100, maxPayload: 1.5, status: "AVAILABLE" },
  { id: "DRN-05", model: "Parrot Anafi USA", battery: 95, maxPayload: 1.5, status: "AVAILABLE" },
];

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get("/health", (req, res) => {
  res.json({ service: "mission-service", status: "ok", version: "1.0.0" });
});

// GET all missions
app.get("/missions", (req, res) => {
  res.json(missions);
});

// GET single mission
app.get("/missions/:id", (req, res) => {
  const mission = missions.find((m) => m.id === req.params.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });
  res.json(mission);
});

// GET mission for a shipment
app.get("/missions/by-shipment/:shipmentId", (req, res) => {
  const mission = missions.find((m) => m.shipmentId === req.params.shipmentId);
  if (!mission) return res.status(404).json({ error: "No mission found for this shipment" });
  res.json(mission);
});

// POST create and start a mission (assign drone + route)
app.post("/missions", (req, res) => {
  const { shipmentId, origin, destination, packageWeight } = req.body;

  if (!shipmentId || !origin || !destination) {
    return res.status(400).json({ error: "shipmentId, origin and destination are required" });
  }

  // Find available drone that can carry the weight
  const weight = packageWeight || 0;
  const drone = drones.find(
    (d) => d.status === "AVAILABLE" && d.maxPayload >= weight && d.battery > 20
  );

  if (!drone) {
    return res.status(503).json({ error: "No available drone meets the requirements" });
  }

  // Simple route: origin → midpoint → destination
  const midLat = (origin.lat + destination.lat) / 2;
  const midLon = (origin.lon + destination.lon) / 2;

  const mission = {
    id: "MSN-" + uuidv4().slice(0, 6).toUpperCase(),
    shipmentId,
    droneId: drone.id,
    status: "IN_PROGRESS",
    route: {
      waypoints: [
        { order: 1, lat: origin.lat,      lon: origin.lon,      alt: 100, label: "Origin" },
        { order: 2, lat: midLat,          lon: midLon,          alt: 120, label: "WP-MID" },
        { order: 3, lat: destination.lat, lon: destination.lon, alt: 100, label: "Destination" },
      ],
    },
    startedAt: new Date().toISOString(),
    eta: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // +45 min
    completedAt: null,
  };

  missions.push(mission);
  drone.status = "ON_MISSION";

  // In production: publish MissionStarted event to Kafka here
  console.log(`[mission-service] MissionStarted: ${mission.id} → drone ${drone.id}`);

  res.status(201).json(mission);
});

// PATCH complete a mission
app.patch("/missions/:id/complete", (req, res) => {
  const mission = missions.find((m) => m.id === req.params.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  mission.status = "COMPLETED";
  mission.completedAt = new Date().toISOString();

  // Release drone
  const drone = drones.find((d) => d.id === mission.droneId);
  if (drone) drone.status = "AVAILABLE";

  console.log(`[mission-service] MissionCompleted: ${mission.id}`);
  res.json(mission);
});

// PATCH abort a mission
app.patch("/missions/:id/abort", (req, res) => {
  const mission = missions.find((m) => m.id === req.params.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });

  mission.status = "ABORTED";
  mission.completedAt = new Date().toISOString();

  const drone = drones.find((d) => d.id === mission.droneId);
  if (drone) drone.status = "AVAILABLE";

  console.log(`[mission-service] MissionAborted: ${mission.id}`);
  res.json(mission);
});

// GET all drones (fleet overview)
app.get("/drones", (req, res) => {
  res.json(drones);
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`[mission-service] running on http://localhost:${PORT}`);
});
