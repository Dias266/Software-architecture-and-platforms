# ✈️ Shipping on the Air — Assignment #02
### Shipping on the Air with Patterns

Refines the Assignment #01 prototype by applying six microservices patterns:
**API Gateway · Health Check API · Application Metrics · Event Sourcing (order service) · CQRS · Circuit Breaker**

📄 Full architectural discussion: [REPORT.md](./REPORT.md)

## Structure

```
assignment-02/
├── REPORT.md                  ← pattern-by-pattern architectural report + QAS
├── docker-compose.yml         ← container-based deployment
├── infra/prometheus.yml       ← metrics scraping config
├── gateway/                   ← API Gateway + Circuit Breaker
│   ├── circuit-breaker.js
│   └── tests/                 ← unit test (breaker state machine)
├── services/
│   ├── order-service/         ← EVENT SOURCING + CQRS write/read split
│   │   ├── domain/shipment.js ← pure event-sourced aggregate
│   │   ├── eventstore.js      ← append-only log (JSONL on a volume)
│   │   ├── projection.js      ← CQRS read model
│   │   └── tests/             ← unit + integration tests
│   ├── tracking-service/      ← cross-service CQRS read model
│   └── mission-service/       ← drone fleet (health + metrics added)
└── tests/e2e/                 ← end-to-end test through the gateway

```

## cross-service CQRS read model
<img width="1408" height="768" alt="image" src="https://github.com/user-attachments/assets/10e94c77-b71f-49de-a9c1-41c565b15789" />

## Run

```bash
docker compose up --build
```

| Endpoint | URL |
|---|---|
| **API Gateway (single entry point)** | http://localhost:8080 |
| Aggregated platform health | http://localhost:8080/health |
| Gateway metrics | http://localhost:8080/metrics |
| Prometheus | http://localhost:9090 |

## Try it

```bash
# place a shipment (through the gateway)
curl -X POST localhost:8080/api/shipments -H 'Content-Type: application/json' -d '{
  "customerId":"CUST-01",
  "origin":{"address":"Bologna Centrale","lat":44.505,"lon":11.343},
  "destination":{"address":"Modena","lat":44.647,"lon":10.925},
  "packageSpec":{"weight":1.5,"fragile":false}}'
# -> {"id":"SHP-XXXXXX","status":"PENDING"}

curl -X POST localhost:8080/api/shipments/SHP-XXXXXX/confirm
curl -X POST localhost:8080/api/missions -H 'Content-Type: application/json' \
     -d '{"shipmentId":"SHP-XXXXXX","weightKg":1.5}'
curl localhost:8080/api/tracking/SHP-XXXXXX          # live tracking timeline
curl localhost:8080/api/shipments/SHP-XXXXXX/events  # full event-sourced audit log

# circuit breaker demo
docker stop order-service
curl localhost:8080/api/shipments   # x3 -> 502, then 503 "circuit open" (fail-fast)
docker start order-service          # circuit half-opens and recloses within ~10s
```

## Tests (test pyramid)

```bash
cd services/order-service && npm install
npm run test:unit           # unit: event-sourced aggregate
npm run test:integration    # integration: HTTP API + projection consistency

cd ../../gateway && npm install
npm run test:unit           # unit: circuit breaker state machine

# e2e (needs docker compose up -d first)
node --test tests/e2e/e2e.test.js
```
