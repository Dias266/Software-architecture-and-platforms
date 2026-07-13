import { useState,useEffect } from "react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "requirements", label: "Requirements" },
  { id: "domain", label: "Domain Model" },
  { id: "bounded", label: "Bounded Contexts" },
  { id: "architecture", label: "Architecture" },
  { id: "prototype", label: "Prototype" },
];

const colors = {
  bg: "#0a0e1a",
  surface: "#111827",
  surface2: "#1a2235",
  border: "#1e2d45",
  accent: "#00d4ff",
  accent2: "#7c3aed",
  green: "#10b981",
  yellow: "#f59e0b",
  red: "#ef4444",
  text: "#e2e8f0",
  muted: "#64748b",
};

// ── Diagram components ──────────────────────────────────────────────────────

function UbiquitousLanguageTable() {
  const terms = [
    ["Shipment", "A request to transport a Package from an Origin to a Destination within a specified time window."],
    ["Package", "The physical item to be delivered, characterised by weight, dimensions and fragility."],
    ["Drone", "An autonomous aerial vehicle assigned to execute a Delivery Mission."],
    ["Delivery Mission", "The operational lifecycle of a Drone carrying a Package from Origin to Destination."],
    ["Route", "A planned sequence of waypoints a Drone follows during a Mission."],
    ["Waypoint", "A geographic coordinate (lat/lon/alt) that forms part of a Route."],
    ["Tracking Event", "An immutable record emitted when a Package transitions state or location changes."],
    ["Time Window", "A bounded interval [earliest_departure, latest_arrival] requested by the Customer."],
    ["Customer", "A natural or legal person who places a Shipment order."],
    ["Fleet Manager", "An operator responsible for Drone availability and maintenance scheduling."],
    ["ETA", "Estimated Time of Arrival, dynamically recomputed as the Mission progresses."],
    ["No-Fly Zone", "A geographic area (polygon) in which Drone flight is prohibited."],
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: colors.surface2 }}>
            <th style={{ padding: "8px 12px", textAlign: "left", color: colors.accent, borderBottom: `1px solid ${colors.border}` }}>Term</th>
            <th style={{ padding: "8px 12px", textAlign: "left", color: colors.accent, borderBottom: `1px solid ${colors.border}` }}>Definition</th>
          </tr>
        </thead>
        <tbody>
          {terms.map(([t, d], i) => (
            <tr key={t} style={{ background: i % 2 === 0 ? colors.surface : colors.surface2 }}>
              <td style={{ padding: "7px 12px", color: colors.accent2, fontWeight: 600, whiteSpace: "nowrap", borderBottom: `1px solid ${colors.border}` }}>{t}</td>
              <td style={{ padding: "7px 12px", color: colors.text, borderBottom: `1px solid ${colors.border}` }}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BoundedContextDiagram() {
  const contexts = [
    { id: "order", label: "Order Management", color: "#00d4ff", x: 30, y: 30, w: 180, h: 100, entities: ["Shipment", "Order", "Customer"] },
    { id: "routing", label: "Route Planning", color: "#7c3aed", x: 260, y: 30, w: 180, h: 100, entities: ["Route", "Waypoint", "NoFlyZone"] },
    { id: "fleet", label: "Fleet Management", color: "#10b981", x: 490, y: 30, w: 180, h: 100, entities: ["Drone", "FleetStatus", "Maintenance"] },
    { id: "mission", label: "Mission Execution", color: "#f59e0b", x: 145, y: 185, w: 180, h: 100, entities: ["Mission", "Telemetry", "MissionEvent"] },
    { id: "tracking", label: "Tracking & Notifications", color: "#ef4444", x: 375, y: 185, w: 180, h: 100, entities: ["TrackingEvent", "ETA", "Notification"] },
  ];
  const arrows = [
    { from: [120, 130], to: [200, 185], label: "placed" },
    { from: [350, 80], to: [235, 185], label: "planned route" },
    { from: [580, 130], to: [325, 185], label: "assigned drone" },
    { from: [235, 235], to: [375, 235], label: "events →" },
  ];
  return (
    <svg viewBox="0 0 700 310" style={{ width: "100%", background: colors.bg, borderRadius: 8, border: `1px solid ${colors.border}` }}>
      {/* arrows */}
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={colors.muted} />
        </marker>
      </defs>
      {arrows.map((a, i) => (
        <g key={i}>
          <line x1={a.from[0]} y1={a.from[1]} x2={a.to[0]} y2={a.to[1]} stroke={colors.muted} strokeWidth={1.5} strokeDasharray="4,3" markerEnd="url(#arr)" />
          <text x={(a.from[0] + a.to[0]) / 2} y={(a.from[1] + a.to[1]) / 2 - 4} textAnchor="middle" fill={colors.muted} fontSize={9}>{a.label}</text>
        </g>
      ))}
      {contexts.map(c => (
        <g key={c.id}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={8} fill={colors.surface2} stroke={c.color} strokeWidth={1.5} />
          <text x={c.x + c.w / 2} y={c.y + 18} textAnchor="middle" fill={c.color} fontSize={11} fontWeight="bold">{c.label}</text>
          {c.entities.map((e, j) => (
            <text key={e} x={c.x + 10} y={c.y + 36 + j * 16} fill={colors.text} fontSize={10}>• {e}</text>
          ))}
        </g>
      ))}
      <text x={350} y={300} textAnchor="middle" fill={colors.muted} fontSize={9}>Context Map — Shipping on the Air v1.0</text>
    </svg>
  );
}

function MicroservicesArchDiagram() {
  return (
    <svg viewBox="0 0 720 420" style={{ width: "100%", background: colors.bg, borderRadius: 8, border: `1px solid ${colors.border}` }}>
      <defs>
        <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#334155" />
        </marker>
      </defs>

      {/* API Gateway */}
      <rect x={275} y={20} width={170} height={44} rx={6} fill="#1a2235" stroke={colors.accent} strokeWidth={2} />
      <text x={360} y={38} textAnchor="middle" fill={colors.accent} fontSize={11} fontWeight="bold">API Gateway</text>
      <text x={360} y={54} textAnchor="middle" fill={colors.muted} fontSize={9}>Auth · Rate-limit · Routing</text>

      {/* Services */}
      {[
        { label: "Order Svc", sub: "REST / Postgres", x: 40, y: 120, color: "#00d4ff" },
        { label: "Route Svc", sub: "REST / PostGIS", x: 200, y: 120, color: "#7c3aed" },
        { label: "Fleet Svc", sub: "REST / Postgres", x: 360, y: 120, color: "#10b981" },
        { label: "Mission Svc", sub: "MQTT / Redis", x: 520, y: 120, color: "#f59e0b" },
        { label: "Tracking Svc", sub: "WS / TimescaleDB", x: 200, y: 240, color: "#ef4444" },
        { label: "Notification Svc", sub: "SMTP · SMS · Push", x: 400, y: 240, color: "#f97316" },
      ].map(s => (
        <g key={s.label}>
          <rect x={s.x} y={s.y} width={140} height={56} rx={6} fill={colors.surface2} stroke={s.color} strokeWidth={1.5} />
          <text x={s.x + 70} y={s.y + 20} textAnchor="middle" fill={s.color} fontSize={11} fontWeight="bold">{s.label}</text>
          <text x={s.x + 70} y={s.y + 38} textAnchor="middle" fill={colors.muted} fontSize={9}>{s.sub}</text>
        </g>
      ))}

      {/* Message Bus */}
      <rect x={60} y={340} width={580} height={36} rx={6} fill={colors.surface2} stroke="#334155" strokeWidth={1.5} strokeDasharray="6,3" />
      <text x={350} y={355} textAnchor="middle" fill={colors.muted} fontSize={10} fontWeight="bold">Event Bus (Apache Kafka)</text>
      <text x={350} y={368} textAnchor="middle" fill="#475569" fontSize={9}>shipment.created · mission.started · telemetry.update · mission.completed</text>

      {/* Gateway → Services lines */}
      {[110, 270, 430, 590].map(x => (
        <line key={x} x1={360} y1={64} x2={x} y2={120} stroke="#334155" strokeWidth={1} strokeDasharray="3,2" markerEnd="url(#arr2)" />
      ))}
      {/* Services → Bus lines */}
      {[110, 270, 430, 590, 270, 470].map((x, i) => (
        <line key={i} x1={x} y1={i < 4 ? 176 : 296} x2={x < 350 ? 180 : 520} y2={340} stroke="#1e2d45" strokeWidth={1} markerEnd="url(#arr2)" />
      ))}
      {/* Drone telemetry annotation */}
      <rect x={580} y={220} width={120} height={44} rx={5} fill="#1a2235" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4,2" />
      <text x={640} y={238} textAnchor="middle" fill="#f59e0b" fontSize={9} fontWeight="bold">Drone Fleet</text>
      <text x={640} y={252} textAnchor="middle" fill={colors.muted} fontSize={8}>MQTT telemetry</text>
      <line x1={590} y1={242} x2={560} y2={200} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" markerEnd="url(#arr2)" />
      <text x={350} y={410} textAnchor="middle" fill={colors.muted} fontSize={9}>Microservices Architecture — Shipping on the Air v1.0</text>
    </svg>
  );
}

function AggregateCard({ title, root, fields, methods, color }) {
  return (
    <div style={{ border: `1px solid ${color}`, borderRadius: 8, overflow: "hidden", fontSize: 12 }}>
      <div style={{ background: color + "22", padding: "6px 12px", borderBottom: `1px solid ${color}` }}>
        <span style={{ color, fontWeight: 700, fontSize: 13 }}>«Aggregate» {title}</span>
        {root && <span style={{ marginLeft: 8, color: colors.muted, fontSize: 11 }}>root: {root}</span>}
      </div>
      <div style={{ padding: "8px 12px", background: colors.surface }}>
        {fields.map(f => <div key={f} style={{ color: colors.text, marginBottom: 2 }}>+ {f}</div>)}
        <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 6, paddingTop: 6 }}>
          {methods.map(m => <div key={m} style={{ color: color, marginBottom: 2 }}>⬧ {m}()</div>)}
        </div>
      </div>
    </div>
  );
}

// ── Prototype ────────────────────────────────────────────────────────────────



const mockShipments = [
  { id: "SHP-001", from: "Milan Central", to: "Rome Termini", weight: "1.2 kg", status: "In Transit", eta: "14:32", progress: 62, drone: "DRN-07", lat: 43.8, lon: 11.2 },
  { id: "SHP-002", from: "Bologna Airport", to: "Florence Duomo", weight: "0.4 kg", status: "Pending", eta: "16:05", progress: 0, drone: "—", lat: null, lon: null },
  { id: "SHP-003", from: "Venice Port", to: "Padova Station", weight: "2.1 kg", status: "Delivered", eta: "Done", progress: 100, drone: "DRN-12", lat: null, lon: null },
  { id: "SHP-004", from: "Turin Porta Nuova", to: "Genova Brignole", weight: "0.8 kg", status: "In Transit", eta: "15:47", progress: 31, drone: "DRN-03", lat: 44.5, lon: 8.7 },
];

const statusColor = { "IN_TRANSIT": colors.accent, "PENDING": colors.yellow, "DELIVERED": colors.green, "Failed": colors.red };

function ProgressBar({ pct, color }) {
  return (
    <div style={{ background: colors.border, borderRadius: 99, height: 6, width: "100%", overflow: "hidden" }}>
      <div style={{ background: color, width: `${pct}%`, height: "100%", borderRadius: 99, transition: "width .4s ease" }} />
    </div>
  );
}
function TrackingTimeline({ shipment }) {
  const currentStatus = shipment.status?.toUpperCase();

  // Parse real timestamp values into clean time formats
  const orderTime = shipment.createdAt
    ? new Date(shipment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "—";

  const etaTime = shipment.timeWindow?.latest 
    ? new Date(shipment.timeWindow.latest).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : "—";

  // Grab location metrics from payload safely
  const originName = shipment.origin?.address || "Origin";
  const destName = shipment.destination?.address || "Destination";
  const weightInfo = shipment.packageSpec?.weight ? ` (${shipment.packageSpec.weight} kg)` : "";

  // DYNAMIC DRONE DATA WITH SAFE FALLBACKS
  const droneId = shipment.drone?.id || `DRN-${shipment.id?.split('-')[1] || 'ASSIGNING'}`;
  const droneModel = shipment.drone?.model || (shipment.packageSpec?.weight > 1 ? "Heavy-Lifter V2" : "Swift-Flyer X1");
  const droneBattery = shipment.drone?.battery !== undefined ? `${shipment.drone.battery}%` : "84%";

  // DYNAMIC MISSION DATA WITH SAFE FALLBACK
  // Checks if the API has a missionId, otherwise falls back to a temporary layout string
  const missionId = shipment.missionId || `MSN-${shipment.id?.split('-')[1] || 'PENDING'}`;

  // Populate dynamic events arrays using real backend properties
  const events = currentStatus === "DELIVERED"
    ? [
        { time: orderTime, label: `Order placed for shipment ${shipment.id} [Mission: ${missionId}]`, done: true },
        { time: "—", label: `Drone ${droneId} (${droneModel}) secured package${weightInfo}`, done: true },
        { time: "—", label: `Departed facility at ${originName}`, done: true },
        { time: "—", label: "Route waypoints completed", done: true },
        { time: etaTime, label: `Package delivered successfully to ${destName}`, done: true },
      ]
    : currentStatus === "IN_TRANSIT"
    ? [
        { time: orderTime, label: `Order placed for shipment ${shipment.id}`, done: true },
        { time: "—", label: `Mission Active: ${missionId}`, done: true }, // Highlight active mission
        { time: "—", label: `Drone routing active: ${droneId} [Model: ${droneModel}]`, done: true },
        { time: "—", label: `Departed from ${originName} — Battery: ${droneBattery}`, done: true },
        { time: "—", label: `En route to ${destName}`, done: true },
        { time: etaTime, label: "Estimated arrival window", done: false },
      ]
    : [ // PENDING state
        { time: orderTime, label: `Order registered for shipment ${shipment.id}`, done: true },
        { time: "—", label: `Awaiting mission & drone assignment at ${originName}`, done: false }, // Updated label
        { time: "—", label: `Scheduled dispatch to ${destName}`, done: false },
        { time: etaTime, label: "Estimated delivery target", done: false },
      ];

  return (
    <div style={{ paddingLeft: 16 }}>
      {events.map((e, i) => (
        <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 12, height: 12, borderRadius: 99, background: e.done ? colors.green : colors.border, border: `2px solid ${e.done ? colors.green : colors.muted}`, flexShrink: 0, marginTop: 2 }} />
            {i < events.length - 1 && <div style={{ width: 2, flex: 1, background: e.done ? colors.green + "44" : colors.border, marginTop: 2, minHeight: 16 }} />}
          </div>
          <div style={{ paddingBottom: 4 }}>
            <div style={{ color: e.done ? colors.text : colors.muted, fontSize: 13 }}>{e.label}</div>
            <div style={{ color: colors.muted, fontSize: 11 }}>{e.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
function MapVisualisation({ shipment }) {
  // Simple SVG Italy shape approximation with drone position dot
  const droneX = shipment.progress > 0 ? 100 + (shipment.progress / 100) * 200 : null;
  const droneY = 150;
  return (
    <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 12 }}>
      <div style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>Live Map</div>
      <svg viewBox="0 0 400 300" style={{ width: "100%", borderRadius: 6, background: "#0d1b2e" }}>
        {/* Grid lines */}
        {[0,1,2,3,4].map(i => (
          <line key={i} x1={i*100} y1={0} x2={i*100} y2={300} stroke="#1e2d45" strokeWidth={0.5} />
        ))}
        {[0,1,2,3].map(i => (
          <line key={i} x1={0} y1={i*100} x2={400} y2={i*100} stroke="#1e2d45" strokeWidth={0.5} />
        ))}
        {/* Route line */}
        {shipment.progress > 0 && (
          <>
            <line x1={100} y1={150} x2={300} y2={150} stroke={colors.accent + "44"} strokeWidth={2} strokeDasharray="6,4" />
            {/* Origin */}
            <circle cx={100} cy={150} r={6} fill={colors.green} />
            <text x={100} y={142} textAnchor="middle" fill={colors.green} fontSize={9}>Origin</text>
            {/* Destination */}
            <circle cx={300} cy={150} r={6} fill={colors.red} />
            <text x={300} y={142} textAnchor="middle" fill={colors.red} fontSize={9}>Dest.</text>
            {/* Drone */}
            {droneX && (
              <g>
                <circle cx={droneX} cy={droneY} r={10} fill={colors.accent + "33"} />
                <text x={droneX} y={droneY + 4} textAnchor="middle" fill={colors.accent} fontSize={14}>✈</text>
                <text x={droneX} y={droneY - 15} textAnchor="middle" fill={colors.accent} fontSize={9}>{shipment.drone}</text>
              </g>
            )}
          </>
        )}
        {shipment.status === "Pending" && (
          <text x={200} y={155} textAnchor="middle" fill={colors.muted} fontSize={11}>No active mission</text>
        )}
        {shipment.status === "Delivered" && (
          <text x={200} y={155} textAnchor="middle" fill={colors.green} fontSize={11}>✓ Delivered successfully</text>
        )}
      </svg>
    </div>
  );
}

function Prototype() {
  const [shipments, setShipments] = useState([]); // Injected local state instead of missing mockData global reference
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("timeline");
  const [form, setForm] = useState({ from: "", to: "", weight: "", date: "", notes: "" });
  const [view, setView] = useState("list");
  const [progress, setProgress] = useState("list");


  // 3. YOUR FUNCTION GOES HERE (Inside App, before return)
  const handleCreateShipment = async () => {
    const payload = {
      customerId: "CUST-01",
      origin: { address: form.from, lat: 45.4654, lon: 9.1866 },
      destination: { address: form.to, lat: 45.4654, lon: 9.1866 },
      packageSpec: {
        weight: parseFloat(form.weight) || 0,
        fragile: form.notes.toLowerCase().includes("fragile")
      },
      timeWindow: {
        earliest: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        latest: form.date ? new Date(new Date(form.date).getTime() + 2 * 60 * 60 * 1000).toISOString() : new Date().toISOString()
      }
    };

    try {
      const response = await fetch("http://localhost:3001/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Server error");
      alert("Shipment created successfully!");
      setForm({ from: "", to: "", weight: "", date: "", notes: "" });
      setView("list");
    } catch (error) {
      console.error(error);
      alert("Failed to create shipment.");
    }
  }; // <--- Make sure this function closes properly



  

  // Fetch hook matching exact target URL
  useEffect(() => {
    fetch("http://localhost:3001/shipments")
      .then((res) => res.json())
      .then((data) => setShipments(data))
      .catch((err) => console.error("Error loading mock api data:", err));
  }, []);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["list", "new"].map(v => (
          <button key={v} onClick={() => setView(v)} style={{ padding: "7px 18px", borderRadius: 6, border: `1px solid ${view === v ? colors.accent : colors.border}`, background: view === v ? colors.accent + "22" : colors.surface, color: view === v ? colors.accent : colors.muted, cursor: "pointer", fontSize: 13 }}>
            {v === "list" ? "📦 My Shipments" : "+ New Shipment"}
          </button>
        ))}
      </div>

      {view === "list" && (
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 16 }}>
          {/* Shipment list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shipments.map(s => (
              <div key={s.id} onClick={() => setSelected(s.id === selected?.id ? null : s)} style={{ background: selected?.id === s.id ? colors.surface2 : colors.surface, border: `1px solid ${selected?.id === s.id ? colors.accent : colors.border}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", transition: "all .2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <span style={{ color: colors.accent, fontWeight: 700, fontSize: 13 }}>{s.id}</span>
                    {/* ADAPTER: Map to matching nested packageSpec weight definition */}
                    <span style={{ color: colors.muted, fontSize: 12, marginLeft: 10 }}>{s.packageSpec?.weight} kg</span>
                  </div>
                  <span style={{ color: statusColor[s.status], fontSize: 12, fontWeight: 600 }}>{s.status}</span>
                </div>
                {/* ADAPTER: Map to matching nested origin/destination addresses */}
                <div style={{ color: colors.text, fontSize: 12, marginBottom: 6 }}>{s.origin?.address} → {s.destination?.address}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    {/* ADAPTER: Provide logical visual progress fallback state */}

                    {/* const statusColor = { "In Transit": colors.accent, Pending: colors.yellow, Delivered: colors.green, Failed: colors.red }; */}


                    <ProgressBar pct={s.status === "IN_TRANSIT" ? 50 : s.status === "DELIVERED" ? 100 : 0} color={statusColor[s.status]} />
                  </div>
                  {/* ADAPTER: Display cleanly converted latest window ISO value string */}
                  <span style={{ color: colors.muted, fontSize: 11, whiteSpace: "nowrap" }}>
                    ETA {s.timeWindow?.latest ? new Date(s.timeWindow.latest).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <span style={{ color: colors.accent, fontWeight: 700, fontSize: 15 }}>{selected.id}</span>
                  <span style={{ marginLeft: 10, color: statusColor[selected.status], fontWeight: 600, fontSize: 12 }}>{selected.status}</span>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: colors.muted, cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
              {/* ADAPTER: Map detail panel address paths */}
              <div style={{ color: colors.text, fontSize: 13, marginBottom: 12 }}>{selected.origin?.address} → {selected.destination?.address}</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {["timeline", "map"].map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{ padding: "5px 14px", borderRadius: 5, border: `1px solid ${tab === t ? colors.accent : colors.border}`, background: tab === t ? colors.accent + "22" : "transparent", color: tab === t ? colors.accent : colors.muted, cursor: "pointer", fontSize: 12 }}>
                    {t === "timeline" ? "⏱ Timeline" : "🗺 Map"}
                  </button>
                ))}
              </div>
              {tab === "timeline" ? <TrackingTimeline shipment={selected} /> : <MapVisualisation shipment={selected} />}
            </div>
          )}
        </div>
      )}



      {view === "new" && (
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20, maxWidth: 500 }}>
          <div style={{ color: colors.accent, fontWeight: 700, fontSize: 15, marginBottom: 16 }}>New Shipment Order</div>
          {[["from", "Origin address"], ["to", "Destination address"], ["weight", "Package weight (kg)"], ["date", "Requested pickup"]].map(([k, label]) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", color: colors.muted, fontSize: 12, marginBottom: 4 }}>{label}</label>
              <input type={k === "date" ? "datetime-local" : "text"} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: "100%", background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 6, padding: "8px 10px", color: colors.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} placeholder={label} />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", color: colors.muted, fontSize: 12, marginBottom: 4 }}>Special instructions</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ width: "100%", background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 6, padding: "8px 10px", color: colors.text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>
          
          {/* Updated click handler here */}
          <button 
            onClick={handleCreateShipment} 
            style={{ background: colors.accent, color: colors.bg, border: "none", borderRadius: 6, padding: "10px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%" }}
          >
            Place Order →
          </button>
        </div>
      )}




    </div>
  );
}
// ── Section renderers ────────────────────────────────────────────────────────

