# User Stories &amp; Use Cases — Assignment #01
### Shipping on the Air

Companion to `01-analysis.md` / `02-design.md`. These express the same functional
requirements (FR-1 through FR-9) from the perspective of the people who use the
system, rather than as an FR table — useful for the presentation narrative, not a
replacement for the FR table itself.

---

## Actors

| Actor | Description |
|---|---|
| **Customer** | The person requesting a package delivery and tracking its progress. |
| **System Operator** | The person (or, in production, an automated process) responsible for dispatching missions, managing the fleet, and recording tracking events. In this prototype, "System Operator" actions are performed manually via API calls, since — per `02-design.md §4.1` — no automatic dispatch exists yet. |

---

## User Stories

| ID | Story | Realises |
|---|---|---|
| US-1 | As a **customer**, I want to submit a new shipment with origin, destination, and package details, so that the delivery process can begin. | FR-1, FR-2 |
| US-2 | As a **customer**, I want to view the current status of my shipment, so that I know whether it's pending, confirmed, or delivered. | FR-3 |
| US-3 | As a **customer**, I want to cancel a shipment that hasn't been dispatched yet, so that I'm not charged for a delivery I no longer need. | FR-4 |
| US-4 | As a **system operator**, I want to dispatch an available drone to a confirmed shipment, so that the package can begin its journey. | FR-5 |
| US-5 | As a **system operator**, I want to mark a mission as completed or aborted, so that the drone is released back to the available fleet. | FR-6 |
| US-6 | As a **customer**, I want to see my package's live location, delivery progress, and event history, so that I know exactly what's happening with my delivery. | FR-7 |
| US-7 | As a **customer**, I want to quickly check just the estimated time of arrival, without loading the full event history, so that I can plan around it. | FR-8 |
| US-8 | As a **system operator**, I want to inspect the current fleet (drones, battery, availability), so that I can understand dispatch capacity. | FR-9 |

**Honest scope note for US-4, US-5, and the "record tracking event" half of US-6:**
in this prototype these are performed by the system operator making an explicit API
call — they are not triggered automatically when a shipment is placed or a mission
starts. See `02-design.md §4.1` and the sequence diagram in §4.2 (also available as a
standalone file, `sequence-diagram-a1.svg`) for the precise, current behavior.

---

## Use Cases (formal descriptions)

### UC-1: Create Shipment
- **Actor:** Customer
- **Precondition:** None
- **Main flow:**
  1. Customer provides origin, destination, package weight/fragility, and a time window.
  2. System (`order-service`) validates the request.
  3. System creates the shipment with status `PENDING` and returns its id.
- **Alternate flow:** If origin, destination, or packageSpec is missing → system
  rejects with `400 Bad Request` (FR-2).
- **Postcondition:** A new `Shipment` exists with status `PENDING`.

### UC-2: View Shipment Status
- **Actor:** Customer
- **Precondition:** A shipment exists.
- **Main flow:** Customer requests the shipment by id; system returns its current
  status and details.

### UC-3: Cancel Shipment
- **Actor:** Customer
- **Precondition:** Shipment exists and has not yet been delivered.
- **Main flow:** Customer requests cancellation; system sets status to `CANCELLED`.

### UC-4: Dispatch Mission
- **Actor:** System Operator
- **Precondition:** A shipment exists (any status — no check against Booking's own
  status is currently enforced by `mission-service`).
- **Main flow:**
  1. Operator submits `shipmentId`, origin, destination, and package weight to `mission-service`.
  2. System selects an `AVAILABLE` drone whose `maxPayload` covers the weight and
     whose battery is above the safety threshold.
  3. System computes a route (waypoints) and creates the mission with status
     `IN_PROGRESS`.
  4. The selected drone's status changes to `ON_MISSION`.
- **Alternate flow:** No drone meets the requirements → `503 Service Unavailable`.
- **Note:** This use case is **not triggered automatically** by UC-1 — the operator
  must invoke it explicitly (see scope note above).

### UC-5: Complete / Abort Mission
- **Actor:** System Operator
- **Precondition:** Mission exists with status `IN_PROGRESS`.
- **Main flow:** Operator marks the mission `COMPLETED` or `ABORTED`; the assigned
  drone's status reverts to `AVAILABLE`.

### UC-6: Track Shipment
- **Actor:** Customer
- **Precondition:** A tracking record exists for the shipment (created by the first
  event ever posted to it — see UC-8).
- **Main flow:** Customer requests the tracking record; system returns current
  location, ETA, progress percentage, and the full chronological event log.
- **Alternate flow:** No tracking record exists yet → `404 Not Found`.

### UC-7: Query ETA
- **Actor:** Customer
- **Main flow:** Customer requests just the ETA/progress for a shipment, without the
  full event log (FR-8) — a lighter-weight read than UC-6.

### UC-8: Record Tracking Event
- **Actor:** System Operator
- **Precondition:** None (creates a tracking record on first use if one doesn't exist).
- **Main flow:** Operator posts an event (type + description, optionally
  location/eta/progress) for a shipment; system appends it to that shipment's
  (append-only) event log.
- **Note:** Not triggered automatically by UC-4/UC-5 — see scope note above.

### UC-9: Inspect Fleet
- **Actor:** System Operator
- **Main flow:** Operator requests the full list of drones and their current
  status/battery/payload capacity.

---

## Files in this set

| File | Contents |
|---|---|
| `use-case-diagram-a1.svg` | Visual use case diagram (actors + use cases + relationships) |
| `sequence-diagram-a1.svg` | Standalone sequence diagram of the actual shipment lifecycle |
| `uml-class-diagram-a1.svg` | UML class diagram — hexagonal structure of all 3 services |
| `uml-domain-model-a1.svg` | UML domain model — aggregates, entities, value objects per context |
| `order-service/tests/test.js` | 9 unit tests for order-service's use-case layer |
| `mission-service/tests/test.js` | 8 unit tests for mission-service's use-case layer |
| `tracking-service/tests/test.js` | 7 unit tests for tracking-service's use-case layer |
