import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemDetails {
  systemName: string;
  starType: string;
  planetCount: number;
  anomaly: string;
  missionHook: string;
}

interface StarSystem {
  systemId: string;
  campaignId: string;
  x: number;
  y: number;
  name: string;
  discovered: boolean;
  details: SystemDetails | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID     = 110;  // px per coordinate unit
const PAD      = 70;   // SVG padding
const R        = 22;   // node radius
const GOLD     = "#F5B942";
const ORANGE   = "#FF6A2B";
const DIM      = "#1E3A5F";
const BG       = "#07152B";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CampaignMap() {
  const { campaignId } = useParams<{ campaignId: string }>();

  const [systems, setSystems]         = useState<StarSystem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<StarSystem | null>(null);
  const [exploring, setExploring]     = useState<string | null>(null); // systemId being explored
  const [exploreError, setExploreError] = useState<string | null>(null);

  // ── Real-time Firestore subscription ──
  useEffect(() => {
    if (!campaignId) return;
    const q = query(
      collection(db, "systems"),
      where("campaignId", "==", campaignId),
    );
    const unsub = onSnapshot(q, (snap) => {
      const result: StarSystem[] = snap.docs.map((d) => d.data() as StarSystem);
      setSystems(result);
      setLoading(false);
    }, (err) => {
      console.error("[CampaignMap] Firestore error:", err);
      setLoading(false);
    });
    return unsub;
  }, [campaignId]);

  // ── Seed the first system ──
  const seedMap = async () => {
    if (!campaignId) return;
    const systemId = crypto.randomUUID();
    await setDoc(doc(db, "systems", systemId), {
      systemId,
      campaignId,
      x: 0,
      y: 0,
      name: "Home System",
      discovered: true,
      details: {
        systemName:  "Home System",
        starType:    "Yellow Star",
        planetCount: 4,
        anomaly:     "A stable, well-charted system — the campaign's point of origin.",
        missionHook: "Command has issued standing orders: explore the surrounding sectors.",
      },
      createdAt: new Date().toISOString(),
    });
    // Trigger frontier expansion via the API
    await fetch("/api/exploreSystem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Seed system is already discovered; we just want neighbors — small workaround:
      // call with a dummy that won't match, handled gracefully by the endpoint
    }).catch(() => {/* non-fatal */});

    // Manually create the 4 neighbors since the seed bypasses the endpoint
    const offsets: [number, number][] = [[1,0],[-1,0],[0,1],[0,-1]];
    await Promise.all(offsets.map(([dx, dy]) => {
      const id = crypto.randomUUID();
      return setDoc(doc(db, "systems", id), {
        systemId: id, campaignId, x: dx, y: dy,
        name: "Unknown System", discovered: false,
        details: null, createdAt: new Date().toISOString(),
      });
    }));
  };

  // ── Explore an undiscovered system ──
  const explore = useCallback(async (system: StarSystem) => {
    if (!campaignId || exploring) return;
    setExploring(system.systemId);
    setExploreError(null);
    try {
      const res = await fetch("/api/exploreSystem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, systemId: system.systemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Exploration failed.");
    } catch (err) {
      setExploreError(err instanceof Error ? err.message : "Exploration failed.");
    } finally {
      setExploring(null);
    }
  }, [campaignId, exploring]);

  // ── SVG coordinate calculations ──
  const toScreen = (coord: number, min: number) => (coord - min) * GRID + PAD;