function SectionOverview() {
  return (
    <div>
      <Badge>Assignment #01 · v1.0.0-20251020</Badge>
      <h2 style={{ color: colors.accent, marginTop: 16 }}>Shipping on the Air</h2>
      <p style={{ color: colors.text, lineHeight: 1.7 }}>
        An online drone-delivery platform enabling customers to ship packages between any two geographic points with real-time tracking, dynamic ETA computation, and guaranteed time-window delivery.
      </p>
      <SectionTitle>Project Scope</SectionTitle>
      <InfoGrid items={[
        ["Methodology", "Domain-Driven Design (DDD)"],
        ["Architecture", "Microservices"],
        ["Prototype stack", "React · Node.js · Kafka · PostGIS"],
        ["Version", "v1.0.0"],
        ["Status", "Living Document"],
      ]} />
      <SectionTitle>Document Structure</SectionTitle>
      <ul style={{ color: colors.text, lineHeight: 2, paddingLeft: 20 }}>
        <li><b style={{ color: colors.accent }}>Requirements</b> — Functional & Non-Functional requirements, User Stories, Use Cases</li>
        <li><b style={{ color: colors.accent }}>Domain Model</b> — Ubiquitous Language, Entities, Value Objects, Aggregates</li>
        <li><b style={{ color: colors.accent }}>Bounded Contexts</b> — Context Map with relationships</li>
        <li><b style={{ color: colors.accent }}>Architecture</b> — Microservices decomposition, API contracts, Event catalog</li>
        <li><b style={{ color: colors.accent }}>Prototype</b> — Interactive UI demonstrating core flows</li>
      </ul>
    </div>
  );
}

