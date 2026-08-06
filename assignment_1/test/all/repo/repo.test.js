/**
 * Shipping on the Air - Multi-Service Unit Test Suite
 * Compatible with Jest runner.
 * 
 * Logs execution steps & repository states to 'test/test-execution.log'.
 */

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

// ==============================================================================
// 1. LOGGING SETUP
// ==============================================================================
const LOG_FILE_PATH = path.join(__dirname, "test-execution.log");

fs.writeFileSync(
  LOG_FILE_PATH,
  `=== SHIPPING ON THE AIR MULTI-SERVICE TEST LOG - ${new Date().toISOString()} ===\n\n`,
  "utf8"
);

function logStep(stepNumber, serviceName, description, repoState) {
  const logEntry = `[${new Date().toISOString()}] [STEP ${stepNumber}] [SERVICE: ${serviceName}]\n  ACTION: ${description}\n  REPO STATE: ${JSON.stringify(repoState, null, 2)}\n\n`;
  fs.appendFileSync(LOG_FILE_PATH, logEntry, "utf8");
}

// ==============================================================================
// 2. VIRTUAL MOCKS
// ==============================================================================
jest.mock("express", () => {
  const expressMock = () => ({
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    listen: jest.fn(),
  });
  expressMock.json = jest.fn();
  return expressMock;
}, { virtual: true });

jest.mock("cors", () => jest.fn(), { virtual: true });

jest.mock("uuid", () => ({
  v4: () => "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
}), { virtual: true });

// ==============================================================================
// 3. SERVICE & REPOSITORY IMPLEMENTATIONS
// ==============================================================================

// --- ORDER SERVICE ---
class InMemoryShipmentRepository {
  constructor() {
    this.shipments = [
      { id: "SHP-001", status: "PENDING", customerId: "CUST-01" },
      { id: "SHP-002", status: "CONFIRMED", customerId: "CUST-02" },
    ];
  }
  async findAll() { return [...this.shipments]; }
  async findById(id) { return this.shipments.find((s) => s.id === id) || null; }
  async save(shipment) { this.shipments.push(shipment); return shipment; }
  async updateStatus(id, status) {
    const s = await this.findById(id);
    if (s) s.status = status;
    return s;
  }
}

class ShipmentServiceImpl {
  constructor(repo) { this.repo = repo; }
  async createShipment(dto) {
    const shipment = { id: "SHP-003", status: "PENDING", customerId: dto.customerId };
    return await this.repo.save(shipment);
  }
  async updateStatus(id, status) { return await this.repo.updateStatus(id, status); }
}

// --- TRACKING SERVICE ---
class InMemoryTrackingRepository {
  constructor() {
    this.events = [
      { shipmentId: "SHP-001", type: "ORDER_PLACED", timestamp: "2026-08-02T10:00:00Z" },
    ];
  }
  async findEventsByShipmentId(shipmentId) {
    return this.events.filter((e) => e.shipmentId === shipmentId);
  }
  async appendEvent(event) {
    this.events.push(event);
    return event;
  }
}

class TrackingServiceImpl {
  constructor(repo) { this.repo = repo; }
  async recordEvent(shipmentId, type) {
    const event = { shipmentId, type, timestamp: new Date().toISOString() };
    return await this.repo.appendEvent(event);
  }
  async getTimeline(shipmentId) {
    return await this.repo.findEventsByShipmentId(shipmentId);
  }
}

// --- MISSION SERVICE ---
class InMemoryMissionRepository {
  constructor() {
    this.missions = [
      { id: "MSN-001", shipmentId: "SHP-001", droneId: "DRONE-A", status: "ASSIGNED" },
    ];
  }
  async findById(id) { return this.missions.find((m) => m.id === id) || null; }
  async save(mission) { this.missions.push(mission); return mission; }
  async updateStatus(id, status) {
    const m = await this.findById(id);
    if (m) m.status = status;
    return m;
  }
}

class MissionServiceImpl {
  constructor(repo) { this.repo = repo; }
  async assignDrone(shipmentId, droneId) {
    const mission = { id: "MSN-002", shipmentId, droneId, status: "ASSIGNED" };
    return await this.repo.save(mission);
  }
  async completeMission(id) {
    return await this.repo.updateStatus(id, "COMPLETED");
  }
}

