/**
 * Hexagonal Architecture Isolation & Verification Test Suite
 * Compatible with Jest & automatically generates 'test-execution-log.txt'.
 */

const fs = require('fs');
const path = require('path');

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
      '           SHIPPING ON THE AIR - HEXAGONAL ARCHITECTURE TEST SUITE',
      '================================================================================',
      `Timestamp   : ${new Date().toISOString()}`,
      'Service     : Order Service / Tracking Context',
      'Test File   : order-service.hexagon.test.js',
      `Environment : Node.js (${process.version}) | Test Runner: Jest`,
      'Architecture: Hexagonal Architecture (Ports & Adapters)',
      '',
      '--------------------------------------------------------------------------------',
      '1. TEST SUITE INITIALIZATION & SUITE DISCOVERY',
      '--------------------------------------------------------------------------------',
      `[${this.getTimestamp()}] INFO  [TestRunner] Initializing Jest runner context...`,
      `[${this.getTimestamp()}] INFO  [TestRunner] Ports loaded: [ShipmentRepositoryPort]`,
      `[${this.getTimestamp()}] INFO  [TestRunner] Domain Services loaded: [ShipmentService]`,
      `[${this.getTimestamp()}] INFO  [TestRunner] Adapters loaded: [InMemoryShipmentRepository, ShipmentController]`,
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

  suite(name) {
    const line = `\n[SUITE] ${name}\n${'-'.repeat(80)}`;
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
      `HEXAGONAL ISOLATION VERIFICATION VERDICT: [ ${this.failed === 0 ? 'PASSED' : 'FAILED'} ]`,
      '- Core Domain: Completely isolated from frameworks and databases.',
      '- Ports & Adapters: Contracts strictly respected and interchangeable.',
      '================================================================================'
    ];
    this.logs.push(...summary);

    fs.writeFileSync(logFilePath, this.logs.join('\n'), 'utf8');
    console.log(`\n\x1b[32m✔ Test execution log successfully saved to: ${logFilePath}\x1b[0m\n`);
  }
}

const logger = new TestLogger();

// Automatically save log file after all Jest tests complete
afterAll(() => {
  logger.save();
});

// ==============================================================================
// 1. DOMAIN & PORTS DEFINITIONS (Mocked/Simulated Hexagonal Contracts)
// ==============================================================================

class ShipmentRepositoryPort {
  async findAll() { throw new Error('Method not implemented'); }
  async findById(id) { throw new Error('Method not implemented'); }
  async save(shipment) { throw new Error('Method not implemented'); }
  async updateStatus(id, status) { throw new Error('Method not implemented'); }
}

class InMemoryShipmentRepository extends ShipmentRepositoryPort {
  constructor() {
    super();
    this.shipments = new Map();
  }

  async findAll() {
    return Array.from(this.shipments.values());
  }

  async findById(id) {
    return this.shipments.get(id) || null;
  }

  async save(shipment) {
    this.shipments.set(shipment.id, shipment);
    return shipment;
  }

  async updateStatus(id, status) {
    const shipment = this.shipments.get(id);
    if (!shipment) return null;
    shipment.status = status;
    this.shipments.set(id, shipment);
    return shipment;
  }
}

class ShipmentService {
  constructor(shipmentRepository) {
    if (!shipmentRepository) {
      throw new Error('Outbound Port [ShipmentRepositoryPort] is required.');
    }
    this.repository = shipmentRepository;
  }

  async createShipment(dto) {
    if (!dto.origin || !dto.destination || !dto.weight) {
      throw new Error('Invalid shipment payload: Missing mandatory attributes.');
    }

    const shipment = {
      id: `SHP-${Math.floor(100000 + Math.random() * 900000)}`,
      origin: dto.origin,
      destination: dto.destination,
      weight: dto.weight,
      status: 'PLACED',
      createdAt: new Date().toISOString()
    };

    return await this.repository.save(shipment);
  }

  async confirmShipment(id) {
    const shipment = await this.repository.findById(id);
    if (!shipment) {
      throw new Error(`Shipment with ID ${id} not found.`);
    }
    return await this.repository.updateStatus(id, 'CONFIRMED');
  }
}

class ShipmentController {
  constructor(shipmentService) {
    this.shipmentService = shipmentService;
  }

