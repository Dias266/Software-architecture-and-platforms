const { test } = require("node:test");
const assert = require("node:assert/strict");
const { MissionServiceImpl, InMemoryMissionRepository } = require("../index.js");

function buildService() {
  const repo = new InMemoryMissionRepository();
  return new MissionServiceImpl(repo);
}

const validDto = () => ({
  shipmentId: "SHP-002",
  origin: { lat: 44.5354, lon: 11.2887 },
  destination: { lat: 43.7731, lon: 11.2560 },
  packageWeight: 0.4,
});

test("getAllMissions returns the seeded mission", async () => {
  const service = buildService();
  const missions = await service.getAllMissions();
  assert.equal(missions.length, 1);
  assert.equal(missions[0].id, "MSN-001");
});

test("getAllDrones returns the seeded fleet", async () => {
  const service = buildService();
  const drones = await service.getAllDrones();
  assert.equal(drones.length, 4);
});

test("createMission picks an AVAILABLE drone with enough payload/battery", async () => {
  const service = buildService();
  const mission = await service.createMission(validDto());
  assert.match(mission.id, /^MSN-[A-F0-9]{6}$/);
  assert.equal(mission.status, "IN_PROGRESS");
  assert.equal(mission.shipmentId, "SHP-002");

  // must have picked one of the two seeded AVAILABLE drones (DRN-12 / DRN-05)
  assert.ok(["DRN-12", "DRN-05"].includes(mission.droneId));

  const drones = await service.getAllDrones();
  const assigned = drones.find((d) => d.id === mission.droneId);
  assert.equal(assigned.status, "ON_MISSION"); // drone is now reserved
});

test("createMission rejects a request missing required fields", async () => {
  const service = buildService();
  const dto = validDto();
  delete dto.shipmentId;
  await assert.rejects(
    () => service.createMission(dto),
    (err) => err.status === 400
  );
});

test("createMission returns 503 when no drone meets the payload requirement", async () => {
  const service = buildService();
  const dto = validDto();
  dto.packageWeight = 999; // heavier than every seeded drone's maxPayload
  await assert.rejects(
    () => service.createMission(dto),
    (err) => err.status === 503
  );
});

test("completeMission marks it COMPLETED and frees the drone", async () => {
  const service = buildService();
  const mission = await service.createMission(validDto());

  const completed = await service.completeMission(mission.id);
  assert.equal(completed.status, "COMPLETED");
  assert.ok(completed.completedAt);

  const drones = await service.getAllDrones();
  const drone = drones.find((d) => d.id === mission.droneId);
  assert.equal(drone.status, "AVAILABLE"); // released back to the fleet
});

test("abortMission marks it ABORTED and frees the drone", async () => {
  const service = buildService();
  const mission = await service.createMission(validDto());

  const aborted = await service.abortMission(mission.id);
  assert.equal(aborted.status, "ABORTED");

  const drones = await service.getAllDrones();
  const drone = drones.find((d) => d.id === mission.droneId);
  assert.equal(drone.status, "AVAILABLE");
});

test("getMissionById throws 404 for an unknown mission", async () => {
  const service = buildService();
  await assert.rejects(
    () => service.getMissionById("MSN-NOPE"),
    (err) => err.status === 404
  );
});