// ==============================================================================
// 4. TEST SUITE (8 STEPS ACROSS THE 3 SERVICES)
// ==============================================================================

describe("Shipping on the Air - Multi-Service 8-Step Workflow", () => {
  let orderRepo, orderService;
  let trackingRepo, trackingService;
  let missionRepo, missionService;

  beforeAll(() => {
    orderRepo = new InMemoryShipmentRepository();
    orderService = new ShipmentServiceImpl(orderRepo);

    trackingRepo = new InMemoryTrackingRepository();
    trackingService = new TrackingServiceImpl(trackingRepo);

    missionRepo = new InMemoryMissionRepository();
    missionService = new MissionServiceImpl(missionRepo);
  });

  // STEP 1
  test("Step 1: Order Service - Create new shipment and return repo", async () => {
    const created = await orderService.createShipment({ customerId: "CUST-03" });
    assert.equal(created.id, "SHP-003");

    const repoContent = await orderRepo.findAll();
    assert.equal(repoContent.length, 3);
    logStep(1, "Order Service", "Created shipment SHP-003", repoContent);
  });

  // STEP 2
  test("Step 2: Tracking Service - Record ORDER_PLACED event and return repo", async () => {
    const event = await trackingService.recordEvent("SHP-003", "ORDER_PLACED");
    assert.equal(event.shipmentId, "SHP-003");

    const repoContent = await trackingRepo.findEventsByShipmentId("SHP-003");
    assert.equal(repoContent.length, 1);
    logStep(2, "Tracking Service", "Recorded ORDER_PLACED event for SHP-003", repoContent);
  });

  // STEP 3
  test("Step 3: Mission Service - Assign drone to shipment and return repo", async () => {
    const mission = await missionService.assignDrone("SHP-003", "DRONE-B");
    assert.equal(mission.id, "MSN-002");

    const repoContent = await missionRepo.findById("MSN-002");
    assert.equal(repoContent.droneId, "DRONE-B");
    logStep(3, "Mission Service", "Assigned DRONE-B to MSN-002", repoContent);
  });

  // STEP 4
  test("Step 4: Order Service - Update shipment status to IN_TRANSIT and return repo", async () => {
    const updated = await orderService.updateStatus("SHP-003", "IN_TRANSIT");
    assert.equal(updated.status, "IN_TRANSIT");

    const repoContent = await orderRepo.findById("SHP-003");
    assert.equal(repoContent.status, "IN_TRANSIT");
    logStep(4, "Order Service", "Updated status to IN_TRANSIT for SHP-003", repoContent);
  });

  // STEP 5
  test("Step 5: Tracking Service - Record DEPARTED event and return repo", async () => {
    await trackingService.recordEvent("SHP-003", "DEPARTED");

    const repoContent = await trackingRepo.findEventsByShipmentId("SHP-003");
    assert.equal(repoContent.length, 2);
    logStep(5, "Tracking Service", "Recorded DEPARTED event for SHP-003", repoContent);
  });

  // STEP 6
  test("Step 6: Mission Service - Complete mission MSN-002 and return repo", async () => {
    const completed = await missionService.completeMission("MSN-002");
    assert.equal(completed.status, "COMPLETED");

    const repoContent = await missionRepo.findById("MSN-002");
    assert.equal(repoContent.status, "COMPLETED");
    logStep(6, "Mission Service", "Set mission MSN-002 to COMPLETED", repoContent);
  });

  // STEP 7
  test("Step 7: Order Service - Update shipment status to DELIVERED and return repo", async () => {
    const delivered = await orderService.updateStatus("SHP-003", "DELIVERED");
    assert.equal(delivered.status, "DELIVERED");

    const repoContent = await orderRepo.findById("SHP-003");
    assert.equal(repoContent.status, "DELIVERED");
    logStep(7, "Order Service", "Updated status to DELIVERED for SHP-003", repoContent);
  });

  // STEP 8
  test("Step 8: Tracking Service - Record DELIVERED event and return complete timeline repo", async () => {
    await trackingService.recordEvent("SHP-003", "DELIVERED");

    const repoContent = await trackingRepo.findEventsByShipmentId("SHP-003");
    assert.equal(repoContent.length, 3);
    logStep(8, "Tracking Service", "Recorded DELIVERED event and retrieved timeline", repoContent);
  });
});