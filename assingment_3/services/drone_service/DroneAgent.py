import random
import time
import logging
from dataclasses import dataclass
from enum import Enum, auto

class FlightMode(Enum):
    IDLE = auto()
    DELIVER = auto()
    RTB = auto()

@dataclass
class Beliefs:
    battery_pct: float
    wind_mps: float
    distance_to_drop_m: float
    obstacle_detected: bool

class DroneAgent:
    def __init__(self, drone_id: str, order_id: str):
        self.drone_id = drone_id
        self.order_id = order_id
        self.status = "INITIALIZING"

    def sense(self) -> Beliefs:
        return Beliefs(
            battery_pct=max(5.0, min(100.0, 72.0 + random.uniform(-2, 2))),
            wind_mps=random.uniform(0, 8),
            distance_to_drop_m=max(0.0, 320.0 + random.uniform(-40, 40)),
            obstacle_detected=random.random() < 0.15,
        )

    def deliberate(self, b: Beliefs) -> FlightMode:
        if b.battery_pct < 18 and b.distance_to_drop_m > 50: return FlightMode.RTB
        if b.obstacle_detected and b.wind_mps > 5: return FlightMode.IDLE
        if b.distance_to_drop_m < 15: return FlightMode.IDLE
        return FlightMode.DELIVER

# In drone_agent.py

    def execute_mission(self, producer_getter, callback_topic: str, archive_callback):
        """Runs the 8-step cycle."""
        try:
            for step in range(8):
                b = self.sense()
                mode = self.deliberate(b)
                self.status = f"Step {step}: {mode.name}"
                
                producer = producer_getter()
                if producer:
                    producer.send(callback_topic, value={
                        "event_type": "DroneTelemetry",
                        "drone_id": self.drone_id,
                        "order_id": self.order_id,
                        "step": self.status,
                        "mode": mode.name,
                        "battery": round(b.battery_pct, 1)
                    })
                time.sleep(0.5)
        except Exception as e:
            logging.error(f"Agent {self.drone_id} error: {e}")
        finally:
            self.status = "COMPLETED"
            archive_callback(self.drone_id, "COMPLETED")