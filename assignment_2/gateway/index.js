/**
 * API GATEWAY pattern — the single entry point of Shipping on the Air.
 *
 * Responsibilities:
 *  - request routing:   /api/shipments -> order,  /api/tracking -> tracking,
 *                       /api/missions|/api/drones -> mission
 *  - resilience:        one CIRCUIT BREAKER per upstream service
 *  - observability:     aggregated /health (fan-out to upstream health
 *                       check APIs) and Prometheus /metrics
 *
 * Clients never learn internal topology; services can move/scale freely.
 */
const express = require("express");
const cors = require("cors");
const client = require("prom-client");
const { CircuitBreaker } = require("./circuit-breaker");

const app = express();
app.use(cors());
app.use(express.json());

const UPSTREAMS = {
  order: process.env.ORDER_URL || "http://localhost:3001",
  tracking: process.env.TRACKING_URL || "http://localhost:3002",
  mission: process.env.MISSION_URL || "http://localhost:3003",
};

// ── Prometheus metrics ────────────────────────────────────────────────────
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });
const gatewayRequests = new client.Counter({
  name: "gateway_http_requests_total",
  help: "Requests through the API gateway",
  labelNames: ["upstream", "method", "status_code"],
  registers: [registry],
});
const gatewayDuration = new client.Histogram({
  name: "gateway_request_duration_seconds",
  help: "End-to-end latency of proxied requests",
  labelNames: ["upstream", "method"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});
const breakerState = new client.Gauge({
  name: "gateway_circuit_breaker_state",
  help: "Circuit breaker state per upstream (0=CLOSED, 1=HALF_OPEN, 2=OPEN)",
  labelNames: ["upstream"],
  registers: [registry],
});
const breakerTransitions = new client.Counter({
  name: "gateway_circuit_breaker_transitions_total",
  help: "Circuit breaker state transitions",
  labelNames: ["upstream", "to_state"],
  registers: [registry],
});

const STATE_VALUE = { CLOSED: 0, HALF_OPEN: 1, OPEN: 2 };
const breakers = {};
for (const name of Object.keys(UPSTREAMS)) {
  breakers[name] = new CircuitBreaker({
    name,
    failureThreshold: Number(process.env.CB_FAILURE_THRESHOLD || 3),
    resetTimeoutMs: Number(process.env.CB_RESET_TIMEOUT_MS || 10000),
    callTimeoutMs: Number(process.env.CB_CALL_TIMEOUT_MS || 2000),
    onStateChange: (upstream, _from, to) => {
      console.log(`[gateway] circuit '${upstream}' -> ${to}`);
      breakerState.set({ upstream }, STATE_VALUE[to]);
      breakerTransitions.inc({ upstream, to_state: to });
    },
  });
  breakerState.set({ upstream: name }, 0);
}

// ── Generic proxy through the circuit breaker ─────────────────────────────
function proxy(upstream, rewrite) {
  return async (req, res) => {
    const end = gatewayDuration.startTimer({ upstream, method: req.method });
    try {
      const response = await breakers[upstream].exec(async () => {
        const url = UPSTREAMS[upstream] + rewrite(req);
        const init = { method: req.method, headers: { "Content-Type": "application/json" } };
        if (!["GET", "HEAD", "DELETE"].includes(req.method)) init.body = JSON.stringify(req.body);
        const r = await fetch(url, init);
        if (r.status >= 500) throw new Error(`Upstream '${upstream}' returned ${r.status}`);
        return r;
      });
      const body = await response.json().catch(() => ({}));
      end();
      gatewayRequests.inc({ upstream, method: req.method, status_code: response.status });
      res.status(response.status).json(body);
    } catch (err) {
      end();
      const status = err.circuitOpen ? 503 : 502;
      gatewayRequests.inc({ upstream, method: req.method, status_code: status });
      res.status(status).json({
        error: err.circuitOpen ? "Service temporarily unavailable (circuit open)" : "Upstream error",
        upstream,
        detail: err.message,
      });
    }
  };
}

// ── Routes ────────────────────────────────────────────────────────────────
const strip = (prefix) => (req) => req.originalUrl.replace(prefix, "");
app.use("/api/shipments", proxy("order", strip("/api")));
app.use("/api/tracking", proxy("tracking", strip("/api")));
app.use("/api/missions", proxy("mission", strip("/api")));
app.use("/api/drones", proxy("mission", strip("/api")));

// ── Aggregated health check (fans out to every upstream /health) ─────────
app.get("/health", async (req, res) => {
  const checks = {};
  await Promise.all(Object.entries(UPSTREAMS).map(async ([name, base]) => {
    try {
      const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1500) });
      checks[name] = { status: r.ok ? "UP" : "DOWN", circuit: breakers[name].state };
    } catch {
      checks[name] = { status: "DOWN", circuit: breakers[name].state };
    }
  }));
  const allUp = Object.values(checks).every((c) => c.status === "UP");
  res.status(allUp ? 200 : 503).json({
    service: "api-gateway", status: allUp ? "UP" : "DEGRADED", checks,
    timestamp: new Date().toISOString(),
  });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`[api-gateway] listening on :${PORT}`));
