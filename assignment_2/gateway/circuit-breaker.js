/**
 * CIRCUIT BREAKER pattern (hand-rolled, no library — three-state machine).
 *
 *   CLOSED    requests flow; failures are counted.
 *   OPEN      after `failureThreshold` consecutive failures: fail fast
 *             (no network call) for `resetTimeoutMs`.
 *   HALF_OPEN after the timeout one trial request is allowed through;
 *             success closes the circuit, failure re-opens it.
 *
 * Protects the gateway (and its callers) from a slow/dead upstream:
 * instead of piling up timed-out connections, callers get an immediate
 * 503 and the upstream gets breathing room to recover.
 */
const STATES = Object.freeze({ CLOSED: "CLOSED", OPEN: "OPEN", HALF_OPEN: "HALF_OPEN" });

class CircuitBreaker {
  constructor({ name, failureThreshold = 3, resetTimeoutMs = 10000, callTimeoutMs = 2000, onStateChange = null }) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.callTimeoutMs = callTimeoutMs;
    this.onStateChange = onStateChange;
    this.state = STATES.CLOSED;
    this.failures = 0;
    this.openedAt = null;
  }

  async exec(fn) {
    if (this.state === STATES.OPEN) {
      if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
        this._transition(STATES.HALF_OPEN); // allow one trial call
      } else {
        const err = new Error(`Circuit '${this.name}' is OPEN — failing fast`);
        err.circuitOpen = true;
        throw err;
      }
    }

    try {
      const result = await this._withTimeout(fn);
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _withTimeout(fn) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Circuit '${this.name}': call timed out`)), this.callTimeoutMs);
      fn().then((r) => { clearTimeout(timer); resolve(r); }, (e) => { clearTimeout(timer); reject(e); });
    });
  }

  _onSuccess() {
    this.failures = 0;
    if (this.state !== STATES.CLOSED) this._transition(STATES.CLOSED);
  }

  _onFailure() {
    this.failures += 1;
    if (this.state === STATES.HALF_OPEN || this.failures >= this.failureThreshold) {
      this.openedAt = Date.now();
      this._transition(STATES.OPEN);
    }
  }

  _transition(next) {
    const prev = this.state;
    this.state = next;
    if (prev !== next && this.onStateChange) this.onStateChange(this.name, prev, next);
  }
}

module.exports = { CircuitBreaker, STATES };
