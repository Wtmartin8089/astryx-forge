import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase/firebaseConfig";
import { subscribeToShips } from "../utils/shipsFirestore";
import { updateCharacter } from "../utils/crewFirestore";
import { isAdmin } from "../utils/adminAuth";
import type { CrewMember, ShipData, ServiceHistoryEntry, AssignmentType } from "../types/fleet";
import starfleetDecorations from "../data/starfleetDecorations";
import "../assets/lcars.css";

const rankColors: Record<string, string> = {
  "Captain": "#ff9900",
  "Commander": "#cc6666",
  "Lt. Commander": "#ffcc33",
  "Full Lieutenant": "#ffcc33",
  "Ensign": "#6699cc",
};

import { getCampaignStardate } from "../utils/campaignStardate";
function currentStardate(): string { return getCampaignStardate(); }

type Message = {
  id: string;
  fromCharacter: string;
  toCharacter: string;
  message: string;
  stardate: string;
  createdAt: any;
};

const PersonnelProfile = () => {
  const { id } = useParams();
  const [visible, setVisible] = useState(false);
  const [member, setMember] = useState<CrewMember | null>(null);
  const [ships, setShips] = useState<Record<string, ShipData>>({});
  const [messages, setMessages] = useState<Message[]>([]);

  // Send message modal state
  const [showModal, setShowModal] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  // Assignment editing state
  const [editingAssignment, setEditingAssignment] = useState(false);
  const [editAssignmentType, setEditAssignmentType] = useState<AssignmentType>("unassigned");
  const [editAssignmentId, setEditAssignmentId] = useState<string>("");
  const [savingAssignment, setSavingAssignment] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;
  const userIsAdmin = user ? isAdmin(user.uid) : false;
  const canEditAssignment = member !== null && user !== null && (user.uid === member.ownerId || userIsAdmin);

  useEffect(() => {
    if (!id) return;
    const unsubShips = subscribeToShips(setShips);

    const unsub = onSnapshot(doc(db, "crew", id), (snap) => {
      setMember(snap.exists() ? (snap.data() as CrewMember) : null);
    });

    const msgQ = query(
      collection(db, "character_messages"),
      where("toCharacter", "==", id),
      orderBy("createdAt", "desc")
    );
    const unsubMsg = onSnapshot(msgQ, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    });

    const timer = setTimeout(() => setVisible(true), 50);
    return () => { unsubShips(); unsub(); unsubMsg(); clearTimeout(timer); };
  }, [id]);

  // Sync edit state when member loads or changes
  useEffect(() => {
    if (member) {
      setEditAssignmentType(resolveAssignmentType(member));
      setEditAssignmentId(resolveAssignmentId(member) || "");
    }
  }, [member]);

  function resolveAssignmentType(m: CrewMember): AssignmentType {
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || !id) return;
    setSending(true);
    setSendError("");
    try {
      await addDoc(collection(db, "character_messages"), {
        fromCharacter: user?.email || user?.uid || "Anonymous",
        toCharacter: id,
        message: msgText.trim(),
        stardate: currentStardate(),
        createdAt: serverTimestamp(),
      });
      setMsgText("");
      setShowModal(false);
    } catch {
      setSendError("Transmission failed. Check your connection.");
    }
    setSending(false);
  };

  const handleSaveAssignment = async () => {
    if (!id || !member) return;
    setSavingAssignment(true);
    try {
      const updates: Partial<CrewMember> = {
        assignmentType: editAssignmentType,
        assignmentId: editAssignmentType === "unassigned" ? null : editAssignmentId || null,
      };
      // Keep shipId in sync for backward compatibility
      if (editAssignmentType === "starbase") {
        updates.shipId = "starbase";
      } else if (editAssignmentType === "ship") {
        updates.shipId = editAssignmentId || "";
      } else {
        updates.shipId = "";
      }
      await updateCharacter(id, updates);
      setEditingAssignment(false);
    } catch (err) {
      console.error("Failed to update assignment:", err);
    }
    setSavingAssignment(false);
  };

  if (!member) {
    return (
      <div style={{ color: "#ff9900", textAlign: "center", marginTop: "4rem", fontFamily: "'Orbitron', sans-serif" }}>
        <p style={{ fontSize: "1.3rem" }}>Accessing personnel record...</p>
        {member === null && id && (
          <p style={{ color: "#6699cc", marginTop: "1rem" }}>Record not found in Starfleet database.</p>
        )}
        <Link to="/personnel" style={{ color: "#9933cc", marginTop: "2rem", display: "inline-block" }}>
          Return to Personnel Database
        </Link>
      </div>
    );
  }

  const rankColor = rankColors[member.rank] || "#888";
  const assignmentLabel = getAssignmentLabel(member);

  const inputStyleBase: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#0a0a0a",
    border: "1px solid #6699cc40",
    borderRadius: "6px",
    color: "#ccc",
    padding: "0.75rem",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.85rem",
    boxSizing: "border-box",
  };

  const selectEditStyle: React.CSSProperties = {
    ...inputStyleBase,
    cursor: "pointer",
  };

  return (
    <div style={{
      maxWidth: "900px",
      margin: "0 auto",
      padding: "2rem",
      fontFamily: "'Orbitron', sans-serif",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : "translateX(-30px)",
      transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
    }}>

      {/* LCARS Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "50px" }}>
        <div style={{ width: "20px", backgroundColor: rankColor, borderRadius: "20px 0 0 0" }} />
        <div style={{
          flex: 1,
          backgroundColor: rankColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2rem",
        }}>
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.4rem", fontWeight: "bold", letterSpacing: "3px" }}>
            STARFLEET PERSONNEL FILE
          </h1>
          <span style={{ color: "#00000070", fontSize: "0.7rem", letterSpacing: "1px" }}>
            SD {currentStardate()}
          </span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Identity Block */}
      <div style={{
        backgroundColor: "#111",
        border: `2px solid ${rankColor}40`,
        borderLeft: `4px solid ${rankColor}`,
        borderRadius: "0 20px 0 0",
        padding: "2rem",
        marginBottom: "1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: "1.5rem",
      }}>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
          {/* Portrait */}
          <img
            src={member.portrait?.trim() || "/portraits/default.svg"}
            alt={member.name}
            className="character-portrait"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/portraits/default.svg"; }}
            style={{
              width: "200px",
              height: "auto",
              objectFit: "cover",
              borderRadius: "4px",
              border: `2px solid ${rankColor}40`,
              flexShrink: 0,
              backgroundColor: "#0a0a0a",
            }}
          />
          <div>
            <p style={{ color: rankColor, fontSize: "0.7rem", margin: "0 0 0.4rem", letterSpacing: "2px", textTransform: "uppercase" }}>
              {member.rank}
            </p>
            <h2 style={{ color: "#fff", fontSize: "2rem", margin: "0 0 0.5rem", fontWeight: "bold" }}>
              {member.name}
            </h2>
            <p style={{ color: "#aaa", fontSize: "0.9rem", margin: 0 }}>
              {member.species} · {member.position}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-end" }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              backgroundColor: rankColor,
              color: "#000",
              border: "none",
              borderRadius: "20px",
              padding: "0.6rem 1.5rem",
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: "bold",
              fontSize: "0.78rem",
              letterSpacing: "1.5px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            SEND MESSAGE
          </button>
          {member.ownerEmail && (
            <span style={{ color: "#6699cc", fontSize: "0.7rem", letterSpacing: "1px" }}>
              Player: {member.ownerEmail}
            </span>
          )}
        </div>
      </div>

      {/* Service Details */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1rem",
        marginBottom: "1.5rem",
      }}>
        {[
          { label: "Species", value: member.species },
          { label: "Rank", value: member.rank },
          {
            label: "Position",
            value: member.rank === "Fleet Admiral"
              ? "Fleet Commander"
              : member.position,
          },
          { label: "Assignment", value: assignmentLabel },
        ].map(({ label, value }) => (
          <div key={label} style={{
            backgroundColor: "#111",
            border: "1px solid #222",
            borderRadius: "4px",
            padding: "1rem 1.25rem",
          }}>
            <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>{label}</span>
            <p style={{ color: "#eee", fontSize: "0.95rem", margin: "0.3rem 0 0", fontWeight: "bold" }}>{value || "\u2014"}</p>
          </div>
        ))}
      </div>

      {/* Assignment Edit Section */}
      {canEditAssignment && (
        <div style={{
          backgroundColor: "#111",
          border: "1px solid #33cc9940",
          borderRadius: "4px",
          padding: "1.25rem",
          marginBottom: "1.5rem",
        }}>
          {!editingAssignment ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#33cc99", fontSize: "0.7rem", letterSpacing: "2px", textTransform: "uppercase" }}>
                Assignment Management
              </span>
              <button
                onClick={() => setEditingAssignment(true)}
                style={{
                  backgroundColor: "#33cc99",
                  color: "#000",
                  border: "none",
                  borderRadius: "20px",
                  padding: "0.4rem 1rem",
                  fontFamily: "'Orbitron', sans-serif",
                  fontWeight: "bold",
                  fontSize: "0.7rem",
                  letterSpacing: "1px",
                  cursor: "pointer",
                }}
              >
                EDIT ASSIGNMENT
              </button>
            </div>
          ) : (
            <div>
              <span style={{ color: "#33cc99", fontSize: "0.7rem", letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: "1rem" }}>
                Edit Assignment
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label style={{ color: "#888", fontSize: "0.65rem", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>
                    Assignment Type
                  </label>
                  <select
                    value={editAssignmentType}
                    onChange={(e) => {
                      const val = e.target.value as AssignmentType;
                      setEditAssignmentType(val);
                      if (val === "starbase") setEditAssignmentId("starbase-machida");
                      else if (val === "unassigned") setEditAssignmentId("");
                    }}
                    style={selectEditStyle}
                  >
                    <option value="ship">Ship</option>
                    <option value="starbase">Starbase</option>
                    <option value="unassigned">Unassigned</option>
                  </select>
                </div>

                {editAssignmentType === "ship" && (
                  <div>
                    <label style={{ color: "#888", fontSize: "0.65rem", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>
                      Ship Assignment
                    </label>
                    <select
                      value={editAssignmentId}
                      onChange={(e) => setEditAssignmentId(e.target.value)}
                      style={selectEditStyle}
                    >
                      <option value="">Select a ship...</option>
                      {Object.entries(ships).map(([slug, s]) => (
                        <option key={slug} value={slug}>
                          {s.name} ({s.registry})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                  <button
                    onClick={() => {
                      setEditingAssignment(false);
                      if (member) {
                        setEditAssignmentType(resolveAssignmentType(member));
                        setEditAssignmentId(resolveAssignmentId(member) || "");
                      }
                    }}
                    style={{
                      backgroundColor: "transparent",
                      border: "1px solid #444",
                      borderRadius: "20px",
                      color: "#888",
                      padding: "0.4rem 1rem",
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                    }}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleSaveAssignment}
                    disabled={savingAssignment}
                    style={{
                      backgroundColor: "#33cc99",
                      color: "#000",
                      border: "none",
                      borderRadius: "20px",
                      padding: "0.4rem 1rem",
                      fontFamily: "'Orbitron', sans-serif",
                      fontWeight: "bold",
                      fontSize: "0.7rem",
                      letterSpacing: "1px",
                      cursor: savingAssignment ? "not-allowed" : "pointer",
                      opacity: savingAssignment ? 0.5 : 1,
                    }}
                  >
                    {savingAssignment ? "SAVING..." : "SAVE ASSIGNMENT"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Biography */}
      <div style={{
        backgroundColor: "#111",
        border: "1px solid #333",
        borderRadius: "4px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}>
        <h3 style={{ color: rankColor, fontSize: "0.75rem", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 1rem" }}>
          Biographical Information
        </h3>
        <p style={{ color: "#aaa", fontSize: "0.9rem", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
          {member.biography?.trim() || "No biography available."}
        </p>
      </div>

      {/* Service Record */}
      <div style={{
        backgroundColor: "#111",
        border: "1px solid #333",
        borderRadius: "4px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}>
        <h3 style={{ color: rankColor, fontSize: "0.75rem", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 1rem" }}>
          Service Record
        </h3>
        {member.serviceRecord && member.serviceRecord.length > 0 ? (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {member.serviceRecord.map((entry, i) => (
              <li key={i} style={{
                color: "#aaa",
                fontSize: "0.9rem",
                lineHeight: 1.8,
                display: "flex",
                gap: "0.6rem",
                alignItems: "baseline",
              }}>
                <span style={{ color: rankColor, flexShrink: 0 }}>&bull;</span>
                {entry}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#aaa", fontSize: "0.9rem", margin: 0 }}>
            No service record available.
          </p>
        )}
      </div>

      {/* Service History Timeline */}
      {member.serviceHistory && member.serviceHistory.length > 0 && (
        <div style={{
          backgroundColor: "#111",
          border: "1px solid #333",
          borderRadius: "4px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}>
          <h3 style={{ color: rankColor, fontSize: "0.75rem", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 1.25rem" }}>
            Service History
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[...(member.serviceHistory as ServiceHistoryEntry[])].sort((a, b) => a.year - b.year).map((entry, i) => (
              <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                {/* Timeline spine */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: rankColor,
                    marginTop: "0.35rem",
                    flexShrink: 0,
                  }} />
                  {i < (member.serviceHistory as ServiceHistoryEntry[]).length - 1 && (
                    <div style={{ width: "2px", flex: 1, backgroundColor: `${rankColor}30`, minHeight: "1.5rem" }} />
                  )}
                </div>
                {/* Entry content */}
                <div style={{ paddingBottom: "1.1rem" }}>
                  <span style={{
                    color: rankColor,
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                    letterSpacing: "1px",
                    display: "block",
                    marginBottom: "0.2rem",
                  }}>
                    {entry.year}
                  </span>
                  <p style={{ color: "#aaa", fontSize: "0.88rem", margin: 0, lineHeight: 1.5 }}>
                    {entry.event}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Starfleet Decorations */}
      <div style={{
        backgroundColor: "#111",
        border: "1px solid #333",
        borderRadius: "4px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}>
        <h3 style={{ color: rankColor, fontSize: "0.75rem", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 1.25rem" }}>
          Starfleet Decorations
        </h3>
        {member.awards && member.awards.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {member.awards.map((award, i) => {
              const def = starfleetDecorations.find((d) => d.id === award.awardId);
              if (!def) return null;
              return (
                <div key={i} style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                  backgroundColor: "#0a0a0a",
                  border: `1px solid ${rankColor}20`,
                  borderRadius: "6px",
                  padding: "1rem",
                }}>
                  <img
                    src={def.image}
                    alt={def.name}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/awards/placeholder.svg"; }}
                    style={{
                      width: "64px",
                      height: "64px",
                      objectFit: "contain",
                      borderRadius: "4px",
                      border: `1px solid ${rankColor}30`,
                      backgroundColor: "#111",
                      padding: "4px",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: rankColor, fontSize: "0.82rem", fontWeight: "bold", margin: "0 0 0.3rem", letterSpacing: "0.5px" }}>
                      {def.name}
                    </p>
                    <p style={{ color: "#aaa", fontSize: "0.82rem", margin: "0 0 0.5rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {award.citation}
                    </p>
                    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                      <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1px" }}>
                        AWARDED BY: <span style={{ color: "#777" }}>{award.awardedBy}</span>
                      </span>
                      <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1px" }}>
                        SD {award.stardate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: "#aaa", fontSize: "0.9rem", margin: 0 }}>
            No decorations awarded.
          </p>
        )}
      </div>

      {/* Notes */}
      {member.notes && (
        <div style={{
          backgroundColor: "#111",
          border: "1px solid #333",
          borderRadius: "4px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}>
          <h3 style={{ color: rankColor, fontSize: "0.75rem", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 1rem" }}>
            Personnel Notes
          </h3>
          <p style={{ color: "#aaa", fontSize: "0.9rem", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
            {member.notes}
          </p>
        </div>
      )}

      {/* Service History & Profile (skills, advantages, disadvantages) */}
      {(member.skills.length > 0 || member.advantages.length > 0 || member.disadvantages.length > 0) && (
        <div style={{
          backgroundColor: "#111",
          border: "1px solid #333",
          borderRadius: "4px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}>
          <h3 style={{ color: rankColor, fontSize: "0.75rem", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 1.25rem" }}>
            Service History &amp; Profile
          </h3>

          {member.skills.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>Trained Skills</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
                {member.skills.map((skill) => (
                  <span key={skill} style={{
                    backgroundColor: `${rankColor}15`,
                    border: `1px solid ${rankColor}40`,
                    borderRadius: "20px",
                    color: rankColor,
                    fontSize: "0.7rem",
                    padding: "0.25rem 0.75rem",
                    letterSpacing: "0.5px",
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {member.advantages.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>Commendations &amp; Advantages</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
                {member.advantages.map((a) => (
                  <span key={a} style={{
                    backgroundColor: "#33cc9915",
                    border: "1px solid #33cc9940",
                    borderRadius: "20px",
                    color: "#33cc99",
                    fontSize: "0.7rem",
                    padding: "0.25rem 0.75rem",
                  }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {member.disadvantages.length > 0 && (
            <div>
              <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>Noted Limitations</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
                {member.disadvantages.map((d) => (
                  <span key={d} style={{
                    backgroundColor: "#cc333315",
                    border: "1px solid #cc333340",
                    borderRadius: "20px",
                    color: "#cc6666",
                    fontSize: "0.7rem",
                    padding: "0.25rem 0.75rem",
                  }}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Incoming Messages */}
      {messages.length > 0 && (
        <div style={{
          backgroundColor: "#111",
          border: "1px solid #333",
          borderRadius: "4px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}>
          <h3 style={{ color: rankColor, fontSize: "0.75rem", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 1rem" }}>
            Incoming Transmissions
          </h3>
          {messages.map((msg) => (
            <div key={msg.id} style={{
              backgroundColor: "#0a0a0a",
              border: "1px solid #1a1a1a",
              borderRadius: "6px",
              padding: "1rem",
              marginBottom: "0.75rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <span style={{ color: rankColor, fontSize: "0.72rem", letterSpacing: "1px" }}>
                  From: {msg.fromCharacter}
                </span>
                <span style={{ color: "#444", fontSize: "0.65rem" }}>SD {msg.stardate}</span>
              </div>
              <p style={{ color: "#ccc", margin: 0, fontSize: "0.88rem", lineHeight: 1.6 }}>{msg.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bottom LCARS bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link to="/personnel" style={{
          flex: 1,
          backgroundColor: rankColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#000",
          fontWeight: "bold",
          textDecoration: "none",
          letterSpacing: "2px",
          fontSize: "0.85rem",
        }}>
          RETURN TO PERSONNEL DATABASE
        </Link>
        <div style={{ width: "20px", backgroundColor: rankColor, borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Send Message Modal */}
      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#000000cc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{
            backgroundColor: "#111",
            border: `1px solid ${rankColor}`,
            borderRadius: "8px",
            padding: "2rem",
            width: "100%",
            maxWidth: "500px",
            margin: "1rem",
          }}>
            <h2 style={{
              color: rankColor,
              fontSize: "0.85rem",
              letterSpacing: "2px",
              textTransform: "uppercase",
              margin: "0 0 0.25rem",
            }}>
              Send Transmission
            </h2>
            <p style={{ color: "#555", fontSize: "0.75rem", margin: "0 0 1.5rem" }}>
              To: {member.name}
            </p>

            <form onSubmit={handleSendMessage}>
              <textarea
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Enter your message..."
                rows={5}
                style={{ ...inputStyleBase, resize: "vertical", marginBottom: "1rem" }}
              />
              {sendError && (
                <p style={{ color: "#cc3333", fontSize: "0.78rem", margin: "0 0 0.75rem" }}>{sendError}</p>
              )}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #444",
                    borderRadius: "20px",
                    color: "#888",
                    padding: "0.5rem 1.25rem",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={sending || !msgText.trim()}
                  style={{
                    backgroundColor: rankColor,
                    border: "none",
                    borderRadius: "20px",
                    color: "#000",
                    padding: "0.5rem 1.5rem",
                    fontFamily: "'Orbitron', sans-serif",
                    fontWeight: "bold",
                    fontSize: "0.75rem",
                    letterSpacing: "1px",
                    cursor: sending || !msgText.trim() ? "not-allowed" : "pointer",
                    opacity: sending || !msgText.trim() ? 0.5 : 1,
                  }}
                >
                  {sending ? "TRANSMITTING..." : "TRANSMIT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonnelProfile;
