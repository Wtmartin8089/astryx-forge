import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { subscribeToShips } from "../utils/shipsFirestore";
import type { CrewMember, ShipData } from "../types/fleet";
import "../assets/lcars.css";

const rankColors: Record<string, string> = {
  "Captain": "#ff9900",
  "Commander": "#cc6666",
  "Lt. Commander": "#ffcc33",
  "Full Lieutenant": "#ffcc33",
  "Ensign": "#6699cc",
};

const rankOrder = ["Fleet Admiral", "Admiral", "Captain", "Commander", "Lt. Commander", "Full Lieutenant", "Ensign"];

type CrewEntry = { id: string; member: CrewMember };

const PersonnelDatabase = () => {
  const [visible, setVisible] = useState(false);
  const [crew, setCrew] = useState<CrewEntry[]>([]);
  const [ships, setShips] = useState<Record<string, ShipData>>({});

  const [filterRank, setFilterRank] = useState("");
  const [filterSpecies, setFilterSpecies] = useState("");
  const [filterAssignment, setFilterAssignment] = useState("");

  useEffect(() => {
    const unsubShips = subscribeToShips(setShips);
    const q = query(collection(db, "crew"), where("status", "==", "active"));
    const unsub = onSnapshot(q, (snap) => {
      setCrew(snap.docs.map((d) => ({ id: d.id, member: d.data() as CrewMember })));
    });
    const timer = setTimeout(() => setVisible(true), 50);
    return () => { unsubShips(); unsub(); clearTimeout(timer); };
  }, []);

  // Derive unique filter options from loaded data
  const allRanks = useMemo(() => {
    const s = new Set(crew.map((e) => e.member.rank).filter(Boolean));
    return Array.from(s).sort();
  }, [crew]);

  const allSpecies = useMemo(() => {
    const s = new Set(crew.map((e) => e.member.species).filter((v) => v && v !== "Unknown"));
    return Array.from(s).sort();
  }, [crew]);

  const filtered = useMemo(() => {
    return crew.filter(({ member }) => {
      if (filterRank && member.rank !== filterRank) return false;
      if (filterSpecies && member.species !== filterSpecies) return false;
      if (filterAssignment) {
        const aType = resolveAssignmentType(member);
        if (filterAssignment === "starbase" && aType !== "starbase") return false;
        if (filterAssignment === "unassigned" && aType !== "unassigned") return false;
        if (filterAssignment !== "starbase" && filterAssignment !== "unassigned") {
          if (aType !== "ship" || resolveAssignmentId(member) !== filterAssignment) return false;
        }
      }
      return true;
    });
  }, [crew, filterRank, filterSpecies, filterAssignment]);

  // Helper to resolve assignment type from new or legacy fields
  function resolveAssignmentType(m: CrewMember): "ship" | "starbase" | "unassigned" {
    if (m.assignmentType) return m.assignmentType;
    if (m.shipId === "starbase") return "starbase";
    if (m.shipId && m.shipId.trim() !== "") return "ship";
    return "unassigned";
  }

  function resolveAssignmentId(m: CrewMember): string | null {
    if (m.assignmentId !== undefined) return m.assignmentId;
    if (m.shipId === "starbase") return "starbase-machida";
    if (m.shipId && m.shipId.trim() !== "") return m.shipId;
    return null;
  }

  function getAssignmentLabel(m: CrewMember): string {
    const aType = resolveAssignmentType(m);
    if (aType === "starbase") return "Starbase Machida";
    if (aType === "ship") {
      const aid = resolveAssignmentId(m);
      if (aid && ships[aid]) return ships[aid].name;
      return aid || "Unknown Ship";
    }
    return "Unassigned";
  }

  // Group filtered results by assignment
  const grouped = useMemo(() => {
    const starbase: CrewEntry[] = [];
    const shipGroups: Record<string, CrewEntry[]> = {};
    const unassigned: CrewEntry[] = [];

    const sortByRank = (a: CrewEntry, b: CrewEntry) => {
      const ai = rankOrder.indexOf(a.member.rank);
      const bi = rankOrder.indexOf(b.member.rank);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    };

    for (const entry of filtered) {
      const aType = resolveAssignmentType(entry.member);
      if (aType === "starbase") {
        starbase.push(entry);
      } else if (aType === "ship") {
        const aid = resolveAssignmentId(entry.member) || "unknown";
        if (!shipGroups[aid]) shipGroups[aid] = [];
        shipGroups[aid].push(entry);
      } else {
        unassigned.push(entry);
      }
    }

    starbase.sort(sortByRank);
    unassigned.sort(sortByRank);
    for (const key of Object.keys(shipGroups)) {
      shipGroups[key].sort(sortByRank);
    }

    return { starbase, shipGroups, unassigned };
  }, [filtered, ships]);

  // Unique assignment options for filter dropdown
  const assignmentOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const { member } of crew) {
      const aType = resolveAssignmentType(member);
      if (aType === "starbase" && !seen.has("starbase")) {
        options.push({ value: "starbase", label: "Starbase Machida" });
        seen.add("starbase");
      } else if (aType === "ship") {
        const aid = resolveAssignmentId(member) || "unknown";
        if (!seen.has(aid)) {
          options.push({ value: aid, label: ships[aid]?.name || aid });
          seen.add(aid);
        }
      } else if (!seen.has("unassigned")) {
        options.push({ value: "unassigned", label: "Unassigned" });
        seen.add("unassigned");
      }
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [crew, ships]);

  const selectStyle: React.CSSProperties = {
    backgroundColor: "#0a0a0a",
    border: "1px solid #6699cc40",
    borderRadius: "4px",
    color: "#ccc",
    padding: "0.4rem 0.75rem",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.75rem",
    letterSpacing: "1px",
    cursor: "pointer",
    minWidth: "160px",
  };

  const renderCard = ({ id, member }: CrewEntry) => {
    const rankColor = rankColors[member.rank] || "#888";
    const assignmentLabel = getAssignmentLabel(member);

    return (
      <Link key={id} to={`/personnel/${id}`} style={{ textDecoration: "none" }}>
        <div
          style={{
            backgroundColor: "#111",
            border: `1px solid ${rankColor}30`,
            borderLeft: `4px solid ${rankColor}`,
            borderRadius: "0 12px 0 0",
            padding: "1.1rem 1.25rem",
            cursor: "pointer",
            transition: "border-color 0.25s, box-shadow 0.25s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.borderColor = rankColor;
            el.style.boxShadow = `0 0 15px ${rankColor}25`;
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.borderColor = `${rankColor}30`;
            el.style.borderLeftColor = rankColor;
            el.style.boxShadow = "none";
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <div>
              <p style={{ color: rankColor, fontSize: "0.65rem", margin: "0 0 0.2rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                {member.rank}
              </p>
              <h3 style={{ color: "#fff", fontSize: "1rem", margin: "0 0 0.3rem" }}>
                {member.name}
              </h3>
            </div>
            <span style={{
              backgroundColor: `${rankColor}15`,
              border: `1px solid ${rankColor}40`,
              borderRadius: "12px",
              color: rankColor,
              fontSize: "0.6rem",
              padding: "0.2rem 0.6rem",
              letterSpacing: "1px",
              whiteSpace: "nowrap",
            }}>
              {member.species !== "Unknown" ? member.species : "\u2014"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem 1rem" }}>
            <div>
              <span style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "1px", textTransform: "uppercase" }}>Position</span>
              <p style={{ color: "#aaa", fontSize: "0.8rem", margin: "0.1rem 0 0" }}>{member.position || "\u2014"}</p>
            </div>
            <div>
              <span style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "1px", textTransform: "uppercase" }}>Assignment</span>
              <p style={{ color: "#aaa", fontSize: "0.8rem", margin: "0.1rem 0 0" }}>{assignmentLabel}</p>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  const renderSection = (title: string, entries: CrewEntry[], color: string) => {
    if (entries.length === 0) return null;
    return (
      <div style={{ marginBottom: "2rem" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
          padding: "0.75rem 1rem",
          backgroundColor: "#111",
          border: `1px solid ${color}`,
          borderRadius: "0 20px 0 0",
        }}>
          <div style={{
            width: "6px",
            height: "30px",
            backgroundColor: color,
            borderRadius: "3px",
          }} />
          <span style={{
            color: color,
            fontSize: "1rem",
            fontWeight: "bold",
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}>
            {title}
          </span>
          <span style={{ color: "#555", fontSize: "0.7rem", letterSpacing: "1px" }}>
            {entries.length} PERSONNEL
          </span>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "1rem",
        }}>
          {entries.map(renderCard)}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "2rem",
      fontFamily: "'Orbitron', sans-serif",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : "translateX(-30px)",
      transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
    }}>

      {/* LCARS Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "50px" }}>
        <div style={{ width: "20px", backgroundColor: "#6699cc", borderRadius: "20px 0 0 0" }} />
        <div style={{
          flex: 1,
          backgroundColor: "#6699cc",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2rem",
        }}>
          <h1 style={{
            margin: 0,
            color: "#000",
            fontSize: "1.6rem",
            fontWeight: "bold",
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}>
            Starfleet Personnel Database
          </h1>
          <span style={{ color: "#00000080", fontSize: "0.7rem", letterSpacing: "1px" }}>
            {filtered.length} RECORD{filtered.length !== 1 ? "S" : ""}
          </span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Filter Bar */}
      <div style={{
        backgroundColor: "#111",
        border: "1px solid #6699cc30",
        borderRadius: "0 20px 0 0",
        padding: "1rem 1.5rem",
        marginBottom: "2rem",
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap",
        alignItems: "center",
      }}>
        <span style={{ color: "#6699cc", fontSize: "0.7rem", letterSpacing: "2px", textTransform: "uppercase" }}>
          Filter:
        </span>

        <select value={filterRank} onChange={(e) => setFilterRank(e.target.value)} style={selectStyle}>
          <option value="">All Ranks</option>
          {allRanks.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <select value={filterSpecies} onChange={(e) => setFilterSpecies(e.target.value)} style={selectStyle}>
          <option value="">All Species</option>
          {allSpecies.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filterAssignment} onChange={(e) => setFilterAssignment(e.target.value)} style={selectStyle}>
          <option value="">All Assignments</option>
          {assignmentOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {(filterRank || filterSpecies || filterAssignment) && (
          <button
            onClick={() => { setFilterRank(""); setFilterSpecies(""); setFilterAssignment(""); }}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #cc333360",
              borderRadius: "20px",
              color: "#cc3333",
              padding: "0.35rem 0.9rem",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.7rem",
              letterSpacing: "1px",
              cursor: "pointer",
            }}
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Personnel Grouped by Assignment */}
      {filtered.length === 0 ? (
        <p style={{ color: "#555", textAlign: "center", fontSize: "0.9rem", marginTop: "3rem" }}>
          No personnel records match current filters.
        </p>
      ) : (
        <>
          {renderSection("Starbase Machida Personnel", grouped.starbase, "#9933cc")}
          {Object.entries(grouped.shipGroups).map(([shipId, entries]) => {
            const shipName = ships[shipId]?.name || shipId;
            return renderSection(`${shipName} Personnel`, entries, "#ff9933");
          })}
          {renderSection("Unassigned Personnel", grouped.unassigned, "#6699cc")}
        </>
      )}

      {/* Bottom LCARS bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link to="/" style={{
          flex: 1,
          backgroundColor: "#6699cc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#000",
          fontWeight: "bold",
          textDecoration: "none",
          letterSpacing: "2px",
          fontSize: "0.9rem",
        }}>
          RETURN TO STAR MAP
        </Link>
        <div style={{ width: "20px", backgroundColor: "#6699cc", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default PersonnelDatabase;
