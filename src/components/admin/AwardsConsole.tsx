import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase/firebaseConfig";
import { isAdmin } from "../../utils/adminAuth";
import starfleetDecorations from "../../data/starfleetDecorations";
import type { CrewMember, AwardEntry } from "../../types/fleet";
import "../../assets/lcars.css";

function currentStardate(): string {
  const base = 74000;
  const baseTime = new Date("2026-01-01").getTime();
  const days = (Date.now() - baseTime) / (1000 * 60 * 60 * 24);
  return (base + (days * 1000) / 365).toFixed(1);
}

type CrewEntry = { slug: string; member: CrewMember };

const AwardsConsole = () => {
  const [visible, setVisible] = useState(false);
  const [crew, setCrew] = useState<CrewEntry[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedAwardId, setSelectedAwardId] = useState("");
  const [citation, setCitation] = useState("");
  const [awardedBy, setAwardedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const auth = getAuth();
  const user = auth.currentUser;
  const userIsAdmin = user ? isAdmin(user.uid) : false;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "crew"), (snap) => {
      const entries: CrewEntry[] = snap.docs.map((d) => ({
        slug: d.id,
        member: d.data() as CrewMember,
      }));
      entries.sort((a, b) => a.member.name.localeCompare(b.member.name));
      setCrew(entries);
    });
    const timer = setTimeout(() => setVisible(true), 50);
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  // Pre-fill awardedBy with current user's email
  useEffect(() => {
    if (user?.email && !awardedBy) setAwardedBy(user.email);
  }, [user]);

  if (!userIsAdmin) {
    return (
      <div style={{
        maxWidth: "600px",
        margin: "4rem auto",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "'Orbitron', sans-serif",
      }}>
        <div style={{
          backgroundColor: "#111",
          border: "2px solid #cc3333",
          borderRadius: "4px",
          padding: "2rem",
        }}>
          <p style={{ color: "#cc3333", fontSize: "1rem", letterSpacing: "2px", margin: "0 0 1rem" }}>
            ACCESS DENIED
          </p>
          <p style={{ color: "#888", fontSize: "0.8rem", margin: "0 0 1.5rem" }}>
            Starfleet Awards Console is restricted to Fleet Command personnel.
          </p>
          <Link to="/personnel" style={{ color: "#6699cc", fontSize: "0.75rem", letterSpacing: "1px" }}>
            Return to Personnel Database
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlug || !selectedAwardId || !citation.trim() || !awardedBy.trim()) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    const entry: AwardEntry = {
      awardId: selectedAwardId,
      citation: citation.trim(),
      awardedBy: awardedBy.trim(),
      stardate: currentStardate(),
    };

    try {
      await updateDoc(doc(db, "crew", selectedSlug), {
        awards: arrayUnion(entry),
      });
      const recipientName = crew.find((c) => c.slug === selectedSlug)?.member.name || selectedSlug;
      const awardName = starfleetDecorations.find((d) => d.id === selectedAwardId)?.name || selectedAwardId;
      setSuccessMsg(`${awardName} awarded to ${recipientName}.`);
      setCitation("");
      setSelectedAwardId("");
      setSelectedSlug("");
    } catch (err) {
      setErrorMsg("Failed to save award. Check your connection.");
      console.error(err);
    }
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#0a0a0a",
    border: "1px solid #F5B94240",
    borderRadius: "4px",
    color: "#ccc",
    padding: "0.5rem 0.75rem",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.82rem",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    color: "#888",
    fontSize: "0.65rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "0.35rem",
  };

  const selectedDecoration = starfleetDecorations.find((d) => d.id === selectedAwardId);
  const selectedCharacter = crew.find((c) => c.slug === selectedSlug)?.member;

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
        <div style={{ width: "20px", backgroundColor: "#F5B942", borderRadius: "20px 0 0 0" }} />
        <div style={{
          flex: 1,
          backgroundColor: "#F5B942",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2rem",
        }}>
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.4rem", fontWeight: "bold", letterSpacing: "3px" }}>
            STARFLEET AWARDS CONSOLE
          </h1>
          <span style={{ color: "#00000070", fontSize: "0.7rem", letterSpacing: "1px" }}>
            FLEET COMMAND ACCESS ONLY
          </span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

        {/* Award Form */}
        <div style={{
          backgroundColor: "#111",
          border: "2px solid #F5B942",
          borderRadius: "0 20px 0 0",
          padding: "1.5rem",
        }}>
          <h2 style={{ color: "#F5B942", fontSize: "0.78rem", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 1.25rem" }}>
            Issue Decoration
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Character selector */}
            <div>
              <label style={labelStyle}>Recipient</label>
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
                required
              >
                <option value="">— Select character —</option>
                {crew.map(({ slug, member }) => (
                  <option key={slug} value={slug}>
                    {member.rank} {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Award selector */}
            <div>
              <label style={labelStyle}>Decoration</label>
              <select
                value={selectedAwardId}
                onChange={(e) => setSelectedAwardId(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
                required
              >
                <option value="">— Select decoration —</option>
                {starfleetDecorations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Awarded by */}
            <div>
              <label style={labelStyle}>Awarded By</label>
              <input
                type="text"
                value={awardedBy}
                onChange={(e) => setAwardedBy(e.target.value)}
                placeholder="Fleet Admiral Ragh'Kor"
                style={inputStyle}
                required
              />
            </div>

            {/* Citation */}
            <div>
              <label style={labelStyle}>Citation</label>
              <textarea
                value={citation}
                onChange={(e) => setCitation(e.target.value)}
                placeholder="For exceptional service in..."
                rows={4}
                style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6" }}
                required
              />
            </div>

            {successMsg && (
              <p style={{ color: "#33cc99", fontSize: "0.78rem", margin: 0, letterSpacing: "1px" }}>
                ✓ {successMsg}
              </p>
            )}
            {errorMsg && (
              <p style={{ color: "#cc3333", fontSize: "0.78rem", margin: 0 }}>{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={saving || !selectedSlug || !selectedAwardId || !citation.trim() || !awardedBy.trim()}
              style={{
                backgroundColor: saving ? "transparent" : "#F5B942",
                border: saving ? "1px solid #F5B94260" : "none",
                borderRadius: "20px",
                color: saving ? "#F5B942" : "#000",
                padding: "0.6rem 1.5rem",
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: "bold",
                fontSize: "0.78rem",
                letterSpacing: "1.5px",
                cursor: saving ? "wait" : "pointer",
                opacity: (!selectedSlug || !selectedAwardId || !citation.trim() || !awardedBy.trim()) ? 0.4 : 1,
                transition: "all 0.2s",
              }}
            >
              {saving ? "TRANSMITTING..." : "ISSUE DECORATION"}
            </button>
          </form>
        </div>

        {/* Preview panel */}
        <div style={{
          backgroundColor: "#111",
          border: "1px solid #333",
          borderRadius: "0 20px 0 0",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}>
          <h2 style={{ color: "#888", fontSize: "0.78rem", letterSpacing: "2px", textTransform: "uppercase", margin: 0 }}>
            Preview
          </h2>

          {/* Character preview */}
          {selectedCharacter ? (
            <div style={{ borderBottom: "1px solid #222", paddingBottom: "1rem" }}>
              <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1px", textTransform: "uppercase" }}>Recipient</span>
              <p style={{ color: "#fff", fontSize: "0.95rem", margin: "0.3rem 0 0", fontWeight: "bold" }}>
                {selectedCharacter.rank} {selectedCharacter.name}
              </p>
              <p style={{ color: "#888", fontSize: "0.78rem", margin: "0.2rem 0 0" }}>
                {selectedCharacter.position} · {selectedCharacter.species}
              </p>
            </div>
          ) : (
            <p style={{ color: "#444", fontSize: "0.82rem" }}>No character selected.</p>
          )}

          {/* Decoration preview */}
          {selectedDecoration ? (
            <div style={{ borderBottom: "1px solid #222", paddingBottom: "1rem" }}>
              <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1px", textTransform: "uppercase" }}>Decoration</span>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.5rem" }}>
                <img
                  src={selectedDecoration.image}
                  alt={selectedDecoration.name}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/awards/placeholder.svg"; }}
                  style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "4px", backgroundColor: "#0a0a0a", border: "1px solid #F5B94230" }}
                />
                <div>
                  <p style={{ color: "#F5B942", fontSize: "0.85rem", margin: 0, fontWeight: "bold" }}>{selectedDecoration.name}</p>
                  <p style={{ color: "#666", fontSize: "0.72rem", margin: "0.25rem 0 0", lineHeight: 1.4 }}>{selectedDecoration.description}</p>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: "#444", fontSize: "0.82rem" }}>No decoration selected.</p>
          )}

          {/* Stardate */}
          <div>
            <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1px", textTransform: "uppercase" }}>Stardate</span>
            <p style={{ color: "#aaa", fontSize: "0.85rem", margin: "0.3rem 0 0" }}>SD {currentStardate()}</p>
          </div>

          {/* Citation preview */}
          {citation.trim() && (
            <div>
              <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1px", textTransform: "uppercase" }}>Citation</span>
              <p style={{ color: "#aaa", fontSize: "0.82rem", margin: "0.3rem 0 0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {citation}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom LCARS bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px", marginTop: "2rem" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link to="/personnel" style={{
          flex: 1,
          backgroundColor: "#F5B942",
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
        <div style={{ width: "20px", backgroundColor: "#F5B942", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default AwardsConsole;
