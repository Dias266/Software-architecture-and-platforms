import React, { useState, useEffect } from "react";

const CONFIG = {
  orderService: "http://localhost:3001",
  trackingService: "http://localhost:3002",
  missionService: "http://localhost:3003",
};

const colors = {
  bg: "#0a0e1a",
  surface: "#111827",
  surface2: "#1a2235",
  border: "#1e2d45",
  accent: "#00d4ff",
  green: "#10b981",
  yellow: "#f59e0b",
  red: "#ef4444",
  text: "#e2e8f0",
  muted: "#64748b",
  white: "#ffffff",
};

// Explicit lifecycle step configuration with canonical event mappings
const LIFECYCLE_STEPS = [
  { id: 1, name: "Create Order", service: "Order Service (:3001)", endpoint: "POST /shipments", eventType: "ORDER_CREATED" },
  { id: 2, name: "Initialize Tracking", service: "Tracking Service (:3002)", endpoint: "POST /track/:shipmentId/events", eventType: "ORDER_PLACED" },
  { id: 3, name: "Request Mission Allocation", service: "Mission Service (:3003)", endpoint: "POST /missions", eventType: "MISSION_ALLOCATED" },
  { id: 4, name: "Record Drone Assignment", service: "Tracking Service (:3002)", endpoint: "POST /track/:shipmentId/events", eventType: "DRONE_ASSIGNED" },
  { id: 5, name: "Record Telemetry / Waypoint", service: "Tracking Service (:3002)", endpoint: "POST /track/:shipmentId/events", eventType: "WAYPOINT_REACHED" },
  { id: 6, name: "Complete Mission Flight", service: "Mission Service (:3003)", endpoint: "PATCH /missions/:id/complete", eventType: "MISSION_COMPLETED" },
  { id: 7, name: "Update Order to DELIVERED", service: "Order Service (:3001)", endpoint: "PATCH /shipments/:id/status", eventType: "STATUS_UPDATED_DELIVERED" },
  { id: 8, name: "Finalize Delivery Tracking", service: "Tracking Service (:3002)", endpoint: "POST /track/:shipmentId/events", eventType: "DELIVERED" },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── TIMELINE COMPONENT ────────────────────────────────────────────────────────

function TrackingTimeline({ shipment, stepLogs = {}, activeContext = {}, isStudioMode = false }) {
  const [liveEvents, setLiveEvents] = useState([]);
  const [loadedForId, setLoadedForId] = useState(null);
  const [missionInfo, setMissionInfo] = useState(null); // { missionId, droneId }

  const targetShipmentId = isStudioMode ? activeContext?.shipmentId : shipment?.id;

  useEffect(() => {
    let isMounted = true;
    if (!targetShipmentId) return;

    const fetchEvents = async () => {
      try {
        const res = await fetch(`${CONFIG.trackingService}/track/${targetShipmentId}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.events || data.history || [];
          if (isMounted) {
            setLiveEvents(list);
            setLoadedForId(targetShipmentId);
          }
        }
      } catch (err) {}
    };

    // Mirror how Studio's Step 3 reads the Mission Service response —
    // Tracking/Order records never carry missionId/droneId, but Mission
    // Service is the actual source of truth for that data.
    const fetchMission = async () => {
      if (isStudioMode) return;
      try {
        const res = await fetch(`${CONFIG.missionService}/missions?shipmentId=${targetShipmentId}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [data];

          // Defensive scoping: don't trust the backend already filtered by
          // shipmentId — find the mission that actually matches this shipment.
          const mission = list.find(
            (m) => (m.shipmentId ?? m.shipment_id) === targetShipmentId
          );

          if (isMounted) {
            setMissionInfo(
              mission
                ? {
                    missionId: mission.id || mission.missionId,
                    droneId: mission.droneId,
                    status: mission.status || mission.state, // add this
                  }
                : null
            );
          }
        }
      } catch (err) {}
    };

    fetchEvents();
    fetchMission();
    const interval = setInterval(() => {
      fetchEvents();
      fetchMission();
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [targetShipmentId, isStudioMode]);



  const eventsForCurrentShipment =
    targetShipmentId && loadedForId === targetShipmentId ? liveEvents : [];


  // UNIFIED STEP RESOLVER (Used identically by both Studio and Active Shipments)
  const isRawStepDone = (stepId) => {
    // Studio mode: trust local execution logs as primary truth
    if (isStudioMode) {
      return stepLogs[stepId]?.status === "SUCCESS";
    }

    // Active Shipments mode:
    if (!targetShipmentId) return false;

    const status = (shipment?.status || "").toUpperCase();
    const events = Array.isArray(eventsForCurrentShipment) ? eventsForCurrentShipment : [];
    const hasMatchingEvent = (...keywords) =>
      events.some((e) => {
        const rawType = (e.type || e.eventType || e.status || "").toUpperCase();
        return keywords.some((kw) => rawType.includes(kw.toUpperCase()));
      });

      // alert("isRawStepDone called for stepId: " + stepId + " with shipmentId: " + targetShipmentId);

    switch (stepId) {
      case 1:
        // Shipment exists in Orders service
        return Boolean(targetShipmentId);

      case 2:
        // Any tracking event or explicit ORDER_PLACED‐like event
        return hasMatchingEvent("ORDER_PLACED", "INITIALIZED", "ORDER_CREATED", "TRACKING") || events.length > 0;

      case 3:
        return (
          hasMatchingEvent("MISSION_ALLOCATED", "MISSION_CREATED", "ALLOCATED", "MISSION") ||
          Boolean(shipment?.missionId) ||
          Boolean(missionInfo?.missionId) // now backed by the real Mission Service lookup
        );
        
      case 4:
        return hasMatchingEvent("DRONE_ASSIGNED", "DRONE_DISPATCHED", "ASSIGNED", "DRONE") ||
              Boolean(shipment?.droneId || shipment?.drone?.id);

      case 5:
        return hasMatchingEvent("WAYPOINT_REACHED", "TELEMETRY", "IN_TRANSIT", "WAYPOINT") ||
              status === "IN_TRANSIT";
      case 6:
        return (
          hasMatchingEvent("MISSION_COMPLETED", "FLIGHT_COMPLETED", "COMPLETED") ||
          missionInfo?.status === "COMPLETED"
        );
      case 7:
        // Here you can use delivered status as well
        return hasMatchingEvent("STATUS_UPDATED_DELIVERED") || status === "DELIVERED";

      case 8:
        return hasMatchingEvent("DELIVERED", "COMPLETED") || status === "DELIVERED";

      default:
        return false;
    }
  };
  // Enforce strict 1..N order sequence
const checkStepDone = (step) => {
  if (isStudioMode) {
    // Studio: reflect exactly what the user has actually run — no inference,
    // no chaining. Running step 7 alone should only check off step 7.
    return isRawStepDone(step.id);
  }

  // Active Shipments: some steps (3, 6, 7) have no direct tracking event of
  // their own, so infer from real backend history — a later canonical event
  // proves the earlier ones already happened server-side.
  for (let i = step.id; i <= LIFECYCLE_STEPS.length; i++) {
    if (isRawStepDone(i)) return true;
  }
  return false;
};

  // Shared metadata extractions across all microservices
  const assignedDroneEvent = liveEvents.find(
  (e) => e.droneId || e.drone || /DRONE_ASSIGNED/i.test(e.type || "")
);
const droneIdMatch = assignedDroneEvent?.description?.match(/Drone\s+([A-Z0-9-]+)\s+assigned/i);
const extractedDroneId =
  assignedDroneEvent?.droneId || assignedDroneEvent?.drone?.id || droneIdMatch?.[1];




  // const assignedDroneEvent = eventsForCurrentShipment.find((e) => e.droneId || e.drone);  
  // const extractedDroneId = assignedDroneEvent?.droneId || assignedDroneEvent?.drone?.id;
  const currentShipmentId = targetShipmentId || "PENDING";
  const currentMissionId = shipment?.missionId || activeContext?.missionId || missionInfo?.missionId || "PENDING";
  const currentDroneId = shipment?.droneId || shipment?.drone?.id || activeContext?.droneId || missionInfo?.droneId || extractedDroneId || "UNASSIGNED";
  return (
    <div>
      <h4 style={{ margin: "0 0 16px 0", color: colors.white }}>8-Step Microservice Execution Lifecycle</h4>

      {!targetShipmentId ? (
        <div style={{ color: colors.muted, fontSize: 12, padding: 20, textAlign: "center" }}>
          Select a shipment or start the execution studio to inspect its lifecycle.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {LIFECYCLE_STEPS.map((step, i) => {
            const isDone = checkStepDone(step);
            const log = stepLogs[step.id];
            const timestamp = log?.time || (isDone ? "Completed" : "Pending");

            return (
              <div key={step.id} style={{ display: "flex", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isDone ? colors.green : colors.surface2,
                      border: `2px solid ${isDone ? colors.green : colors.border}`,
                      color: isDone ? "#000" : colors.muted,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: "bold",
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? "✓" : step.id}
                  </div>
                  {i < LIFECYCLE_STEPS.length - 1 && (
                    <div
                      style={{
                        width: 2,
                        flex: 1,
                        background: isDone ? colors.green + "88" : colors.border,
                        minHeight: 18,
                      }}
                    />
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                    background: isDone ? colors.surface2 : colors.bg,
                    border: `1px solid ${isDone ? colors.green + "66" : colors.border}`,
                    borderRadius: 6,
                    padding: 10,
                    opacity: isDone ? 1 : 0.5,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: isDone ? colors.white : colors.muted, fontWeight: "bold", fontSize: 12 }}>
                        {step.id}. {step.name}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          color: colors.accent,
                          background: colors.bg,
                          padding: "1px 5px",
                          borderRadius: 4,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {step.service}
                      </span>
                    </div>
                    <span style={{ color: colors.muted, fontSize: 10 }}>{timestamp}</span>
                  </div>

                  <div style={{ fontSize: 10, color: colors.muted, fontFamily: "monospace", marginBottom: 6 }}>
                    Endpoint: <span style={{ color: colors.text }}>{step.endpoint}</span>
                  </div>

                  <div
                    style={{
                      background: colors.bg,
                      borderRadius: 4,
                      padding: 6,
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 4,
                      fontSize: 10,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div><span style={{ color: colors.muted }}>Shipment:</span> <strong style={{ color: isDone ? colors.white : colors.muted }}>{currentShipmentId}</strong></div>
                    <div><span style={{ color: colors.muted }}>Mission:</span> <strong style={{ color: isDone ? colors.white : colors.muted }}>{currentMissionId}</strong></div>
                    <div><span style={{ color: colors.muted }}>Drone:</span> <strong style={{ color: isDone ? colors.white : colors.muted }}>{currentDroneId}</strong></div>
                    <div><span style={{ color: colors.muted }}>Status:</span> <strong style={{ color: isDone ? colors.green : colors.muted }}>{isDone ? "EXECUTIVE_SUCCESS" : "WAITING"}</strong></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── MAP COMPONENT ─────────────────────────────────────────────────────────────

function MapVisualisation({ shipment, activeContext = {}, stepLogs = {}, isStudioMode = false }) {
  const originName = shipment?.origin?.address || "Milan Duomo";
  const destName = shipment?.destination?.address || "Milan Central Station";

  let progress = 0;
  if (isStudioMode) {
    if (stepLogs[8]?.status === "SUCCESS" || stepLogs[7]?.status === "SUCCESS") progress = 100;
    else if (stepLogs[5]?.status === "SUCCESS") progress = 50;
  } else {
    if (shipment?.status === "DELIVERED") progress = 100;
    else if (shipment?.status === "IN_TRANSIT") progress = 50;
  }

  const droneId = isStudioMode 
    ? (activeContext?.droneId || "DRN-101") 
    : (shipment?.droneId || shipment?.drone?.id || "DRN-101");
  const droneX = 100 + (progress / 100) * 200;

  return (
    <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 12 }}>
      <div style={{ color: colors.muted, fontSize: 11, marginBottom: 4 }}>Live Mission Route Map</div>
      <div style={{ color: colors.white, fontSize: 12, marginBottom: 12 }}>
        Assigned Drone: <span style={{ color: colors.accent, fontWeight: "bold" }}>{droneId}</span>
      </div>

      <svg viewBox="0 0 400 240" style={{ width: "100%", borderRadius: 6, background: "#0d1b2e" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={i * 100} y1={0} x2={i * 100} y2={240} stroke="#1e2d45" strokeWidth={0.5} />
        ))}
        {[0, 1, 2].map((i) => (
          <line key={i} x1={0} y1={i * 80} x2={400} y2={i * 80} stroke="#1e2d45" strokeWidth={0.5} />
        ))}

        <line x1={100} y1={120} x2={300} y2={120} stroke={colors.accent + "44"} strokeWidth={2} strokeDasharray="6,4" />

        <circle cx={100} cy={120} r={6} fill={colors.green} />
        <text x={100} y={100} textAnchor="middle" fill={colors.green} fontSize={10}>
          {originName}
        </text>

        <circle cx={300} cy={120} r={6} fill={colors.red} />
        <text x={300} y={100} textAnchor="middle" fill={colors.red} fontSize={10}>
          {destName}
        </text>

        <g>
          <circle cx={droneX} cy={120} r={10} fill={colors.accent + "33"} />
          <text x={droneX} y={124} textAnchor="middle" fill={colors.accent} fontSize={12}>
            ✈
          </text>
        </g>
      </svg>
    </div>
  );
}

// ── MAIN APP COMPONENT ──────────────────────────────────────────────────────

export default function App() {
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [view, setView] = useState("studio"); // 'studio' | 'list'

  const [activeStep, setActiveStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepLogs, setStepLogs] = useState({});
  const [activeContext, setActiveContext] = useState({ shipmentId: null, missionId: null, droneId: null });

  const [form] = useState({
    from: "Milan Duomo",
    to: "Milan Central Station",
    weight: "1.5",
    notes: "Fragile medical supplies",
  });

  // Switch tabs cleanly and keep context in sync
  const handleTabSwitch = (newView) => {
    setView(newView);
    
    if (newView === "list" && activeContext?.shipmentId) {
      // Find the shipment created in Studio and select it automatically
      const newlyCreated = shipments.find((s) => s.id === activeContext.shipmentId);
      if (newlyCreated) {
        setSelectedShipment(newlyCreated);
      }
    }
  };

  // Poll backend for active shipment list & keep selected shipment details updated
  useEffect(() => {
    let isMounted = true;
    const fetchShipments = async () => {
      try {
        const res = await fetch(`${CONFIG.orderService}/shipments`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setShipments(data);
            if (data.length > 0 && view === "list") {
              setSelectedShipment((prev) => {
                if (!prev) return data[0];
                const refreshed = data.find((s) => s.id === prev.id);
                return refreshed || prev;
              });
            }
          }
        }
      } catch (err) {}
    };

    fetchShipments();
    const interval = setInterval(fetchShipments, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [view]);

  // Execute single lifecycle step in studio mode
  const executeStep = async (stepNum, forcedCtx = null) => {
    // If called from executeAllSteps, use forcedCtx; otherwise use current activeContext
    const currentCtx = forcedCtx ?? activeContext;

    setIsProcessing(true);
    let ctx = { ...currentCtx };
    let logEntry = { step: stepNum, time: new Date().toLocaleTimeString(), status: "IN_PROGRESS" };

    try {
      if (stepNum === 1) {
        const payload = {
          customerId: "CUST-STUDIO-01",
          origin: { address: form.from, lat: 45.4641, lon: 9.1919 },
          destination: { address: form.to, lat: 45.4847, lon: 9.2048 },
          packageSpec: { weight: parseFloat(form.weight) || 1.0, fragile: true },
        };
        const res = await fetch(`${CONFIG.orderService}/shipments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        logEntry.response = data;
        logEntry.status = "SUCCESS";
        ctx.shipmentId = data.id || data.shipmentId;
      } else if (stepNum === 2) {
        if (!ctx.shipmentId) throw new Error("Run Step 1 first to create a shipment!");
        const payload = { type: "ORDER_PLACED", description: "Shipment order registered." };
        const res = await fetch(`${CONFIG.trackingService}/track/${ctx.shipmentId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        logEntry.response = await res.json();
        logEntry.status = "SUCCESS";
      } else if (stepNum === 3) {
        if (!ctx.shipmentId) throw new Error("Run Step 1 first to create a shipment!");
        const payload = {
          shipmentId: ctx.shipmentId,
          origin: { address: form.from, lat: 45.4641, lon: 9.1919 },
          destination: { address: form.to, lat: 45.4847, lon: 9.2048 },
          packageWeight: parseFloat(form.weight) || 1.0,
        };
        const res = await fetch(`${CONFIG.missionService}/missions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        logEntry.response = data;
        logEntry.status = "SUCCESS";
        ctx.missionId = data.id || data.missionId;
        ctx.droneId = data.droneId || "DRN-101";
      } else if (stepNum === 4) {
        if (!ctx.shipmentId) throw new Error("Missing shipment ID");
        const payload = { type: "DRONE_ASSIGNED", description: `Drone ${ctx.droneId} assigned.`, droneId: ctx.droneId };
        const res = await fetch(`${CONFIG.trackingService}/track/${ctx.shipmentId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        logEntry.response = await res.json();
        logEntry.status = "SUCCESS";
      } else if (stepNum === 5) {
        if (!ctx.shipmentId) throw new Error("Missing shipment ID");
        const payload = { type: "WAYPOINT_REACHED", description: "Mid-flight waypoint passed.", progress: 50 };
        const res = await fetch(`${CONFIG.trackingService}/track/${ctx.shipmentId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        logEntry.response = await res.json();
        logEntry.status = "SUCCESS";
      } else if (stepNum === 6) {
        if (!ctx.missionId) throw new Error("Missing mission ID from Step 3");
        const res = await fetch(`${CONFIG.missionService}/missions/${ctx.missionId}/complete`, { method: "PATCH" });
        logEntry.response = await res.json();
        logEntry.status = "SUCCESS";
      } else if (stepNum === 7) {
        if (!ctx.shipmentId) throw new Error("Missing shipment ID");
        const res = await fetch(`${CONFIG.orderService}/shipments/${ctx.shipmentId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DELIVERED" }),
        });
        logEntry.response = await res.json();
        logEntry.status = "SUCCESS";
      } else if (stepNum === 8) {
        if (!ctx.shipmentId) throw new Error("Missing shipment ID");
        const payload = { type: "DELIVERED", description: "Package delivered safely.", progress: 100 };
        const res = await fetch(`${CONFIG.trackingService}/track/${ctx.shipmentId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        logEntry.response = await res.json();
        logEntry.status = "SUCCESS";
      }

      setActiveContext(prev => ({ ...prev, ...ctx }));
      setStepLogs((prev) => ({ ...prev, [stepNum]: logEntry }));
      setActiveStep(stepNum < 8 ? stepNum + 1 : 8);
      return ctx;
    } catch (err) {
      logEntry.status = "FAILED";
      logEntry.error = err.message;
      setStepLogs((prev) => ({ ...prev, [stepNum]: logEntry }));
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const executeAllSteps = async () => {
    setStepLogs({});
    let currentCtx = { shipmentId: null, missionId: null, droneId: null };
    setActiveContext(currentCtx);
    setActiveStep(1);

    for (let step = 1; step <= 8; step++) {
      try {
        // Always pass the evolving context explicitly
        currentCtx = await executeStep(step, currentCtx);
        await delay(500);
      } catch (e) {
        break;
      }
    }

    // Force a fresh shipments fetch right after finishing the pipeline
    try {
      const res = await fetch(`${CONFIG.orderService}/shipments`);
      if (res.ok) {
        const data = await res.json();
        setShipments(data);
        // Optionally auto-select the newly created shipment
        if (currentCtx.shipmentId) {
          const newlyCreated = data.find((s) => s.id === currentCtx.shipmentId);
          if (newlyCreated) {
            setSelectedShipment(newlyCreated);
          }
        }
      }
    } catch (err) {
      // ignore
    }
  };

  return (
    <div style={{ background: colors.bg, minHeight: "100vh", color: colors.text, padding: 24, fontFamily: "sans-serif" }}>
      {/* Navbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: colors.white }}>Shipping on the Air — Dispatch Dashboard</h2>
          <span style={{ fontSize: 12, color: colors.muted }}>Microservice Architecture Pipeline Testbed</span>
        </div>
        <div>
          <button
            onClick={() => handleTabSwitch("studio")}
            style={{
              padding: "8px 16px",
              marginRight: 8,
              background: view === "studio" ? colors.accent : colors.surface2,
              color: view === "studio" ? "#000" : colors.text,
              border: "none",
              borderRadius: 4,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Lifecycle Studio
          </button>
          <button
            onClick={() => handleTabSwitch("list")}
            style={{
              padding: "8px 16px",
              background: view === "list" ? colors.accent : colors.surface2,
              color: view === "list" ? "#000" : colors.text,
              border: "none",
              borderRadius: 4,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Active Shipments
          </button>
        </div>
      </div>

      {view === "studio" ? (
        /* Studio Tab */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>
          <div style={{ background: colors.surface, padding: 20, borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, borderBottom: `1px solid ${colors.border}`, paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Execution Studio</h3>
                <span style={{ color: colors.muted, fontSize: 12 }}>Test live microservice API routes sequentially</span>
              </div>
              <button
                onClick={executeAllSteps}
                disabled={isProcessing}
                style={{
                  padding: "8px 16px",
                  background: colors.green,
                  color: "#000",
                  fontWeight: "bold",
                  border: "none",
                  borderRadius: 4,
                  cursor: isProcessing ? "not-allowed" : "pointer",
                }}
              >
                {isProcessing ? "Executing..." : "Run Full Pipeline"}
              </button>
            </div>

            {/* Stepper buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, marginBottom: 20 }}>
              {LIFECYCLE_STEPS.map((step) => {
                const log = stepLogs[step.id];
                const isCurrent = activeStep === step.id;

                let bg = colors.surface2;
                if (log?.status === "SUCCESS") bg = colors.green;
                else if (log?.status === "FAILED") bg = colors.red;
                else if (isCurrent) bg = colors.accent;

                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    style={{
                      padding: 8,
                      borderRadius: 4,
                      background: bg,
                      color: isCurrent || log?.status === "SUCCESS" ? "#000" : colors.text,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: "bold",
                    }}
                  >
                    Step {step.id}
                  </button>
                );
              })}
            </div>

            {/* Step payload inspector */}
            {(() => {
              const stepMeta = LIFECYCLE_STEPS.find((s) => s.id === activeStep);
              const log = stepLogs[activeStep];

              return (
                <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <h4 style={{ margin: 0, color: colors.white }}>Step {stepMeta.id}: {stepMeta.name}</h4>
                      <span style={{ fontSize: 11, color: colors.accent }}>{stepMeta.service}</span>
                    </div>

                    <button
                      onClick={() => executeStep(activeStep)}
                      disabled={isProcessing}
                      style={{
                        padding: "6px 12px",
                        background: isProcessing ? colors.muted : colors.accent,
                        color: "#000",
                        fontWeight: "bold",
                        border: "none",
                        borderRadius: 4,
                        cursor: isProcessing ? "not-allowed" : "pointer",
                      }}
                    >
                      {isProcessing ? "..." : log ? "Re-Run Step" : "Run Step"}
                    </button>
                  </div>

                  {log ? (
                    <div>
                      <div style={{ color: colors.muted, fontSize: 11, marginBottom: 4 }}>HTTP Response Payload:</div>
                      <pre style={{ background: colors.bg, padding: 8, borderRadius: 4, overflow: "auto", border: `1px solid ${colors.border}`, margin: 0, fontSize: 11, color: log.status === "SUCCESS" ? colors.green : colors.red }}>
                        {JSON.stringify(log.response || log.error, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: colors.muted }}>Click "Run Step" or trigger the pipeline to execute HTTP call.</div>
                  )}
                </div>
              );
            })()}

            <div style={{ marginTop: 20 }}>
              <MapVisualisation activeContext={activeContext} stepLogs={stepLogs} isStudioMode={true} />
            </div>
          </div>

          <div style={{ background: colors.surface, padding: 20, borderRadius: 8, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
            <TrackingTimeline activeContext={activeContext} stepLogs={stepLogs} isStudioMode={true} />
          </div>
        </div>
      ) : (
        /* Active Shipments Tab */
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px", gap: 16 }}>
          {/* Shipment selector */}
          <div style={{ background: colors.surface, padding: 16, borderRadius: 8 }}>
            <h4 style={{ margin: "0 0 12px 0", color: colors.white }}>Active Shipments ({shipments.length})</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}>
              {shipments.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedShipment(s)}
                  style={{
                    padding: 12,
                    borderRadius: 6,
                    background: selectedShipment?.id === s.id ? colors.surface2 : colors.bg,
                    border: `1px solid ${selectedShipment?.id === s.id ? colors.accent : colors.border}`,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: "bold", color: colors.white }}>{s.id}</div>
                  <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                    From: {s.origin?.address || "Milan"} → To: {s.destination?.address || "Milan"}
                  </div>
                  <div style={{ fontSize: 10, color: colors.muted, marginTop: 4 }}>
                    Status: <span style={{ color: s.status === "DELIVERED" ? colors.green : colors.yellow, fontWeight: "bold" }}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline for selected historical shipment */}
          <div style={{ background: colors.surface, padding: 16, borderRadius: 8, maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}>
            <TrackingTimeline shipment={selectedShipment} isStudioMode={false} />
          </div>

          {/* Route map for selected historical shipment */}
          <div>
            <MapVisualisation shipment={selectedShipment} isStudioMode={false} />
          </div>
        </div>
      )}
    </div>
  );
}