import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { isAdmin } from "../utils/adminAuth";
import {
  subscribeMissions,
  generateAndStoreMission,
  updateMissionStatus,
  assignMissionToShip,
  deleteMission,
  seedStarterMissions,
} from "../server/routes/missions";
import { getShips } from "../utils/gameData";
import { createMissionThread } from "../server/forum/forumService";
import { starterMissions } from "../data/starterMissions";
import { MISSION_TYPES } from "../data/missionTemplates";
import type { Mission, MissionStatus } from "../types/mission";
import "../assets/lcars.css";

const STATUS_COLOR: Record<MissionStatus, string> = {
  active:    "#33cc99",
  pending:   "#F5B942",
  completed: "#6699cc",
  failed:    "#cc3333",
};

const MissionBoard = () => {
  const [visible, setVisible] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [filter, setFilter] = useState<MissionStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [shipEntries] = useState<{ id: string; name: string }[]>(() =>
    Object.entries(getShips()).map(([id, s]) => ({ id, name: s.name })).filter((s) => s.name)
  );
  const [generating, setGenerating] = useState(false);
  const [genType, setGenType] = useState("");
  const [genSystem, setGenSystem] = useState("");

  const [userIsAdmin, setUserIsAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    // onAuthStateChanged so admin status is reactive, not a stale snapshot
    return auth.onAuthStateChanged((u) => setUserIsAdmin(u ? isAdmin(u.uid) : false));
  }, []);

  useEffect(() => {
    const unsub = subscribeMissions(setMissions);
    const timer = setTimeout(() => setVisible(true), 50);
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  const displayed = filter === "all"
    ? missions
    : missions.filter((m) => m.status === filter);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateAndStoreMission(genType || undefined, genSystem || undefined);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
    setGenType("");
    setGenSystem("");
  };

  const handleSeed = async () => {
    const n = await seedStarterMissions(starterMissions, true);
    alert(`${n} starter missions seeded.`);
  };

  const handleAssignShip = async (m: Mission, shipId: string) => {
    await assignMissionToShip(m.id!, shipId);
    if (!shipId) return;
    await createMissionThread(m, shipId);
  };


  const inputStyle: React.CSSProperties = {
    backgroundColor: "#0a0a0a",
    border: "1px solid #6699cc40",
    borderRadius: "4px",
    color: "#ccc",
    padding: "0.4rem 0.65rem",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.78rem",
  };

  return (
    <div style={{
      maxWidth: "960px",
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
        <div style={{ flex: 1, backgroundColor: "#6699cc", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem" }}>
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.3rem", fontWeight: "bold", letterSpacing: "3px" }}>
            MISSION OPERATIONS BOARD
          </h1>
          <span style={{ color: "#00000070", fontSize: "0.7rem", letterSpacing: "1px" }}>
            {missions.length} MISSION{missions.length !== 1 ? "S" : ""} ON RECORD
          </span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Filter + Admin bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {(["all", "active", "pending", "completed", "failed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                backgroundColor: filter === s ? "#6699cc" : "transparent",
                border: `1px solid ${filter === s ? "#6699cc" : "#333"}`,
                borderRadius: "20px",
                color: filter === s ? "#000" : "#666",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.65rem",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                padding: "0.3rem 0.9rem",
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {userIsAdmin && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <select value={genType} onChange={(e) => setGenType(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Random type</option>
              {MISSION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            <input
              value={genSystem}
              onChange={(e) => setGenSystem(e.target.value)}
              placeholder="System name"
              style={{ ...inputStyle, width: "120px" }}
            />
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                backgroundColor: "#9933cc",
                border: "none",
                borderRadius: "20px",
                color: "#fff",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.65rem",
                letterSpacing: "1.5px",
                padding: "0.35rem 0.9rem",
                cursor: "pointer",
                opacity: generating ? 0.5 : 1,
              }}
            >
              {generating ? "GENERATING..." : "GENERATE"}
            </button>
            <button
              onClick={handleSeed}
              style={{
                backgroundColor: "transparent",
                border: "1px solid #33cc9960",
                borderRadius: "20px",
                color: "#33cc99",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.65rem",
                letterSpacing: "1.5px",
                padding: "0.35rem 0.9rem",
                cursor: "pointer",
              }}
            >
              SEED STARTERS
            </button>
          </div>
        )}
      </div>

      {/* Mission list */}
      {displayed.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#444", fontSize: "0.85rem" }}>
          {missions.length === 0
            ? "No missions on record. Seed starter missions or generate one."
            : "No missions match the selected filter."}
        </div>
      )}

      {displayed.map((m) => {
        const isOpen = expanded === m.id;
        const sc = STATUS_COLOR[m.status];
        return (
          <div key={m.id} style={{
            backgroundColor: "#111",
            border: `1px solid ${isOpen ? "#6699cc" : "#222"}`,
            borderLeft: `3px solid ${sc}`,
            borderRadius: "4px",
            marginBottom: "0.75rem",
            overflow: "hidden",
          }}>
            {/* Header row — always visible */}
            <div
              onClick={() => setExpanded(isOpen ? null : m.id!)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.9rem 1.25rem", cursor: "pointer", gap: "1rem" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "#fff", fontSize: "0.88rem", fontWeight: "bold", margin: 0, letterSpacing: "0.5px" }}>{m.title}</p>
                <p style={{ color: "#555", fontSize: "0.7rem", margin: "0.2rem 0 0" }}>
                  {m.system} · <span style={{ color: sc, textTransform: "uppercase", letterSpacing: "1px" }}>{m.status}</span>
                  {(m.shipId || m.assignedShip) && (
                    <span style={{ marginLeft: "0.75rem", color: "#9933cc" }}>
                      ⬡ {m.shipId ? (getShips()[m.shipId]?.name || m.shipId) : m.assignedShip}
                    </span>
                  )}
                  {m.stardate && <span style={{ marginLeft: "0.75rem", color: "#444" }}>SD {m.stardate}</span>}
                </p>
              </div>
              <span style={{ color: "#555", fontSize: "0.75rem", flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{ padding: "0 1.25rem 1.25rem", borderTop: "1px solid #1a1a1a" }}>
                <p style={{ color: "#aaa", fontSize: "0.85rem", lineHeight: 1.7, margin: "1rem 0 1rem" }}>
                  {m.briefing}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>Objectives</span>
                    <ul style={{ margin: "0.5rem 0 0", padding: 0, listStyle: "none" }}>
                      {m.objectives.map((obj, i) => (
                        <li key={i} style={{ color: "#aaa", fontSize: "0.78rem", lineHeight: 1.7, display: "flex", gap: "0.5rem" }}>
                          <span style={{ color: "#6699cc", flexShrink: 0 }}>›</span>{obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>Possible Outcomes</span>
                    <ul style={{ margin: "0.5rem 0 0", padding: 0, listStyle: "none" }}>
                      {m.possibleOutcomes.map((o, i) => (
                        <li key={i} style={{ color: "#888", fontSize: "0.75rem", lineHeight: 1.7, display: "flex", gap: "0.5rem" }}>
                          <span style={{ color: "#9933cc", flexShrink: 0 }}>›</span>{o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  <div style={{ backgroundColor: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "4px", padding: "0.6rem 0.9rem", flex: 1 }}>
                    <span style={{ color: "#555", fontSize: "0.62rem", letterSpacing: "1px", textTransform: "uppercase" }}>Complication</span>
                    <p style={{ color: "#F5B942", fontSize: "0.78rem", margin: "0.2rem 0 0" }}>{m.complication}</p>
                  </div>
                  <div style={{ backgroundColor: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "4px", padding: "0.6rem 0.9rem", flex: 1 }}>
                    <span style={{ color: "#555", fontSize: "0.62rem", letterSpacing: "1px", textTransform: "uppercase" }}>Discovery</span>
                    <p style={{ color: "#33cc99", fontSize: "0.78rem", margin: "0.2rem 0 0" }}>{m.discovery}</p>
                  </div>
                </div>

                {userIsAdmin && (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem", alignItems: "center" }}>
                    {/* Ship assignment */}
                    <select
                      value={m.shipId || ""}
                      onChange={(e) => handleAssignShip(m, e.target.value)}
                      style={{
                        backgroundColor: "#0a0a0a",
                        border: "1px solid #9933cc60",
                        borderRadius: "20px",
                        color: m.shipId ? "#9933cc" : "#555",
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: "0.62rem",
                        letterSpacing: "1px",
                        padding: "0.25rem 0.65rem",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">— Assign Ship —</option>
                      {shipEntries.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {(["active", "pending", "completed", "failed"] as MissionStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateMissionStatus(m.id!, s)}
                        style={{
                          backgroundColor: m.status === s ? STATUS_COLOR[s] + "30" : "transparent",
                          border: `1px solid ${STATUS_COLOR[s]}60`,
                          borderRadius: "20px",
                          color: STATUS_COLOR[s],
                          fontFamily: "'Orbitron', sans-serif",
                          fontSize: "0.62rem",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          padding: "0.25rem 0.65rem",
                          cursor: "pointer",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                    <button
                      onClick={() => { if (confirm(`Delete "${m.title}"?`)) deleteMission(m.id!); }}
                      style={{ backgroundColor: "transparent", border: "1px solid #cc333360", borderRadius: "20px", color: "#cc6666", fontFamily: "'Orbitron', sans-serif", fontSize: "0.62rem", letterSpacing: "1px", padding: "0.25rem 0.65rem", cursor: "pointer" }}
                    >
                      DELETE
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px", marginTop: "2rem" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link to="/" style={{ flex: 1, backgroundColor: "#6699cc", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", textDecoration: "none", letterSpacing: "2px", fontSize: "0.85rem" }}>
          RETURN TO STAR MAP
        </Link>
        <div style={{ width: "20px", backgroundColor: "#6699cc", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default MissionBoard;
