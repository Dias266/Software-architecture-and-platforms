# Software Architecture and Platforms
# Shipping on the Air 
### Software Architecture and Platforms — a.y. 2025–2026 · University of Bologna

An online system for delivering packages through drones, as a service: a customer sends a package from one place to another within a time window and tracks the delivery in real time. Developed across three assignments with **Domain-Driven Design** as the methodological approach and **Microservices** as the architectural style.

## Team

| Name | Student ID | Assignment |
|------|-----------|------------|
| Dias Katrenov | <!-- 0001159300 --> | #01 |
| Mary Anne Selirio| 0001180941 | #02 |
| Danial Khayatian | <!-- ID --> | #03 |

## The three assignments

### [Assignment #01 — Shipping on the Air](./assignment_1/)
From the business idea to a running prototype: DDD analysis (ubiquitous language, bounded contexts, aggregates), functional & non-functional requirements, microservices decomposition (Order / Tracking / Mission services), React living-doc + prototype UI, Docker Compose deployment.
→ [README](./assignment_1/README.md) · living document in `src/App.jsx` (plus `docs/01-analysis.md`, `docs/02-design.md`, `openapi.yaml`)

### [Assignment #02 — Shipping on the Air with Patterns](./assignment_2/)
Refines the design, implementation and deployment of #01 by applying six microservices patterns: **API Gateway**, **Health Check API** and **Application Metrics** (observability), **Event Sourcing** on the order service, **CQRS**, and **Circuit Breaker**. Adds a container-based deployment with Prometheus, a full test pyramid (unit / integration / e2e), and two Quality Attribute Scenarios implemented via the observability patterns.
→ [REPORT.md](./assignment_2/REPORT.md) · [README](./assignment_2/README.md)

### [Assignment #03 — Event-driven re-engineering](./assignment_3/)
Re-engineers the shipment orchestration around **Apache Kafka** as event-driven middleware, defines **SLOs/SLIs** on Prometheus metrics (orchestration latency, order API availability), provides **Kubernetes** manifests, and sketches an optional **BDI agent** architecture for autonomous drone control.
→ [REPORT.md](./assignment_3/REPORT.md) · [README](./assignment_3/README.md)

## Architectural storyline

1. **#01 — model the domain**: bounded contexts and aggregates fix the service boundaries.
2. **#02 — harden the architecture**: one entry point, contained failures, auditable state, measurable behaviour, tested at every pyramid level.
3. **#03 — scale the integration**: synchronous HTTP integration is replaced by an event log (Kafka); observability graduates into explicit SLOs; deployment graduates to Kubernetes.

Each assignment folder is self-contained with its own README and `docker compose up --build`.
