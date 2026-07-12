const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

// In-memory store (replace with PostgreSQL in production)
const shipments = [
  {
    id: "SHP-001",
    customerId: "CUST-01",
    origin: { address: "Milan Central", lat: 45.4654, lon: 9.1866 },
    destination: { address: "Rome Termini", lat: 41.9009, lon: 12.5007 },
    packageSpec: { weight: 1.2, fragile: false },
    timeWindow: { earliest: "2025-10-20T13:00:00Z", latest: "2025-10-20T15:00:00Z" },
    status: "IN_TRANSIT",
    createdAt: "2025-10-20T13:00:00Z",
  },
  {
    id: "SHP-002",
    customerId: "CUST-02",
    origin: { address: "Bologna Airport", lat: 44.5354, lon: 11.2887 },
    destination: { address: "Florence Duomo", lat: 43.7731, lon: 11.2560 },
    packageSpec: { weight: 0.4, fragile: true },
    timeWindow: { earliest: "2025-10-20T15:00:00Z", latest: "2025-10-20T17:00:00Z" },
    status: "PENDING",
    createdAt: "2025-10-20T14:30:00Z",
  },
];

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get("/health", (req, res) => {
  res.json({ service: "order-service", status: "ok", version: "1.0.0" });
});

// GET all shipments
app.get("/shipments", (req, res) => {
  res.json(shipments);
});

// GET single shipment
app.get("/shipments/:id", (req, res) => {
  const shipment = shipments.find((s) => s.id === req.params.id);
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });
  res.json(shipment);
});

// POST create shipment
app.post("/shipments", (req, res) => {
  const { origin, destination, packageSpec, timeWindow, customerId } = req.body;

  if (!origin || !destination || !packageSpec) {
    return res.status(400).json({ error: "origin, destination and packageSpec are required" });
  }

  const shipment = {
    id: "SHP-" + uuidv4().slice(0, 6).toUpperCase(),
    customerId: customerId || "CUST-ANONYMOUS",
    origin,
    destination,
    packageSpec,
    timeWindow: timeWindow || { earliest: new Date().toISOString(), latest: null },
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  shipments.push(shipment);

  // In production: publish ShipmentPlaced event to Kafka here
  console.log(`[order-service] ShipmentPlaced: ${shipment.id}`);

  res.status(201).json(shipment);
});

// PATCH update shipment status
app.patch("/shipments/:id/status", (req, res) => {
  const shipment = shipments.find((s) => s.id === req.params.id);
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });

  const { status } = req.body;
  const validStatuses = ["PENDING", "CONFIRMED", "IN_TRANSIT", "DELIVERED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
  }

  shipment.status = status;
  shipment.updatedAt = new Date().toISOString();

  console.log(`[order-service] Shipment ${shipment.id} status → ${status}`);
  res.json(shipment);
});

// DELETE cancel shipment
app.delete("/shipments/:id", (req, res) => {
  const index = shipments.findIndex((s) => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Shipment not found" });

  shipments[index].status = "CANCELLED";
  shipments[index].updatedAt = new Date().toISOString();

  console.log(`[order-service] ShipmentCancelled: ${req.params.id}`);
  res.json({ message: "Shipment cancelled", id: req.params.id });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[order-service] running on http://localhost:${PORT}`);
});


