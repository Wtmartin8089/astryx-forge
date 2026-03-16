import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { isAdmin } from "../../utils/adminAuth";
import {
  createTransmission,
  updateTransmission,
  deleteTransmission,
  subscribeToTransmissions,
  type Transmission,
} from "../../server/fleet/transmissions/transmissionService";
import "../../assets/lcars.css";

const BLANK: Omit<Transmission, "id" | "stardate" | "timestamp"> = {
  author: "Fleet Admiral Ragh'Kor",
  rank: "Fleet Admiral",
  location: "Starbase Machida",
  title: "",
  message: "",
  targetShip: "*",
  priority: "standard",
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent:   "#FF4444",
  command:  "#F5B942",
  standard: "#8AAAD0",
};

const TransmissionsConsole = () => {
  const [visible, setVisible] = useState(false);
  const [transmissions, setTransmissions] = useState<Transmission[]>([]);
  const [form, setForm] = useState({ ...BLANK });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const auth = getAuth();
  const user = auth.currentUser;
  const userIsAdmin = user ? isAdmin(user.uid) : false;

  useEffect(() => {
    const unsub = subscribeToTransmissions(setTransmissions);
    const timer = setTimeout(() => setVisible(true), 50);
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  if (!userIsAdmin) {
    return (
      <div style={{ maxWidth: "600px", margin: "4rem auto", padding: "2rem", textAlign: "center", fontFamily: "'Orbitron', sans-serif" }}>
        <div style={{ backgroundColor: "#111", border: "2px solid #cc3333", borderRadius: "4px", padding: "2rem" }}>
          <p style={{ color: "#cc3333", fontSize: "1rem", letterSpacing: "2px", margin: "0 0 1rem" }}>ACCESS DENIED</p>
          <p style={{ color: "#888", fontSize: "0.8rem", margin: "0 0 1.5rem" }}>
            Fleet Transmissions Console is restricted to Fleet Command personnel.
          </p>
          <Link to="/" style={{ color: "#6699cc", fontSize: "0.75rem", letterSpacing: "1px" }}>Return to Command Center</Link>
        </div>
      </div>
    );
  }

  const handleField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleEdit = (tx: Transmission) => {
    setEditingId(tx.id!);
    setForm({
      author:     tx.author || "Fleet Admiral Ragh'Kor",
      rank:       tx.rank || "Fleet Admiral",
      location:   tx.location || "Starbase Machida",
      title:      tx.title,
      message:    tx.message,
      targetShip: tx.targetShip || "*",
      priority:   tx.priority || "standard",
    });
    setSuccessMsg("");
    setErrorMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ ...BLANK });
    setSuccessMsg("");
    setErrorMsg("");
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete transmission "${title}"?`)) return;
    try {
      await deleteTransmission(id);
      setSuccessMsg(`"${title}" deleted.`);
      if (editingId === id) handleCancel();
    } catch {
      setErrorMsg("Delete failed.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      if (editingId) {
        await updateTransmission(editingId, form);
        setSuccessMsg(`"${form.title}" updated.`);
      } else {
        await createTransmission(form);
        setSuccessMsg(`"${form.title}" transmitted.`);
      }
      handleCancel();
    } catch (err: any) {
      setErrorMsg("Failed to save. Check your connection.");
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
        <div style={{ width: "20px", backgroundColor: "#F5B942", borderRadius: "20px 0 0 0" }} />
        <div style={{ flex: 1, backgroundColor: "#F5B942", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem" }}>
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.3rem", fontWeight: "bold", letterSpacing: "3px" }}>
            FLEET TRANSMISSIONS CONSOLE
          </h1>
          <span style={{ color: "#00000070", fontSize: "0.7rem", letterSpacing: "1px" }}>FLEET COMMAND ACCESS ONLY</span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

        {/* ── Compose / Edit Form ── */}
        <div style={{ backgroundColor: "#111", border: "2px solid #F5B942", borderRadius: "0 20px 0 0", padding: "1.5rem" }}>
          <h2 style={{ color: "#F5B942", fontSize: "0.78rem", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 1.25rem" }}>
            {editingId ? "Edit Transmission" : "Compose Transmission"}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Author</label>
                <input value={form.author} onChange={(e) => handleField("author", e.target.value)} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Rank</label>
                <input value={form.rank} onChange={(e) => handleField("rank", e.target.value)} style={inputStyle} required />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Location / Station</label>
              <input value={form.location} onChange={(e) => handleField("location", e.target.value)} style={inputStyle} placeholder="Starbase Machida" required />
            </div>

            <div>
              <label style={labelStyle}>Title</label>
              <input value={form.title} onChange={(e) => handleField("title", e.target.value)} style={inputStyle} placeholder="Exploration Order Alpha-7" required />
            </div>

            <div>
              <label style={labelStyle}>Priority</label>
              <select value={form.priority} onChange={(e) => handleField("priority", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="standard">Standard</option>
                <option value="command">Command</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Target</label>
              <select value={form.targetShip} onChange={(e) => handleField("targetShip", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="*">All Fleet (Global Broadcast)</option>
                <option value="USS Joshua Tree">USS Joshua Tree</option>
                <option value="USS King">USS King</option>
                <option value="USS Defiant-A">USS Defiant-A</option>
                <option value="USS Lancelot">USS Lancelot</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Message</label>
              <textarea
                value={form.message}
                onChange={(e) => handleField("message", e.target.value)}
                rows={6}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                placeholder="All hands. By order of Fleet Command..."
                required
              />
            </div>

            {successMsg && <p style={{ color: "#33cc99", fontSize: "0.78rem", margin: 0, letterSpacing: "1px" }}>✓ {successMsg}</p>}
            {errorMsg   && <p style={{ color: "#cc3333", fontSize: "0.78rem", margin: 0 }}>{errorMsg}</p>}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="submit"
                disabled={saving || !form.title.trim() || !form.message.trim()}
                style={{
                  flex: 1,
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
                  opacity: (!form.title.trim() || !form.message.trim()) ? 0.4 : 1,
                  transition: "all 0.2s",
                }}
              >
                {saving ? "TRANSMITTING..." : editingId ? "UPDATE" : "TRANSMIT"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #555",
                    borderRadius: "20px",
                    color: "#888",
                    padding: "0.6rem 1.25rem",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  CANCEL
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Transmission Log ── */}
        <div style={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "0 20px 0 0", padding: "1.5rem", maxHeight: "80vh", overflowY: "auto" }}>
          <h2 style={{ color: "#888", fontSize: "0.78rem", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 1.25rem" }}>
            Transmission Log ({transmissions.length})
          </h2>

          {transmissions.length === 0 && (
            <p style={{ color: "#444", fontSize: "0.82rem" }}>No transmissions on record.</p>
          )}

          {transmissions.map((tx) => {
            const pc = PRIORITY_COLOR[tx.priority || "standard"];
            return (
              <div key={tx.id} style={{
                backgroundColor: "#0a0a0a",
                border: `1px solid ${editingId === tx.id ? "#F5B942" : "#1a1a1a"}`,
                borderLeft: `3px solid ${pc}`,
                borderRadius: "4px",
                padding: "0.9rem 1rem",
                marginBottom: "0.75rem",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                  <span style={{ color: "#F5B942", fontSize: "0.8rem", fontWeight: "bold", letterSpacing: "0.5px" }}>{tx.title}</span>
                  <span style={{ color: "#444", fontSize: "0.65rem", whiteSpace: "nowrap", marginLeft: "0.5rem" }}>SD {tx.stardate}</span>
                </div>
                <p style={{ color: "#666", fontSize: "0.75rem", margin: "0 0 0.1rem" }}>
                  {tx.rank} {tx.author} · {tx.location}
                </p>
                <p style={{ color: "#444", fontSize: "0.7rem", margin: "0 0 0.6rem" }}>
                  Target: {tx.targetShip === "*" ? "Global" : tx.targetShip}
                  {tx.priority && tx.priority !== "standard" && (
                    <span style={{ color: pc, marginLeft: "0.5rem" }}>[{tx.priority}]</span>
                  )}
                </p>
                <p style={{ color: "#888", fontSize: "0.78rem", margin: "0 0 0.75rem", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {tx.message}
                </p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => handleEdit(tx)}
                    style={{ backgroundColor: "#F5B94220", border: "1px solid #F5B94260", borderRadius: "20px", color: "#F5B942", fontSize: "0.65rem", letterSpacing: "1px", padding: "0.25rem 0.75rem", cursor: "pointer", fontFamily: "'Orbitron', sans-serif" }}
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => handleDelete(tx.id!, tx.title)}
                    style={{ backgroundColor: "#cc333320", border: "1px solid #cc333360", borderRadius: "20px", color: "#cc6666", fontSize: "0.65rem", letterSpacing: "1px", padding: "0.25rem 0.75rem", cursor: "pointer", fontFamily: "'Orbitron', sans-serif" }}
                  >
                    DELETE
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px", marginTop: "2rem" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link to="/fleet" style={{ flex: 1, backgroundColor: "#F5B942", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", textDecoration: "none", letterSpacing: "2px", fontSize: "0.85rem" }}>
          RETURN TO FLEET REGISTRY
        </Link>
        <div style={{ width: "20px", backgroundColor: "#F5B942", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default TransmissionsConsole;
