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

function currentStardate(): string {
  const base = 74000;
  const baseTime = new Date("2026-01-01").getTime();
  const days = (Date.now() - baseTime) / (1000 * 60 * 60 * 24);
  return (base + (days * 1000) / 365).toFixed(1);
}

type Message = {
  id: string;
  fromCharacter: string;
  toCharacter: string;
  message: string;
  stardate: string;
  createdAt: any;
};

const PersonnelProfile = () => {
  const { crewSlug } = useParams();
  const [visible, setVisible] = useState(false);
  const [member, setMember] = useState<CrewMember | null>(null);
  const [ships, setShips] = useState<Record<string, ShipData>>({});
  const [messages, setMessages] = useState<Message[]>([]);

  // Send message modal state
  const [showModal, setShowModal] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (!crewSlug) return;
    setShips(getShips());

    const unsub = onSnapshot(doc(db, "crew", crewSlug), (snap) => {
      setMember(snap.exists() ? (snap.data() as CrewMember) : null);
    });

    const msgQ = query(
      collection(db, "character_messages"),
      where("toCharacter", "==", crewSlug),
      orderBy("createdAt", "desc")
    );
    const unsubMsg = onSnapshot(msgQ, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    });

    const timer = setTimeout(() => setVisible(true), 50);
    return () => { unsub(); unsubMsg(); clearTimeout(timer); };
  }, [crewSlug]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || !crewSlug) return;
    setSending(true);
    setSendError("");
    try {
      await addDoc(collection(db, "character_messages"), {
        fromCharacter: user?.email || user?.uid || "Anonymous",
        toCharacter: crewSlug,
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

  if (!member) {
    return (
      <div style={{ color: "#ff9900", textAlign: "center", marginTop: "4rem", fontFamily: "'Orbitron', sans-serif" }}>
        <p style={{ fontSize: "1.3rem" }}>Accessing personnel record...</p>
        {member === null && crewSlug && (
          <p style={{ color: "#6699cc", marginTop: "1rem" }}>Record not found in Starfleet database.</p>
        )}
        <Link to="/personnel" style={{ color: "#9933cc", marginTop: "2rem", display: "inline-block" }}>
          Return to Personnel Database
        </Link>
      </div>
    );
  }

  const rankColor = rankColors[member.rank] || "#888";
  const shipName = member.shipId === "starbase"
    ? "Starbase Machida"
    : (ships[member.shipId]?.name || member.shipId || "Unassigned");

  const inputStyle: React.CSSProperties = {
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
            PERSONNEL FILE
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
          { label: "Position", value: member.position },
          { label: "Ship Assignment", value: shipName },
        ].map(({ label, value }) => (
          <div key={label} style={{
            backgroundColor: "#111",
            border: "1px solid #222",
            borderRadius: "4px",
            padding: "1rem 1.25rem",
          }}>
            <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>{label}</span>
            <p style={{ color: "#eee", fontSize: "0.95rem", margin: "0.3rem 0 0", fontWeight: "bold" }}>{value || "—"}</p>
          </div>
        ))}
      </div>

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

      {/* Service History */}
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
                style={{ ...inputStyle, resize: "vertical", marginBottom: "1rem" }}
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
