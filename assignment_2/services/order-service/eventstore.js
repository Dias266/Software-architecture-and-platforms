/**
 * Append-only EVENT STORE (Event Sourcing pattern).
 *
 * Events are the single source of truth. The store:
 *  - appends events per aggregate stream (never updates/deletes),
 *  - replays a stream to rehydrate an aggregate,
 *  - notifies subscribers (CQRS projections, integration publishers).
 *
 * Persistence: JSON-lines file (one event per line) so the log survives
 * restarts — swap with EventStoreDB/Kafka/Postgres in production without
 * touching domain code.
 */
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

class EventStore {
  constructor({ file = null } = {}) {
    this.file = file;
    this.events = [];            // global ordered log
    this.streams = new Map();    // aggregateId -> events[]
    this.subscribers = [];
    if (file) this._load();
  }

  /** Append an event to its aggregate stream and notify subscribers. */
  append(event) {
    const stored = { eventId: randomUUID(), sequence: this.events.length + 1, ...event };
    this.events.push(stored);
    if (!this.streams.has(stored.aggregateId)) this.streams.set(stored.aggregateId, []);
    this.streams.get(stored.aggregateId).push(stored);
    if (this.file) fs.appendFileSync(this.file, JSON.stringify(stored) + "\n");
    for (const fn of this.subscribers) fn(stored);
    return stored;
  }

  /** Full event history of one aggregate (for rehydration / audit). */
  streamOf(aggregateId) {
    return this.streams.get(aggregateId) || [];
  }

  /** All events in global order (for rebuilding projections). */
  all() {
    return [...this.events];
  }

  /** Register a listener called for every appended event. */
  subscribe(fn) {
    this.subscribers.push(fn);
  }

  _load() {
    if (!fs.existsSync(this.file)) {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      return;
    }
    const lines = fs.readFileSync(this.file, "utf8").split("\n").filter(Boolean);
    for (const line of lines) {
      const e = JSON.parse(line);
      this.events.push(e);
      if (!this.streams.has(e.aggregateId)) this.streams.set(e.aggregateId, []);
      this.streams.get(e.aggregateId).push(e);
    }
  }
}

module.exports = { EventStore };
