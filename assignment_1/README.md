Here is the raw Markdown text ready for you to copy and paste:

# ✈️ Shipping on the Air

> Autonomous drone package delivery platform — Assignment #01
> **Version:** `v1.0.0` · Course Project · DDD + Microservices Architecture

---

## 💡 Overview

**Shipping on the Air** is a distributed, event-driven platform designed for automated autonomous drone logistics.

### Key Features

* **Smart Booking:** Onboard shipments with distinct physical specifications and time constraints.
* **Automated Dispatching:** Dynamically matches optimal drones and generates 3D flight waypoints.
* **Live Telematics:** High-frequency tracking with sub-resource ETA calculations and checkpoint logs.
* **Resilient Operations:** Built-in flight safety overrides (In-flight Route Abort / Return-to-Base).

The platform applies **Domain-Driven Design (DDD)** principles to orchestrate decentralized, event-driven microservices.

---
<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/39069067-e8dc-4d28-bb1c-f91a77bba045" />


## 📂 Repository Structure

```text
shipping-on-the-air/
├── openapi.yaml                 ← Unified API specification (OpenAPI 3.0)
├── docker-compose.yml           ← Service orchestrator
├── frontend/                    ← React Web App (Prototype UI + Living Doc)
│   ├── src/
│   │   └── App.jsx
│   └── package.json
└── services/
    ├── order-service/           ← Manages shipment lifecycle (Port 3001)
    ├── tracking-service/        ← Live telematics & event streams (Port 3002)
    └── mission-service/         ← Fleet dispatches & flight routes (Port 3003)

```

---

## 🚀 Quick Start & Environment Setup

### Option A — Frontend Prototype Only

```bash
cd frontend
npm install && npm run dev

```

🌐 **URL:** [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173)

### Option B — Complete Microservice Infrastructure (Docker)

Spin up the complete ecosystem alongside an isolated interactive global documentation suite:

```bash
docker compose up --build -d

```

### 🛰️ Cluster Port Allocation

| Service Component | Internal Domain URI | Purpose |
| --- | --- | --- |
| **API Documentation** | [http://localhost:8080](https://www.google.com/search?q=http://localhost:8080) | Interactive Swagger UI API Engine |
| **Frontend UI** | [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173) | Living document & simulation interface |
| **Order Service** | [http://localhost:3001](https://www.google.com/search?q=http://localhost:3001) | Core booking & shipment records |
| **Tracking Service** | [http://localhost:3002](https://www.google.com/search?q=http://localhost:3002) | Telematics ledger & event ingestion |
| **Mission Service** | [http://localhost:3003](https://www.google.com/search?q=http://localhost:3003) | Flight path calculation & asset tracking |

---

## 🏗️ Architectural Topology

The system maps explicitly to **5 Bounded Contexts** communicating asynchronously via **Apache Kafka** domain events.

| Bounded Context | Microservice Owner | Core Domain Responsibility |
| --- | --- | --- |
| **Order Management** | `order-service` | Ingestion, validation, and shipment state transitions. |
| **Route Planning** | `mission-service` | Geo-spatial 3D waypoint computation & corridor safety. |
| **Fleet Management** | `mission-service` | Drone availability matrices, payloads, and battery health. |
| **Mission Execution** | `mission-service` | Telemetry capture, route verification, and safe landing steps. |
| **Tracking & Alerts** | `tracking-service` | Dynamic ETA calculations and chronological journey events. |

---

## 🛠️ Technology Ecosystem

* **Frontend:** React + Vite (SPA)
* **Backend Services:** Node.js + Express.js
* **Database Engine:** PostgreSQL (Isolated per microservice context)
* **Asynchronous Bus:** Apache Kafka (Distributed Domain Event Logs)
* **Containerization:** Docker + Docker Compose v2
* **API Standards:** OpenAPI 3.0 Specification (Swagger rendering)

---

## 📖 The "Living Document"

The code inside `frontend/src/App.jsx` acts as the project's executable **living documentation**, combining blueprint models directly with operational software:

* ✅ Functional & Non-Functional Requirements Matrix
* ✅ **Ubiquitous Language Glossary** for logistics-drones alignment
* ✅ Aggregate boundaries & Entity definition blocks
* ✅ Vectorized **Bounded Context Map** (SVG Blueprint)
* ✅ Integrated Kafka Domain Event Catalog
* ✅ Live simulation sandbox tracking `SHP-001`, `MSN-001`, and `DRN-07`

---

## 🎥 Demonstration

> 📹 **[Watch the Demo Video Layout](https://github.com/)** *(Insert link post-recording)*

---

## 👥 Engineering Team

* **Student Name** (Student ID: `00000000`) - *Core System Contributor*

---

## 📄 License

Academic Research Artifact — Protected against commercial distribution.
