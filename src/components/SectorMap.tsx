/**
 * SectorMap.tsx
 * Real-time 2D sector map for the Astryx Forge exploration system.
 *
 * Displays:
 *   ▲  Player ships            (orange triangle)
 *   ★  Known systems (lvl ≥2) (gold 6-point star)
 *   ?  Unknown signals (lvl 1) (teal ? inside dashed ring)
 *   ◆  Anomalies               (purple diamond)
 *   ◌  Sensor range bubble     (teal dashed circle per ship)
 *
 * Controls:
 *   Scroll wheel → zoom toward cursor
 *   Click + drag → pan
 *   +/− buttons  → zoom
 *   RST button   → reset view
 *
 * Data: polls GET /api/sector/:sectorId every 5 seconds.
 *       Hidden systems (explorationLevel 0) are never in the response.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

// ─── Palette ──────────────────────────────────────────────────────────────────
const GOLD   = "#F5B942";
const ORANGE = "#FF6A2B";
const TEAL   = "#4ADDBE";
const PURPLE = "#9F5AE5";
const BG     = "#07152B";

// ─── Map constants ────────────────────────────────────────────────────────────
const VW         = 900;   // SVG viewBox width
const VH         = 560;   // SVG viewBox height
const BASE_SCALE = 5;     // SVG content units per world unit
const PAD        = 60;    // content padding (world → SVG space)
const POLL_MS    = 5000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisibleSystem {
  id: string;
  explorationLevel: number;
  provisionalName: string;
  displayName: string | null;
  starType: string;
  planetCount: number;
  asteroidBelts?: number;
  anomalyPresent?: boolean;
  xCoord: number;
  yCoord: number;
  discoveredByShip?: string;
}

interface UnknownSignal {
  id: string;
  explorationLevel: number;
  xCoord: number;
  yCoord: number;
  discoveredByShip?: string;
}

interface Anomaly {
  id: string;
  systemId: string;
  scale: string;
  type: string;
  status: string;
  xCoord: number;
  yCoord: number;
}

interface Ship {
  id: string;
  name: string;
  currentX: number;
  currentY: number;
  sensorRange: number;
  travelStatus: string;
}

interface SectorPayload {
  sector: {
    id: string;
    designation: string;
    trait: string;
    chartingPercent: number;
    totalSystemCount: number;
    status: string;
  };
  visibleSystems: VisibleSystem[];
  unknownSignals: UnknownSignal[];
  anomalies: Anomaly[];
  ships: Ship[];
}

type Selected =
  | { kind: "system";  data: VisibleSystem  }
  | { kind: "signal";  data: UnknownSignal  }
  | { kind: "anomaly"; data: Anomaly        }
  | { kind: "ship";    data: Ship           }
  | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// World coordinate → content-space SVG unit
function wcs(coord: number, minCoord: number): number {
  return (coord - minCoord) * BASE_SCALE + PAD;
}

// ─── Symbols ──────────────────────────────────────────────────────────────────

function ShipTriangle({
  cx, cy, size = 9, fill,
}: { cx: number; cy: number; size?: number; fill: string }) {
  const pts = [
    `${cx},${cy - size}`,
    `${cx + size * 0.75},${cy + size * 0.65}`,
    `${cx - size * 0.75},${cy + size * 0.65}`,
  ].join(" ");
  return (
    <polygon points={pts} fill={fill} stroke={BG} strokeWidth={1.5} />
  );
}

function StarHex({
  cx, cy, r = 9, fill,
}: { cx: number; cy: number; r?: number; fill: string }) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const a   = (Math.PI / 6) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.44;
    return `${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} filter="url(#sglow)" />;
}

function Diamond({
  cx, cy, r = 8, fill,
}: { cx: number; cy: number; r?: number; fill: string }) {
  const pts = `${cx},${cy - r} ${cx + r * 0.65},${cy} ${cx},${cy + r} ${cx - r * 0.65},${cy}`;
  return <polygon points={pts} fill={fill} filter="url(#sglow)" />;
}

// ─── Detail panel components ──────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={dr.row}>
      <span style={dr.label}>{label}</span>
      <span style={dr.value}>{value}</span>
    </div>
  );
}

function DetailPanel({
  selected,
  onClose,
}: { selected: Selected; onClose: () => void }) {
  if (!selected) return null;

  const titleMap: Record<string, string> = {
    ship:    selected.kind === "ship"    ? selected.data.name  : "",
    system:  selected.kind === "system"  ? (selected.data as VisibleSystem).displayName ?? (selected.data as VisibleSystem).provisionalName : "",
    signal:  "Unknown Stellar Signature",
    anomaly: "Anomalous Reading",
  };

  return (
    <div style={s.panel}>
      <div style={s.panelHead}>
        <h2 style={s.panelTitle}>{titleMap[selected.kind]}</h2>
        <button style={s.closeBtn} onClick={onClose}>✕</button>
      </div>

      {selected.kind === "ship" && (() => {
        const d = selected.data;
        return (
          <>
            <Row label="Status"       value={d.travelStatus.toUpperCase()} />
            <Row label="Position"     value={`${d.currentX.toFixed(1)}, ${d.currentY.toFixed(1)}`} />
            <Row label="Sensor Range" value={`${d.sensorRange} units`} />
          </>
        );
      })()}

      {selected.kind === "signal" && (() => {
        const d = selected.data;
        return (
          <>
            <Row label="Classification" value="Unidentified stellar body" />
            <Row label="Position"       value={`${d.xCoord.toFixed(1)}, ${d.yCoord.toFixed(1)}`} />
            <Row label="Next Step"      value="Identify scan required" />
            {d.discoveredByShip && <Row label="Detected By" value={d.discoveredByShip} />}
          </>
        );
      })()}

      {selected.kind === "system" && (() => {
        const d = selected.data;
        return (
          <>
            <Row label="Exploration"  value={`Level ${d.explorationLevel}`} />
            <Row label="Position"     value={`${d.xCoord.toFixed(1)}, ${d.yCoord.toFixed(1)}`} />
            {d.explorationLevel >= 2 && <Row label="Star Type"  value={d.starType} />}
            {d.explorationLevel >= 2 && <Row label="Planets"    value={String(d.planetCount)} />}
            {d.explorationLevel >= 3 && <Row label="Asteroids"  value={`${d.asteroidBelts ?? 0} belt(s)`} />}
            {d.explorationLevel >= 3 && d.anomalyPresent && (
              <Row label="Anomaly" value="Present — investigation required" />
            )}
            {d.discoveredByShip && <Row label="Charted By" value={d.discoveredByShip} />}
          </>
        );
      })()}

      {selected.kind === "anomaly" && (() => {
        const d = selected.data;
        return (
          <>
            <Row label="Type"   value={d.type} />
            <Row label="Scale"  value={d.scale.toUpperCase()} />
            <Row label="Status" value={d.status.toUpperCase()} />
          </>
        );
      })()}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { sym: "▲", color: ORANGE, label: "Player Ship" },
    { sym: "★", color: GOLD,   label: "Known System" },
    { sym: "?", color: TEAL,   label: "Unknown Signal" },
    { sym: "◆", color: PURPLE, label: "Anomaly" },
    { sym: "◌", color: TEAL,   label: "Sensor Range" },
  ];
  return (
    <div style={s.legend}>
      {items.map(({ sym, color, label }) => (
        <div key={label} style={s.legendItem}>
          <span style={{ color, fontSize: "1.1rem", lineHeight: 1 }}>{sym}</span>
          <span style={s.legendLabel}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SectorMap() {
  const { sectorId } = useParams<{ sectorId: string }>();

  const [data,       setData]       = useState<SectorPayload | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [worldMin,   setWorldMin]   = useState({ x: 0, y: 0 });
  const [selected,   setSelected]   = useState<Selected>(null);
  const [zoom,       setZoom]       = useState(1);
  const [pan,        setPan]        = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart,  setDragStart]  = useState({ x: 0, y: 0 });

  const svgRef   = useRef<SVGSVGElement>(null);
  const initDone = useRef(false);
  const zoomRef  = useRef(zoom);
  const panRef   = useRef(pan);
  zoomRef.current = zoom;
  panRef.current  = pan;

  // ── Polling ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!sectorId) return;
    try {
      const res = await fetch(`/api/sector/${sectorId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const payload: SectorPayload = await res.json();
      setData(payload);
      setError(null);

      // Compute world bounding box for coordinate mapping
      const pts = [
        ...payload.visibleSystems.map(s  => [s.xCoord,   s.yCoord]),
        ...payload.unknownSignals.map(s  => [s.xCoord,   s.yCoord]),
        ...payload.ships.map(s           => [s.currentX, s.currentY]),
      ];
      if (pts.length === 0) return;

      const xs    = pts.map(p => p[0]);
      const ys    = pts.map(p => p[1]);
      const minX  = Math.min(...xs);
      const minY  = Math.min(...ys);
      const maxX  = Math.max(...xs);
      const maxY  = Math.max(...ys);
      setWorldMin({ x: minX, y: minY });

      // Fit view on first load only — don't reset while user is navigating
      if (!initDone.current) {
        initDone.current = true;
        const cw      = (maxX - minX) * BASE_SCALE + PAD * 2;
        const ch      = (maxY - minY) * BASE_SCALE + PAD * 2;
        const fitZ    = clamp(Math.min(VW / cw, VH / ch) * 0.9, 0.3, 2);
        const initPanX = (VW - cw * fitZ) / 2;
        const initPanY = (VH - ch * fitZ) / 2;
        setZoom(fitZ);
        setPan({ x: initPanX, y: initPanY });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sector.");
    }
  }, [sectorId]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  // ── Wheel zoom ───────────────────────────────────────────────────────────
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect    = el.getBoundingClientRect();
      // Cursor in SVG viewBox coordinates
      const svgX    = ((e.clientX - rect.left)  / rect.width)  * VW;
      const svgY    = ((e.clientY - rect.top)   / rect.height) * VH;
      const factor  = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      const curZ    = zoomRef.current;
      const curP    = panRef.current;
      const newZ    = clamp(curZ * factor, 0.2, 7);
      // Keep the world point under cursor stationary
      const newPanX = svgX - ((svgX - curP.x) / curZ) * newZ;
      const newPanY = svgY - ((svgY - curP.y) / curZ) * newZ;
      setZoom(newZ);
      setPan({ x: newPanX, y: newPanY });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Drag pan ─────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const el   = svgRef.current!;
    const rect = el.getBoundingClientRect();
    const dx   = ((e.clientX - dragStart.x) / rect.width)  * VW;
    const dy   = ((e.clientY - dragStart.y) / rect.height) * VH;
    setPan(p  => ({ x: p.x + dx, y: p.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const onMouseUp = () => setIsDragging(false);

  // ── Coordinate conversion ─────────────────────────────────────────────────
  const sx = (wx: number) => wcs(wx, worldMin.x);
  const sy = (wy: number) => wcs(wy, worldMin.y);

  const resetView = () => {
    initDone.current = false;
    fetchData();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.errorBox}>{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={s.page}>
        <p style={s.loading}>Accessing sector database...</p>
      </div>
    );
  }

  const { sector, visibleSystems, unknownSignals, anomalies, ships } = data;

  return (
    <div style={s.page}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>SECTOR {sector.designation}</h1>
          <p style={s.trait}>{sector.trait}</p>
        </div>
        <div style={s.chartBox}>
          <div style={s.chartRow}>
            <span style={s.chartLabel}>CHARTED</span>
            <span style={s.chartValue}>{sector.chartingPercent.toFixed(1)}%</span>
          </div>
          <div style={s.progressTrack}>
            <div
              style={{
                ...s.progressFill,
                width: `${clamp(sector.chartingPercent, 0, 100)}%`,
              }}
            />
          </div>
          <span style={s.sysCount}>
            {sector.totalSystemCount} system{sector.totalSystemCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Layout ── */}
      <div style={s.layout}>

        {/* ── SVG Map ── */}
        <div style={s.mapWrapper}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VW} ${VH}`}
            style={{ ...s.svg, cursor: isDragging ? "grabbing" : "grab" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onClick={() => setSelected(null)}
          >
            <defs>
              {/* Glow for stars and anomalies */}
              <filter id="sglow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Radial gradient for sensor bubble fill */}
              <radialGradient id="sensorBubble">
                <stop offset="0%"   stopColor={TEAL} stopOpacity="0.06" />
                <stop offset="100%" stopColor={TEAL} stopOpacity="0"    />
              </radialGradient>
            </defs>

            {/* ── Zoom + pan group ── */}
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>

              {/* 1. Sensor range bubbles — drawn first (behind everything) */}
              {ships.map(ship => (
                <g key={`sr-${ship.id}`}>
                  <circle
                    cx={sx(ship.currentX)}
                    cy={sy(ship.currentY)}
                    r={ship.sensorRange * BASE_SCALE}
                    fill="url(#sensorBubble)"
                    stroke={TEAL}
                    strokeWidth={0.6}
                    strokeDasharray="5 3"
                    strokeOpacity={0.35}
                  />
                </g>
              ))}

              {/* 2. Unknown signals — exploration level 1 */}
              {unknownSignals.map(sig => {
                const cx = sx(sig.xCoord);
                const cy = sy(sig.yCoord);
                const isSel = selected?.kind === "signal" && selected.data.id === sig.id;
                return (
                  <g
                    key={sig.id}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected({ kind: "signal", data: sig });
                    }}
                  >
                    {isSel && (
                      <circle
                        cx={cx} cy={cy} r={24}
                        fill="none"
                        stroke={TEAL}
                        strokeWidth={1}
                        strokeOpacity={0.4}
                      />
                    )}
                    <circle
                      cx={cx} cy={cy} r={14}
                      fill={BG}
                      stroke={TEAL}
                      strokeWidth={1}
                      strokeOpacity={0.55}
                      strokeDasharray="3 2"
                    />
                    <text
                      x={cx} y={cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{
                        fontFamily: "Orbitron, sans-serif",
                        fontSize: 11,
                        fill: TEAL,
                        opacity: 0.8,
                        pointerEvents: "none",
                      }}
                    >?</text>
                    <text
                      x={cx} y={cy + 23}
                      textAnchor="middle"
                      style={{
                        fontFamily: "Orbitron, sans-serif",
                        fontSize: 6.5,
                        fill: TEAL,
                        opacity: 0.5,
                        letterSpacing: 0.5,
                        pointerEvents: "none",
                      }}
                    >UNKNOWN</text>
                  </g>
                );
              })}

              {/* 3. Known systems — exploration level ≥ 2 */}
              {visibleSystems.map(sys => {
                const cx    = sx(sys.xCoord);
                const cy    = sy(sys.yCoord);
                const name  = sys.displayName ?? sys.provisionalName;
                const isSel = selected?.kind === "system" && selected.data.id === sys.id;
                const lvl3  = sys.explorationLevel >= 3;
                return (
                  <g
                    key={sys.id}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected({ kind: "system", data: sys });
                    }}
                  >
                    {isSel && (
                      <circle
                        cx={cx} cy={cy} r={26}
                        fill="none"
                        stroke={ORANGE}
                        strokeWidth={1.5}
                        strokeOpacity={0.5}
                        filter="url(#sglow)"
                      />
                    )}
                    <StarHex cx={cx} cy={cy} r={lvl3 ? 11 : 9} fill={lvl3 ? GOLD : "#A08828"} />
                    <text
                      x={cx} y={cy + 20}
                      textAnchor="middle"
                      style={{
                        fontFamily: "Orbitron, sans-serif",
                        fontSize: 7.5,
                        fill: GOLD,
                        opacity: lvl3 ? 0.9 : 0.65,
                        letterSpacing: 0.5,
                        pointerEvents: "none",
                      }}
                    >{name}</text>
                    {lvl3 && (
                      <text
                        x={cx} y={cy + 29}
                        textAnchor="middle"
                        style={{
                          fontFamily: "monospace",
                          fontSize: 6,
                          fill: "#2A4A70",
                          pointerEvents: "none",
                        }}
                      >{sys.xCoord.toFixed(0)},{sys.yCoord.toFixed(0)}</text>
                    )}
                  </g>
                );
              })}

              {/* 4. Anomalies — shown near their parent system */}
              {anomalies.map(anom => {
                const parent = visibleSystems.find(s => s.id === anom.systemId);
                if (!parent) return null;
                const cx    = sx(parent.xCoord) + 20;
                const cy    = sy(parent.yCoord) - 20;
                const isSel = selected?.kind === "anomaly" && selected.data.id === anom.id;
                return (
                  <g
                    key={anom.id}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected({ kind: "anomaly", data: anom });
                    }}
                  >
                    {isSel && (
                      <circle
                        cx={cx} cy={cy} r={16}
                        fill="none"
                        stroke={PURPLE}
                        strokeWidth={1}
                        strokeOpacity={0.5}
                      />
                    )}
                    <Diamond cx={cx} cy={cy} r={8} fill={PURPLE} />
                  </g>
                );
              })}

              {/* 5. Ships — drawn on top */}
              {ships.map(ship => {
                const cx      = sx(ship.currentX);
                const cy      = sy(ship.currentY);
                const isSel   = selected?.kind === "ship" && selected.data.id === ship.id;
                const moving  = ship.travelStatus === "traveling";
                return (
                  <g
                    key={ship.id}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected({ kind: "ship", data: ship });
                    }}
                  >
                    {isSel && (
                      <circle
                        cx={cx} cy={cy} r={22}
                        fill="none"
                        stroke={ORANGE}
                        strokeWidth={1.5}
                        strokeOpacity={0.6}
                      />
                    )}
                    {/* Rotating warp ring when traveling */}
                    {moving && (
                      <circle
                        cx={cx} cy={cy} r={17}
                        fill="none"
                        stroke={ORANGE}
                        strokeWidth={1}
                        strokeDasharray="6 3"
                        strokeOpacity={0.5}
                      >
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from={`0 ${cx} ${cy}`}
                          to={`360 ${cx} ${cy}`}
                          dur="2.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                    <ShipTriangle cx={cx} cy={cy} size={9} fill={ORANGE} />
                    <text
                      x={cx} y={cy + 21}
                      textAnchor="middle"
                      style={{
                        fontFamily: "Orbitron, sans-serif",
                        fontSize: 7,
                        fill: ORANGE,
                        opacity: 0.85,
                        letterSpacing: 0.5,
                        pointerEvents: "none",
                      }}
                    >{ship.name}</text>
                  </g>
                );
              })}
            </g>{/* end zoom/pan group */}
          </svg>

          {/* Zoom controls */}
          <div style={s.zoomControls}>
            <button
              style={s.zoomBtn}
              onClick={() => setZoom(z => clamp(z * 1.3, 0.2, 7))}
            >+</button>
            <button
              style={s.zoomBtn}
              onClick={() => setZoom(z => clamp(z / 1.3, 0.2, 7))}
            >−</button>
            <button
              style={{ ...s.zoomBtn, fontSize: "0.5rem", letterSpacing: "0.5px" }}
              onClick={resetView}
            >RST</button>
          </div>
        </div>

        {/* ── Detail panel ── */}
        <DetailPanel selected={selected} onClose={() => setSelected(null)} />
      </div>

      {/* ── Legend ── */}
      <Legend />

      {/* ── Hint ── */}
      {!selected && (
        <p style={s.hint}>
          Click any marker to inspect · Scroll to zoom · Drag to pan
        </p>
      )}
    </div>
  );
}

// ─── Detail row sub-component ─────────────────────────────────────────────────

const dr: Record<string, React.CSSProperties> = {
  row: {
    paddingBottom: "0.55rem",
    borderBottom: "1px solid #1E3A5F",
    marginBottom: "0.55rem",
  },
  label: {
    display: "block",
    color: GOLD,
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.6rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    marginBottom: "0.2rem",
  },
  value: {
    display: "block",
    color: "#C8D8F0",
    fontSize: "0.85rem",
    lineHeight: 1.5,
  },
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "1rem",
    marginBottom: "1.25rem",
  },
  title: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "1.4rem",
    fontWeight: 900,
    background: "linear-gradient(135deg, #F5B942, #FF6A2B)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "3px",
    margin: 0,
  },
  trait: {
    color: "#4A7AAA",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.7rem",
    letterSpacing: "1.5px",
    margin: "0.25rem 0 0",
  },
  chartBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.3rem",
    minWidth: 160,
  },
  chartRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.5rem",
  },
  chartLabel: {
    color: "#4A7AAA",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.6rem",
    letterSpacing: "1.5px",
  },
  chartValue: {
    color: GOLD,
    fontFamily: "Orbitron, sans-serif",
    fontSize: "1.1rem",
    fontWeight: 700,
  },
  progressTrack: {
    width: 160,
    height: 4,
    backgroundColor: "#1E3A5F",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`,
    borderRadius: 2,
    transition: "width 0.8s ease",
  },
  sysCount: {
    color: "#3A5A80",
    fontFamily: "monospace",
    fontSize: "0.7rem",
  },
  layout: {
    display: "flex",
    gap: "1.5rem",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  mapWrapper: {
    flex: 1,
    minWidth: 300,
    position: "relative",
    backgroundColor: BG,
    border: "1px solid #1E3A5F",
    borderRadius: 10,
    overflow: "hidden",
  },
  svg: {
    display: "block",
    width: "100%",
  },
  zoomControls: {
    position: "absolute",
    bottom: 12,
    right: 12,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  zoomBtn: {
    width: 28,
    height: 28,
    background: "#0D2240",
    border: "1px solid #1E3A5F",
    color: GOLD,
    borderRadius: 4,
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Orbitron, sans-serif",
    padding: 0,
  },
  panel: {
    width: 260,
    flexShrink: 0,
    backgroundColor: "#0D2240",
    border: "1px solid #1E3A5F",
    borderRadius: 10,
    padding: "1.25rem",
  },
  panelHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem",
  },
  panelTitle: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.9rem",
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
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    marginTop: "1.25rem",
    padding: "0.75rem 1rem",
    backgroundColor: "#080F1E",
    border: "1px solid #1E3A5F",
    borderRadius: 8,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  legendLabel: {
    color: "#4A7AAA",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.62rem",
    letterSpacing: "1px",
  },
  hint: {
    marginTop: "0.75rem",
    textAlign: "center",
    color: "#2A4A6A",
    fontSize: "0.75rem",
    fontFamily: "Orbitron, sans-serif",
    letterSpacing: "1px",
  },
  errorBox: {
    maxWidth: 500,
    margin: "4rem auto",
    backgroundColor: "#FF6A2B18",
    border: "1px solid #FF6A2B50",
    borderRadius: 8,
    color: ORANGE,
    padding: "1rem 1.5rem",
    textAlign: "center",
    fontSize: "0.9rem",
  },
  loading: {
    color: "#4A6A90",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.85rem",
    textAlign: "center",
    marginTop: "6rem",
    letterSpacing: "2px",
  },
};
