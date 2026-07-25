const express = require("express");
const cors = require("cors");

// ==============================================================================
// 1. OUTBOUND PORT (Repository Interface)
// ==============================================================================
class TrackingRepositoryPort {
  async findByShipmentId(shipmentId) { throw new Error("Method not implemented"); }
  async saveEvent(shipmentId, eventData) { throw new Error("Method not implemented"); }
}

// ==============================================================================
// 2. OUTBOUND ADAPTER (In-Memory Repository Implementation)
// ==============================================================================
class InMemoryTrackingRepository extends TrackingRepositoryPort {
  constructor() {
    super();
    this.trackingRecords = {
      "SHP-001": {
        shipmentId: "SHP-001",
        currentLocation: { lat: 43.8, lon: 11.2, alt: 120 },
        eta: "2025-10-20T14:32:00Z",
        progress: 62,
        droneId: "DRN-07",
        events: [
          { timestamp: "2025-10-20T13:00:00Z", type: "ORDER_PLACED", description: "Shipment order placed" },
          { timestamp: "2025-10-20T13:07:00Z", type: "DRONE_ASSIGNED", description: "Drone DRN-07 assigned" },
          { timestamp: "2025-10-20T13:12:00Z", type: "MISSION_STARTED", description: "Drone departed Milan Central" },
          { timestamp: "2025-10-20T14:00:00Z", type: "WAYPOINT_REACHED", description: "Waypoint WP-2 reached" },
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
  }

  async findByShipmentId(shipmentId) {
    return this.trackingRecords[shipmentId] || null;
  }

  async saveEvent(shipmentId, eventDto) {
    if (!this.trackingRecords[shipmentId]) {
      this.trackingRecords[shipmentId] = {
        shipmentId,
        currentLocation: null,
        eta: null,
        progress: 0,
        droneId: null,
        events: [],
      };
    }

    const record = this.trackingRecords[shipmentId];

    const event = {
      timestamp: new Date().toISOString(),
      type: eventDto.type,
      description: eventDto.description,
    };

    record.events.push(event);

    if (eventDto.location) record.currentLocation = eventDto.location;
    if (eventDto.eta) record.eta = eventDto.eta;
    if (eventDto.progress !== undefined) record.progress = eventDto.progress;

    return event;
  }
}

// ==============================================================================
// 3. INBOUND PORT / DOMAIN SERVICE (Application Logic)
// ==============================================================================
class TrackingService {
  constructor(trackingRepository) {
    this.trackingRepository = trackingRepository;
  }

  async getTrackingRecord(shipmentId) {
    const record = await this.trackingRepository.findByShipmentId(shipmentId);
    if (!record) {
      throw { status: 404, message: "No tracking record found for this shipment" };
    }
    return record;
  }

  async getEvents(shipmentId) {
    const record = await this.getTrackingRecord(shipmentId);
    return record.events;
  }

  async addEvent(shipmentId, eventDto) {
    const { type, description } = eventDto;
    if (!type || !description) {
      throw { status: 400, message: "type and description are required" };
    }

    const event = await this.trackingRepository.saveEvent(shipmentId, eventDto);
    console.log(`[tracking-service] Event appended to ${shipmentId}: ${type}`);
    return event;
  }

  async getEta(shipmentId) {
    const record = await this.getTrackingRecord(shipmentId);
    return { shipmentId, eta: record.eta, progress: record.progress };
  }
}

// ==============================================================================
// 4. INBOUND ADAPTER (Express Controller)
// ==============================================================================
class TrackingController {
  constructor(trackingService) {
    this.trackingService = trackingService;
  }

  getTracking = async (req, res, next) => {
    try {
      res.json(await this.trackingService.getTrackingRecord(req.params.shipmentId));
    } catch (err) { next(err); }
  };

  getEvents = async (req, res, next) => {
    try {
      res.json(await this.trackingService.getEvents(req.params.shipmentId));
    } catch (err) { next(err); }
  };

  addEvent = async (req, res, next) => {
    try {
      res.status(201).json(await this.trackingService.addEvent(req.params.shipmentId, req.body));
    } catch (err) { next(err); }
  };

  getEta = async (req, res, next) => {
    try {
      res.json(await this.trackingService.getEta(req.params.shipmentId));
    } catch (err) { next(err); }
  };
}

// ==============================================================================
// 5. APPLICATION COMPOSITION ROOT & SERVER SETUP
// ==============================================================================
const app = express();
app.use(cors());
app.use(express.json());

// Wiring components together (Dependency Injection)
const trackingRepository = new InMemoryTrackingRepository();
const trackingService = new TrackingService(trackingRepository);
const controller = new TrackingController(trackingService);

// Health check
app.get("/health", (req, res) => {
  res.json({ service: "tracking-service", status: "ok", version: "1.0.0" });
});

// Routes
app.get("/track/:shipmentId", controller.getTracking);
app.get("/track/:shipmentId/events", controller.getEvents);
app.post("/track/:shipmentId/events", controller.addEvent);
app.get("/track/:shipmentId/eta", controller.getEta);

// Centralized Error Middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`[tracking-service] running on http://localhost:${PORT}`);
});