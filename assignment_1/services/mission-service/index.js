const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

// ==============================================================================
// 1. OUTBOUND PORT (Repository Interface)
// ==============================================================================
class MissionRepositoryPort {
  async findAllMissions() { throw new Error("Method not implemented"); }
  async findMissionById(id) { throw new Error("Method not implemented"); }
  async findMissionByShipmentId(shipmentId) { throw new Error("Method not implemented"); }
  async saveMission(mission) { throw new Error("Method not implemented"); }
  async findAllDrones() { throw new Error("Method not implemented"); }
  async findAvailableDrone(requiredWeight) { throw new Error("Method not implemented"); }
  async updateDroneStatus(droneId, status) { throw new Error("Method not implemented"); }
}

// ==============================================================================
// 2. OUTBOUND ADAPTER (In-Memory Repository Implementation)
// ==============================================================================
class InMemoryMissionRepository extends MissionRepositoryPort {
  constructor() {
    super();
    this.missions = [
      {
        id: "MSN-001",
        shipmentId: "SHP-001",
        droneId: "DRN-07",
        status: "IN_PROGRESS",
        route: {
          waypoints: [
            { order: 1, lat: 45.4654, lon: 9.1866, alt: 100, label: "Milan Central (origin)" },
            { order: 2, lat: 44.6488, lon: 10.9255, alt: 120, label: "WP-2 (en route)" },
            { order: 3, lat: 43.8, lon: 11.2, alt: 120, label: "WP-3 (current)" },
            { order: 4, lat: 41.9009, lon: 12.5007, alt: 100, label: "Rome Termini (destination)" },
          ],
        },
        startedAt: "2025-10-20T13:12:00Z",
        eta: "2025-10-20T14:32:00Z",
        completedAt: null,
      },
    ];

    this.drones = [
      { id: "DRN-07", model: "DJI Matrice 300", battery: 72, maxPayload: 2.7, status: "ON_MISSION" },
      { id: "DRN-03", model: "DJI Matrice 300", battery: 88, maxPayload: 2.7, status: "ON_MISSION" },
      { id: "DRN-12", model: "Parrot Anafi USA", battery: 100, maxPayload: 1.5, status: "AVAILABLE" },
      { id: "DRN-05", model: "Parrot Anafi USA", battery: 95, maxPayload: 1.5, status: "AVAILABLE" },
    ];
  }

  async findAllMissions() {
    return this.missions;
  }

  async findMissionById(id) {
    return this.missions.find((m) => m.id === id) || null;
  }

  async findMissionByShipmentId(shipmentId) {
    return this.missions.find((m) => m.shipmentId === shipmentId) || null;
  }

  async saveMission(mission) {
    this.missions.push(mission);
    return mission;
  }

  async findAllDrones() {
    return this.drones;
  }

  async findAvailableDrone(requiredWeight) {
    return this.drones.find(
      (d) => d.status === "AVAILABLE" && d.maxPayload >= requiredWeight && d.battery > 20
    ) || null;
  }

  async updateDroneStatus(droneId, status) {
    const drone = this.drones.find((d) => d.id === droneId);
    if (drone) drone.status = status;
    return drone;
  }
}

// ==============================================================================
// 3. INBOUND PORT / DOMAIN SERVICE (Application Logic)
// ==============================================================================
class MissionService {
  constructor(missionRepository) {
    this.missionRepository = missionRepository;
  }

  async getAllMissions() {
    return await this.missionRepository.findAllMissions();
  }

  async getMissionById(id) {
    const mission = await this.missionRepository.findMissionById(id);
    if (!mission) {
      throw { status: 404, message: "Mission not found" };
    }
    return mission;
  }

  async getMissionByShipment(shipmentId) {
    const mission = await this.missionRepository.findMissionByShipmentId(shipmentId);
    if (!mission) {
      throw { status: 404, message: "No mission found for this shipment" };
    }
    return mission;
  }

