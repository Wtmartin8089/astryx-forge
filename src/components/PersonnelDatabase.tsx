import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { getShips } from "../utils/gameData";
import type { CrewMember, ShipData } from "../types/fleet";
import "../assets/lcars.css";

const rankColors: Record<string, string> = {
  "Captain": "#ff9900",
  "Commander": "#cc6666",
  "Lt. Commander": "#ffcc33",
  "Full Lieutenant": "#ffcc33",
  "Ensign": "#6699cc",
};

type CrewEntry = { slug: string; member: CrewMember };

const PersonnelDatabase = () => {
  const [visible, setVisible] = useState(false);
  const [crew, setCrew] = useState<CrewEntry[]>([]);
  const [ships, setShips] = useState<Record<string, ShipData>>({});

  const [filterRank, setFilterRank] = useState("");
  const [filterSpecies, setFilterSpecies] = useState("");
  const [filterShip, setFilterShip] = useState("");

  useEffect(() => {
    setShips(getShips());
    const q = query(collection(db, "crew"));
    const unsub = onSnapshot(q, (snap) => {
      setCrew(snap.docs.map((d) => ({ slug: d.id, member: d.data() as CrewMember })));
    });
    const timer = setTimeout(() => setVisible(true), 50);
    return () => { unsub(); clearTimeout(timer); };
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

  const allShips = useMemo(() => {
    const s = new Set(crew.map((e) => e.member.shipId).filter(Boolean));
    return Array.from(s).sort();
  }, [crew]);

  const filtered = useMemo(() => {
    return crew.filter(({ member }) => {
      if (filterRank && member.rank !== filterRank) return false;
      if (filterSpecies && member.species !== filterSpecies) return false;
      if (filterShip && member.shipId !== filterShip) return false;
      return true;
    });
  }, [crew, filterRank, filterSpecies, filterShip]);

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

        <select value={filterShip} onChange={(e) => setFilterShip(e.target.value)} style={selectStyle}>
          <option value="">All Ships</option>
          {allShips.map((id) => (
            <option key={id} value={id}>
              {id === "starbase" ? "Starbase Machida" : (ships[id]?.name || id)}
            </option>
          ))}
        </select>

        {(filterRank || filterSpecies || filterShip) && (
          <button
            onClick={() => { setFilterRank(""); setFilterSpecies(""); setFilterShip(""); }}
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

      {/* Personnel Grid */}
      {filtered.length === 0 ? (
        <p style={{ color: "#555", textAlign: "center", fontSize: "0.9rem", marginTop: "3rem" }}>
          No personnel records match current filters.
        </p>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}>
          {filtered.map(({ slug, member }) => {
            const rankColor = rankColors[member.rank] || "#888";
            const shipName = member.shipId === "starbase"
              ? "Starbase Machida"
              : (ships[member.shipId]?.name || member.shipId || "Unassigned");

            return (
              <Link key={slug} to={`/personnel/${slug}`} style={{ textDecoration: "none" }}>
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
                      {member.species !== "Unknown" ? member.species : "—"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem 1rem" }}>
                    <div>
                      <span style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "1px", textTransform: "uppercase" }}>Position</span>
                      <p style={{ color: "#aaa", fontSize: "0.8rem", margin: "0.1rem 0 0" }}>{member.position || "—"}</p>
                    </div>
                    <div>
                      <span style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "1px", textTransform: "uppercase" }}>Assigned Ship</span>
                      <p style={{ color: "#aaa", fontSize: "0.8rem", margin: "0.1rem 0 0" }}>{shipName}</p>
                    </div>
                    <div style={{ gridColumn: "1 / -1", marginTop: "0.3rem" }}>
                      <span style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "1px", textTransform: "uppercase" }}>Player</span>
                      <p style={{ color: "#6699cc", fontSize: "0.78rem", margin: "0.1rem 0 0" }}>
                        {member.ownerEmail || "Unassigned"}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
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
