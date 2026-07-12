# Changelog

All notable changes to **Shipping on the Air** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2025-10-20

### Added
- Initial living document covering full DDD analysis and design
- Ubiquitous Language glossary (12 terms)
- Functional requirements FR-01 through FR-10
- Non-functional requirements QA-01 through QA-07
- User stories US-01 through US-05
- Aggregate design: Shipment, Mission, Drone, TrackingRecord
- Value Objects and Domain Events catalog
- Bounded Context map with 5 contexts and relationship descriptions
- Microservices architecture diagram (6 services + API Gateway + Kafka)
- Service catalogue with tech stack and ports
- Kafka event catalog (8 topics/events)
- Interactive prototype UI (React + Vite)
  - Shipment list with live status and progress
  - Package tracking timeline
  - Map visualisation with drone position
  - New shipment order form
- order-service scaffold (Node.js + Express)
- tracking-service scaffold (Node.js + Express)
- mission-service scaffold (Node.js + Express)
- docker-compose.yml wiring all services

---

## [Unreleased]

### Planned
- Connect frontend to real REST APIs (replace mock data)
- Integrate Kafka event bus between services
- Add PostgreSQL persistence to all services
- Route planning service with PostGIS
- Fleet management service
- JWT authentication via API Gateway
- Real drone telemetry simulation (MQTT)
- WebSocket push for live tracking updates
- Email/SMS notification service