  async createMission(dto) {
    const { shipmentId, origin, destination, packageWeight } = dto;

    if (!shipmentId || !origin || !destination) {
      throw { status: 400, message: "shipmentId, origin and destination are required" };
    }

    const weight = packageWeight || 0;
    const drone = await this.missionRepository.findAvailableDrone(weight);

    if (!drone) {
      throw { status: 503, message: "No available drone meets the requirements" };
    }

    const midLat = (origin.lat + destination.lat) / 2;
    const midLon = (origin.lon + destination.lon) / 2;

    const mission = {
      id: "MSN-" + uuidv4().slice(0, 6).toUpperCase(),
      shipmentId,
      droneId: drone.id,
      status: "IN_PROGRESS",
      route: {
        waypoints: [
          { order: 1, lat: origin.lat, lon: origin.lon, alt: 100, label: "Origin" },
          { order: 2, lat: midLat, lon: midLon, alt: 120, label: "WP-MID" },
          { order: 3, lat: destination.lat, lon: destination.lon, alt: 100, label: "Destination" },
        ],
      },
      startedAt: new Date().toISOString(),
      eta: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      completedAt: null,
    };

    await this.missionRepository.saveMission(mission);
    await this.missionRepository.updateDroneStatus(drone.id, "ON_MISSION");

    console.log(`[mission-service] MissionStarted: ${mission.id} → drone ${drone.id}`);
    return mission;
  }

  async completeMission(id) {
    const mission = await this.getMissionById(id);
    mission.status = "COMPLETED";
    mission.completedAt = new Date().toISOString();

    await this.missionRepository.updateDroneStatus(mission.droneId, "AVAILABLE");

    console.log(`[mission-service] MissionCompleted: ${mission.id}`);
    return mission;
  }

  async abortMission(id) {
    const mission = await this.getMissionById(id);
    mission.status = "ABORTED";
    mission.completedAt = new Date().toISOString();

    await this.missionRepository.updateDroneStatus(mission.droneId, "AVAILABLE");

    console.log(`[mission-service] MissionAborted: ${mission.id}`);
    return mission;
  }

  async getAllDrones() {
    return await this.missionRepository.findAllDrones();
  }
}

// ==============================================================================
// 4. INBOUND ADAPTER (Express Controller)
// ==============================================================================
class MissionController {
  constructor(missionService) {
    this.missionService = missionService;
  }

  getAll = async (req, res, next) => {
    try {
      res.json(await this.missionService.getAllMissions());
    } catch (err) { next(err); }
  };

  getById = async (req, res, next) => {
    try {
      res.json(await this.missionService.getMissionById(req.params.id));
    } catch (err) { next(err); }
  };

  getByShipment = async (req, res, next) => {
    try {
      res.json(await this.missionService.getMissionByShipment(req.params.shipmentId));
    } catch (err) { next(err); }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json(await this.missionService.createMission(req.body));
    } catch (err) { next(err); }
  };

  complete = async (req, res, next) => {
    try {
      res.json(await this.missionService.completeMission(req.params.id));
    } catch (err) { next(err); }
  };

  abort = async (req, res, next) => {
    try {
      res.json(await this.missionService.abortMission(req.params.id));
    } catch (err) { next(err); }
  };

  getDrones = async (req, res, next) => {
    try {
      res.json(await this.missionService.getAllDrones());
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
const missionRepository = new InMemoryMissionRepository();
const missionService = new MissionService(missionRepository);
const controller = new MissionController(missionService);

// Health check
app.get("/health", (req, res) => {
  res.json({ service: "mission-service", status: "ok", version: "1.0.0" });
});

// Routes
app.get("/missions", controller.getAll);
app.get("/missions/:id", controller.getById);
app.get("/missions/by-shipment/:shipmentId", controller.getByShipment);
app.post("/missions", controller.create);
app.patch("/missions/:id/complete", controller.complete);
app.patch("/missions/:id/abort", controller.abort);
app.get("/drones", controller.getDrones);

// Centralized Error Middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`[mission-service] running on http://localhost:${PORT}`);
});