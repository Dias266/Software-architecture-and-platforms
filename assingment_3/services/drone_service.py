import json, os, threading, time, logging
from typing import Any
from fastapi import FastAPI, Response
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from DroneAgent import DroneAgent

KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC_ASSIGNMENTS = "shipping.drone.assignments"
TOPIC_STATUS = "shipping.drone.status"

# --- Metrics ---
DRONE_EVENTS_CONSUMED = Counter("drone_service_assignments_total", "Consumed events", ["event_type"])
DRONE_PUBLISH_SECONDS = Histogram("drone_service_assignment_to_status_seconds", "Timing")
DRONE_CONSUMER_ERRORS = Counter("drone_service_consumer_errors_total", "Errors", ["phase"])
DRONE_READY = Gauge("drone_service_consumer_running", "1 while Kafka consumer is active")

# --- Service State ---
_producer = None
_lock = threading.Lock()
# --- Global State ---
active_missions = {}
archived_missions = []  # History list
missions_lock = threading.Lock()

def get_producer():
    global _producer
    with _lock:
        if _producer is None:
            _producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
                value_serializer=lambda v: json.dumps(v).encode("utf-8")
            )
    return _producer

app = FastAPI(title="Drone Service")


def archive_mission(d_id, final_status):
    with missions_lock:
        if d_id in active_missions:
            # Save to history before deleting
            record = {"drone_id": d_id, "status": final_status, "completed_at": time.time()}
            archived_missions.append(record)
            del active_missions[d_id]
            logging.info(f"Archived mission for {d_id}")

@app.get("/drones/history")
def get_drone_history():
    with missions_lock:
        return archived_missions # Returns the full history of completed missions


# Inside main.py, define the cleanup function
def remove_mission(d_id):
    with missions_lock:
        if d_id in active_missions:
            del active_missions[d_id]
            logging.info(f"Cleaned up mission for {d_id}")

def consume_loop():
    while True:
        try:
            consumer = KafkaConsumer(TOPIC_ASSIGNMENTS, bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
                                     group_id="drone-fleet-alpha", value_deserializer=lambda b: json.loads(b.decode("utf-8")))
            DRONE_READY.set(1)
            
            for msg in consumer:
                ev = msg.value
                if isinstance(ev, dict) and ev.get("event_type") == "DroneAssigned":
                    d_id = ev.get("drone_id")
                    with _lock:
                        if d_id not in active_missions:
                            order_id = ev.get("order_id","unknown")
                            drone_id = ev.get("drone_id","unknown")
                            agent = DroneAgent(drone_id, order_id)
                            active_missions[d_id] = agent
                            threading.Thread(
                                target=agent.execute_mission, 
                                args=(get_producer, "shipping.drone.status", archive_mission), 
                                daemon=True
                            ).start()



                    DRONE_EVENTS_CONSUMED.labels("DroneAssigned").inc()
        except KafkaError:
            DRONE_CONSUMER_ERRORS.labels("connect").inc()
            time.sleep(2)
        finally:
            DRONE_READY.set(0)

@app.on_event("startup")
def startup(): threading.Thread(target=consume_loop, daemon=True).start()

@app.get("/drones/active")
def get_active_drones(): return {d_id: agent.status for d_id, agent in active_missions.items()}

@app.get("/metrics")
def metrics(): return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/health")
def health(): return {"status": "ok"}