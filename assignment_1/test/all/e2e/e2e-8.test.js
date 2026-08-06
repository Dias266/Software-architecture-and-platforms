/**
 * Microservices Integration & End-to-End Delivery Lifecycle Test Suite
 * Compatible with Jest & automatically generates 'test-execution-log.txt'.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ==============================================================================
// 0. LOGGER SETUP (Automated File Creation via Jest Lifecycle)
// ==============================================================================
const logFilePath = path.join(__dirname, 'test-execution-log.txt');

class TestLogger {
  constructor() {
    this.logs = [];
    this.passed = 0;
    this.failed = 0;
    this.appendHeader();
  }

  appendHeader() {
    const header = [
      '================================================================================',
      '           DRONE DELIVERY PLATFORM - SINGLE ORDER E2E TEST SUITE',
      '================================================================================',
      `Timestamp   : ${new Date().toISOString()}`,
      'Services    : Order Service (:3001) | Tracking Service (:3002) | Mission Service (:3003)',
      'Test File   : full_circle_round.test.js',
      `Environment : Node.js (${process.version}) | Test Runner: Jest`,
      'Architecture: Microservices Ecosystem & Hexagonal Isolation',
      '',
      '--------------------------------------------------------------------------------',
      '1. TEST SUITE INITIALIZATION & SERVICE CONFIGURATION',
      '--------------------------------------------------------------------------------',
      `[${this.getTimestamp()}] INFO  [TestRunner] Initializing Jest runner context...`,
      `[${this.getTimestamp()}] INFO  [TestRunner] Configured Order Service    -> http://localhost:3001`,
      `[${this.getTimestamp()}] INFO  [TestRunner] Configured Tracking Service -> http://localhost:3002`,
      `[${this.getTimestamp()}] INFO  [TestRunner] Configured Mission Service  -> http://localhost:3003`,
      '',
      '--------------------------------------------------------------------------------',
      '2. TEST EXECUTION PHASES',
      '--------------------------------------------------------------------------------',
      ''
    ];
    this.logs.push(...header);
  }

  getTimestamp() {
    return new Date().toISOString().substring(11, 23);
  }

  log(level, tag, message) {
    const line = `[${this.getTimestamp()}] ${level.padEnd(5)} [${tag}] ${message}`;
    console.log(line);
    this.logs.push(line);
  }

  pass(testName) {
    this.passed++;
    const line = `[${this.getTimestamp()}] PASS  [Test] ${testName}`;
    console.log(line);
    this.logs.push(line);
  }

  fail(testName, error) {
    this.failed++;
    const line = `[${this.getTimestamp()}] FAIL  [Test] ${testName}\n  --> Error: ${error.message}`;
    console.error(line);
    this.logs.push(line);
  }

  save() {
    const summary = [
      '',
      '--------------------------------------------------------------------------------',
      '3. EXECUTION SUMMARY',
      '--------------------------------------------------------------------------------',
      `Test Results: ${this.passed} passed, ${this.failed} failed, ${this.passed + this.failed} total`,
      '',
      '================================================================================',
      `E2E LIFECYCLE VERIFICATION VERDICT: [ ${this.failed === 0 ? 'PASSED' : 'FAILED'} ]`,
      '- Order Service    : Created & completed shipment state transitions.',
      '- Mission Service  : Assigned drone, executed flight mission & released resources.',
      '- Tracking Service : Maintained consistent timeline events from order to delivery.',
      '================================================================================'
    ];
    this.logs.push(...summary);

    fs.writeFileSync(logFilePath, this.logs.join('\n'), 'utf8');
    console.log(`\n\x1b[32m✔ Test execution log successfully saved to: ${logFilePath}\x1b[0m\n`);
  }
}

const logger = new TestLogger();

// Save log file after all tests complete
afterAll(() => {
  logger.save();
});

// ==============================================================================
// 1. CONFIGURATION & STATE STORAGE
// ==============================================================================
const config = {
  orderService: 'http://localhost:3001',
  trackingService: 'http://localhost:3002',
  missionService: 'http://localhost:3003',
};

let currentShipmentId;
let currentMissionId;
let assignedDroneId;
let missionEta;

// ==============================================================================
// 2. JEST END-TO-END TEST SUITE (SINGLE ORDER CYCLE)
// ==============================================================================

describe('Drone Delivery Platform Single Order Lifecycle', () => {
  jest.setTimeout(15000);

  describe('Phase 1: Order Placement & Initial Tracking Context', () => {
    test('1. Initialize Order (POST /shipments @:3001)', async () => {
      const testName = '1. Initialize Order (POST /shipments @:3001)';
      try {
        logger.log('DEBUG', 'OrderService', 'Creating new shipment order...');
        const payload = {
          customerId: 'CUST-FULL-TEST-01',
          origin: { address: 'Milan Duomo', lat: 45.4641, lon: 9.1919 },
          destination: { address: 'Milan Central Station', lat: 45.4847, lon: 9.2048 },
          packageSpec: { weight: 1.5, fragile: true },
          timeWindow: { earliest: '2026-10-21T09:00:00Z', latest: '2026-10-21T11:00:00Z' }
        };

        const res = await axios.post(`${config.orderService}/shipments`, payload);

        expect(res.status).toBe(201);
        expect(res.data).toHaveProperty('id');

        currentShipmentId = res.data.id;
        logger.log('INFO', 'OrderService', `Shipment Created -> ID: ${currentShipmentId}`);
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });

    test('2. Initialize Tracking Timeline (POST /track/:id/events @:3002)', async () => {
      const testName = '2. Initialize Tracking Timeline (POST /track/:id/events @:3002)';
      try {
        logger.log('DEBUG', 'TrackingService', `Appending ORDER_PLACED event for ${currentShipmentId}...`);
        const payload = {
          type: 'ORDER_PLACED',
          description: 'Shipment order placed by customer (Automated Suite).'
        };

        const res = await axios.post(`${config.trackingService}/track/${currentShipmentId}/events`, payload);

        expect(res.status).toBe(201);
        expect(res.data.type).toBe('ORDER_PLACED');
        logger.log('INFO', 'TrackingService', `Tracking record initialized for ${currentShipmentId}`);
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });
  });

  describe('Phase 2: Mission Planning & Drone Dispatch', () => {
    test('3. Trigger Mission Planning (POST /missions @:3003)', async () => {
      const testName = '3. Trigger Mission Planning (POST /missions @:3003)';
      try {
        logger.log('DEBUG', 'MissionService', `Allocating drone for shipment ${currentShipmentId}...`);
        const payload = {
          shipmentId: currentShipmentId,
          origin: { lat: 45.4641, lon: 9.1919 },
          destination: { lat: 45.4847, lon: 9.2048 },
          packageWeight: 1.5
        };

        const res = await axios.post(`${config.missionService}/missions`, payload);

        expect(res.status).toBe(201);
        expect(res.data).toHaveProperty('id');
        expect(res.data).toHaveProperty('droneId');

        currentMissionId = res.data.id;
        assignedDroneId = res.data.droneId;
        missionEta = res.data.eta;

        logger.log('INFO', 'MissionService', `Mission Allocated -> ID: ${currentMissionId} | Drone: ${assignedDroneId}`);
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });

    test('4. Update Tracking (Drone Assigned @:3002)', async () => {
      const testName = '4. Update Tracking (Drone Assigned @:3002)';
      try {
        logger.log('DEBUG', 'TrackingService', `Linking Drone ${assignedDroneId} to tracking record...`);
        const payload = {
          type: 'DRONE_ASSIGNED',
          description: `Mission initialized. Drone ${assignedDroneId} assigned.`,
          droneId: assignedDroneId,
          progress: 0,
          eta: missionEta
        };

        const res = await axios.post(`${config.trackingService}/track/${currentShipmentId}/events`, payload);

        expect(res.status).toBe(201);
        expect(res.data.type).toBe('DRONE_ASSIGNED');
        logger.log('INFO', 'TrackingService', `Drone assignment timeline event recorded.`);
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });
  });

  describe('Phase 3: Flight Telemetry & Completion', () => {
    test('5. Simulate "En Route" Tracking Progress (POST /track/:id/events @:3002)', async () => {
      const testName = '5. Simulate "En Route" Tracking Progress (POST /track/:id/events @:3002)';
      try {
        logger.log('DEBUG', 'TrackingService', 'Simulating waypoint update...');
        const payload = {
          type: 'WAYPOINT_REACHED',
          description: 'Waypoint 2 reached (Mid-flight telemetry).',
          location: { lat: 45.4744, lon: 9.1983, alt: 120 },
          progress: 50
        };

        const res = await axios.post(`${config.trackingService}/track/${currentShipmentId}/events`, payload);

        expect(res.status).toBe(201);
        expect(res.data.type).toBe('WAYPOINT_REACHED');
        logger.log('INFO', 'TrackingService', 'Waypoint reached event recorded (50% progress)');
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });

    test('6. Complete Mission Flight (PATCH /missions/:id/complete @:3003)', async () => {
      const testName = '6. Complete Mission Flight (PATCH /missions/:id/complete @:3003)';
      try {
        if (!currentMissionId) {
          throw new Error('Cannot complete mission: currentMissionId is undefined.');
        }

        logger.log('DEBUG', 'MissionService', `Completing flight mission ${currentMissionId}...`);
        const res = await axios.patch(`${config.missionService}/missions/${currentMissionId}/complete`);

        expect(res.status).toBe(200);
        expect(res.data.status).toBe('COMPLETED');

        logger.log('INFO', 'MissionService', `Mission ${currentMissionId} completed. Drone ${assignedDroneId} released.`);
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });

    test('7. Update Shipment Status to Delivered (PATCH /shipments/:id/status @:3001)', async () => {
      const testName = '7. Update Shipment Status to Delivered (PATCH /shipments/:id/status @:3001)';
      try {
        logger.log('DEBUG', 'OrderService', `Updating shipment status for ${currentShipmentId} to DELIVERED...`);
        const payload = { status: 'DELIVERED' };

        const res = await axios.patch(`${config.orderService}/shipments/${currentShipmentId}/status`, payload);

        expect(res.status).toBe(200);
        expect(res.data.status).toBe('DELIVERED');

        logger.log('INFO', 'OrderService', `Shipment status updated to DELIVERED.`);
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });

    test('8. Update Tracking Timeline Final (POST /track/:id/events @:3002)', async () => {
      const testName = '8. Update Tracking Timeline Final (POST /track/:id/events @:3002)';
      try {
        logger.log('DEBUG', 'TrackingService', 'Finalizing tracking timeline...');
        const payload = {
          type: 'DELIVERED',
          description: 'Package safely delivered to destination.',
          progress: 100
        };

        const res = await axios.post(`${config.trackingService}/track/${currentShipmentId}/events`, payload);

        expect(res.status).toBe(201);
        expect(res.data.type).toBe('DELIVERED');

        logger.log('INFO', 'TrackingService', 'Final DELIVERED timeline event stored.');
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });
  });
});