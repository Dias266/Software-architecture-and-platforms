const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// In-memory tracking records (replace with TimescaleDB in production)
const trackingRecords = {
  "SHP-001": {
    shipmentId: "SHP-001",
    currentLocation: { lat: 43.8, lon: 11.2, alt: 120 },
    eta: "2025-10-20T14:32:00Z",
    progress: 62,
    droneId: "DRN-07",
    events: [
      { timestamp: "2025-10-20T13:00:00Z", type: "ORDER_PLACED",    description: "Shipment order placed" },
      { timestamp: "2025-10-20T13:07:00Z", type: "DRONE_ASSIGNED",  description: "Drone DRN-07 assigned" },
      { timestamp: "2025-10-20T13:12:00Z", type: "MISSION_STARTED", description: "Drone departed Milan Central" },
      { timestamp: "2025-10-20T14:00:00Z", type: "WAYPOINT_REACHED",description: "Waypoint WP-2 reached" },
    ],
  },
  "SHP-002": {
    shipmentId: "SHP-002",
    currentLocation: null,
    eta: "2025-10-20T16:05:00Z",
    progress: 0,
    droneId: null,
    events: [
      { timestamp: "2025-10-20T14:30:00Z", type: "ORDER_PLACED", description: "Shipment order placed" },
    ],
  },
};

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get("/health", (req, res) => {
  res.json({ service: "tracking-service", status: "ok", version: "1.0.0" });
});

// GET tracking info for a shipment
app.get("/track/:shipmentId", (req, res) => {
  const record = trackingRecords[req.params.shipmentId];
  if (!record) {
    return res.status(404).json({ error: "No tracking record found for this shipment" });
  }
  res.json(record);
});

// GET only the event history
app.get("/track/:shipmentId/events", (req, res) => {
  const record = trackingRecords[req.params.shipmentId];
  if (!record) return res.status(404).json({ error: "Shipment not found" });
  res.json(record.events);
});

// POST append a new tracking event (called by mission-service)
app.post("/track/:shipmentId/events", (req, res) => {
  const { type, description, location, eta, progress } = req.body;

  if (!type || !description) {
    return res.status(400).json({ error: "type and description are required" });
  }

  if (!trackingRecords[req.params.shipmentId]) {
    trackingRecords[req.params.shipmentId] = {
      shipmentId: req.params.shipmentId,
      currentLocation: null,
      eta: null,
      progress: 0,
      droneId: null,
      events: [],
    };
  }

  const record = trackingRecords[req.params.shipmentId];

  const event = {
    timestamp: new Date().toISOString(),
    type,
    description,
  };
  record.events.push(event);

  // Update live fields if provided
  if (location) record.currentLocation = location;
  if (eta) record.eta = eta;
  if (progress !== undefined) record.progress = progress;

  console.log(`[tracking-service] Event appended to ${req.params.shipmentId}: ${type}`);
  res.status(201).json(event);
});

// GET ETA for a shipment
app.get("/track/:shipmentId/eta", (req, res) => {
  const record = trackingRecords[req.params.shipmentId];
  if (!record) return res.status(404).json({ error: "Shipment not found" });
  res.json({ shipmentId: req.params.shipmentId, eta: record.eta, progress: record.progress });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`[tracking-service] running on http://localhost:${PORT}`);
});