function SectionRequirements() {
  const functional = [
    ["FR-01", "A Customer shall be able to place a Shipment specifying origin, destination, package weight, and desired delivery time window."],
    ["FR-02", "The system shall validate the feasibility of the route (no-fly zones, drone range) before accepting the order."],
    ["FR-03", "The system shall automatically assign the most suitable available Drone to a confirmed Shipment."],
    ["FR-04", "The system shall compute and continuously update an ETA for each active Delivery Mission."],
    ["FR-05", "A Customer shall be able to track the real-time position of their Package via a map interface."],
    ["FR-06", "The system shall emit a Tracking Event for every meaningful state transition (departed, waypoint reached, delivered, etc.)."],
    ["FR-07", "The Customer shall receive push/email/SMS notifications at key lifecycle events."],
    ["FR-08", "A Fleet Manager shall be able to view the operational status of all Drones."],
    ["FR-09", "The system shall support immediate dispatch as well as scheduled future deliveries."],
    ["FR-10", "The system shall log the full telemetry history for every completed Mission for auditing."],
  ];
  const nonfunctional = [
    ["QA-01", "Availability", "The Tracking service shall maintain ≥ 99.9 % uptime (SLO)."],
    ["QA-02", "Latency", "Telemetry updates shall appear in the tracking UI within 2 s end-to-end (P95)."],
    ["QA-03", "Scalability", "The system shall handle ≥ 10,000 concurrent active Missions without degradation."],
    ["QA-04", "Security", "All API endpoints shall require JWT authentication; data at rest and in transit shall be encrypted (TLS 1.3 / AES-256)."],
    ["QA-05", "Reliability", "In the event of a Drone connection loss, the system shall trigger a safe-landing fallback within 30 s."],
    ["QA-06", "Observability", "Every service shall emit structured logs, metrics (Prometheus) and distributed traces (OpenTelemetry)."],
    ["QA-07", "Extensibility", "Adding a new notification channel shall require no changes to the Mission or Order services."],
  ];
  const stories = [
    ["US-01", "Customer", "place a shipment with an explicit delivery window", "I can plan my logistics confidently"],
    ["US-02", "Customer", "track my package in real time on a map", "I always know where my package is"],
    ["US-03", "Customer", "receive a push notification when my package is delivered", "I don't need to keep the app open"],
    ["US-04", "Fleet Manager", "see all drones and their current battery / status", "I can proactively schedule maintenance"],
    ["US-05", "System", "re-route a drone around a dynamically declared no-fly zone", "missions remain compliant and safe"],
  ];
  return (
    <div>
      <SectionTitle>Functional Requirements</SectionTitle>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: colors.surface2 }}>
              {["ID", "Description"].map(h => <th key={h} style={{ padding: "7px 12px", textAlign: "left", color: colors.accent, borderBottom: `1px solid ${colors.border}` }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {functional.map(([id, desc], i) => (
              <tr key={id} style={{ background: i % 2 === 0 ? colors.surface : colors.surface2 }}>
                <td style={{ padding: "7px 12px", color: colors.accent2, fontWeight: 600, whiteSpace: "nowrap", borderBottom: `1px solid ${colors.border}` }}>{id}</td>
                <td style={{ padding: "7px 12px", color: colors.text, borderBottom: `1px solid ${colors.border}` }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SectionTitle>Non-Functional Requirements (Quality Attributes)</SectionTitle>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: colors.surface2 }}>
              {["ID", "Category", "Requirement"].map(h => <th key={h} style={{ padding: "7px 12px", textAlign: "left", color: colors.accent, borderBottom: `1px solid ${colors.border}` }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {nonfunctional.map(([id, cat, req], i) => (
              <tr key={id} style={{ background: i % 2 === 0 ? colors.surface : colors.surface2 }}>
                <td style={{ padding: "7px 12px", color: colors.accent2, fontWeight: 600, whiteSpace: "nowrap", borderBottom: `1px solid ${colors.border}` }}>{id}</td>
                <td style={{ padding: "7px 12px", color: colors.yellow, whiteSpace: "nowrap", borderBottom: `1px solid ${colors.border}` }}>{cat}</td>
                <td style={{ padding: "7px 12px", color: colors.text, borderBottom: `1px solid ${colors.border}` }}>{req}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SectionTitle>User Stories</SectionTitle>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: colors.surface2 }}>
              {["ID", "As a…", "I want to…", "So that…"].map(h => <th key={h} style={{ padding: "7px 12px", textAlign: "left", color: colors.accent, borderBottom: `1px solid ${colors.border}` }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {stories.map(([id, a, w, s], i) => (
              <tr key={id} style={{ background: i % 2 === 0 ? colors.surface : colors.surface2 }}>
                <td style={{ padding: "7px 12px", color: colors.accent2, fontWeight: 600, borderBottom: `1px solid ${colors.border}` }}>{id}</td>
                <td style={{ padding: "7px 12px", color: colors.yellow, borderBottom: `1px solid ${colors.border}` }}>{a}</td>
                <td style={{ padding: "7px 12px", color: colors.text, borderBottom: `1px solid ${colors.border}` }}>{w}</td>
                <td style={{ padding: "7px 12px", color: colors.muted, borderBottom: `1px solid ${colors.border}` }}>{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionDomain() {
  return (
    <div>
      <SectionTitle>Ubiquitous Language</SectionTitle>
      <UbiquitousLanguageTable />
      <SectionTitle>Aggregate Design</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, marginTop: 8 }}>
        <AggregateCard title="Shipment" root="ShipmentId" color={colors.accent}
          fields={["shipmentId: UUID", "customerId: CustomerId", "origin: Address", "destination: Address", "timeWindow: TimeWindow", "status: ShipmentStatus", "packageSpec: PackageSpec"]}
          methods={["place", "cancel", "assignMission", "complete"]} />
        <AggregateCard title="Mission" root="MissionId" color={colors.accent2}
          fields={["missionId: UUID", "droneId: DroneId", "route: Route", "status: MissionStatus", "telemetry: TelemetrySnapshot", "eta: Instant"]}
          methods={["start", "updateTelemetry", "reRoute", "complete", "abort"]} />
        <AggregateCard title="Drone" root="DroneId" color={colors.green}
          fields={["droneId: UUID", "model: DroneModel", "batteryLevel: Percentage", "maxPayload: Weight", "status: DroneStatus", "location: GeoPoint"]}
          methods={["assign", "release", "scheduleMaintenance", "updateLocation"]} />
        <AggregateCard title="TrackingRecord" root="ShipmentId" color={colors.red}
          fields={["shipmentId: UUID", "events: TrackingEvent[]", "currentLocation: GeoPoint", "eta: Instant"]}
          methods={["appendEvent", "updateETA", "getHistory"]} />
      </div>
      <SectionTitle>Value Objects</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {["Address(street, city, lat, lon)", "GeoPoint(lat, lon, alt)", "TimeWindow(earliest, latest)", "PackageSpec(weight, dims, fragile)", "Route(waypoints: Waypoint[])", "Waypoint(geoPoint, order)", "Weight(value, unit)", "Percentage(0–100)"].map(v => (
          <span key={v} style={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 6, padding: "4px 10px", color: colors.text, fontSize: 12 }}>{v}</span>
        ))}
      </div>
      <SectionTitle>Domain Events</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {["ShipmentPlaced", "ShipmentCancelled", "DroneAssigned", "MissionStarted", "WaypointReached", "ETAUpdated", "MissionCompleted", "MissionAborted", "PackageDelivered", "NoFlyZoneDeclared"].map(e => (
          <span key={e} style={{ background: "#1a1025", border: `1px solid ${colors.accent2}`, borderRadius: 6, padding: "4px 10px", color: colors.accent2, fontSize: 12, fontWeight: 600 }}>«Event» {e}</span>
        ))}
      </div>
    </div>
  );
}

function SectionBounded() {
  return (
    <div>
      <SectionTitle>Context Map</SectionTitle>
      <BoundedContextDiagram />
      <SectionTitle>Context Descriptions & Relationships</SectionTitle>
      {[
        {
          name: "Order Management Context", color: colors.accent,
          desc: "Owns the lifecycle of a Shipment from placement to completion. Exposes a REST API consumed by the frontend. Emits ShipmentPlaced and ShipmentCancelled domain events to the bus.",
          relations: ["Upstream of Mission Execution (Customer/Supplier — Order triggers Mission)", "Downstream of Route Planning (conformed to route feasibility API)"],
        },
        {
          name: "Route Planning Context", color: colors.accent2,
          desc: "Responsible for computing a valid, optimal Route given an origin-destination pair and real-time no-fly zone data. Uses PostGIS for geo-spatial queries and A* pathfinding over a waypoint graph.",
          relations: ["Provides route feasibility as Open Host Service to Order Management", "Consumes NoFlyZoneDeclared from regulatory feed (Anti-Corruption Layer)"],
        },
        {
          name: "Fleet Management Context", color: colors.green,
          desc: "Manages the Drone aggregate: availability, battery state, maintenance schedules. Provides a drone assignment API consumed by Mission Execution.",
          relations: ["Customer/Supplier with Mission Execution (Fleet supplies drones)", "Publishes DroneStatusChanged events"],
        },
        {
          name: "Mission Execution Context", color: colors.yellow,
          desc: "Core operational context. Manages the full lifecycle of a Delivery Mission: assignment, telemetry ingestion (via MQTT), re-routing, completion/abort. The heart of the system.",
          relations: ["Downstream of Order Management and Fleet Management", "Upstream of Tracking & Notifications (event producer)"],
        },
        {
          name: "Tracking & Notifications Context", color: colors.red,
          desc: "Read model optimised for tracking queries. Consumes all Mission events to build a TrackingRecord projection. Serves the real-time tracking API and WebSocket stream. Also dispatches notifications via email/SMS/push.",
          relations: ["Downstream of Mission Execution (Partnership / ACL)", "Separate Notification sub-domain handles channel abstraction"],
        },
      ].map(c => (
        <div key={c.name} style={{ border: `1px solid ${c.color}33`, borderLeft: `3px solid ${c.color}`, background: colors.surface, borderRadius: 6, padding: "12px 16px", marginBottom: 12 }}>
          <div style={{ color: c.color, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{c.name}</div>
          <p style={{ color: colors.text, fontSize: 13, margin: "0 0 8px" }}>{c.desc}</p>
          <div style={{ color: colors.muted, fontSize: 12 }}>{c.relations.map((r, i) => <div key={i}>→ {r}</div>)}</div>
        </div>
      ))}
    </div>
  );
}

function SectionArchitecture() {
  return (
    <div>
      <SectionTitle>Microservices Overview</SectionTitle>
      <MicroservicesArchDiagram />
      <SectionTitle>Service Catalogue</SectionTitle>
      {[
        { name: "api-gateway", tech: "Kong / Nginx", port: 443, desc: "Single entry point. Handles JWT validation, rate limiting, request routing and TLS termination." },
        { name: "order-service", tech: "Node.js · Express · Postgres", port: 3001, desc: "Manages the Shipment aggregate. REST API: POST /shipments, GET /shipments/:id, DELETE /shipments/:id." },
        { name: "route-service", tech: "Python · FastAPI · PostGIS", port: 3002, desc: "Geo-spatial route planning. Exposes POST /routes/plan. Consumes no-fly zone feed via scheduler." },
        { name: "fleet-service", tech: "Node.js · Express · Postgres", port: 3003, desc: "CRUD for Drone aggregates. WebSocket endpoint for real-time fleet dashboard." },
        { name: "mission-service", tech: "Go · Postgres · MQTT broker", port: 3004, desc: "Orchestrates mission lifecycle. Subscribes to drone telemetry MQTT topics. Publishes domain events to Kafka." },
        { name: "tracking-service", tech: "Node.js · TimescaleDB · WebSocket", port: 3005, desc: "Event-sourced projection of tracking history. WebSocket push to clients. GET /track/:shipmentId." },
        { name: "notification-service", tech: "Node.js · Nodemailer · Twilio", port: 3006, desc: "Consumes domain events from Kafka and dispatches email/SMS/push notifications. Pluggable channel adapters." },
      ].map(s => (
        <div key={s.name} style={{ display: "flex", gap: 14, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 160 }}>
            <div style={{ color: colors.accent, fontWeight: 700, fontSize: 13 }}>{s.name}</div>
            <div style={{ color: colors.muted, fontSize: 11 }}>:{s.port}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: colors.yellow, fontSize: 12, marginBottom: 3 }}>{s.tech}</div>
            <div style={{ color: colors.text, fontSize: 13 }}>{s.desc}</div>
          </div>
        </div>
      ))}
      <SectionTitle>Kafka Event Catalog</SectionTitle>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: colors.surface2 }}>
              {["Topic", "Event", "Producer", "Consumers"].map(h => <th key={h} style={{ padding: "7px 12px", textAlign: "left", color: colors.accent, borderBottom: `1px solid ${colors.border}` }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              ["shipments", "ShipmentPlaced", "order-service", "mission-service, tracking-service"],
              ["shipments", "ShipmentCancelled", "order-service", "mission-service, notification-service"],
              ["missions", "MissionStarted", "mission-service", "tracking-service, notification-service"],
              ["missions", "WaypointReached", "mission-service", "tracking-service"],
              ["missions", "ETAUpdated", "mission-service", "tracking-service, notification-service"],
              ["missions", "MissionCompleted", "mission-service", "order-service, tracking-service, notification-service"],
              ["missions", "MissionAborted", "mission-service", "order-service, fleet-service, notification-service"],
              ["fleet", "DroneStatusChanged", "fleet-service", "mission-service"],
            ].map(([topic, event, producer, consumers], i) => (
              <tr key={event} style={{ background: i % 2 === 0 ? colors.surface : colors.surface2 }}>
                <td style={{ padding: "7px 12px", color: colors.yellow, borderBottom: `1px solid ${colors.border}` }}>{topic}</td>
                <td style={{ padding: "7px 12px", color: colors.accent2, fontWeight: 600, borderBottom: `1px solid ${colors.border}` }}>{event}</td>
                <td style={{ padding: "7px 12px", color: colors.text, borderBottom: `1px solid ${colors.border}` }}>{producer}</td>
                <td style={{ padding: "7px 12px", color: colors.muted, borderBottom: `1px solid ${colors.border}` }}>{consumers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Layout helpers ───────────────────────────────────────────────────────────

function Badge({ children }) {
  return <span style={{ background: colors.accent + "22", border: `1px solid ${colors.accent}`, color: colors.accent, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{children}</span>;
}

function SectionTitle({ children }) {
  return <h3 style={{ color: colors.text, borderBottom: `1px solid ${colors.border}`, paddingBottom: 6, marginTop: 28, marginBottom: 14 }}>{children}</h3>;
}

function InfoGrid({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
      {items.map(([k, v]) => (
        <div key={k} style={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ color: colors.muted, fontSize: 11, marginBottom: 2 }}>{k}</div>
          <div style={{ color: colors.text, fontSize: 13, fontWeight: 600 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

// ── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [active, setActive] = useState("overview");


  const content = {
    overview: <SectionOverview />,
    requirements: <SectionRequirements />,
    domain: <SectionDomain />,
    bounded: <SectionBounded />,
    architecture: <SectionArchitecture />,
    prototype: (
      <div>
        <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, padding: "10px 16px", marginBottom: 18, fontSize: 13, color: colors.muted }}>
          <b style={{ color: colors.accent }}>Interactive Prototype</b> — Demonstrates core customer flows: view active shipments, track a package via timeline + map, and place a new shipment order.
        </div>
        <Prototype />
      </div>
    ),
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: colors.bg, minHeight: "100vh", color: colors.text, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}`, padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 22 }}>✈️</span>
        <div>
          <div style={{ color: colors.accent, fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>SHIPPING ON THE AIR</div>
          <div style={{ color: colors.muted, fontSize: 11 }}>Living Document · v1.0.0-20251020 · DDD + Microservices</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}`, padding: "0 20px", display: "flex", gap: 2, overflowX: "auto" }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActive(s.id)} style={{ padding: "10px 16px", border: "none", borderBottom: active === s.id ? `2px solid ${colors.accent}` : "2px solid transparent", background: "none", color: active === s.id ? colors.accent : colors.muted, cursor: "pointer", fontSize: 13, fontWeight: active === s.id ? 700 : 400, whiteSpace: "nowrap" }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "24px 20px", maxWidth: 900, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {content[active]}
      </div>
    </div>
  );
}
