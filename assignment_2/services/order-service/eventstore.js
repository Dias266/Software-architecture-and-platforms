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
  /**
   * @param {Object} options
   * @param {string|null} options.file - File path to save/load events (e.g., "./data/events.jsonl")
   */
  constructor({ file = null } = {}) {
    this.file = file;
    this.events = [];         // Global ordered log: Array of event objects
    this.streams = new Map(); // aggregateId -> Array of event objects
    this.subscribers = [];

    if (file) {
      this._load();
    }
  }

  /**
   * Append an event to its aggregate stream and notify subscribers.
   * 
   * @param {Object} event - Event data (must contain at least aggregateId and type)
   * @returns {Object} The stored event enriched with eventId and global sequence number
   */
  append(event) {
    if (!event.aggregateId) {
      throw new Error("Event must contain an 'aggregateId'.");
    }

    const stored = {
      eventId: randomUUID(),
      sequence: this.events.length + 1,
      timestamp: new Date().toISOString(),
      ...event,
    };

    // 1. Store globally
    this.events.push(stored);

    // 2. Store in aggregate stream
    if (!this.streams.has(stored.aggregateId)) {
      this.streams.set(stored.aggregateId, []);
    }
    this.streams.get(stored.aggregateId).push(stored);

    // 3. Persist to disk (if file option is provided)
    if (this.file) {
      fs.appendFileSync(this.file, JSON.stringify(stored) + "\n", "utf8");
    }

    // 4. Notify all registered subscribers
    for (const subscriber of this.subscribers) {
      try {
        subscriber(stored);
      } catch (err) {
        console.error("Subscriber error:", err);
      }
    }

    return stored;
  }

  /**
   * Full event history of one aggregate (for rehydration / aggregate recovery).
   * 
   * @param {string} aggregateId
   * @returns {Array} Array of events for this aggregate
   */
  streamOf(aggregateId) {
    return this.streams.get(aggregateId) || [];
  }

  /**
   * All events in global order (useful for rebuilding projections or read models).
   * 
   * @returns {Array} Copy of all stored events
   */
  all() {
    return [...this.events];
  }

  /**
   * Register a callback listener called for every newly appended event.
   * 
   * @param {Function} fn - Subscriber callback (receives stored event)
   */
  subscribe(fn) {
    this.subscribers.push(fn);
  }

  /**
   * Internal helper to load and parse existing JSON-lines file on startup.
   */
  _load() {
    const dir = path.dirname(this.file);

    // Ensure target folder exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // If file doesn't exist yet, return empty
    if (!fs.existsSync(this.file)) {
      return;
    }

    // Read and parse file line by line
    const fileContent = fs.readFileSync(this.file, "utf8");
    const lines = fileContent.split(/\r?\n/).filter((line) => line.trim() !== "");

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        
        this.events.push(event);

        if (!this.streams.has(event.aggregateId)) {
          this.streams.set(event.aggregateId, []);
        }
        this.streams.get(event.aggregateId).push(event);
      } catch (err) {
        console.error(`Failed to parse line in event log [${this.file}]:`, line, err);
      }
    }
  }
}

module.exports = { EventStore };