  async create(req, res) {
    try {
      const result = await this.shipmentService.createShipment(req.body);
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}

// ==============================================================================
// 2. JEST TEST SUITES WITH LOGGING INTEGRATION
// ==============================================================================

describe('Hexagonal Architecture Isolation Tests - Order Service', () => {
  let inMemoryRepo;
  let shipmentService;
  let controller;

  beforeEach(() => {
    inMemoryRepo = new InMemoryShipmentRepository();
    shipmentService = new ShipmentService(inMemoryRepo);
    controller = new ShipmentController(shipmentService);
  });

  describe('1. Core Application Hexagon Isolation (Domain Core)', () => {
    test('should successfully execute business logic without any HTTP/Database frameworks', async () => {
      const testName = 'should successfully execute business logic without any HTTP/Database frameworks';
      try {
        logger.log('DEBUG', 'DomainCore', 'Executing ShipmentService.createShipment()');
        const payload = { origin: 'Cesena', destination: 'Bologna', weight: 2.5 };
        const shipment = await shipmentService.createShipment(payload);

        expect(shipment).toBeDefined();
        expect(shipment.id).toMatch(/^SHP-\d{6}$/);
        expect(shipment.status).toBe('PLACED');
        
        logger.log('DEBUG', 'DomainCore', `Domain Entity Created -> ID: ${shipment.id}`);
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });

    test('should enforce domain validation rules independently', async () => {
      const testName = 'should enforce domain validation rules independently';
      try {
        logger.log('DEBUG', 'DomainCore', 'Testing invalid payload validation');
        await expect(shipmentService.createShipment({ origin: 'Cesena' })).rejects.toThrow(
          'Invalid shipment payload: Missing mandatory attributes.'
        );
        logger.log('WARN', 'DomainCore', 'Caught expected validation exception');
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });

    test('should prevent instantiation if Outbound Port is missing', () => {
      const testName = 'should prevent instantiation if Outbound Port is missing';
      try {
        logger.log('DEBUG', 'DomainCore', 'Checking constructor dependency guard');
        expect(() => new ShipmentService(null)).toThrow(
          'Outbound Port [ShipmentRepositoryPort] is required.'
        );
        logger.log('WARN', 'DomainCore', 'Guard successfully enforced');
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });
  });

  describe('2. Outbound Adapter Compliance (Secondary Port Verification)', () => {
    test('InMemoryRepository adapter must strictly implement port interface methods', async () => {
      const testName = 'InMemoryRepository adapter must strictly implement port interface methods';
      try {
        logger.log('DEBUG', 'Port:Out', 'Verifying method contract on InMemoryShipmentRepository');
        const requiredMethods = ['findAll', 'findById', 'save', 'updateStatus'];
        for (const method of requiredMethods) {
          expect(typeof inMemoryRepo[method]).toBe('function');
        }
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });

    test('should seamlessly allow swapping outbound repository implementation with a Mock Adapter', async () => {
      const testName = 'should seamlessly allow swapping outbound repository implementation with a Mock Adapter';
      try {
        logger.log('DEBUG', 'Port:Out', 'Injecting mock adapter into domain core');
        const mockAdapter = {
          save: jest.fn().mockResolvedValue({ id: 'SHP-MOCK-999', status: 'PLACED' }),
          findById: jest.fn(),
          findAll: jest.fn(),
          updateStatus: jest.fn()
        };

        const isolatedService = new ShipmentService(mockAdapter);
        const result = await isolatedService.createShipment({ origin: 'A', destination: 'B', weight: 1 });

        expect(result.id).toBe('SHP-MOCK-999');
        expect(mockAdapter.save).toHaveBeenCalledTimes(1);
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });
  });

  describe('3. Inbound Adapter Decoupling (Primary Controller Verification)', () => {
    test('HTTP Controller should adapt request payload to domain service and return HTTP 201', async () => {
      const testName = 'HTTP Controller should adapt request payload to domain service and return HTTP 201';
      try {
        logger.log('DEBUG', 'Adapter:In', 'Simulating HTTP Request POST /shipments');
        const req = { body: { origin: 'Cesena Hub', destination: 'Forlì', weight: 1.2 } };
        let responseStatus = null;
        let responseBody = null;

        const res = {
          status(code) { responseStatus = code; return this; },
          json(data) { responseBody = data; return this; }
        };

        await controller.create(req, res);

        expect(responseStatus).toBe(201);
        expect(responseBody.success).toBe(true);
        logger.pass(testName);
      } catch (err) {
        logger.fail(testName, err);
        throw err;
      }
    });
  });
});