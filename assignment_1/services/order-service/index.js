const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

// ==============================================================================
// 1. OUTBOUND PORT (Repository Interface)
// ==============================================================================
class ShipmentRepositoryPort {
  async findAll() { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async save(shipment) { throw new Error("Method not implemented"); }
  async updateStatus(id, status) { throw new Error("Method not implemented"); }
}

// ==============================================================================
// 2. OUTBOUND ADAPTER (In-Memory Repository Implementation)
// ==============================================================================
class InMemoryShipmentRepository extends ShipmentRepositoryPort {
  constructor() {
    super();
    this.shipments = [
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
  }

  async findAll() {
    return this.shipments;
  }

  async findById(id) {
    return this.shipments.find((s) => s.id === id) || null;
  }

  async save(shipment) {
    this.shipments.push(shipment);
    return shipment;
  }

  async updateStatus(id, status) {
    const shipment = await this.findById(id);
    if (!shipment) return null;
    shipment.status = status;
    shipment.updatedAt = new Date().toISOString();
    return shipment;
  }
}

// ==============================================================================
// 3a. INBOUND PORT (Application Service Interface)
// ==============================================================================
class ShipmentService {
  async getAllShipments() { throw new Error("Method not implemented"); }
  async getShipmentById(_id) { throw new Error("Method not implemented"); }
  async createShipment(_dto) { throw new Error("Method not implemented"); }
  async updateShipmentStatus(_id, _status) { throw new Error("Method not implemented"); }
  async cancelShipment(_id) { throw new Error("Method not implemented"); }
}

// ==============================================================================
// 3b. INBOUND PORT IMPLEMENTATION (Use Cases / Application Logic)
// ==============================================================================
class ShipmentServiceImpl extends ShipmentService {
  constructor(shipmentRepository) {
    super();
    this.shipmentRepository = shipmentRepository;
  }

  async getAllShipments() {
    return await this.shipmentRepository.findAll();
  }

  async getShipmentById(id) {
    const shipment = await this.shipmentRepository.findById(id);
    if (!shipment) {
      throw { status: 404, message: "Shipment not found" };
    }
    return shipment;
  }

  async createShipment(dto) {
    const { origin, destination, packageSpec, timeWindow, customerId } = dto;

    if (!origin || !destination || !packageSpec) {
      throw { status: 400, message: "origin, destination and packageSpec are required" };
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

    const saved = await this.shipmentRepository.save(shipment);

    // In production: publish ShipmentPlaced event to Kafka/EventBridge here
    console.log(`[order-service] ShipmentPlaced: ${shipment.id}`);

    return saved;
  }

  async updateShipmentStatus(id, status) {
    const validStatuses = ["PENDING", "CONFIRMED", "IN_TRANSIT", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      throw { status: 400, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` };
    }

    const updated = await this.shipmentRepository.updateStatus(id, status);
    if (!updated) {
      throw { status: 404, message: "Shipment not found" };
    }

    console.log(`[order-service] Shipment ${id} status → ${status}`);
    return updated;
  }

  async cancelShipment(id) {
    const updated = await this.shipmentRepository.updateStatus(id, "CANCELLED");
    if (!updated) {
      throw { status: 404, message: "Shipment not found" };
    }

    console.log(`[order-service] ShipmentCancelled: ${id}`);
    return { message: "Shipment cancelled", id };
  }
}

// ==============================================================================
// 4. INBOUND ADAPTER (Express Controller)
// ==============================================================================
class ShipmentController {
  constructor(shipmentService) {
    this.shipmentService = shipmentService;
  }

  getAll = async (req, res, next) => {
    try {
      res.json(await this.shipmentService.getAllShipments());
    } catch (err) { next(err); }
  };

  getById = async (req, res, next) => {
    try {
      res.json(await this.shipmentService.getShipmentById(req.params.id));
    } catch (err) { next(err); }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json(await this.shipmentService.createShipment(req.body));
    } catch (err) { next(err); }
  };

  updateStatus = async (req, res, next) => {
    try {
      res.json(await this.shipmentService.updateShipmentStatus(req.params.id, req.body.status));
    } catch (err) { next(err); }
  };

  cancel = async (req, res, next) => {
    try {
      res.json(await this.shipmentService.cancelShipment(req.params.id));
    } catch (err) { next(err); }
  };
}

// ==============================================================================
// 5. APPLICATION COMPOSITION ROOT & SERVER SETUP
// ==============================================================================
const app = express();
app.use(cors());
app.use(express.json());

const shipmentRepository = new InMemoryShipmentRepository();
const shipmentService = new ShipmentServiceImpl(shipmentRepository);
const controller = new ShipmentController(shipmentService);

app.get("/health", (req, res) => {
  res.json({ service: "order-service", status: "ok", version: "1.0.0" });
});

app.get("/shipments", controller.getAll);
app.get("/shipments/:id", controller.getById);
app.post("/shipments", controller.create);
app.patch("/shipments/:id/status", controller.updateStatus);
app.delete("/shipments/:id", controller.cancel);

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

module.exports = {
  app,
  ShipmentService,
  ShipmentServiceImpl,
  ShipmentRepositoryPort,
  InMemoryShipmentRepository,
};

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`[order-service] running on http://localhost:${PORT}`);
  });
}
