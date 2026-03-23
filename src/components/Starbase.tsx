import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { subscribeToShips } from "../utils/shipsFirestore";
import { subscribeToShipCrew, createCharacter } from "../utils/crewFirestore";
import { isAdmin } from "../utils/adminAuth";
import { getAuth } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { createForumThread } from "../server/forum/forumService";
import type { ShipData, CrewMember } from "../types/fleet";
import "../assets/lcars.css";

const STARBASE_ID = "starbase";
const FLEET_COMMAND_RANKS = ["Fleet Admiral", "Admiral"];
const CAPTAIN_RANKS = ["Captain", "Commanding Officer", "Acting Captain", "Acting Commanding Officer", "CO"];
const CMD_DEPARTMENTS = [
  { id: "bridge", label: "Bridge" },
  { id: "engineering", label: "Engineering" },
  { id: "sickbay", label: "Sickbay" },
  { id: "tenForward", label: "Ten Forward" },
  { id: "holodeck", label: "Holodeck" },
];

const Starbase = () => {
  const [ships, setShips] = useState<Record<string, ShipData>>({});
  const [starbaseCrew, setStarbaseCrew] = useState<Record<string, CrewMember>>({});
  const navigate = useNavigate();
  const auth = getAuth();

  // Reactive auth
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  useEffect(() => {
    return auth.onAuthStateChanged((u) => setCurrentUser(u));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const userIsAdmin = currentUser ? isAdmin(currentUser.uid) : false;

  // Fleet-wide crew lookup to resolve character name + rank
  const [allCrew, setAllCrew] = useState<Record<string, CrewMember>>({});
  useEffect(() => {
    const q = query(collection(db, "crew"));
    return onSnapshot(q, (snap) => {
      const result: Record<string, CrewMember> = {};
      snap.docs.forEach((d) => { result[d.id] = d.data() as CrewMember; });
      setAllCrew(result);
    });
  }, []);

  const userCrewMember = currentUser
    ? Object.values(allCrew).find((m) => (m as any).ownerId === currentUser.uid)
    : undefined;
  const userRank: string = userCrewMember?.rank || "";
  const canTransmitFleetOrder = FLEET_COMMAND_RANKS.includes(userRank) || userIsAdmin;
  const canSubmitProposal = CAPTAIN_RANKS.includes(userRank) || canTransmitFleetOrder;

  // Proposal form state
  const [showProposal, setShowProposal] = useState(false);
  const [propStardate, setPropStardate] = useState("");
  const [propShip, setPropShip] = useState("");
  const [propReqName, setPropReqName] = useState("");
  const [propReqRank, setPropReqRank] = useState("");
  const [propReqDept, setPropReqDept] = useState("");
  const [propObjective, setPropObjective] = useState("");
  const [propMethod, setPropMethod] = useState("");
  const [propRisks, setPropRisks] = useState("");
  const [propPower, setPropPower] = useState("");
  const [propRecommendation, setPropRecommendation] = useState("");
  const [propSending, setPropSending] = useState(false);

  // Existing proposals subscription
  const [proposals, setProposals] = useState<any[]>([]);
  useEffect(() => {
    const q = query(
      collection(db, "forum"),
      where("shipId", "==", STARBASE_ID),
      where("category", "==", "proposals"),
    );
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => {
        const at = a.createdAt?.toMillis?.() ?? 0;
        const bt = b.createdAt?.toMillis?.() ?? 0;
        return bt - at;
      });
      setProposals(docs);
    });
  }, []);

  // Fleet Command Console modal state
  const [showConsole, setShowConsole] = useState(false);
  const [cmdShip, setCmdShip] = useState("");
  const [cmdDept, setCmdDept] = useState("bridge");
  const [cmdTitle, setCmdTitle] = useState("");
  const [cmdMessage, setCmdMessage] = useState("");
  const [cmdSending, setCmdSending] = useState(false);

  const shipEntries = Object.entries(ships).map(([id, s]) => ({ id, name: s.name })).filter((s) => s.name);

  useEffect(() => {
    const unsubShips = subscribeToShips((loadedShips) => {
      setShips(loadedShips);
      // Set default ship selection on first load
      setCmdShip((prev) => prev || Object.keys(loadedShips)[0] || "");
    });

    const unsubscribe = subscribeToShipCrew(STARBASE_ID, (data) => setStarbaseCrew(data));
    return () => { unsubShips(); unsubscribe(); };
  }, []);

  const starbaseCrewEntries = Object.entries(starbaseCrew);

  const handleAddStarbaseCrew = async () => {
    const slug = `crew-${Date.now()}`;
    const newMember: CrewMember = {
      name: "New Crew Member",
      rank: "Ensign",
      position: "Unassigned",
      species: "Unknown",
      shipId: STARBASE_ID,
      attributes: { Fitness: null, Coordination: null, Presence: null, Intellect: null, PSI: null },
      advantages: [],
      disadvantages: [],
      skills: [],
      notes: "",
      biography: "",
      portrait: "",
      awards: [],
      ownerId: userIsAdmin ? null : (currentUser?.uid ?? null),
      ownerEmail: userIsAdmin ? null : (currentUser?.email ?? null),
      status: userIsAdmin ? "active" : "pending",
    };
    await createCharacter(slug, newMember);
    navigate(`/crew/${slug}?edit=true`);
  };

  const handleTransmitFleetOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdShip || !cmdTitle.trim() || !cmdMessage.trim() || !canTransmitFleetOrder) return;
    setCmdSending(true);
    try {
      await createForumThread({
        shipId: cmdShip,
        category: cmdDept as any,
        title: cmdTitle.trim(),
        content: cmdMessage.trim(),
        author: userCrewMember?.name || currentUser?.email || "Starbase Command",
        rank: userRank,
        source: "starbase",
        type: "command",
      } as any);
      setCmdTitle("");
      setCmdMessage("");
      setShowConsole(false);
    } catch (err) {
      console.error("Failed to transmit fleet order:", err);
    }
    setCmdSending(false);
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitProposal || !propObjective.trim() || !propMethod.trim()) return;
    setPropSending(true);
    try {
      const content = [
        `STARDATE: ${propStardate || "—"}`,
        `FROM: ${userRank} ${userCrewMember?.name || currentUser?.email || "Unknown"} — ${propShip || "—"}`,
        ``,
        `REQUESTING OFFICER`,
        `  Rank: ${propReqRank || "—"}`,
        `  Name: ${propReqName || "—"}`,
        `  Department: ${propReqDept || "—"}`,
        ``,
        `OBJECTIVE`,
        propObjective.trim(),
        ``,
        `PROPOSED METHOD`,
        propMethod.trim(),
        ``,
        `RISKS & LIMITATIONS`,
        propRisks.trim() || "None specified.",
        ``,
        `POWER / RESOURCE IMPACT`,
        propPower.trim() || "Not assessed.",
        ``,
        `CAPTAIN'S RECOMMENDATION`,
        propRecommendation.trim() || "—",
      ].join("\n");

      const title = `PROPOSAL — ${propObjective.trim().slice(0, 60)}${propObjective.trim().length > 60 ? "…" : ""}`;

      await createForumThread({
        shipId: STARBASE_ID,
        category: "proposals",
        title,
        content,
        author: `${userRank} ${userCrewMember?.name || currentUser?.email || "Unknown"}`,
        rank: userRank,
        source: "captain",
        type: "proposal",
      } as any);

      setPropStardate(""); setPropShip(""); setPropReqName(""); setPropReqRank("");
      setPropReqDept(""); setPropObjective(""); setPropMethod(""); setPropRisks("");
      setPropPower(""); setPropRecommendation("");
      setShowProposal(false);
    } catch (err) {
      console.error("Failed to submit proposal:", err);
    }
    setPropSending(false);
  };

  const modalInputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#0a0a0a",
    border: "1px solid #ff990040",
    borderRadius: "4px",
    color: "#ccc",
    padding: "0.5rem 0.75rem",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.8rem",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#666",
    fontSize: "0.58rem",
    letterSpacing: "2px",
    textTransform: "uppercase",
    marginBottom: "0.35rem",
  };

  return (
    <div className="lcars-container">
      <h1 className="lcars-header">Starbase Machida — Command Center</h1>

      {/* Fleet Command Console button */}
      {canTransmitFleetOrder && (
        <div style={{ marginBottom: "1.5rem", textAlign: "right" }}>
          <button
            onClick={() => setShowConsole(true)}
            style={{
              backgroundColor: "#ff990020",
              border: "1px solid #ff9900",
              borderRadius: "20px",
              color: "#ff9900",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.65rem",
              letterSpacing: "1.5px",
              padding: "0.35rem 1rem",
              cursor: "pointer",
            }}
          >
            ⚡ FLEET COMMAND CONSOLE
          </button>
        </div>
      )}

      <div className="lcars-panel">
        <h2>Mission Logs</h2>
        <p>Latest starship and planetary mission logs will appear here.</p>
        <Link to="/missionlogs">View All Logs</Link>
      </div>

      <div className="lcars-panel">
        <h2>Docked Ships</h2>
        {Object.entries(ships).map(([slug, ship]) => (
          <p key={slug}>
            <Link to={`/ship/${slug}`} style={{ color: "#000", textDecoration: "underline" }}>
              {ship.name}
            </Link>
            {" "}({ship.registry}) — {ship.status}
          </p>
        ))}
      </div>

      <div className="lcars-panel">
        <h2>Starbase Crew Roster</h2>
        {starbaseCrewEntries.length > 0 ? (
          starbaseCrewEntries.map(([slug, member]) => (
            <p key={slug} style={{ margin: "0.25rem 0" }}>
              <Link to={`/crew/${slug}`} style={{ color: "#000", textDecoration: "underline" }}>
                {member.rank} {member.name}
              </Link>
              {" "}— {member.position}
            </p>
          ))
        ) : (
          <p>No starbase personnel on file.</p>
        )}
        <button
          onClick={handleAddStarbaseCrew}
          style={{
            marginTop: "0.75rem",
            background: "#33cc99",
            color: "#000",
            border: "none",
            borderRadius: "15px",
            padding: "0.4rem 1.2rem",
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: "bold",
            fontSize: "0.75rem",
            letterSpacing: "1px",
            cursor: "pointer",
          }}
        >
          + ADD STARBASE CREW
        </button>
      </div>

      <div className="lcars-panel">
        <h2>Resource Status</h2>
        <p>Energy reserves: 92%</p>
        <p>Medical supplies: Fully stocked</p>
      </div>

      {/* Command Review — Proposals */}
      <div style={{
        backgroundColor: "#0d0a00",
        border: "1px solid #cc990040",
        borderLeft: "4px solid #cc9900",
        borderRadius: "4px",
        marginBottom: "1.5rem",
        padding: "1.25rem 1.5rem",
        fontFamily: "'Orbitron', sans-serif",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <p style={{ color: "#cc990080", fontSize: "0.55rem", letterSpacing: "3px", textTransform: "uppercase", margin: "0 0 0.2rem" }}>Starbase Machida</p>
            <h2 style={{ color: "#cc9900", fontSize: "0.95rem", margin: 0, letterSpacing: "2px" }}>COMMAND REVIEW — PROPOSALS</h2>
          </div>
          {canSubmitProposal && (
            <button
              onClick={() => setShowProposal(true)}
              style={{
                backgroundColor: "#cc990020",
                border: "1px solid #cc9900",
                borderRadius: "20px",
                color: "#cc9900",
                cursor: "pointer",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.62rem",
                letterSpacing: "1.5px",
                padding: "0.35rem 1rem",
              }}
            >
              + SUBMIT PROPOSAL
            </button>
          )}
          {!canSubmitProposal && (
            <span style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "1px" }}>
              Captain authorization required to submit
            </span>
          )}
        </div>

        {proposals.length === 0 ? (
          <p style={{ color: "#555", fontSize: "0.72rem", margin: 0 }}>No proposals on record.</p>
        ) : (
          proposals.map((p: any) => (
            <div key={p.id} style={{
              backgroundColor: "#0a0800",
              border: "1px solid #cc990025",
              borderLeft: "2px solid #cc990060",
              borderRadius: "2px",
              padding: "0.75rem 1rem",
              marginBottom: "0.6rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.35rem" }}>
                <span style={{ color: "#cc9900", fontSize: "0.75rem", fontWeight: "bold", letterSpacing: "0.5px" }}>{p.title}</span>
                <span style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "1px", textTransform: "uppercase" }}>{p.author}</span>
              </div>
              <pre style={{ color: "#888", fontSize: "0.68rem", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", fontFamily: "'Orbitron', sans-serif" }}>
                {p.content}
              </pre>
            </div>
          ))
        )}
      </div>

      <div className="lcars-panel">
        <h2>Community Forum</h2>
        <Link to="/forum">Enter the Forum</Link>
      </div>

      <Link to="/" className="lcars-button">Return to Star Map</Link>

      {/* Fleet Command Console Modal */}
      {showConsole && (
        <div
          onClick={() => setShowConsole(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#0d0d0d",
              border: "1px solid #ff9900",
              borderTop: "3px solid #ff9900",
              borderRadius: "4px",
              padding: "2rem",
              width: "100%",
              maxWidth: "540px",
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <p style={{ color: "#ff9900", fontSize: "0.6rem", letterSpacing: "3px", margin: "0 0 0.25rem", textTransform: "uppercase" }}>
                  Starbase Machida — Command Authority
                </p>
                <h2 style={{ color: "#fff", fontSize: "0.95rem", margin: 0, letterSpacing: "2px" }}>
                  FLEET COMMAND CONSOLE
                </h2>
              </div>
              <button
                onClick={() => setShowConsole(false)}
                style={{ background: "none", border: "none", color: "#555", fontSize: "1.25rem", cursor: "pointer", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransmitFleetOrder}>
              {/* Target Ship */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: "#666", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  Target Vessel
                </label>
                <select
                  value={cmdShip}
                  onChange={(e) => setCmdShip(e.target.value)}
                  style={{ ...modalInputStyle, cursor: "pointer" }}
                >
                  <option value="">— Select Ship —</option>
                  {shipEntries.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Target Department */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: "#666", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  Target Department
                </label>
                <select
                  value={cmdDept}
                  onChange={(e) => setCmdDept(e.target.value)}
                  style={{ ...modalInputStyle, cursor: "pointer" }}
                >
                  {CMD_DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Directive Title */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: "#666", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  Directive Title
                </label>
                <input
                  type="text"
                  value={cmdTitle}
                  onChange={(e) => setCmdTitle(e.target.value)}
                  placeholder="Enter directive title..."
                  style={modalInputStyle}
                />
              </div>

              {/* Directive Message */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", color: "#666", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  Directive Message
                </label>
                <textarea
                  value={cmdMessage}
                  onChange={(e) => setCmdMessage(e.target.value)}
                  placeholder="Enter the full fleet order..."
                  rows={5}
                  style={{ ...modalInputStyle, resize: "vertical" }}
                />
              </div>

              {/* Issuing as */}
              {userCrewMember && (
                <p style={{ color: "#444", fontSize: "0.62rem", letterSpacing: "1px", margin: "0 0 1.25rem", textTransform: "uppercase" }}>
                  Issuing as: <span style={{ color: "#ff9900" }}>{userRank} {userCrewMember.name}</span>
                </p>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowConsole(false)}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #333",
                    borderRadius: "20px",
                    color: "#666",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.65rem",
                    letterSpacing: "1.5px",
                    padding: "0.4rem 1.1rem",
                    cursor: "pointer",
                  }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={cmdSending || !cmdShip || !cmdTitle.trim() || !cmdMessage.trim()}
                  style={{
                    backgroundColor: cmdSending || !cmdShip || !cmdTitle.trim() || !cmdMessage.trim() ? "#ff990040" : "#ff9900",
                    border: "none",
                    borderRadius: "20px",
                    color: "#000",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.65rem",
                    fontWeight: "bold",
                    letterSpacing: "1.5px",
                    padding: "0.4rem 1.1rem",
                    cursor: cmdSending || !cmdShip || !cmdTitle.trim() || !cmdMessage.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {cmdSending ? "TRANSMITTING..." : "TRANSMIT FLEET ORDER"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proposal Submission Modal */}
      {showProposal && (
        <div
          onClick={() => setShowProposal(false)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#0d0a00",
              border: "1px solid #cc9900",
              borderTop: "3px solid #cc9900",
              borderRadius: "4px",
              padding: "2rem",
              width: "100%",
              maxWidth: "580px",
              maxHeight: "90vh",
              overflowY: "auto",
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <p style={{ color: "#cc990080", fontSize: "0.55rem", letterSpacing: "3px", margin: "0 0 0.2rem", textTransform: "uppercase" }}>
                  Starbase Machida — Command Review
                </p>
                <h2 style={{ color: "#fff", fontSize: "0.9rem", margin: 0, letterSpacing: "2px" }}>SUBMIT PROPOSAL</h2>
              </div>
              <button onClick={() => setShowProposal(false)} style={{ background: "none", border: "none", color: "#555", fontSize: "1.25rem", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleSubmitProposal}>

              {/* Row: Stardate + Ship */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div>
                  <label style={labelStyle}>Stardate</label>
                  <input type="text" value={propStardate} onChange={(e) => setPropStardate(e.target.value)} placeholder="e.g. 48632.4" style={modalInputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Captain's Ship</label>
                  <select value={propShip} onChange={(e) => setPropShip(e.target.value)} style={{ ...modalInputStyle, cursor: "pointer" }}>
                    <option value="">— Select Vessel —</option>
                    {shipEntries.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Requesting Officer */}
              <div style={{ backgroundColor: "#080600", border: "1px solid #cc990020", borderRadius: "4px", padding: "0.75rem", marginBottom: "0.75rem" }}>
                <p style={labelStyle}>Requesting Officer</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: "0.52rem" }}>Rank</label>
                    <input type="text" value={propReqRank} onChange={(e) => setPropReqRank(e.target.value)} placeholder="Lieutenant" style={modalInputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: "0.52rem" }}>Name</label>
                    <input type="text" value={propReqName} onChange={(e) => setPropReqName(e.target.value)} placeholder="Full name" style={modalInputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: "0.52rem" }}>Department</label>
                    <input type="text" value={propReqDept} onChange={(e) => setPropReqDept(e.target.value)} placeholder="Engineering" style={modalInputStyle} />
                  </div>
                </div>
              </div>

              {/* Objective */}
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={labelStyle}>Objective <span style={{ color: "#cc3333" }}>*</span></label>
                <textarea value={propObjective} onChange={(e) => setPropObjective(e.target.value)} placeholder="Describe the goal or desired outcome..." rows={2} style={{ ...modalInputStyle, resize: "vertical" }} required />
              </div>

              {/* Proposed Method */}
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={labelStyle}>Proposed Method <span style={{ color: "#cc3333" }}>*</span></label>
                <textarea value={propMethod} onChange={(e) => setPropMethod(e.target.value)} placeholder="Describe the approach, resources, and steps..." rows={3} style={{ ...modalInputStyle, resize: "vertical" }} required />
              </div>

              {/* Risks + Power (side by side) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div>
                  <label style={labelStyle}>Risks & Limitations</label>
                  <textarea value={propRisks} onChange={(e) => setPropRisks(e.target.value)} placeholder="Known risks or constraints..." rows={3} style={{ ...modalInputStyle, resize: "vertical" }} />
                </div>
                <div>
                  <label style={labelStyle}>Power / Resource Impact</label>
                  <textarea value={propPower} onChange={(e) => setPropPower(e.target.value)} placeholder="Estimated resource requirements..." rows={3} style={{ ...modalInputStyle, resize: "vertical" }} />
                </div>
              </div>

              {/* Captain's Recommendation */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={labelStyle}>Captain's Recommendation</label>
                <textarea value={propRecommendation} onChange={(e) => setPropRecommendation(e.target.value)} placeholder="Your assessment and recommendation to Command..." rows={3} style={{ ...modalInputStyle, resize: "vertical" }} />
              </div>

              {/* Issuing as */}
              {userCrewMember && (
                <p style={{ color: "#444", fontSize: "0.62rem", letterSpacing: "1px", margin: "0 0 1.25rem", textTransform: "uppercase" }}>
                  Submitting as: <span style={{ color: "#cc9900" }}>{userRank} {userCrewMember.name}</span>
                </p>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowProposal(false)}
                  style={{ backgroundColor: "transparent", border: "1px solid #333", borderRadius: "20px", color: "#666", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", letterSpacing: "1.5px", padding: "0.4rem 1.1rem", cursor: "pointer" }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={propSending || !propObjective.trim() || !propMethod.trim()}
                  style={{
                    backgroundColor: propSending || !propObjective.trim() || !propMethod.trim() ? "#cc990040" : "#cc9900",
                    border: "none",
                    borderRadius: "20px",
                    color: "#000",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.65rem",
                    fontWeight: "bold",
                    letterSpacing: "1.5px",
                    padding: "0.4rem 1.1rem",
                    cursor: propSending || !propObjective.trim() || !propMethod.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {propSending ? "TRANSMITTING..." : "SUBMIT TO COMMAND"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Starbase;