  const svgDimensions = (() => {
    if (systems.length === 0) return { w: 400, h: 300, minX: 0, minY: 0 };
    const xs = systems.map((s) => s.x);
    const ys = systems.map((s) => s.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return {
      w: (maxX - minX) * GRID + PAD * 2,
      h: (maxY - minY) * GRID + PAD * 2,
      minX,
      minY,
    };
  })();

  // Draw connection lines between adjacent discovered systems
  const connections: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const discoveredSet = new Set(
    systems.filter((s) => s.discovered).map((s) => `${s.x},${s.y}`)
  );
  systems.filter((s) => s.discovered).forEach((s) => {
    [[1,0],[0,1]].forEach(([dx, dy]) => {
      if (discoveredSet.has(`${s.x + dx},${s.y + dy}`)) {
        connections.push({
          x1: toScreen(s.x, svgDimensions.minX),
          y1: toScreen(s.y, svgDimensions.minY),
          x2: toScreen(s.x + dx, svgDimensions.minX),
          y2: toScreen(s.y + dy, svgDimensions.minY),
        });
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={s.page}>
        <p style={s.loadingText}>Loading campaign map...</p>
      </div>
    );
  }

  if (systems.length === 0) {
    return (
      <div style={s.page}>
        <div style={s.emptyCard}>
          <h2 style={s.emptyTitle}>Campaign Map Uncharted</h2>
          <p style={s.emptyDesc}>No systems have been charted yet. Initialize the map to begin exploration.</p>
          <button style={s.btnPrimary} onClick={seedMap}>
            ✦ Initialize Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Campaign Map</h1>
        <div style={s.legend}>
          <span style={s.legendGold}>◉</span><span style={s.legendLabel}>Discovered</span>
          <span style={s.legendDim}>◉</span><span style={s.legendLabel}>Unexplored</span>
        </div>
      </div>

      {exploreError && (
        <div style={s.errorBanner}>{exploreError}</div>
      )}

      <div style={s.layout}>
        {/* ── SVG Map ── */}
        <div style={s.mapWrapper}>
          <svg
            viewBox={`0 0 ${svgDimensions.w} ${svgDimensions.h}`}
            style={s.svg}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="dimFilter">
                <feColorMatrix type="saturate" values="0.2" />
              </filter>
            </defs>

            {/* Connection lines */}
            {connections.map((c, i) => (
              <line
                key={i}
                x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
                stroke={GOLD}
                strokeWidth={1.5}
                strokeOpacity={0.3}
                strokeDasharray="4 4"
              />
            ))}

            {/* System nodes */}
            {systems.map((sys) => {
              const cx = toScreen(sys.x, svgDimensions.minX);
              const cy = toScreen(sys.y, svgDimensions.minY);
              const isSelected  = selected?.systemId === sys.systemId;
              const isExploring = exploring === sys.systemId;
              const isDisc      = sys.discovered;

              return (
                <g
                  key={sys.systemId}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    if (isDisc) {
                      setSelected(isSelected ? null : sys);
                    } else if (!isExploring) {
                      explore(sys);
                    }
                  }}
                >
                  {/* Outer glow ring for discovered */}
                  {isDisc && (
                    <circle
                      cx={cx} cy={cy} r={R + 6}
                      fill="none"
                      stroke={isSelected ? ORANGE : GOLD}
                      strokeWidth={isSelected ? 2 : 1}
                      strokeOpacity={isSelected ? 0.8 : 0.25}
                      filter="url(#glow)"
                    />
                  )}

                  {/* Main circle */}
                  <circle
                    cx={cx} cy={cy} r={R}
                    fill={isDisc ? (isSelected ? "#1A3A1A" : BG) : "#0A1525"}
                    stroke={isDisc ? (isSelected ? ORANGE : GOLD) : DIM}
                    strokeWidth={isDisc ? 2 : 1}
                    strokeOpacity={isDisc ? 1 : 0.5}
                    filter={isDisc ? "url(#glow)" : undefined}
                  />

                  {/* Star dot at center */}
                  <circle
                    cx={cx} cy={cy} r={isDisc ? 4 : 2}
                    fill={isDisc ? GOLD : "#2A4A6A"}
                    filter={isDisc ? "url(#glow)" : undefined}
                  />

                  {/* Exploring spinner ring */}
                  {isExploring && (
                    <circle
                      cx={cx} cy={cy} r={R + 10}
                      fill="none"
                      stroke={ORANGE}
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      strokeOpacity={0.7}
                    >
                      <animateTransform
                        attributeName="transform" type="rotate"
                        from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
                        dur="1.2s" repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* System label */}
                  <text
                    x={cx}
                    y={cy + R + 14}
                    textAnchor="middle"
                    style={{
                      fontFamily: "Orbitron, sans-serif",
                      fontSize: isDisc ? 8.5 : 7.5,
                      fill: isDisc ? GOLD : "#3A5A80",
                      letterSpacing: 0.5,
                    }}
                  >
                    {isExploring ? "SCANNING..." : (isDisc ? sys.name : "UNKNOWN")}
                  </text>

                  {/* Coordinate label (dim) */}
                  <text
                    x={cx}
                    y={cy + R + 24}
                    textAnchor="middle"
                    style={{ fontFamily: "monospace", fontSize: 7, fill: "#2A4A6A" }}
                  >
                    {sys.x},{sys.y}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── Detail Panel ── */}
        {selected && (
          <div style={s.panel}>
            <div style={s.panelHeader}>
              <h2 style={s.panelTitle}>{selected.name}</h2>
              <button
                style={s.closeBtn}
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={s.panelCoord}>
              Coordinates: ({selected.x}, {selected.y})
            </div>

            {selected.details ? (
              <div style={s.detailGrid}>
                <DetailRow label="Star Type"    value={selected.details.starType} />
                <DetailRow label="Planets"      value={String(selected.details.planetCount)} />
                <DetailRow label="Anomaly"      value={selected.details.anomaly} />
                <DetailRow label="Mission Hook" value={selected.details.missionHook} />
              </div>
            ) : (
              <p style={s.noDetails}>System details pending analysis.</p>
            )}
          </div>
        )}
      </div>

      {/* Tap hint when nothing selected */}
      {!selected && (
        <p style={s.hint}>
          Tap a <span style={{ color: GOLD }}>discovered system</span> to view details ·
          Tap an <span style={{ color: DIM }}>unknown system</span> to explore
        </p>
      )}
    </div>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={dr.row}>
      <span style={dr.label}>{label}</span>
      <span style={dr.value}>{value}</span>
    </div>
  );
}

const dr: Record<string, React.CSSProperties> = {
  row:   { paddingBottom: "0.6rem", borderBottom: "1px solid #1E3A5F", marginBottom: "0.6rem" },
  label: { display: "block", color: GOLD, fontFamily: "Orbitron,sans-serif", fontSize: "0.62rem", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "0.2rem" },
  value: { display: "block", color: "#C8D8F0", fontSize: "0.88rem", lineHeight: 1.5 },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: "#0B1E3A",
    minHeight: "100vh",
    padding: "1.5rem 2rem 3rem",
    fontFamily: "'Segoe UI', sans-serif",
    color: "#ffffff",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1.25rem",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  title: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "1.4rem",
    fontWeight: 900,
    background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "3px",
    margin: 0,
  },
  legend: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.78rem",
  },
  legendGold:  { color: GOLD,  fontSize: "1rem" },
  legendDim:   { color: DIM,   fontSize: "1rem", marginLeft: "0.75rem" },
  legendLabel: { color: "#8AAAD0", fontFamily: "Orbitron,sans-serif", fontSize: "0.65rem", letterSpacing: "1px" },
  errorBanner: {
    backgroundColor: "#FF6A2B18",
    border: "1px solid #FF6A2B50",
    borderRadius: "6px",
    color: ORANGE,
    padding: "0.6rem 1rem",
    marginBottom: "1rem",
    fontSize: "0.85rem",
  },
  layout: {
    display: "flex",
    gap: "1.5rem",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  mapWrapper: {
    flex: 1,
    minWidth: 280,
    backgroundColor: BG,
    border: "1px solid #1E3A5F",
    borderRadius: "10px",
    overflow: "auto",
  },
  svg: {
    display: "block",
    width: "100%",
    minWidth: 280,
  },
  panel: {
    width: 280,
    flexShrink: 0,
    backgroundColor: "#0D2240",
    border: "1px solid #1E3A5F",
    borderRadius: "10px",
    padding: "1.25rem",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.4rem",
  },
  panelTitle: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.95rem",
    color: GOLD,
    letterSpacing: "1.5px",
    margin: 0,
    flex: 1,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#3A5A80",
    fontSize: "1rem",
    cursor: "pointer",
    padding: "0 0 0 0.5rem",
    lineHeight: 1,
  },
  panelCoord: {
    color: "#3A5A80",
    fontFamily: "monospace",
    fontSize: "0.75rem",
    marginBottom: "1rem",
  },
  detailGrid: {
    display: "flex",
    flexDirection: "column",
  },
  noDetails: {
    color: "#3A5A80",
    fontSize: "0.85rem",
    fontStyle: "italic",
  },
  hint: {
    marginTop: "1.25rem",
    textAlign: "center",
    color: "#3A5A80",
    fontSize: "0.78rem",
  },
  // Empty state
  emptyCard: {
    maxWidth: 420,
    margin: "6rem auto",
    backgroundColor: "#0D2240",
    border: "1px solid #1E3A5F",
    borderRadius: "10px",
    padding: "2.5rem",
    textAlign: "center",
  },
  emptyTitle: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "1.1rem",
    color: GOLD,
    letterSpacing: "2px",
    marginBottom: "0.75rem",
  },
  emptyDesc: {
    color: "#8AAAD0",
    fontSize: "0.9rem",
    lineHeight: 1.6,
    marginBottom: "1.75rem",
  },
  btnPrimary: {
    background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
    border: "none",
    color: "#0B1E3A",
    borderRadius: "6px",
    padding: "0.75rem 2rem",
    fontFamily: "Orbitron,sans-serif",
    fontWeight: 700,
    fontSize: "0.8rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    cursor: "pointer",
  },
  loadingText: {
    color: "#4A6A90",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.85rem",
    textAlign: "center",
    marginTop: "6rem",
    letterSpacing: "2px",
  },
};
